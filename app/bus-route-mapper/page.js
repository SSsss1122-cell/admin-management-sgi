'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Save, X, MapPin, Bus, Trash2, ChevronLeft,
  RefreshCw, Layers, Map as MapIcon, Eye, Route,
  Sun, Moon, Navigation, AlertCircle, CheckCircle,
  Info, Edit2, Users, User, Phone, Mail, GraduationCap
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getAdminInstitution } from '../lib/getInstitution';
import withAuth from '../../components/withAuth';
import 'leaflet/dist/leaflet.css';

/* ── Professional Design Tokens (Slate/Blue Theme) ── */
const T = {
  bg:      '#0f172a',
  surface: '#1e293b',
  card:    '#1e293b',
  border:  'rgba(71,85,105,0.5)',
  text:    '#f1f5f9',
  muted:   '#94a3b8',
  faint:   '#475569',
  blue:    '#3b82f6',
  cyan:    '#06b6d4',
  green:   '#10b981',
  red:     '#ef4444',
  amber:   '#f59e0b',
  purple:  '#8b5cf6',
};

/* ── Tile layers ── */
const TILES = {
  streets: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: '',
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ',
    subdomains: '',
  },
};

/* ── Stop colour by position ── */
const stopCol = (i, total) => {
  if (i === 0)           return { a: '#10b981', b: '#34d399' };
  if (i === total - 1)   return { a: '#ef4444', b: '#f87171' };
  return                        { a: '#3b82f6', b: '#60a5fa' };
};

