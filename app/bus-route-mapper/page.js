'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Save, X, MapPin, Bus, Plus, Trash2, Edit2, 
  ArrowLeft, CheckCircle, AlertCircle, ChevronLeft,
  GripVertical, Navigation, Sun, Moon, RefreshCw,
  Layers, Map as MapIcon, List, Download, Upload, Maximize2, Minimize2,
  Eye, Route
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

function BusRouteMapper() {
  const [buses, setBuses] = useState([]);
  const [selectedBus, setSelectedBus] = useState('');
  const [selectedBusNumber, setSelectedBusNumber] = useState('');
  const [direction, setDirection] = useState('morning');
  const [stops, setStops] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [map, setMap] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [showNameInput, setShowNameInput] = useState(false);
  const [tempName, setTempName] = useState('');
  const [tempLatLng, setTempLatLng] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [existingStops, setExistingStops] = useState([]);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [showExistingStops, setShowExistingStops] = useState(false);
  const [availableStops, setAvailableStops] = useState([]);
  const [mapStyle, setMapStyle] = useState('streets'); // streets, satellite
  
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const router = useRouter();

  // Tile layer URLs for different map styles (Google Maps like)
  const tileLayers = {
    streets: {
      url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      name: 'Street Map'
    },
    satellite: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: '&copy; <a href="https://www.esri.com">Esri</a> | &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      subdomains: '',
      name: 'Satellite'
    }
  };

  // Fetch buses
  useEffect(() => {
    fetchBuses();
  }, []);

  const fetchBuses = async () => {
    const { data, error } = await supabase
      .from('buses')
      .select('id, bus_number, route_name')
      .eq('is_active', true)
      .order('bus_number');
    
    if (!error) {
      setBuses(data || []);
    }
  };

  // Clear stops when bus changes
  useEffect(() => {
    if (selectedBus) {
      setStops([]);
      setExistingStops([]);
      setAvailableStops([]);
      // Clear markers from map
      if (markers.length > 0) {
        markers.forEach(marker => {
          if (mapInstanceRef.current) mapInstanceRef.current.removeLayer(marker);
        });
        setMarkers([]);
        if (window.routeLine && mapInstanceRef.current) mapInstanceRef.current.removeLayer(window.routeLine);
      }
    }
  }, [selectedBus, direction]);

  // Load existing stops when "Show Stops" is clicked
  const loadExistingStops = async () => {
    if (!selectedBus) {
      setMessage({ type: 'error', text: 'Please select a bus first' });
      setTimeout(() => setMessage({ type: '', text: '' }), 2000);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('bus_stops')
      .select('*')
      .eq('bus_id', parseInt(selectedBus))
      .eq('direction', direction)
      .order('sequence', { ascending: true });
    
    setLoading(false);
    
    if (!error && data && data.length > 0) {
      const formattedStops = data.map(stop => ({
        id: stop.id,
        name: stop.stop_name,
        lat: stop.latitude,
        lng: stop.longitude,
        sequence: stop.sequence,
        landmark: stop.landmark,
        estimated_time: stop.estimated_time,
        is_major: stop.is_major
      }));
      setExistingStops(formattedStops);
      setAvailableStops(formattedStops);
      setStops(formattedStops);
      setMessage({ type: 'success', text: `Loaded ${formattedStops.length} existing stops!` });
      setTimeout(() => setMessage({ type: '', text: '' }), 2000);
      
      // Add markers to map
      setTimeout(() => {
        if (mapInstanceRef.current && formattedStops.length > 0) {
          updateMapMarkers(formattedStops);
          const bounds = formattedStops.map(s => [s.lat, s.lng]);
          mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
        }
      }, 500);
    } else {
      setExistingStops([]);
      setAvailableStops([]);
      setStops([]);
      setMessage({ type: 'info', text: 'No existing stops found. You can add new stops by double-clicking on the map.' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    }
  };

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const initMap = async () => {
      const L = await import('leaflet');
      await import('leaflet/dist/leaflet.css');
      
      // Fix leaflet icon issue
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });

      const mapInstance = L.map(mapContainerRef.current).setView([17.289382, 76.869064], 13);
      
      // Add default tile layer (Street Map)
      const currentLayer = tileLayers[mapStyle];
      const tileLayer = L.tileLayer(currentLayer.url, {
        attribution: currentLayer.attribution,
        maxZoom: 19,
        subdomains: currentLayer.subdomains || 'abc'
      }).addTo(mapInstance);
      
      mapInstance.tileLayer = tileLayer;

      // DOUBLE CLICK handler to add stops
      mapInstance.on('dblclick', (e) => {
        if (!selectedBus) {
          setMessage({ type: 'error', text: 'Please select a bus first' });
          setTimeout(() => setMessage({ type: '', text: '' }), 2000);
          return;
        }
        const { lat, lng } = e.latlng;
        setTempLatLng({ lat: lat.toFixed(8), lng: lng.toFixed(8) });
        setTempName('');
        setEditingIndex(null);
        setShowNameInput(true);
      });

      mapInstanceRef.current = mapInstance;
      setLeafletLoaded(true);
      
      // Add zoom controls
      L.control.zoom({ position: 'topright' }).addTo(mapInstance);
      
      // Add scale bar
      L.control.scale({ metric: true, imperial: false, position: 'bottomleft' }).addTo(mapInstance);
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [selectedBus]);

  // Change map style
  const changeMapStyle = (style) => {
    setMapStyle(style);
    if (mapInstanceRef.current && mapInstanceRef.current.tileLayer) {
      mapInstanceRef.current.removeLayer(mapInstanceRef.current.tileLayer);
      const currentLayer = tileLayers[style];
      const newTileLayer = L.tileLayer(currentLayer.url, {
        attribution: currentLayer.attribution,
        maxZoom: 19,
        subdomains: currentLayer.subdomains || 'abc'
      }).addTo(mapInstanceRef.current);
      mapInstanceRef.current.tileLayer = newTileLayer;
    }
  };

  // Update markers and route line when stops change
  const updateMapMarkers = (stopsList) => {
    if (!mapInstanceRef.current || !leafletLoaded) return;

    const L = window.L;
    
    // Clear existing markers
    markers.forEach(marker => {
      if (mapInstanceRef.current) mapInstanceRef.current.removeLayer(marker);
    });
    
    const newMarkers = [];
    
    stopsList.forEach((stop, index) => {
      // Create custom marker with number and color based on sequence
      const gradient = index === 0 ? '#10b981' : index === stopsList.length - 1 ? '#ef4444' : '#3b82f6';
      const customIcon = L.divIcon({
        html: `<div style="
          width: 34px;
          height: 34px;
          background: linear-gradient(135deg, ${gradient}, ${gradient === '#3b82f6' ? '#06b6d4' : gradient === '#10b981' ? '#34d399' : '#f87171'});
          border-radius: 50%;
          border: 3px solid white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 13px;
          color: white;
          box-shadow: 0 4px 8px rgba(0,0,0,0.3);
          cursor: pointer;
          transition: transform 0.2s;
        ">${index + 1}</div>`,
        className: 'stop-marker',
        iconSize: [34, 34],
        iconAnchor: [17, 17]
      });
      
      const marker = L.marker([stop.lat, stop.lng], { icon: customIcon, draggable: true }).addTo(mapInstanceRef.current);
      
      // Add hover effect
      marker.on('mouseover', function() {
        this.openPopup();
      });
      
      marker.bindPopup(`
        <div style="padding: 10px; min-width: 180px; font-family: system-ui;">
          <div style="font-weight: bold; margin-bottom: 8px; color: #1f2937;">
            🚏 Stop ${index + 1}: ${stop.name}
          </div>
          <div style="font-size: 11px; color: #6b7280; margin-bottom: 8px;">
            📍 ${stop.lat.toFixed(6)}, ${stop.lng.toFixed(6)}
          </div>
          <div style="display: flex; gap: 8px; margin-top: 8px;">
            <button onclick="window.editStop(${index})" style="padding: 4px 12px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px;">✏️ Edit</button>
            <button onclick="window.deleteStop(${index})" style="padding: 4px 12px; background: #ef4444; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px;">🗑️ Delete</button>
          </div>
        </div>
      `);
      
      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        const updatedStops = [...stopsList];
        updatedStops[index] = {
          ...updatedStops[index],
          lat: pos.lat,
          lng: pos.lng
        };
        setStops(updatedStops);
      });
      
      newMarkers.push(marker);
    });
    
    setMarkers(newMarkers);
    
    // Draw route line connecting stops
    if (stopsList.length > 1) {
      if (window.routeLine && mapInstanceRef.current) mapInstanceRef.current.removeLayer(window.routeLine);
      
      const routePoints = stopsList.map(s => [s.lat, s.lng]);
      
      // Main route line
      window.routeLine = L.polyline(routePoints, {
        color: '#3b82f6',
        weight: 5,
        opacity: 0.9,
        lineJoin: 'round',
        lineCap: 'round'
      }).addTo(mapInstanceRef.current);
      
      // Add dashed line effect for better visibility
      const dashLine = L.polyline(routePoints, {
        color: '#06b6d4',
        weight: 2,
        opacity: 0.5,
        lineJoin: 'round',
        dashArray: '10, 10'
      }).addTo(mapInstanceRef.current);
      
      window.dashLine = dashLine;
    }
  };

  // Update map when stops change
  useEffect(() => {
    if (leafletLoaded && mapInstanceRef.current) {
      updateMapMarkers(stops);
      
      // Fit bounds to show all stops
      if (stops.length > 0) {
        const bounds = stops.map(s => [s.lat, s.lng]);
        mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [stops, leafletLoaded]);

  // Expose functions to window for popup buttons
  useEffect(() => {
    window.editStop = (index) => {
      setEditingIndex(index);
      setTempName(stops[index].name);
      setTempLatLng({ lat: stops[index].lat, lng: stops[index].lng });
      setShowNameInput(true);
    };
    
    window.deleteStop = (index) => {
      const updatedStops = stops.filter((_, i) => i !== index);
      setStops(updatedStops);
      setMessage({ type: 'success', text: 'Stop removed!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 2000);
    };
    
    return () => {
      delete window.editStop;
      delete window.deleteStop;
    };
  }, [stops]);

  const addStop = () => {
    if (!tempName.trim()) {
      setMessage({ type: 'error', text: 'Please enter stop name' });
      return;
    }
    
    const nextSequence = stops.length + 1;
    
    const newStop = {
      name: tempName.trim(),
      lat: parseFloat(tempLatLng.lat),
      lng: parseFloat(tempLatLng.lng),
      is_major: false,
      estimated_time: null,
      landmark: ''
    };
    
    if (editingIndex !== null) {
      const updatedStops = [...stops];
      updatedStops[editingIndex] = newStop;
      setStops(updatedStops);
      setMessage({ type: 'success', text: 'Stop updated!' });
    } else {
      setStops([...stops, newStop]);
      setMessage({ type: 'success', text: `Stop "${tempName.trim()}" added as Stop ${nextSequence}!` });
    }
    
    setShowNameInput(false);
    setTempName('');
    setTempLatLng(null);
    setEditingIndex(null);
    setTimeout(() => setMessage({ type: '', text: '' }), 2000);
  };

  const removeStop = (index) => {
    const updatedStops = stops.filter((_, i) => i !== index);
    setStops(updatedStops);
    setMessage({ type: 'success', text: 'Stop removed!' });
    setTimeout(() => setMessage({ type: '', text: '' }), 2000);
  };

  const moveStopUp = (index) => {
    if (index === 0) return;
    const updatedStops = [...stops];
    [updatedStops[index - 1], updatedStops[index]] = [updatedStops[index], updatedStops[index - 1]];
    setStops(updatedStops);
  };

  const moveStopDown = (index) => {
    if (index === stops.length - 1) return;
    const updatedStops = [...stops];
    [updatedStops[index], updatedStops[index + 1]] = [updatedStops[index + 1], updatedStops[index]];
    setStops(updatedStops);
  };

  const handleDragStart = (index) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (index) => {
    if (draggedIndex === null) return;
    const updatedStops = [...stops];
    const [draggedItem] = updatedStops.splice(draggedIndex, 1);
    updatedStops.splice(index, 0, draggedItem);
    setStops(updatedStops);
    setDraggedIndex(null);
  };

  const saveRoute = async () => {
    if (!selectedBus) {
      setMessage({ type: 'error', text: 'Please select a bus' });
      return;
    }
    if (stops.length === 0) {
      setMessage({ type: 'error', text: 'Please add at least one stop' });
      return;
    }

    setSaving(true);
    
    try {
      // Delete existing stops for this bus and direction
      const { error: deleteError } = await supabase
        .from('bus_stops')
        .delete()
        .eq('bus_id', parseInt(selectedBus))
        .eq('direction', direction);
      
      if (deleteError) throw deleteError;
      
      // Insert all new stops
      const stopsToInsert = stops.map((stop, index) => ({
        bus_id: parseInt(selectedBus),
        stop_name: stop.name,
        sequence: index + 1,
        latitude: stop.lat,
        longitude: stop.lng,
        direction: direction,
        estimated_time: stop.estimated_time || null,
        is_major: stop.is_major || false,
        landmark: stop.landmark || null
      }));
      
      const { error: insertError } = await supabase
        .from('bus_stops')
        .insert(stopsToInsert);
      
      if (insertError) throw insertError;
      
      setMessage({ type: 'success', text: `Route saved successfully! ${stops.length} stops added.` });
      setTimeout(() => {
        router.push('/bus-stops');
      }, 2000);
      
    } catch (error) {
      console.error('Error saving route:', error);
      setMessage({ type: 'error', text: 'Error saving route: ' + error.message });
    } finally {
      setSaving(false);
    }
  };

  const clearAllStops = () => {
    if (confirm('Are you sure you want to clear all stops?')) {
      setStops([]);
      setMessage({ type: 'success', text: 'All stops cleared!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 2000);
    }
  };

  const resetForm = () => {
    setSelectedBus('');
    setSelectedBusNumber('');
    setDirection('morning');
    setStops([]);
    setExistingStops([]);
    setAvailableStops([]);
    setMessage({ type: '', text: '' });
    // Clear markers from map
    if (markers.length > 0) {
      markers.forEach(marker => {
        if (mapInstanceRef.current) mapInstanceRef.current.removeLayer(marker);
      });
      setMarkers([]);
      if (window.routeLine && mapInstanceRef.current) mapInstanceRef.current.removeLayer(window.routeLine);
      if (window.dashLine && mapInstanceRef.current) mapInstanceRef.current.removeLayer(window.dashLine);
    }
  };

  const handleBusChange = (busId) => {
    setSelectedBus(busId);
    const bus = buses.find(b => b.id === parseInt(busId));
    setSelectedBusNumber(bus?.bus_number || '');
    // Clear stops when bus changes
    setStops([]);
    setExistingStops([]);
    setAvailableStops([]);
    if (markers.length > 0) {
      markers.forEach(marker => {
        if (mapInstanceRef.current) mapInstanceRef.current.removeLayer(marker);
      });
      setMarkers([]);
      if (window.routeLine && mapInstanceRef.current) mapInstanceRef.current.removeLayer(window.routeLine);
      if (window.dashLine && mapInstanceRef.current) mapInstanceRef.current.removeLayer(window.dashLine);
    }
  };

  const getBusName = () => {
    const bus = buses.find(b => b.id === parseInt(selectedBus));
    return bus ? `${bus.bus_number} - ${bus.route_name || 'No Route'}` : '';
  };

  const fitMapToStops = () => {
    if (mapInstanceRef.current && stops.length > 0) {
      const bounds = stops.map(s => [s.lat, s.lng]);
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'radial-gradient(circle at 50% 50%, #1a1a2e, #0a0a0f)',
      position: 'relative'
    }}>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        
        .action-button {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 40px;
          padding: 8px 16px;
          font-size: 13px;
          font-weight: 500;
          color: #a0a0c0;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .action-button:hover {
          background: rgba(255,255,255,0.1);
          border-color: #3b82f6;
          color: #3b82f6;
          transform: translateY(-1px);
        }
        
        .action-button.primary {
          background: linear-gradient(135deg, #3b82f6, #06b6d4);
          color: white;
          border: none;
        }
        
        .action-button.primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px -5px #3b82f6;
        }
        
        .action-button.danger {
          background: rgba(239,68,68,0.1);
          border-color: rgba(239,68,68,0.3);
          color: #ef4444;
        }
        
        .action-button.danger:hover {
          background: rgba(239,68,68,0.2);
          border-color: #ef4444;
        }
        
        .input-field {
          width: 100%;
          padding: 12px 16px;
          background: #0a0a0f;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          font-size: 14px;
          color: white;
          outline: none;
          transition: all 0.2s ease;
        }
        
        .input-field:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59,130,246,0.2);
        }
        
        .input-field::placeholder {
          color: #6b6b8b;
        }
        
        select.input-field {
          cursor: pointer;
        }
        
        option {
          background: #16162a;
        }
        
        .leaflet-container {
          background: #1a1a2e;
        }
        
        .leaflet-control-zoom a {
          background: rgba(22,22,42,0.95) !important;
          color: white !important;
          border: 1px solid rgba(255,255,255,0.1) !important;
          border-radius: 8px !important;
          margin: 4px !important;
          width: 36px !important;
          height: 36px !important;
          line-height: 36px !important;
        }
        
        .leaflet-control-zoom a:hover {
          background: #3b82f6 !important;
        }
        
        .leaflet-control-attribution {
          background: rgba(0,0,0,0.7) !important;
          color: #a0a0c0 !important;
          font-size: 10px !important;
          padding: 4px 8px !important;
          border-radius: 8px !important;
        }
        
        .leaflet-control-attribution a {
          color: #3b82f6 !important;
        }
        
        .stop-marker {
          transition: transform 0.2s;
        }
        
        .stop-marker:hover {
          transform: scale(1.1);
        }
      `}</style>

      {/* Header */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 20,
        background: 'rgba(22, 22, 42, 0.95)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '12px 20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => router.back()}
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <ChevronLeft size={20} color="#a0a0c0" />
            </button>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: 'white' }}>Bus Route Mapper</h1>
              <p style={{ fontSize: 12, color: '#6b6b8b' }}>Double-click on map to add stops • Drag markers to reposition</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {/* Map Style Selector */}
            <div style={{ display: 'flex', gap: 4, background: 'rgba(0,0,0,0.3)', borderRadius: 40, padding: 4 }}>
              <button
                onClick={() => changeMapStyle('streets')}
                style={{
                  padding: '6px 12px',
                  borderRadius: 30,
                  background: mapStyle === 'streets' ? '#3b82f6' : 'transparent',
                  border: 'none',
                  color: mapStyle === 'streets' ? 'white' : '#a0a0c0',
                  cursor: 'pointer',
                  fontSize: 11,
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                <MapIcon size={12} />
                Streets
              </button>
              <button
                onClick={() => changeMapStyle('satellite')}
                style={{
                  padding: '6px 12px',
                  borderRadius: 30,
                  background: mapStyle === 'satellite' ? '#3b82f6' : 'transparent',
                  border: 'none',
                  color: mapStyle === 'satellite' ? 'white' : '#a0a0c0',
                  cursor: 'pointer',
                  fontSize: 11,
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                <Layers size={12} />
                Satellite
              </button>
            </div>
            <button
              onClick={loadExistingStops}
              disabled={!selectedBus || loading}
              className="action-button"
              style={{ background: loading ? 'rgba(255,255,255,0.02)' : 'rgba(59,130,246,0.1)', borderColor: '#3b82f6', color: '#3b82f6' }}
            >
              <Eye size={16} />
              <span>{loading ? 'Loading...' : 'Show Stops'}</span>
            </button>
            <button
              onClick={fitMapToStops}
              disabled={stops.length === 0}
              className="action-button"
            >
              <MapIcon size={16} />
              <span>Fit Map</span>
            </button>
            <button
              onClick={clearAllStops}
              className="action-button danger"
            >
              <Trash2 size={16} />
              <span>Clear All</span>
            </button>
            <button
              onClick={resetForm}
              className="action-button"
            >
              <RefreshCw size={16} />
              <span>Reset</span>
            </button>
            <button
              onClick={saveRoute}
              disabled={saving || !selectedBus || stops.length === 0}
              className="action-button primary"
            >
              <Save size={16} />
              <span>{saving ? 'Saving...' : 'Save Route'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Message */}
      {message.text && (
        <div style={{
          position: 'fixed',
          top: 80,
          right: 20,
          zIndex: 30,
          padding: '12px 20px',
          borderRadius: 12,
          background: message.type === 'error' ? 'rgba(239,68,68,0.95)' : 
                     message.type === 'success' ? 'rgba(16,185,129,0.95)' :
                     'rgba(59,130,246,0.95)',
          color: 'white',
          fontSize: 14,
          backdropFilter: 'blur(8px)',
          animation: 'fadeIn 0.3s ease',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2)'
        }}>
          {message.type === 'success' ? '✅ ' : message.type === 'error' ? '❌ ' : 'ℹ️ '}
          {message.text}
        </div>
      )}

      {/* Main Content */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 360px',
        gap: 0,
        height: 'calc(100vh - 70px)'
      }}>
        {/* Map Section */}
        <div style={{ position: 'relative', background: '#1a1a2e' }}>
          <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
          
          {/* Map Instructions Overlay */}
          <div style={{
            position: 'absolute',
            bottom: 20,
            left: 20,
            background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(8px)',
            padding: '10px 18px',
            borderRadius: 30,
            fontSize: 12,
            color: '#a0a0c0',
            pointerEvents: 'none',
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            <div style={{ width: 8, height: 8, background: '#10b981', borderRadius: '50%', animation: 'pulse 2s infinite' }}></div>
            <MapPin size={14} />
            <span>Double-click to add stop</span>
            <span style={{ width: 1, height: 12, background: '#4b4b6b', margin: '0 4px' }}></span>
            <span>🖱️ Drag markers to reposition</span>
          </div>
          
          {/* Route Summary Overlay */}
          {stops.length > 0 && (
            <div style={{
              position: 'absolute',
              top: 20,
              right: 20,
              background: 'rgba(0,0,0,0.8)',
              backdropFilter: 'blur(8px)',
              padding: '8px 16px',
              borderRadius: 20,
              fontSize: 12,
              color: 'white',
              pointerEvents: 'none',
              zIndex: 10,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <Route size={14} color="#3b82f6" />
              <span><strong style={{ color: '#3b82f6' }}>{stops.length}</strong> stops in route</span>
              <span style={{ width: 1, height: 12, background: '#4b4b6b' }}></span>
              <span>🚏 {stops[0]?.name} → {stops[stops.length - 1]?.name}</span>
            </div>
          )}
        </div>

        {/* Stops List Section */}
        <div style={{
          background: 'rgba(22, 22, 42, 0.98)',
          borderLeft: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {/* Controls */}
          <div style={{ padding: 20, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6b6b8b', marginBottom: 6, display: 'block' }}>
                Select Bus
              </label>
              <select
                value={selectedBus}
                onChange={(e) => handleBusChange(e.target.value)}
                className="input-field"
                style={{ width: '100%' }}
              >
                <option value="">-- Select a bus --</option>
                {buses.map(bus => (
                  <option key={bus.id} value={bus.id}>
                    {bus.bus_number} - {bus.route_name || 'No Route'}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6b6b8b', marginBottom: 6, display: 'block' }}>
                Direction
              </label>
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={() => setDirection('morning')}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: 10,
                    background: direction === 'morning' ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.03)',
                    border: direction === 'morning' ? '1px solid #f59e0b' : '1px solid rgba(255,255,255,0.08)',
                    color: direction === 'morning' ? '#f59e0b' : '#a0a0c0',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 500,
                    transition: 'all 0.2s'
                  }}
                >
                  <Sun size={14} style={{ display: 'inline', marginRight: 6 }} />
                  Morning
                </button>
                <button
                  onClick={() => setDirection('evening')}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: 10,
                    background: direction === 'evening' ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.03)',
                    border: direction === 'evening' ? '1px solid #3b82f6' : '1px solid rgba(255,255,255,0.08)',
                    color: direction === 'evening' ? '#3b82f6' : '#a0a0c0',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 500,
                    transition: 'all 0.2s'
                  }}
                >
                  <Moon size={14} style={{ display: 'inline', marginRight: 6 }} />
                  Evening
                </button>
              </div>
            </div>

            {selectedBus && (
              <div style={{
                background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(6,182,212,0.1))',
                borderRadius: 12,
                padding: '12px',
                border: '1px solid rgba(59,130,246,0.3)'
              }}>
                <Bus size={14} style={{ display: 'inline', marginRight: 8, color: '#3b82f6' }} />
                <span style={{ fontSize: 13, color: '#3b82f6', fontWeight: 500 }}>{getBusName()}</span>
              </div>
            )}
          </div>

          {/* Stops List */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: 'white', display: 'flex', alignItems: 'center', gap: 8 }}>
                <MapPin size={16} color="#3b82f6" />
                Route Stops ({stops.length})
              </h3>
              {stops.length > 0 && (
                <button
                  onClick={fitMapToStops}
                  className="action-button"
                  style={{ padding: '4px 12px', fontSize: 11 }}
                >
                  <MapIcon size={12} />
                  <span>Fit Map</span>
                </button>
              )}
            </div>

            {stops.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: 40,
                background: 'rgba(255,255,255,0.02)',
                borderRadius: 16,
                border: '1px dashed rgba(255,255,255,0.08)'
              }}>
                <MapPin size={40} color="#6b6b8b" style={{ marginBottom: 12 }} />
                <p style={{ color: '#6b6b8b', fontSize: 13 }}>No stops added yet</p>
                <p style={{ color: '#4b4b6b', fontSize: 11, marginTop: 6 }}>Double-click on the map to add stops</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {stops.map((stop, index) => (
                  <div
                    key={index}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(index)}
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      borderRadius: 12,
                      border: '1px solid rgba(255,255,255,0.06)',
                      cursor: 'grab',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', padding: '12px' }}>
                      <div style={{
                        width: 32,
                        height: 32,
                        background: index === 0 ? 'linear-gradient(135deg, #10b981, #34d399)' : 
                                   index === stops.length - 1 ? 'linear-gradient(135deg, #ef4444, #f87171)' :
                                   'linear-gradient(135deg, #3b82f6, #06b6d4)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12,
                        fontWeight: 'bold',
                        color: 'white',
                        marginRight: 12,
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                      }}>
                        {index + 1}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, color: 'white', fontSize: 13 }}>{stop.name}</div>
                        <div style={{ fontSize: 10, color: '#6b6b8b', fontFamily: 'monospace', marginTop: 2 }}>
                          {stop.lat.toFixed(6)}°, {stop.lng.toFixed(6)}°
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => moveStopUp(index)}
                          disabled={index === 0}
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: 8,
                            background: 'rgba(255,255,255,0.05)',
                            border: 'none',
                            color: index === 0 ? '#4b4b6b' : '#a0a0c0',
                            cursor: index === 0 ? 'not-allowed' : 'pointer',
                            fontSize: 14,
                            transition: 'all 0.2s'
                          }}
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => moveStopDown(index)}
                          disabled={index === stops.length - 1}
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: 8,
                            background: 'rgba(255,255,255,0.05)',
                            border: 'none',
                            color: index === stops.length - 1 ? '#4b4b6b' : '#a0a0c0',
                            cursor: index === stops.length - 1 ? 'not-allowed' : 'pointer',
                            fontSize: 14,
                            transition: 'all 0.2s'
                          }}
                        >
                          ↓
                        </button>
                        <button
                          onClick={() => removeStop(index)}
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: 8,
                            background: 'rgba(239,68,68,0.15)',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Summary */}
          {stops.length > 0 && (
            <div style={{
              padding: 16,
              borderTop: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(0,0,0,0.3)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: '#6b6b8b' }}>Total Stops</span>
                <span style={{ fontSize: 16, fontWeight: 700, color: '#3b82f6' }}>{stops.length}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: '#6b6b8b' }}>Route Sequence</span>
                <span style={{ fontSize: 12, color: '#a0a0c0' }}>
                  <span style={{ color: '#10b981' }}>Start</span> → <span style={{ color: '#ef4444' }}>End</span>
                </span>
              </div>
              <div style={{ marginTop: 12, height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{
                  width: '100%',
                  height: '100%',
                  background: 'linear-gradient(90deg, #10b981, #3b82f6, #ef4444)',
                  borderRadius: 2
                }}></div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Stop Modal */}
      {showNameInput && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          animation: 'fadeIn 0.2s ease'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #16162a, #1a1a35)',
            borderRadius: 28,
            maxWidth: 420,
            width: '90%',
            padding: 28,
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{
                width: 48,
                height: 48,
                background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
                borderRadius: 24,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <MapPin size={24} color="white" />
              </div>
              <div>
                <h3 style={{ fontSize: 20, fontWeight: 700, color: 'white', margin: 0 }}>
                  {editingIndex !== null ? 'Edit Stop' : `Add Stop #${stops.length + 1}`}
                </h3>
                <p style={{ fontSize: 12, color: '#6b6b8b', marginTop: 4 }}>
                  {editingIndex !== null ? 'Modify stop details' : 'Enter a name for this location'}
                </p>
              </div>
            </div>
            
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6b6b8b', marginBottom: 8, display: 'block' }}>
                Stop Name
              </label>
              <input
                type="text"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                placeholder="e.g., SGI College Main Gate"
                autoFocus
                className="input-field"
                style={{ width: '100%' }}
                onKeyPress={(e) => e.key === 'Enter' && addStop()}
              />
            </div>
            
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6b6b8b', marginBottom: 8, display: 'block' }}>
                Location Coordinates
              </label>
              <div style={{ 
                background: 'rgba(0,0,0,0.4)', 
                padding: '10px 14px', 
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.05)'
              }}>
                <code style={{ fontSize: 12, color: '#a0a0c0', display: 'block', textAlign: 'center' }}>
                  📍 {tempLatLng?.lat}, {tempLatLng?.lng}
                </code>
              </div>
            </div>
            
            {!editingIndex && (
              <div style={{ 
                marginBottom: 24, 
                padding: '10px 14px', 
                background: 'rgba(59,130,246,0.1)', 
                borderRadius: 12,
                border: '1px solid rgba(59,130,246,0.3)'
              }}>
                <code style={{ fontSize: 12, color: '#3b82f6', display: 'block', textAlign: 'center' }}>
                  🔢 This will be Stop #{stops.length + 1} in the route sequence
                </code>
              </div>
            )}
            
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => {
                  setShowNameInput(false);
                  setTempName('');
                  setTempLatLng(null);
                  setEditingIndex(null);
                }}
                className="action-button"
                style={{ flex: 1, justifyContent: 'center', padding: '12px' }}
              >
                Cancel
              </button>
              <button
                onClick={addStop}
                className="action-button primary"
                style={{ flex: 1, justifyContent: 'center', padding: '12px' }}
              >
                {editingIndex !== null ? 'Update Stop' : `Add Stop #${stops.length + 1}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BusRouteMapper;