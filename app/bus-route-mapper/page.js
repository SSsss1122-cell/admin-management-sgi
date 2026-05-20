'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Save, X, MapPin, Bus, Trash2, ChevronLeft,
  RefreshCw, Layers, Map as MapIcon, Eye, Route,
  Sun, Moon, Navigation, AlertCircle, CheckCircle,
  Info, Edit2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getAdminInstitution } from '../lib/getInstitution';
import withAuth from '../../components/withAuth';
import 'leaflet/dist/leaflet.css';

/* ── Design tokens ── */
const T = {
  bg:      '#0b0b14',
  surface: '#11111d',
  card:    '#17172a',
  border:  'rgba(255,255,255,0.08)',
  text:    '#e2e2ef',
  muted:   '#7878a0',
  faint:   '#38385a',
  blue:    '#5b8def',
  cyan:    '#22d3ee',
  green:   '#10b981',
  red:     '#f43f5e',
  amber:   '#f59e0b',
  purple:  '#a78bfa',
};

/* ── Tile layers ── */
const TILES = {
  streets: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    subdomains: 'abc',
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
    subdomains: '',
  },
};

/* ── Stop colour by position ── */
const stopCol = (i, total) => {
  if (i === 0)           return { a: '#10b981', b: '#34d399' };
  if (i === total - 1)   return { a: '#f43f5e', b: '#fb7185' };
  return                        { a: '#5b8def', b: '#22d3ee' };
};