/* ═══════════════════════════════════════════ */
function BusRouteMapper() {

  /* ── State ── */
  const [buses,             setBuses]             = useState([]);
  const [selectedBus,       setSelectedBus]       = useState('');
  const [direction,         setDirection]         = useState('morning');
  const [stops,             setStops]             = useState([]);
  const [stopStudents,      setStopStudents]      = useState({});
  const [loading,           setLoading]           = useState(false);
  const [saving,            setSaving]            = useState(false);
  const [toast,             setToast]             = useState({ type: '', text: '' });
  const [showModal,         setShowModal]         = useState(false);
  const [showStudentsModal, setShowStudentsModal] = useState(false);
  const [selectedStop,      setSelectedStop]      = useState(null);
  const [studentsAtStop,    setStudentsAtStop]    = useState([]);
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
  const sidebarRef   = useRef(null);

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

  /* ─────────────────── FETCH STUDENTS FOR STOP ─────────────────── */
 /* ─────────────────── FETCH STUDENTS FOR STOP ─────────────────── */
const fetchStudentsForStop = async (stopId) => {
  try {
    console.log('Fetching students for stop ID:', stopId);
    console.log('Institution ID:', instId);
    
    if (!stopId) {
      console.log('No stop ID provided');
      return [];
    }

    if (!instId) {
      console.log('No institution ID available');
      return [];
    }

    // First, check if students_stops table exists and has data
    const { data: tableCheck, error: tableError } = await supabase
      .from('students_stops')
      .select('count', { count: 'exact', head: true });

    if (tableError) {
      console.error('Error checking students_stops table:', tableError);
      return [];
    }

    // Get the student IDs from students_stops
    const { data: stopAssignments, error: assignmentError } = await supabase
      .from('students_stops')
      .select('student_id')
      .eq('stop_id', stopId);

    if (assignmentError) {
      console.error('Error fetching stop assignments:', assignmentError);
      console.error('Error details:', JSON.stringify(assignmentError, null, 2));
      return [];
    }

    console.log('Stop assignments found:', stopAssignments?.length || 0);

    if (!stopAssignments || stopAssignments.length === 0) {
      console.log('No assignments found for this stop');
      return [];
    }

    // Get the student IDs
    const studentIds = stopAssignments.map(item => item.student_id).filter(id => id);
    
    if (studentIds.length === 0) {
      console.log('No valid student IDs found');
      return [];
    }

    console.log('Student IDs to fetch:', studentIds);

    // Now fetch the student details
    const { data: studentsData, error: studentsError } = await supabase
      .from('students')
      .select('id, full_name, usn, branch, phone, email, semester')
      .in('id', studentIds);

    if (studentsError) {
      console.error('Error fetching student details:', studentsError);
      return [];
    }

    console.log('Students fetched:', studentsData?.length || 0);
    return studentsData || [];
  } catch (error) {
    console.error('Error fetching students for stop:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    return [];
  }
};

/* ─────────────────── FETCH ALL STUDENTS FOR ALL STOPS ─────────────────── */
const fetchAllStopStudents = async (stopsList) => {
  console.log('Fetching all stop students for stops:', stopsList.length);
  
  if (!stopsList.length) {
    console.log('No stops to fetch students for');
    return;
  }

  const stopIds = stopsList.map(s => s.id).filter(id => id);
  console.log('Valid stop IDs:', stopIds);
  
  if (!stopIds.length) {
    console.log('No valid stop IDs (stops might not be saved yet)');
    setStopStudents({});
    return;
  }

  try {
    // Get all assignments for these stops
    const { data: assignments, error: assignmentError } = await supabase
      .from('students_stops')
      .select('stop_id, student_id')
      .in('stop_id', stopIds);

    if (assignmentError) {
      console.error('Error fetching assignments:', assignmentError);
      setStopStudents({});
      return;
    }

    console.log('Assignments found:', assignments?.length || 0);

    if (!assignments || assignments.length === 0) {
      console.log('No assignments found for these stops');
      setStopStudents({});
      return;
    }

    // Get unique student IDs
    const studentIds = [...new Set(assignments.map(a => a.student_id).filter(id => id))];
    console.log('Unique student IDs:', studentIds.length);

    if (studentIds.length === 0) {
      console.log('No valid student IDs in assignments');
      setStopStudents({});
      return;
    }

    // Fetch all student details
    const { data: studentsData, error: studentsError } = await supabase
      .from('students')
      .select('id, full_name, usn, branch, phone, email, semester')
      .in('id', studentIds);

    if (studentsError) {
      console.error('Error fetching students:', studentsError);
      setStopStudents({});
      return;
    }

    console.log('Students fetched:', studentsData?.length || 0);

    // Create a map of student details by ID
    const studentsMap = {};
    studentsData.forEach(student => {
      studentsMap[student.id] = student;
    });

    // Group students by stop_id
    const studentsByStop = {};
    assignments.forEach(assignment => {
      if (!studentsByStop[assignment.stop_id]) {
        studentsByStop[assignment.stop_id] = [];
      }
      if (studentsMap[assignment.student_id]) {
        studentsByStop[assignment.stop_id].push(studentsMap[assignment.student_id]);
      }
    });

    console.log('Students by stop:', Object.keys(studentsByStop).length);
    setStopStudents(studentsByStop);
  } catch (error) {
    console.error('Error fetching stop students:', error);
    setStopStudents({});
  }
};

  /* ─────────────────── MAP INIT ─────────────────── */
  useEffect(() => {
    if (mapReady || mapRef.current || !mapEl.current || !instId) return;
    let cancelled = false;

    const initMap = async () => {
      try {
        await new Promise(r => setTimeout(r, 100));
        if (cancelled || !mapEl.current || mapRef.current) return;

        const L = await import('leaflet');
        window.L = L;

        delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        });

        const map = L.map(mapEl.current, {
          center: [instLocRef.current.lat, instLocRef.current.lng],
          zoom: 15,
          zoomControl: true,
          doubleClickZoom: true,
          scrollWheelZoom: true,
          dragging: true,
          touchZoom: true,
        });

        const t = TILES[mapStyle];
        tileRef.current = L.tileLayer(t.url, {
          attribution: t.attribution,
          maxZoom: 19,
          subdomains: t.subdomains || 'abc',
        }).addTo(map);

        campusRef.current = makeCampusMarker(L, map,
          instLocRef.current.lat, instLocRef.current.lng, instNameRef.current);

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
  }, [instId]);

  function makeCampusMarker(L, map, lat, lng, name) {
    const icon = L.divIcon({
      html: `<div style="
        width:40px;height:40px;
        background:linear-gradient(135deg,#3b82f6,#06b6d4);
        border-radius:50%;border:3px solid rgba(255,255,255,.9);
        display:flex;align-items:center;justify-content:center;
        box-shadow:0 0 0 4px rgba(59,130,246,.25),0 4px 14px rgba(0,0,0,.5);">
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
        <div style="font-weight:700;font-size:13px;color:#f1f5f9;margin-bottom:3px;">🏛️ ${name}</div>
        <div style="font-size:11px;color:#94a3b8;">Main Campus</div>
        <div style="font-size:10px;color:#475569;margin-top:4px;">${lat.toFixed(5)}, ${lng.toFixed(5)}</div>
        <button onclick="window.__centerCampus()" style="margin-top:9px;width:100%;padding:6px;background:#3b82f6;color:#fff;border:none;border-radius:7px;cursor:pointer;font-size:12px;font-weight:600;">📍 Center map</button>
      </div>
    `);
    return m;
  }

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

  useEffect(() => {
    window.__centerCampus = () => {
      if (mapRef.current) {
        mapRef.current.setView([instLocRef.current.lat, instLocRef.current.lng], 15);
      }
    };
    return () => { delete window.__centerCampus; };
  }, []);

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

 const showStopStudents = async (stop, stopIndex) => {
  console.log('Showing students for stop:', stop);
  setSelectedStop({ ...stop, index: stopIndex });
  
  try {
    const students = await fetchStudentsForStop(stop.id);
    console.log('Students found:', students.length);
    setStudentsAtStop(students);
    setShowStudentsModal(true);
  } catch (error) {
    console.error('Error in showStopStudents:', error);
    setStudentsAtStop([]);
    setShowStudentsModal(true);
  }
};

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
      const studentCount = stopStudents[stop.id]?.length || 0;
      
      const icon = L.divIcon({
        html: `<div style="
          width:${studentCount > 0 ? '42px' : '36px'};
          height:${studentCount > 0 ? '42px' : '36px'};
          background:linear-gradient(135deg,${c.a},${c.b});
          border-radius:50%;border:2.5px solid rgba(255,255,255,.88);
          display:flex;align-items:center;justify-content:center;
          font-weight:700;font-size:${studentCount > 0 ? '11px' : '13px'};
          color:#fff;
          box-shadow:0 0 0 3px ${c.a}44,0 3px 10px rgba(0,0,0,.45);
          position:relative;
        ">
          ${studentCount > 0 ? `<span style="position:absolute;top:-5px;right:-5px;background:#ef4444;color:white;border-radius:50%;width:18px;height:18px;font-size:9px;display:flex;align-items:center;justify-content:center;border:1.5px solid white;">${studentCount}</span>` : ''}
          ${i + 1}
        </div>`,
        className: '',
        iconSize: [studentCount > 0 ? 42 : 36, studentCount > 0 ? 42 : 36],
        iconAnchor: [studentCount > 0 ? 21 : 18, studentCount > 0 ? 42 : 36],
        popupAnchor: [0, studentCount > 0 ? -26 : -22],
      });

      const mk = L.marker([stop.lat, stop.lng], { icon, draggable: true }).addTo(mapRef.current);
      
      const studentInfo = studentCount > 0 
        ? `<div style="margin-top:8px;padding-top:6px;border-top:1px solid #334155;">
            <div style="display:flex;align-items:center;gap:4px;margin-bottom:4px;">
              <Users size={11} color="#3b82f6"/>
              <span style="font-weight:600;color:#3b82f6;">${studentCount} Student${studentCount > 1 ? 's' : ''} Assigned</span>
            </div>
            <button onclick="window.__viewStudents(${i})" 
              style="width:100%;padding:6px;background:#3b82f6;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:11px;font-weight:600;margin-top:4px;">
              👥 View Students
            </button>
          </div>`
        : `<div style="margin-top:8px;padding-top:6px;border-top:1px solid #334155;">
            <div style="display:flex;align-items:center;gap:4px;">
              <Users size={11} color="#64748b"/>
              <span style="color:#64748b;font-size:11px;">No students assigned</span>
            </div>
          </div>`;

      mk.bindPopup(`
        <div style="padding:12px 14px;min-width:220px;font-family:system-ui;">
          <div style="font-weight:700;font-size:14px;color:#f1f5f9;margin-bottom:4px;">🚏 Stop ${i + 1}: ${stop.name}</div>
          <div style="font-size:10px;color:#94a3b8;font-family:monospace;margin-bottom:8px;">${Number(stop.lat).toFixed(6)}, ${Number(stop.lng).toFixed(6)}</div>
          ${studentInfo}
          <div style="display:flex;gap:7px;margin-top:10px;">
            <button onclick="window.__editStop(${i})"
              style="flex:1;padding:6px;background:#3b82f6;color:#fff;border:none;border-radius:7px;cursor:pointer;font-size:12px;font-weight:600;">✏️ Edit</button>
            <button onclick="window.__delStop(${i})"
              style="flex:1;padding:6px;background:#ef4444;color:#fff;border:none;border-radius:7px;cursor:pointer;font-size:12px;font-weight:600;">🗑️ Delete</button>
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
  }, [stopStudents]);

  useEffect(() => {
    if (!mapReady || !leafletLoaded) return;
    renderMap(stops);
    if (stops.length > 0 && mapRef.current) {
      const bounds = stops.map(s => [s.lat, s.lng]);
      mapRef.current.fitBounds(bounds, { padding: [60, 60] });
    }
  }, [stops, mapReady, leafletLoaded, renderMap, stopStudents]);

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
    window.__viewStudents = async (i) => {
      const s = stopsRef.current[i];
      if (s && s.id) {
        const students = await fetchStudentsForStop(s.id);
        setStudentsAtStop(students);
        setSelectedStop({ ...s, index: i });
        setShowStudentsModal(true);
      }
    };
    return () => { 
      delete window.__editStop; 
      delete window.__delStop;
      delete window.__viewStudents;
    };
  }, []);

  useEffect(() => {
    if (!mapEl.current) return;
    mapEl.current.style.cursor = campusPickerMode ? 'crosshair' : '';
  }, [campusPickerMode]);

  const commitStop = async () => {
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
      const existingStop = stops[editIdx];
      if (existingStop.id) {
        const { error } = await supabase
          .from('bus_stops')
          .update({
            stop_name: stop.name,
            latitude: stop.lat,
            longitude: stop.lng
          })
          .eq('id', existingStop.id);
        
        if (error) {
          msg('error', 'Failed to update stop: ' + error.message);
          return;
        }
        stop.id = existingStop.id;
      }
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
      const stopsData = data.map(s => ({ 
        id: s.id, 
        name: s.stop_name, 
        lat: s.latitude, 
        lng: s.longitude, 
        sequence: s.sequence, 
        landmark: s.landmark, 
        estimated_time: s.estimated_time, 
        is_major: s.is_major 
      }));
      setStops(stopsData);
      await fetchAllStopStudents(stopsData);
      msg('success', `Loaded ${data.length} stops`);
    } else {
      setStops([]);
      msg('info', 'No stops found for this bus/direction', 4000);
    }
  };

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
      
      const refreshedStops = stops.map((s, i) => ({ ...s, id: null }));
      await fetchAllStopStudents(refreshedStops);
      
      msg('success', `Route saved — ${stops.length} stops`);
      setTimeout(() => router.push('/bus-stops'), 1800);
    } catch (e) {
      msg('error', 'Save failed: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const changeBus = (id) => {
    if (stopsRef.current.length && !confirm('Changing bus clears unsaved stops. Continue?')) return;
    setSelectedBus(id);
    setStops([]);
    setStopStudents({});
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
    setStopStudents({});
  };

  const clearAll = () => {
    if (!confirm('Clear all stops?')) return;
    setStops([]);
    setStopStudents({});
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

  const handleSidebarScroll = (e) => {
    e.stopPropagation();
  };

  if (!instId) return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
      <div style={{ width: 42, height: 42, border: `3px solid ${T.faint}`, borderTopColor: T.blue, borderRadius: '50%', animation: 'sp .8s linear infinite' }} />
      <p style={{ color: T.muted, fontSize: 14 }}>Loading institution data...</p>
      <style>{`@keyframes sp{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const toastBg = { success: '#059669', error: '#e11d48', info: '#2563eb' }[toast.type] || '#2563eb';
  const ToastIcon = () => toast.type === 'success' ? <CheckCircle size={14}/> : toast.type === 'error' ? <AlertCircle size={14}/> : <Info size={14}/>;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: T.bg, color: T.text }}>

      <style>{`
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:6px}::-webkit-scrollbar-track{background:${T.surface}}::-webkit-scrollbar-thumb{background:${T.blue};border-radius:4px}
        .btn{display:inline-flex;align-items:center;gap:5px;padding:7px 13px;border-radius:8px;border:1px solid ${T.border};background:rgba(255,255,255,.04);color:${T.muted};font-size:12px;font-weight:500;cursor:pointer;transition:all .15s;white-space:nowrap}
        .btn:hover:not(:disabled){background:rgba(255,255,255,.09);border-color:rgba(255,255,255,.15);color:${T.text}}
        .btn:active:not(:disabled){transform:scale(.97)}
        .btn:disabled{opacity:.38;cursor:not-allowed}
        .btn-primary{background:linear-gradient(135deg,${T.blue},${T.cyan}) !important;border:none !important;color:#fff !important;font-weight:600 !important}
        .btn-primary:hover:not(:disabled){opacity:.88 !important;box-shadow:0 6px 18px rgba(59,130,246,.4) !important}
        .btn-danger{background:rgba(239,68,68,.08) !important;border-color:rgba(239,68,68,.3) !important;color:${T.red} !important}
        .btn-danger:hover:not(:disabled){background:rgba(239,68,68,.16) !important;border-color:${T.red} !important}
        .inp{width:100%;padding:10px 14px;background:${T.bg};border:1px solid ${T.border};border-radius:10px;font-size:13px;color:${T.text};outline:none;transition:border-color .2s,box-shadow .2s}
        .inp:focus{border-color:${T.blue};box-shadow:0 0 0 3px rgba(59,130,246,.15)}
        .inp::placeholder{color:${T.faint}}
        option{background:#1e293b}
        .stop-card{background:${T.card};border:1px solid ${T.border};border-radius:12px;transition:all .15s;cursor:grab}
        .stop-card:hover{border-color:rgba(255,255,255,.14);background:#2d3a4e}
        .stop-card:active{cursor:grabbing}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes toastIn{from{opacity:0;transform:translateX(14px)}to{opacity:1;transform:translateX(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}
        .pulse{animation:pulse 1.5s ease infinite}
        .leaflet-container{background:#111120 !important;cursor:grab}
        .leaflet-container:active{cursor:grabbing}
        .leaflet-control-zoom{border:none !important}
        .leaflet-control-zoom a{background:rgba(30,41,59,.95) !important;color:${T.muted} !important;border:1px solid ${T.border} !important;border-radius:8px !important;margin:3px !important;width:34px !important;height:34px !important;line-height:34px !important}
        .leaflet-control-zoom a:hover{background:${T.blue} !important;color:#fff !important;border-color:${T.blue} !important}
        .leaflet-control-attribution{background:rgba(0,0,0,.55) !important;color:${T.faint} !important;font-size:9px !important}
        .leaflet-control-attribution a{color:${T.blue} !important}
        .leaflet-popup-content-wrapper{background:${T.card} !important;border:1px solid ${T.border} !important;border-radius:12px !important;color:${T.text} !important;box-shadow:0 16px 40px rgba(0,0,0,.6) !important;padding:0 !important}
        .leaflet-popup-tip-container{display:none}
        .sidebar-scroll{overflow-y:auto;scrollbar-width:thin;flex:1}
        .sidebar-scroll::-webkit-scrollbar{width:5px}
        .sidebar-scroll::-webkit-scrollbar-track{background:${T.surface}}
        .sidebar-scroll::-webkit-scrollbar-thumb{background:${T.blue};border-radius:5px}
        .stop-name{word-break:break-word;white-space:normal;line-height:1.3}
        .stop-number{flex-shrink:0}
        .student-card-modal{background:${T.card};border:1px solid ${T.border};border-radius:12px;padding:12px;transition:all .15s}
        .student-card-modal:hover{background:#2d3a4e;border-color:${T.blue}}
      `}</style>

      <header style={{ position:'sticky',top:0,zIndex:50,background:'rgba(15,23,42,.97)',backdropFilter:'blur(16px)',borderBottom:`1px solid ${T.border}`,padding:'0 18px',height:60,display:'flex',alignItems:'center',justifyContent:'space-between',gap:10 }}>
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
          <div style={{ display:'flex',background:T.surface,border:`1px solid ${T.border}`,borderRadius:9,padding:3,gap:2 }}>
            {[['streets','Streets',<MapIcon size={11}/>],['satellite','Satellite',<Layers size={11}/>]].map(([k,label,icon])=>(
              <button key={k} onClick={()=>switchStyle(k)} style={{ padding:'5px 11px',borderRadius:7,border:'none',cursor:'pointer',background:mapStyle===k?T.blue:'transparent',color:mapStyle===k?'#fff':T.muted,fontSize:11,fontWeight:500,display:'flex',alignItems:'center',gap:4,transition:'all .15s' }}>
                {icon}{label}
              </button>
            ))}
          </div>

          <button
            onClick={() => { if (campusPickerMode) { setCampusPickerMode(false); msg('info','Campus picker cancelled',2000); } else { centerCampus(); } }}
            onDoubleClick={() => { setCampusPickerMode(true); msg('info','Campus picker active — double-click map',5000); }}
            className={`btn ${campusPickerMode ? 'btn' : ''}`}
            style={campusPickerMode ? { background: T.purple + '20', borderColor: T.purple, color: T.purple } : {}}
            title="Click: center campus | Double-click: change campus location"
          >
            <MapPin size={13}/>
            {campusPickerMode ? 'Cancel Picker' : 'Campus'}
          </button>

          <button onClick={loadStops} disabled={!selectedBus || loading} className="btn" style={{ color:T.blue,borderColor:'rgba(59,130,246,.3)',background:'rgba(59,130,246,.07)' }}>
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

      {toast.text && (
        <div style={{ position:'fixed',top:68,right:18,zIndex:999,padding:'10px 16px',background:toastBg,color:'#fff',borderRadius:10,fontSize:12,fontWeight:500,display:'flex',alignItems:'center',gap:7,boxShadow:'0 8px 24px rgba(0,0,0,.4)',animation:'toastIn .2s ease',maxWidth:320 }}>
          <ToastIcon/>{toast.text}
        </div>
      )}

      {campusPickerMode && (
        <div className="pulse" style={{ position:'fixed',top:'50%',left:'50%',transform:'translate(-50%,-50%)',background:'linear-gradient(135deg,#3b82f6,#06b6d4)',padding:'13px 28px',borderRadius:50,color:'#fff',fontWeight:700,fontSize:14,zIndex:100,pointerEvents:'none',whiteSpace:'nowrap',boxShadow:'0 8px 30px rgba(59,130,246,.55)' }}>
          📍 Campus Picker Active — Double-click to set new location
        </div>
      )}

      <div style={{ flex:1,display:'grid',gridTemplateColumns:'1fr 380px',height:'calc(100vh - 60px)',overflow:'hidden' }}>

        {/* MAP */}
        <div style={{ position:'relative',overflow:'hidden' }}>
          <div ref={mapEl} style={{ width:'100%',height:'100%' }}/>

          <div style={{ position:'absolute',bottom:36,left:16,zIndex:10,background:'rgba(0,0,0,.72)',backdropFilter:'blur(8px)',padding:'7px 15px',borderRadius:28,fontSize:11,color:T.muted,display:'flex',alignItems:'center',gap:8,pointerEvents:'none',border:`1px solid ${T.border}` }}>
            <span className="pulse" style={{ width:7,height:7,background:T.green,borderRadius:'50%',flexShrink:0 }}/>
            {campusPickerMode ? 'Double-click to set campus location' : selectedBus ? 'Double-click to add stop • Drag marker to reposition • Scroll to zoom' : 'Select a bus first'}
          </div>

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

        {/* SIDEBAR with scrollable stops list */}
        <aside style={{ background:T.surface,borderLeft:`1px solid ${T.border}`,display:'flex',flexDirection:'column',overflow:'hidden' }}>

          <div style={{ padding:'16px 14px 12px',borderBottom:`1px solid ${T.border}`,display:'flex',flexDirection:'column',gap:12 }}>
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

            <div>
              <label style={{ display:'block',fontSize:10,fontWeight:700,color:T.muted,marginBottom:5,letterSpacing:'.06em',textTransform:'uppercase' }}>Direction</label>
              <div style={{ display:'flex',gap:8 }}>
                {[['morning','Morning',<Sun size={12}/>,T.amber],['evening','Evening',<Moon size={12}/>,T.blue]].map(([v,lbl,ic,col])=>(
                  <button key={v} onClick={()=>changeDir(v)} style={{ flex:1,padding:'8px',borderRadius:9,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6,fontSize:12,fontWeight:500,background:direction===v?`rgba(59,130,246,.14)`:'rgba(255,255,255,.03)',border:direction===v?`1px solid ${col}`:`1px solid ${T.border}`,color:direction===v?col:T.muted,transition:'all .15s' }}>
                    {ic}{lbl}
                  </button>
                ))}
              </div>
            </div>

            {selectedBus && (
              <div style={{ background:'rgba(59,130,246,.08)',border:'1px solid rgba(59,130,246,.25)',borderRadius:8,padding:'8px 12px',display:'flex',alignItems:'center',gap:7 }}>
                <Bus size={12} color={T.blue}/>
                <span style={{ fontSize:12,color:T.blue,fontWeight:600 }}>{getBusLabel()}</span>
              </div>
            )}
          </div>

          {/* Scrollable Stops List */}
          <div 
            className="sidebar-scroll" 
            ref={sidebarRef}
            onWheel={handleSidebarScroll}
            onScroll={handleSidebarScroll}
            style={{ 
              flex: 1, 
              overflowY: 'auto', 
              padding: '14px',
              overscrollBehavior: 'contain'
            }}
          >
            <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12 }}>
              <div style={{ display:'flex',alignItems:'center',gap:7 }}>
                <MapPin size={14} color={T.blue}/>
                <span style={{ fontSize:13,fontWeight:700,color:T.text }}>Route Stops</span>
                <span style={{ background:'rgba(59,130,246,.15)',color:T.blue,borderRadius:20,padding:'1px 8px',fontSize:11,fontWeight:700 }}>{stops.length}</span>
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
              <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
                {stops.map((stop, i) => {
                  const c = stopCol(i, stops.length);
                  const studentCount = stopStudents[stop.id]?.length || 0;
                  return (
                    <div 
                      key={i} 
                      className="stop-card" 
                      draggable 
                      onDragStart={()=>setDragIdx(i)} 
                      onDragOver={e=>e.preventDefault()} 
                      onDrop={()=>handleDrop(i)} 
                      style={{ animation:'fadeUp .2s ease' }}
                    >
                      <div style={{ display:'flex',alignItems:'center',padding:'10px 12px',gap:10 }}>
                        <div className="stop-number" style={{ width:32,height:32,flexShrink:0,background:`linear-gradient(135deg,${c.a},${c.b})`,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:800,color:'#fff',boxShadow:`0 0 0 2px ${c.a}33` }}>
                          {i+1}
                        </div>

                        <div style={{ flex:1,minWidth:0 }}>
                          <div className="stop-name" style={{ fontSize:13,fontWeight:600,color:T.text,wordBreak:'break-word' }}>
                            {stop.name}
                          </div>
                          <div style={{ display:'flex',alignItems:'center',gap:6,marginTop:4 }}>
                            <Users size={10} color={studentCount > 0 ? T.blue : T.faint}/>
                            <span style={{ fontSize:10,color:studentCount > 0 ? T.blue : T.faint }}>
                              {studentCount} student{studentCount !== 1 ? 's' : ''} assigned
                            </span>
                          </div>
                        </div>

                        <div style={{ display:'flex',gap:4,flexShrink:0 }}>
                          <button 
                            onClick={() => showStopStudents(stop, i)} 
                            className="btn" 
                            style={{ padding:'5px 8px' }}
                            title="View assigned students"
                          >
                            <Users size={12}/>
                          </button>
                          <button onClick={()=>moveStop(i,-1)} disabled={i===0} className="btn" style={{ padding:'5px 8px',fontSize:11 }}>↑</button>
                          <button onClick={()=>moveStop(i, 1)} disabled={i===stops.length-1} className="btn" style={{ padding:'5px 8px',fontSize:11 }}>↓</button>
                          <button onClick={()=>{ setEditIdx(i);setTempName(stop.name);setTempLL({lat:stop.lat,lng:stop.lng});setShowModal(true); }} className="btn" style={{ padding:'5px 8px' }}><Edit2 size={12}/></button>
                          <button onClick={()=>removeStop(i)} className="btn btn-danger" style={{ padding:'5px 8px' }}><Trash2 size={12}/></button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {stops.length > 0 && (
            <div style={{ padding:'12px 14px',borderTop:`1px solid ${T.border}`,background:'rgba(0,0,0,.18)' }}>
              <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6 }}>
                <span style={{ fontSize:11,color:T.muted }}>Total Stops</span>
                <span style={{ fontSize:18,fontWeight:800,color:T.blue }}>{stops.length}</span>
              </div>
              <div style={{ display:'flex',justifyContent:'space-between',marginBottom:4 }}>
                <span style={{ fontSize:10,color:T.faint }}>Start</span>
                <span style={{ fontSize:10,color:T.green,fontWeight:600,textAlign:'right',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{stops[0]?.name}</span>
              </div>
              <div style={{ display:'flex',justifyContent:'space-between',marginBottom:10 }}>
                <span style={{ fontSize:10,color:T.faint }}>End</span>
                <span style={{ fontSize:10,color:T.red,fontWeight:600,textAlign:'right',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{stops[stops.length-1]?.name}</span>
              </div>
              <div style={{ height:4,background:T.faint,borderRadius:4,overflow:'hidden' }}>
                <div style={{ width:'100%',height:'100%',background:`linear-gradient(90deg,${T.green},${T.blue},${T.red})`,borderRadius:4 }}/>
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* Add/Edit Stop Modal */}
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

      {/* Students at Stop Modal */}
      {showStudentsModal && selectedStop && (
        <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.82)',backdropFilter:'blur(10px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000 }}>
          <div style={{ background:T.card,borderRadius:20,width:500,maxWidth:'92vw',maxHeight:'80vh',overflowY:'auto',border:`1px solid ${T.border}`,boxShadow:'0 30px 60px rgba(0,0,0,.65)',animation:'fadeUp .2s ease' }}>
            <div style={{ position:'sticky',top:0,background:T.card,borderBottom:`1px solid ${T.border}`,padding:'20px 24px',display:'flex',justifyContent:'space-between',alignItems:'center' }}>
              <div style={{ display:'flex',alignItems:'center',gap:12 }}>
                <div style={{ width:40,height:40,flexShrink:0,background:`linear-gradient(135deg,${T.blue},${T.cyan})`,borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center' }}>
                  <Users size={20} color="#fff"/>
                </div>
                <div>
                  <h3 style={{ fontSize:18,fontWeight:700,color:T.text }}>Students at Stop #{selectedStop.index + 1}</h3>
                  <p style={{ fontSize:13,color:T.muted,marginTop:2 }}>{selectedStop.name}</p>
                </div>
              </div>
              <button onClick={() => setShowStudentsModal(false)} className="btn" style={{ padding:'8px' }}>
                <X size={18}/>
              </button>
            </div>

            <div style={{ padding:'20px 24px' }}>
              {studentsAtStop.length === 0 ? (
                <div style={{ textAlign:'center',padding:'40px 20px' }}>
                  <Users size={48} color={T.faint} style={{ marginBottom:12,opacity:0.5 }}/>
                  <p style={{ color:T.muted,fontSize:14 }}>No students assigned to this stop yet</p>
                </div>
              ) : (
                <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
                  {studentsAtStop.map((student, idx) => (
                    <div key={student.id} className="student-card-modal">
                      <div style={{ display:'flex',gap:12 }}>
                        <div style={{ width:44,height:44,flexShrink:0,background:`linear-gradient(135deg,${T.blue},${T.cyan})`,borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center' }}>
                          <GraduationCap size={20} color="#fff"/>
                        </div>
                        <div style={{ flex:1 }}>
                          <h4 style={{ fontSize:15,fontWeight:700,color:T.text,marginBottom:2 }}>{student.full_name}</h4>
                          <p style={{ fontSize:12,color:T.muted,marginBottom:4 }}>USN: {student.usn}</p>
                          <div style={{ display:'flex',flexWrap:'wrap',gap:12,marginTop:8 }}>
                            {student.branch && (
                              <div style={{ display:'flex',alignItems:'center',gap:4 }}>
                                <GraduationCap size={11} color={T.blue}/>
                                <span style={{ fontSize:11,color:T.muted }}>{student.branch}</span>
                              </div>
                            )}
                            {student.semester && (
                              <div style={{ display:'flex',alignItems:'center',gap:4 }}>
                                <span style={{ fontSize:11,color:T.muted }}>Semester: {student.semester}</span>
                              </div>
                            )}
                            {student.phone && (
                              <div style={{ display:'flex',alignItems:'center',gap:4 }}>
                                <Phone size={11} color={T.blue}/>
                                <span style={{ fontSize:11,color:T.muted }}>{student.phone}</span>
                              </div>
                            )}
                            {student.email && (
                              <div style={{ display:'flex',alignItems:'center',gap:4 }}>
                                <Mail size={11} color={T.blue}/>
                                <span style={{ fontSize:11,color:T.muted }}>{student.email}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default withAuth(BusRouteMapper);