/* ═══════════════════════════════════════════ */
function BusRouteMapper() {

  /* ── State ── */
  const [buses,             setBuses]             = useState([]);
  const [selectedBus,       setSelectedBus]       = useState('');
  const [direction,         setDirection]         = useState('morning');
  const [stops,             setStops]             = useState([]);
  const [loading,           setLoading]           = useState(false);
  const [saving,            setSaving]            = useState(false);
  const [toast,             setToast]             = useState({ type: '', text: '' });
  const [showModal,         setShowModal]         = useState(false);
  const [tempName,          setTempName]          = useState('');
  const [tempLL,            setTempLL]            = useState(null);
  const [editIdx,           setEditIdx]           = useState(null);
  const [dragIdx,           setDragIdx]           = useState(null);
  const [mapStyle,          setMapStyle]          = useState('streets');
  const [mapReady,          setMapReady]          = useState(false);
  const [instId,            setInstId]            = useState(null);
  const [instLoc,           setInstLoc]           = useState({ lat: 17.2894, lng: 76.8691 });
  const [instName,          setInstName]          = useState('College');
  const [campusPickerMode,  setCampusPickerMode]  = useState(false);
  const [savingCampus,      setSavingCampus]      = useState(false);
  const [leafletLoaded,     setLeafletLoaded]     = useState(false);

  /* ── Refs ── */
  const mapEl        = useRef(null);
  const mapRef       = useRef(null);
  const markersRef   = useRef([]);
  const lineRef      = useRef(null);
  const campusRef    = useRef(null);
  const tileRef      = useRef(null);

  /* mutable refs so Leaflet closures always see fresh state */
  const busRef       = useRef(selectedBus);
  const stopsRef     = useRef(stops);
  const pickerRef    = useRef(campusPickerMode);
  const instLocRef   = useRef(instLoc);
  const instIdRef    = useRef(instId);
  const instNameRef  = useRef(instName);

  useEffect(() => { busRef.current      = selectedBus;     }, [selectedBus]);
  useEffect(() => { stopsRef.current    = stops;           }, [stops]);
  useEffect(() => { pickerRef.current   = campusPickerMode;}, [campusPickerMode]);
  useEffect(() => { instLocRef.current  = instLoc;        }, [instLoc]);
  useEffect(() => { instIdRef.current   = instId;         }, [instId]);
  useEffect(() => { instNameRef.current = instName;       }, [instName]);

  const router = useRouter();

  /* ── Toast ── */
  const msg = (type, text, ms = 3500) => {
    setToast({ type, text });
    setTimeout(() => setToast({ type: '', text: '' }), ms);
  };

  /* ─────────────────── INIT ─────────────────── */
  useEffect(() => {
    load();
    return () => { 
      if (mapRef.current) { 
        mapRef.current.remove(); 
        mapRef.current = null; 
      } 
    };
  }, []);

  const load = async () => {
    try {
      const admin = await getAdminInstitution();
      if (!admin?.institution_id) { 
        msg('error', 'Institution not found'); 
        return; 
      }
      setInstId(admin.institution_id);
      instIdRef.current = admin.institution_id;

      const { data, error } = await supabase
        .from('institutions')
        .select('name, lat, lan')
        .eq('id', admin.institution_id)
        .single();
      if (!error && data) {
        const loc = { lat: parseFloat(data.lat) || 17.2894, lng: parseFloat(data.lan) || 76.8691 };
        setInstLoc(loc); 
        instLocRef.current = loc;
        setInstName(data.name || 'College'); 
        instNameRef.current = data.name || 'College';
      }

      const { data: bdata } = await supabase
        .from('buses')
        .select('id, bus_number, route_name')
        .eq('institution_id', admin.institution_id)
        .order('bus_number');
      setBuses(bdata || []);
    } catch (e) {
      msg('error', 'Failed to load: ' + e.message);
    }
  };

  /* ─────────────────── MAP INIT (once) ─────────────────── */
  useEffect(() => {
    if (mapReady || mapRef.current || !mapEl.current || !instId) return;
    let cancelled = false;

    const initMap = async () => {
      try {
        await new Promise(r => setTimeout(r, 100));
        if (cancelled || !mapEl.current || mapRef.current) return;

        // Dynamically import Leaflet
        const L = await import('leaflet');
        window.L = L;

        // Fix default icon paths
        delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        });

        const map = L.map(mapEl.current, {
          center: [instLocRef.current.lat, instLocRef.current.lng],
          zoom: 15,
          zoomControl: false,
          doubleClickZoom: false,
        });

        const t = TILES[mapStyle];
        tileRef.current = L.tileLayer(t.url, {
          attribution: t.attribution,
          maxZoom: 19,
          subdomains: t.subdomains || 'abc',
        }).addTo(map);

        // Campus marker
        campusRef.current = makeCampusMarker(L, map,
          instLocRef.current.lat, instLocRef.current.lng, instNameRef.current);

        // DOUBLE-CLICK handler
        map.on('dblclick', e => {
          const { lat, lng } = e.latlng;

          if (pickerRef.current) {
            doSaveCampus(lat, lng);
            return;
          }

          if (!busRef.current) {
            msg('error', 'Select a bus first, then double-click to add stops');
            return;
          }

          setTempLL({ lat: lat.toFixed(7), lng: lng.toFixed(7) });
          setTempName('');
          setEditIdx(null);
          setShowModal(true);
        });

        L.control.zoom({ position: 'topright' }).addTo(map);
        L.control.scale({ metric: true, imperial: false, position: 'bottomleft' }).addTo(map);

        mapRef.current = map;
        setMapReady(true);
        setLeafletLoaded(true);
        
        setTimeout(() => {
          if (mapRef.current) {
            mapRef.current.invalidateSize();
          }
        }, 200);
        
      } catch (error) {
        console.error('Error initializing map:', error);
        msg('error', 'Failed to load map. Please refresh the page.');
      }
    };

    initMap();

    return () => { 
      cancelled = true; 
    };
  }, [instId]); // Only re-run when instId is set

  /* ─────────────────── CAMPUS MARKER ─────────────────── */
  function makeCampusMarker(L, map, lat, lng, name) {
    const icon = L.divIcon({
      html: `<div style="
        width:40px;height:40px;
        background:linear-gradient(135deg,#6366f1,#a78bfa);
        border-radius:50%;border:3px solid rgba(255,255,255,.9);
        display:flex;align-items:center;justify-content:center;
        box-shadow:0 0 0 4px rgba(99,102,241,.25),0 4px 14px rgba(0,0,0,.5);">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z"/>
        </svg>
      </div>`,
      className: '',
      iconSize: [40, 40],
      iconAnchor: [20, 40],
      popupAnchor: [0, -44],
    });
    const m = L.marker([lat, lng], { icon }).addTo(map);
    m.bindPopup(`
      <div style="padding:12px 14px;font-family:system-ui;min-width:160px;">
        <div style="font-weight:700;font-size:13px;color:#e2e2ef;margin-bottom:3px;">🏛️ ${name}</div>
        <div style="font-size:11px;color:#7878a0;">Main Campus</div>
        <div style="font-size:10px;color:#38385a;margin-top:4px;">${lat.toFixed(5)}, ${lng.toFixed(5)}</div>
        <button onclick="window.__centerCampus()" style="margin-top:9px;width:100%;padding:6px;background:#6366f1;color:#fff;border:none;border-radius:7px;cursor:pointer;font-size:12px;font-weight:600;">📍 Center map</button>
      </div>
    `);
    return m;
  }

  /* ─────────────────── CAMPUS LOCATION SAVE ─────────────────── */
  const doSaveCampus = async (lat, lng) => {
    if (!instIdRef.current) return;
    setSavingCampus(true);
    try {
      const { error } = await supabase
        .from('institutions')
        .update({ lat, lan: lng, updated_at: new Date().toISOString() })
        .eq('id', instIdRef.current);
      if (error) throw error;

      const loc = { lat, lng };
      setInstLoc(loc); 
      instLocRef.current = loc;
      setCampusPickerMode(false);

      if (mapRef.current && window.L && campusRef.current) {
        mapRef.current.removeLayer(campusRef.current);
        campusRef.current = makeCampusMarker(window.L, mapRef.current, lat, lng, instNameRef.current);
      }
      msg('success', 'Campus location updated!');
    } catch (e) {
      msg('error', 'Failed to save: ' + e.message);
    } finally {
      setSavingCampus(false);
    }
  };

  /* expose to popup button */
  useEffect(() => {
    window.__centerCampus = () => {
      if (mapRef.current) {
        mapRef.current.setView([instLocRef.current.lat, instLocRef.current.lng], 15);
      }
    };
    return () => { delete window.__centerCampus; };
  }, []);

  /* ─────────────────── TILE STYLE SWITCH ─────────────────── */
  const switchStyle = async (style) => {
    setMapStyle(style);
    if (!mapRef.current || !window.L) return;
    const L = window.L;
    if (tileRef.current) mapRef.current.removeLayer(tileRef.current);
    const t = TILES[style];
    tileRef.current = L.tileLayer(t.url, {
      attribution: t.attribution, 
      maxZoom: 19, 
      subdomains: t.subdomains || 'abc',
    }).addTo(mapRef.current);
    if (campusRef.current) campusRef.current.bringToFront?.();
  };

  /* ─────────────────── MAP MARKERS + ROUTE LINE ─────────────────── */
  const renderMap = useCallback((list) => {
    if (!mapRef.current || !window.L) return;
    const L = window.L;

    markersRef.current.forEach(m => {
      if (mapRef.current) mapRef.current.removeLayer(m);
    });
    markersRef.current = [];
    if (lineRef.current) { 
      if (mapRef.current) mapRef.current.removeLayer(lineRef.current); 
      lineRef.current = null; 
    }

    list.forEach((stop, i) => {
      const c = stopCol(i, list.length);
      const icon = L.divIcon({
        html: `<div style="
          width:36px;height:36px;
          background:linear-gradient(135deg,${c.a},${c.b});
          border-radius:50%;border:2.5px solid rgba(255,255,255,.88);
          display:flex;align-items:center;justify-content:center;
          font-weight:700;font-size:13px;color:#fff;
          box-shadow:0 0 0 3px ${c.a}44,0 3px 10px rgba(0,0,0,.45);">
          ${i + 1}
        </div>`,
        className: '',
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -22],
      });

      const mk = L.marker([stop.lat, stop.lng], { icon, draggable: true }).addTo(mapRef.current);
      mk.bindPopup(`
        <div style="padding:12px 14px;min-width:190px;font-family:system-ui;">
          <div style="font-weight:700;font-size:13px;color:#e2e2ef;margin-bottom:5px;">🚏 Stop ${i + 1}: ${stop.name}</div>
          <div style="font-size:10px;color:#7878a0;font-family:monospace;margin-bottom:10px;">${Number(stop.lat).toFixed(6)}, ${Number(stop.lng).toFixed(6)}</div>
          <div style="display:flex;gap:7px;">
            <button onclick="window.__editStop(${i})"
              style="flex:1;padding:6px;background:#5b8def;color:#fff;border:none;border-radius:7px;cursor:pointer;font-size:12px;font-weight:600;">✏️ Edit</button>
            <button onclick="window.__delStop(${i})"
              style="flex:1;padding:6px;background:#f43f5e;color:#fff;border:none;border-radius:7px;cursor:pointer;font-size:12px;font-weight:600;">🗑️ Delete</button>
          </div>
        </div>
      `);

      mk.on('dragend', () => {
        const p = mk.getLatLng();
        setStops(prev => prev.map((s, idx) => idx === i ? { ...s, lat: p.lat, lng: p.lng } : s));
      });

      markersRef.current.push(mk);
    });

    if (list.length > 1 && mapRef.current) {
      const pts = list.map(s => [s.lat, s.lng]);
      lineRef.current = L.polyline(pts, {
        color: T.blue,
        weight: 4,
        opacity: 0.85,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(mapRef.current);

      L.polyline(pts, {
        color: T.cyan,
        weight: 2,
        opacity: 0.45,
        dashArray: '7 10',
      }).addTo(mapRef.current);
    }
  }, []);

  useEffect(() => {
    if (!mapReady || !leafletLoaded) return;
    renderMap(stops);
    if (stops.length > 0 && mapRef.current) {
      const bounds = stops.map(s => [s.lat, s.lng]);
      mapRef.current.fitBounds(bounds, { padding: [60, 60] });
    }
  }, [stops, mapReady, leafletLoaded, renderMap]);

  /* popup button handlers */
  useEffect(() => {
    window.__editStop = (i) => {
      const s = stopsRef.current[i];
      setEditIdx(i); 
      setTempName(s.name); 
      setTempLL({ lat: s.lat, lng: s.lng }); 
      setShowModal(true);
    };
    window.__delStop = (i) => {
      setStops(p => p.filter((_, idx) => idx !== i));
      msg('success', 'Stop removed', 2000);
    };
    return () => { 
      delete window.__editStop; 
      delete window.__delStop; 
    };
  }, []);

  /* crosshair cursor for picker */
  useEffect(() => {
    if (!mapEl.current) return;
    mapEl.current.style.cursor = campusPickerMode ? 'crosshair' : '';
  }, [campusPickerMode]);

  /* ─────────────────── STOP CRUD ─────────────────── */
  const commitStop = () => {
    if (!tempName.trim()) { 
      msg('error', 'Enter a stop name'); 
      return; 
    }
    const stop = { 
      name: tempName.trim(), 
      lat: parseFloat(tempLL.lat), 
      lng: parseFloat(tempLL.lng), 
      is_major: false, 
      estimated_time: null, 
      landmark: '' 
    };
    if (editIdx !== null) {
      setStops(p => p.map((s, i) => i === editIdx ? stop : s));
      msg('success', 'Stop updated', 2000);
    } else {
      setStops(p => [...p, stop]);
      msg('success', `"${stop.name}" added`, 2000);
    }
    setShowModal(false); 
    setTempName(''); 
    setTempLL(null); 
    setEditIdx(null);
  };

  const removeStop = (i) => { 
    setStops(p => p.filter((_, idx) => idx !== i)); 
    msg('success', 'Removed', 1800); 
  };

  const moveStop = (i, d) => setStops(p => {
    const a = [...p]; 
    const t2 = i + d;
    if (t2 < 0 || t2 >= a.length) return a;
    [a[i], a[t2]] = [a[t2], a[i]]; 
    return a;
  });

  const handleDrop = (i) => {
    if (dragIdx === null) return;
    setStops(p => { 
      const a = [...p]; 
      const [item] = a.splice(dragIdx, 1); 
      a.splice(i, 0, item); 
      return a; 
    });
    setDragIdx(null);
  };

  /* ─────────────────── LOAD EXISTING STOPS ─────────────────── */
  const loadStops = async () => {
    if (!selectedBus) { 
      msg('error', 'Select a bus first'); 
      return; 
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('bus_stops')
      .select('*')
      .eq('institution_id', instId)
      .eq('bus_id', parseInt(selectedBus))
      .eq('direction', direction)
      .order('sequence', { ascending: true });
    setLoading(false);
    if (!error && data?.length) {
      setStops(data.map(s => ({ 
        id: s.id, 
        name: s.stop_name, 
        lat: s.latitude, 
        lng: s.longitude, 
        sequence: s.sequence, 
        landmark: s.landmark, 
        estimated_time: s.estimated_time, 
        is_major: s.is_major 
      })));
      msg('success', `Loaded ${data.length} stops`);
    } else {
      setStops([]);
      msg('info', 'No stops found for this bus/direction', 4000);
    }
  };

  /* ─────────────────── SAVE ROUTE ─────────────────── */
  const saveRoute = async () => {
    if (!selectedBus)  { msg('error', 'Select a bus');           return; }
    if (!stops.length) { msg('error', 'Add at least one stop');  return; }
    if (!instId)       { msg('error', 'Institution not loaded'); return; }

    setSaving(true);
    try {
      await supabase.from('bus_stops').delete()
        .eq('institution_id', instId)
        .eq('bus_id', parseInt(selectedBus))
        .eq('direction', direction);

      const { error } = await supabase.from('bus_stops').insert(
        stops.map((s, i) => ({
          bus_id: parseInt(selectedBus),
          institution_id: instId,
          stop_name: s.name,
          sequence: i + 1,
          latitude: s.lat,
          longitude: s.lng,
          direction,
          estimated_time: s.estimated_time || null,
          is_major: s.is_major || false,
          landmark: s.landmark || null,
        }))
      );
      if (error) throw error;
      msg('success', `Route saved — ${stops.length} stops`);
      setTimeout(() => router.push('/bus-stops'), 1800);
    } catch (e) {
      msg('error', 'Save failed: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  /* ─────────────────── BUS / DIRECTION CHANGE ─────────────────── */
  const changeBus = (id) => {
    if (stopsRef.current.length && !confirm('Changing bus clears unsaved stops. Continue?')) return;
    setSelectedBus(id);
    setStops([]);
    markersRef.current.forEach(m => mapRef.current?.removeLayer(m));
    markersRef.current = [];
    if (lineRef.current) { 
      mapRef.current?.removeLayer(lineRef.current); 
      lineRef.current = null; 
    }
  };

  const changeDir = (d) => {
    if (stopsRef.current.length && !confirm('Changing direction clears unsaved stops. Continue?')) return;
    setDirection(d);
    setStops([]);
  };

  const clearAll = () => {
    if (!confirm('Clear all stops?')) return;
    setStops([]);
    msg('success', 'Cleared', 1800);
  };

  const centerCampus = () => {
    if (mapRef.current) mapRef.current.setView([instLoc.lat, instLoc.lng], 15);
  };

  const fitStops = () => {
    if (mapRef.current && stops.length) {
      mapRef.current.fitBounds(stops.map(s => [s.lat, s.lng]), { padding: [60, 60] });
    }
  };

  const getBusLabel = () => {
    const b = buses.find(b => b.id === parseInt(selectedBus));
    return b ? `${b.bus_number} — ${b.route_name || 'No Route'}` : '';
  };

  /* ─────────────────── LOADING SCREEN ─────────────────── */
  if (!instId) return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
      <div style={{ width: 42, height: 42, border: `3px solid ${T.faint}`, borderTopColor: T.blue, borderRadius: '50%', animation: 'sp .8s linear infinite' }} />
      <p style={{ color: T.muted, fontSize: 14, fontFamily: 'system-ui' }}>Loading institution data...</p>
      <style>{`@keyframes sp{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  /* ─────────────────── TOAST STYLES ─────────────────── */
  const toastBg = { success: '#059669', error: '#e11d48', info: '#2563eb' }[toast.type] || '#2563eb';
  const ToastIcon = () => toast.type === 'success' ? <CheckCircle size={14}/> : toast.type === 'error' ? <AlertCircle size={14}/> : <Info size={14}/>;

  /* ════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════ */
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: T.bg, fontFamily: "'DM Sans', system-ui, sans-serif", color: T.text }}>

      {/* ── Global styles ── */}
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:${T.faint};border-radius:4px}
        .btn{display:inline-flex;align-items:center;gap:5px;padding:7px 13px;border-radius:8px;border:1px solid ${T.border};background:rgba(255,255,255,.04);color:${T.muted};font-size:12px;font-weight:500;cursor:pointer;transition:all .15s;white-space:nowrap;font-family:inherit}
        .btn:hover:not(:disabled){background:rgba(255,255,255,.09);border-color:rgba(255,255,255,.15);color:${T.text}}
        .btn:active:not(:disabled){transform:scale(.97)}
        .btn:disabled{opacity:.38;cursor:not-allowed}
        .btn-primary{background:linear-gradient(135deg,${T.blue},${T.cyan}) !important;border:none !important;color:#fff !important;font-weight:600 !important}
        .btn-primary:hover:not(:disabled){opacity:.88 !important;box-shadow:0 6px 18px rgba(91,141,239,.4) !important}
        .btn-danger{background:rgba(244,63,94,.08) !important;border-color:rgba(244,63,94,.3) !important;color:${T.red} !important}
        .btn-danger:hover:not(:disabled){background:rgba(244,63,94,.16) !important;border-color:${T.red} !important}
        .btn-purple{background:rgba(167,139,250,.1) !important;border-color:rgba(167,139,250,.3) !important;color:${T.purple} !important}
        .btn-purple:hover:not(:disabled){background:rgba(167,139,250,.18) !important;border-color:${T.purple} !important}
        .inp{width:100%;padding:10px 14px;background:${T.bg};border:1px solid ${T.border};border-radius:10px;font-size:13px;color:${T.text};outline:none;font-family:inherit;transition:border-color .2s,box-shadow .2s;-webkit-appearance:none}
        .inp:focus{border-color:${T.blue};box-shadow:0 0 0 3px rgba(91,141,239,.15)}
        .inp::placeholder{color:${T.faint}}
        option{background:#16162a}
        .stop-card{background:${T.card};border:1px solid ${T.border};border-radius:12px;transition:border-color .15s,background .15s;cursor:grab}
        .stop-card:hover{border-color:rgba(255,255,255,.14);background:#1d1d30}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes toastIn{from{opacity:0;transform:translateX(14px)}to{opacity:1;transform:translateX(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}
        .pulse{animation:pulse 1.5s ease infinite}
        /* Leaflet overrides */
        .leaflet-container{background:#111120 !important}
        .leaflet-control-zoom{border:none !important}
        .leaflet-control-zoom a{background:rgba(17,17,32,.95) !important;color:${T.muted} !important;border:1px solid ${T.border} !important;border-radius:8px !important;margin:3px !important;width:34px !important;height:34px !important;line-height:34px !important}
        .leaflet-control-zoom a:hover{background:${T.blue} !important;color:#fff !important;border-color:${T.blue} !important}
        .leaflet-control-attribution{background:rgba(0,0,0,.55) !important;color:${T.faint} !important;font-size:9px !important}
        .leaflet-control-attribution a{color:${T.blue} !important}
        .leaflet-popup-content-wrapper{background:${T.card} !important;border:1px solid ${T.border} !important;border-radius:12px !important;color:${T.text} !important;box-shadow:0 16px 40px rgba(0,0,0,.6) !important;padding:0 !important}
        .leaflet-popup-tip-container{display:none}
      `}</style>

      {/* ── Header ── */}
      <header style={{ position:'sticky',top:0,zIndex:50,background:'rgba(11,11,20,.97)',backdropFilter:'blur(16px)',borderBottom:`1px solid ${T.border}`,padding:'0 18px',height:60,display:'flex',alignItems:'center',justifyContent:'space-between',gap:10 }}>
        <div style={{ display:'flex',alignItems:'center',gap:10 }}>
          <button onClick={() => router.back()} className="btn" style={{ padding:'6px 9px' }}>
            <ChevronLeft size={16}/>
          </button>
          <div style={{ width:32,height:32,background:`linear-gradient(135deg,${T.blue},${T.cyan})`,borderRadius:9,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
            <Route size={16} color="#fff"/>
          </div>
          <div>
            <div style={{ fontSize:15,fontWeight:700,color:T.text }}>Bus Route Mapper</div>
            <div style={{ fontSize:10,color:T.faint,marginTop:1 }}>
              {campusPickerMode
                ? '📍 Campus picker active — double-click map to set new campus location'
                : selectedBus
                  ? '✅ Bus selected — double-click map to add stops'
                  : 'Select a bus, then double-click map to add stops'}
            </div>
          </div>
        </div>

        <div style={{ display:'flex',gap:6,alignItems:'center',flexWrap:'wrap' }}>
          {/* Map style */}
          <div style={{ display:'flex',background:T.surface,border:`1px solid ${T.border}`,borderRadius:9,padding:3,gap:2 }}>
            {[['streets','Streets',<MapIcon size={11}/>],['satellite','Satellite',<Layers size={11}/>]].map(([k,label,icon])=>(
              <button key={k} onClick={()=>switchStyle(k)} style={{ padding:'5px 11px',borderRadius:7,border:'none',cursor:'pointer',background:mapStyle===k?T.blue:'transparent',color:mapStyle===k?'#fff':T.muted,fontSize:11,fontWeight:500,display:'flex',alignItems:'center',gap:4,transition:'all .15s',fontFamily:'inherit' }}>
                {icon}{label}
              </button>
            ))}
          </div>

          {/* Campus button */}
          <button
            onClick={() => { if (campusPickerMode) { setCampusPickerMode(false); msg('info','Campus picker cancelled',2000); } else { centerCampus(); } }}
            onDoubleClick={() => { setCampusPickerMode(true); msg('info','Campus picker active — double-click map',5000); }}
            className={`btn ${campusPickerMode ? 'btn-purple' : ''}`}
            title="Click: center campus | Double-click: change campus location"
          >
            <MapPin size={13}/>
            {campusPickerMode ? 'Cancel Picker' : 'Campus'}
          </button>

          <button onClick={loadStops} disabled={!selectedBus || loading} className="btn" style={{ color:T.blue,borderColor:'rgba(91,141,239,.3)',background:'rgba(91,141,239,.07)' }}>
            <Eye size={13}/>{loading ? 'Loading…' : 'Load Stops'}
          </button>

          <button onClick={fitStops} disabled={!stops.length} className="btn">
            <Navigation size={13}/>Fit
          </button>

          <button onClick={clearAll} className="btn btn-danger">
            <Trash2 size={13}/>Clear
          </button>

          <button onClick={()=>{setSelectedBus('');setStops([]);setDirection('morning');}} className="btn">
            <RefreshCw size={13}/>Reset
          </button>

          <button onClick={saveRoute} disabled={saving||!selectedBus||!stops.length} className="btn btn-primary" style={{ paddingLeft:16,paddingRight:16 }}>
            <Save size={13}/>{saving?'Saving…':'Save Route'}
          </button>
        </div>
      </header>

      {/* ── Toast ── */}
      {toast.text && (
        <div style={{ position:'fixed',top:68,right:18,zIndex:999,padding:'10px 16px',background:toastBg,color:'#fff',borderRadius:10,fontSize:12,fontWeight:500,display:'flex',alignItems:'center',gap:7,boxShadow:'0 8px 24px rgba(0,0,0,.4)',animation:'toastIn .2s ease',maxWidth:320 }}>
          <ToastIcon/>{toast.text}
        </div>
      )}

      {/* ── Campus picker pill ── */}
      {campusPickerMode && (
        <div className="pulse" style={{ position:'fixed',top:'50%',left:'50%',transform:'translate(-50%,-50%)',background:'linear-gradient(135deg,#6366f1,#a78bfa)',padding:'13px 28px',borderRadius:50,color:'#fff',fontWeight:700,fontSize:14,zIndex:100,pointerEvents:'none',whiteSpace:'nowrap',boxShadow:'0 8px 30px rgba(99,102,241,.55)' }}>
          📍 Campus Picker Active — Double-click to set new location
        </div>
      )}

      {/* ── Main layout ── */}
      <div style={{ flex:1,display:'grid',gridTemplateColumns:'1fr 355px',height:'calc(100vh - 60px)',overflow:'hidden' }}>

        {/* MAP */}
        <div style={{ position:'relative',overflow:'hidden' }}>
          <div ref={mapEl} style={{ width:'100%',height:'100%' }}/>

          {/* hint */}
          <div style={{ position:'absolute',bottom:36,left:16,zIndex:10,background:'rgba(0,0,0,.72)',backdropFilter:'blur(8px)',padding:'7px 15px',borderRadius:28,fontSize:11,color:T.muted,display:'flex',alignItems:'center',gap:8,pointerEvents:'none',border:`1px solid ${T.border}` }}>
            <span className="pulse" style={{ width:7,height:7,background:T.green,borderRadius:'50%',flexShrink:0 }}/>
            {campusPickerMode ? 'Double-click to set campus location' : selectedBus ? 'Double-click to add stop • Drag to reposition' : 'Select a bus first'}
          </div>

          {/* route badge */}
          {stops.length > 0 && (
            <div style={{ position:'absolute',top:14,left:'50%',transform:'translateX(-50%)',zIndex:10,background:'rgba(0,0,0,.75)',backdropFilter:'blur(8px)',padding:'7px 16px',borderRadius:30,fontSize:11,color:T.text,display:'flex',alignItems:'center',gap:8,pointerEvents:'none',border:`1px solid ${T.border}`,whiteSpace:'nowrap' }}>
              <Route size={12} color={T.blue}/>
              <span style={{ color:T.blue,fontWeight:700 }}>{stops.length}</span> stops
              <span style={{ width:1,height:11,background:T.faint }}/>
              <span style={{ color:T.green }}>{stops[0]?.name}</span>
              <span style={{ color:T.faint }}>→</span>
              <span style={{ color:T.red }}>{stops[stops.length-1]?.name}</span>
            </div>
          )}
        </div>

        {/* SIDEBAR */}
        <aside style={{ background:T.surface,borderLeft:`1px solid ${T.border}`,display:'flex',flexDirection:'column',overflow:'hidden' }}>

          {/* Controls */}
          <div style={{ padding:'16px 14px 12px',borderBottom:`1px solid ${T.border}`,display:'flex',flexDirection:'column',gap:12 }}>

            {/* Bus select */}
            <div>
              <label style={{ display:'block',fontSize:10,fontWeight:700,color:T.muted,marginBottom:5,letterSpacing:'.06em',textTransform:'uppercase' }}>Select Bus</label>
              <div style={{ position:'relative' }}>
                <Bus size={13} style={{ position:'absolute',left:11,top:'50%',transform:'translateY(-50%)',color:T.faint,pointerEvents:'none' }}/>
                <select value={selectedBus} onChange={e=>changeBus(e.target.value)} className="inp" style={{ paddingLeft:32 }}>
                  <option value="">— Pick a bus —</option>
                  {buses.map(b=><option key={b.id} value={b.id}>{b.bus_number} — {b.route_name||'No Route'}</option>)}
                </select>
              </div>
              {!buses.length && <p style={{ fontSize:11,color:T.red,marginTop:4 }}>No buses found. Add buses first.</p>}
            </div>

            {/* Direction */}
            <div>
              <label style={{ display:'block',fontSize:10,fontWeight:700,color:T.muted,marginBottom:5,letterSpacing:'.06em',textTransform:'uppercase' }}>Direction</label>
              <div style={{ display:'flex',gap:8 }}>
                {[['morning','Morning',<Sun size={12}/>,T.amber],['evening','Evening',<Moon size={12}/>,T.blue]].map(([v,lbl,ic,col])=>(
                  <button key={v} onClick={()=>changeDir(v)} style={{ flex:1,padding:'8px',borderRadius:9,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6,fontSize:12,fontWeight:500,background:direction===v?`rgba(${v==='morning'?'245,158,11':'91,141,239'},.14)`:'rgba(255,255,255,.03)',border:direction===v?`1px solid ${col}`:`1px solid ${T.border}`,color:direction===v?col:T.muted,transition:'all .15s',fontFamily:'inherit' }}>
                    {ic}{lbl}
                  </button>
                ))}
              </div>
            </div>

            {/* Active bus pill */}
            {selectedBus && (
              <div style={{ background:'rgba(91,141,239,.08)',border:'1px solid rgba(91,141,239,.25)',borderRadius:8,padding:'8px 12px',display:'flex',alignItems:'center',gap:7 }}>
                <Bus size={12} color={T.blue}/>
                <span style={{ fontSize:12,color:T.blue,fontWeight:600 }}>{getBusLabel()}</span>
              </div>
            )}
          </div>

          {/* Stops list */}
          <div style={{ flex:1,overflowY:'auto',padding:'14px 14px 10px' }}>
            <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12 }}>
              <div style={{ display:'flex',alignItems:'center',gap:7 }}>
                <MapPin size={14} color={T.blue}/>
                <span style={{ fontSize:13,fontWeight:700,color:T.text }}>Route Stops</span>
                <span style={{ background:'rgba(91,141,239,.15)',color:T.blue,borderRadius:20,padding:'1px 8px',fontSize:11,fontWeight:700 }}>{stops.length}</span>
              </div>
              {stops.length>0 && (
                <button onClick={fitStops} className="btn" style={{ padding:'3px 9px',fontSize:10 }}>
                  <Navigation size={10}/>Fit
                </button>
              )}
            </div>

            {stops.length === 0 ? (
              <div style={{ textAlign:'center',padding:'36px 16px',background:'rgba(255,255,255,.02)',borderRadius:13,border:`1px dashed ${T.faint}` }}>
                <MapPin size={32} color={T.faint} style={{ marginBottom:10 }}/>
                <p style={{ color:T.muted,fontSize:13,fontWeight:500 }}>No stops added yet</p>
                <p style={{ color:T.faint,fontSize:11,marginTop:4 }}>{selectedBus ? 'Double-click on the map to add stops' : 'Select a bus first'}</p>
              </div>
            ) : (
              <div style={{ display:'flex',flexDirection:'column',gap:6 }}>
                {stops.map((stop, i) => {
                  const c = stopCol(i, stops.length);
                  return (
                    <div key={i} className="stop-card" draggable onDragStart={()=>setDragIdx(i)} onDragOver={e=>e.preventDefault()} onDrop={()=>handleDrop(i)} style={{ animation:'fadeUp .2s ease' }}>
                      <div style={{ display:'flex',alignItems:'center',padding:'9px 11px',gap:9 }}>
                        {/* badge */}
                        <div style={{ width:30,height:30,flexShrink:0,background:`linear-gradient(135deg,${c.a},${c.b})`,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:800,color:'#fff',boxShadow:`0 0 0 2px ${c.a}33` }}>{i+1}</div>

                        {/* info */}
                        <div style={{ flex:1,minWidth:0 }}>
                          <div style={{ fontSize:12,fontWeight:700,color:T.text,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>{stop.name}</div>
                          <div style={{ fontSize:9,color:T.faint,fontFamily:'monospace',marginTop:1 }}>{Number(stop.lat).toFixed(5)}, {Number(stop.lng).toFixed(5)}</div>
                        </div>

                        {/* actions */}
                        <div style={{ display:'flex',gap:3,flexShrink:0 }}>
                          <button onClick={()=>moveStop(i,-1)} disabled={i===0} className="btn" style={{ padding:'3px 6px',fontSize:12,opacity:i===0?.28:1 }}>↑</button>
                          <button onClick={()=>moveStop(i, 1)} disabled={i===stops.length-1} className="btn" style={{ padding:'3px 6px',fontSize:12,opacity:i===stops.length-1?.28:1 }}>↓</button>
                          <button onClick={()=>{ setEditIdx(i);setTempName(stop.name);setTempLL({lat:stop.lat,lng:stop.lng});setShowModal(true); }} className="btn" style={{ padding:'3px 6px' }}><Edit2 size={11}/></button>
                          <button onClick={()=>removeStop(i)} className="btn btn-danger" style={{ padding:'3px 6px' }}><Trash2 size={11}/></button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer summary */}
          {stops.length > 0 && (
            <div style={{ padding:'12px 14px',borderTop:`1px solid ${T.border}`,background:'rgba(0,0,0,.18)' }}>
              <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6 }}>
                <span style={{ fontSize:11,color:T.muted }}>Total Stops</span>
                <span style={{ fontSize:18,fontWeight:800,color:T.blue }}>{stops.length}</span>
              </div>
              <div style={{ display:'flex',justifyContent:'space-between',marginBottom:4 }}>
                <span style={{ fontSize:10,color:T.faint }}>Start</span>
                <span style={{ fontSize:10,color:T.green,fontWeight:600,maxWidth:'65%',textAlign:'right',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{stops[0]?.name}</span>
              </div>
              <div style={{ display:'flex',justifyContent:'space-between',marginBottom:10 }}>
                <span style={{ fontSize:10,color:T.faint }}>End</span>
                <span style={{ fontSize:10,color:T.red,fontWeight:600,maxWidth:'65%',textAlign:'right',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{stops[stops.length-1]?.name}</span>
              </div>
              <div style={{ height:4,background:T.faint,borderRadius:4,overflow:'hidden' }}>
                <div style={{ width:'100%',height:'100%',background:`linear-gradient(90deg,${T.green},${T.blue},${T.red})`,borderRadius:4 }}/>
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* ── Add/Edit Modal ── */}
      {showModal && (
        <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.82)',backdropFilter:'blur(10px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000 }}>
          <div style={{ background:T.card,borderRadius:20,width:400,maxWidth:'92vw',padding:26,border:`1px solid ${T.border}`,boxShadow:'0 30px 60px rgba(0,0,0,.65)',animation:'fadeUp .2s ease' }}>
            <div style={{ display:'flex',alignItems:'center',gap:12,marginBottom:22 }}>
              <div style={{ width:44,height:44,flexShrink:0,background:`linear-gradient(135deg,${T.blue},${T.cyan})`,borderRadius:13,display:'flex',alignItems:'center',justifyContent:'center' }}>
                <MapPin size={21} color="#fff"/>
              </div>
              <div>
                <h3 style={{ fontSize:16,fontWeight:700,color:T.text }}>{editIdx!==null ? 'Edit Stop' : `Add Stop #${stops.length+1}`}</h3>
                <p style={{ fontSize:11,color:T.muted,marginTop:2 }}>{editIdx!==null ? 'Update details below' : 'Name this map location'}</p>
              </div>
            </div>

            <label style={{ display:'block',fontSize:10,fontWeight:700,color:T.muted,marginBottom:5,textTransform:'uppercase',letterSpacing:'.06em' }}>Stop Name</label>
            <input type="text" value={tempName} onChange={e=>setTempName(e.target.value)} placeholder="e.g., SGI College Main Gate" autoFocus className="inp" onKeyDown={e=>e.key==='Enter'&&commitStop()} style={{ marginBottom:14 }}/>

            <label style={{ display:'block',fontSize:10,fontWeight:700,color:T.muted,marginBottom:5,textTransform:'uppercase',letterSpacing:'.06em' }}>Coordinates</label>
            <div style={{ background:T.bg,border:`1px solid ${T.border}`,borderRadius:9,padding:'9px 13px',marginBottom:20,display:'flex',alignItems:'center',gap:7 }}>
              <MapPin size={11} color={T.faint}/>
              <code style={{ fontSize:11,color:T.muted,fontFamily:'monospace' }}>{tempLL?.lat}, {tempLL?.lng}</code>
            </div>

            <div style={{ display:'flex',gap:9 }}>
              <button onClick={()=>{setShowModal(false);setTempName('');setTempLL(null);setEditIdx(null);}} className="btn" style={{ flex:1,justifyContent:'center',padding:'10px' }}><X size={13}/>Cancel</button>
              <button onClick={commitStop} className="btn btn-primary" style={{ flex:2,justifyContent:'center',padding:'10px' }}><Save size={13}/>{editIdx!==null?'Update Stop':`Add Stop #${stops.length+1}`}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default withAuth(BusRouteMapper);