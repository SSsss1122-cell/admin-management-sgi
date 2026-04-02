'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import withAuth from '../../components/withAuth';
import { useRouter } from 'next/navigation';
import { 
  Plus, Edit, Trash2, Save, X, MapPin, Bus, Clock, 
  Star, AlertCircle, CheckCircle, ChevronLeft,
  Search, RefreshCw, Sun, Moon, Info, Map, Navigation
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

function BusStopsPage() {
  const [stops, setStops] = useState([]);
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingStop, setEditingStop] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBus, setSelectedBus] = useState('all');
  const [selectedDirection, setSelectedDirection] = useState('all');
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapInstance, setMapInstance] = useState(null);
  const [markerInstance, setMarkerInstance] = useState(null);
  const [currentTime, setCurrentTime] = useState('');
  const mapContainerRef = useRef(null);
  
  const [formData, setFormData] = useState({
    bus_id: '',
    stop_name: '',
    sequence: '',
    latitude: '',
    longitude: '',
    estimated_time: '',
    is_major: false,
    landmark: '',
    direction: 'morning'
  });
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [stopToDelete, setStopToDelete] = useState(null);

  const router = useRouter();

  // Update time
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Load Leaflet when map picker is opened
  useEffect(() => {
    if (showMapPicker && !mapLoaded && typeof window !== 'undefined') {
      if (!window.L) {
        const leafletCSS = document.createElement('link');
        leafletCSS.rel = 'stylesheet';
        leafletCSS.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(leafletCSS);
        
        const leafletJS = document.createElement('script');
        leafletJS.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        leafletJS.onload = () => {
          setMapLoaded(true);
        };
        document.head.appendChild(leafletJS);
      } else {
        setMapLoaded(true);
      }
    }
  }, [showMapPicker, mapLoaded]);

  // Initialize map
  useEffect(() => {
    if (showMapPicker && mapLoaded && mapContainerRef.current && !mapInstance && window.L) {
      const L = window.L;
      
      const defaultLat = formData.latitude ? parseFloat(formData.latitude) : 17.289382917207856;
      const defaultLng = formData.longitude ? parseFloat(formData.longitude) : 76.86906490165809;
      
      const map = L.map(mapContainerRef.current).setView([defaultLat, defaultLng], 15);
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);
      
      const marker = L.marker([defaultLat, defaultLng], {
        draggable: true
      }).addTo(map);
      
      marker.on('dragend', () => {
        const position = marker.getLatLng();
        setFormData(prev => ({
          ...prev,
          latitude: position.lat.toFixed(8),
          longitude: position.lng.toFixed(8)
        }));
      });
      
      map.on('click', (e) => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        setFormData(prev => ({
          ...prev,
          latitude: lat.toFixed(8),
          longitude: lng.toFixed(8)
        }));
      });
      
      setMapInstance(map);
      setMarkerInstance(marker);
    }
    
    return () => {
      if (mapInstance && !showMapPicker) {
        mapInstance.remove();
        setMapInstance(null);
        setMarkerInstance(null);
      }
    };
  }, [showMapPicker, mapLoaded, formData.latitude, formData.longitude]);

  const fetchBuses = async () => {
    try {
      const { data, error } = await supabase
        .from('buses')
        .select('id, bus_number, route_name, is_active')
        .order('bus_number');
      
      if (error) throw error;
      setBuses(data || []);
    } catch (error) {
      console.error('Error fetching buses:', error);
    }
  };

  const fetchStops = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('bus_stops')
        .select('*, buses(bus_number, route_name)')
        .order('bus_id')
        .order('direction')
        .order('sequence');
      
      if (error) throw error;
      setStops(data || []);
    } catch (error) {
      console.error('Error fetching stops:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBuses();
    fetchStops();
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!formData.bus_id) {
      setFormError('Please select a bus');
      return;
    }
    if (!formData.stop_name) {
      setFormError('Stop name is required');
      return;
    }
    if (!formData.sequence) {
      setFormError('Sequence number is required');
      return;
    }
    if (!formData.latitude || !formData.longitude) {
      setFormError('Please select location from map or enter coordinates');
      return;
    }

    try {
      if (editingStop) {
        const { error } = await supabase
          .from('bus_stops')
          .update({
            bus_id: parseInt(formData.bus_id),
            stop_name: formData.stop_name,
            sequence: parseInt(formData.sequence),
            latitude: parseFloat(formData.latitude),
            longitude: parseFloat(formData.longitude),
            estimated_time: formData.estimated_time ? parseInt(formData.estimated_time) : null,
            is_major: formData.is_major,
            landmark: formData.landmark || null,
            direction: formData.direction
          })
          .eq('id', editingStop.id);

        if (error) throw error;
        setFormSuccess('Stop updated successfully!');
      } else {
        const { error } = await supabase
          .from('bus_stops')
          .insert([{
            bus_id: parseInt(formData.bus_id),
            stop_name: formData.stop_name,
            sequence: parseInt(formData.sequence),
            latitude: parseFloat(formData.latitude),
            longitude: parseFloat(formData.longitude),
            estimated_time: formData.estimated_time ? parseInt(formData.estimated_time) : null,
            is_major: formData.is_major,
            landmark: formData.landmark || null,
            direction: formData.direction
          }]);

        if (error) throw error;
        setFormSuccess('Stop added successfully!');
      }

      setTimeout(() => {
        setShowModal(false);
        setShowMapPicker(false);
        if (mapInstance) {
          mapInstance.remove();
          setMapInstance(null);
        }
        resetForm();
        fetchStops();
      }, 1500);
      
    } catch (error) {
      console.error('Error saving stop:', error);
      setFormError(error.message);
    }
  };

  const handleEdit = (stop) => {
    setEditingStop(stop);
    setFormData({
      bus_id: stop.bus_id.toString(),
      stop_name: stop.stop_name,
      sequence: stop.sequence.toString(),
      latitude: stop.latitude.toString(),
      longitude: stop.longitude.toString(),
      estimated_time: stop.estimated_time?.toString() || '',
      is_major: stop.is_major || false,
      landmark: stop.landmark || '',
      direction: stop.direction || 'morning'
    });
    setShowModal(true);
  };

  const handleDelete = async () => {
    if (!stopToDelete) return;

    try {
      const { error } = await supabase
        .from('bus_stops')
        .delete()
        .eq('id', stopToDelete.id);

      if (error) throw error;
      
      setShowDeleteModal(false);
      setStopToDelete(null);
      fetchStops();
      setFormSuccess('Stop deleted successfully!');
      setTimeout(() => setFormSuccess(''), 3000);
    } catch (error) {
      console.error('Error deleting stop:', error);
      setFormError(error.message);
      setTimeout(() => setFormError(''), 3000);
    }
  };

  const resetForm = () => {
    setEditingStop(null);
    setFormData({
      bus_id: '',
      stop_name: '',
      sequence: '',
      latitude: '',
      longitude: '',
      estimated_time: '',
      is_major: false,
      landmark: '',
      direction: 'morning'
    });
    setFormError('');
    setFormSuccess('');
  };

  const openAddModal = () => {
    resetForm();
    setShowModal(true);
  };

  const getCurrentLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData(prev => ({
            ...prev,
            latitude: position.coords.latitude.toFixed(8),
            longitude: position.coords.longitude.toFixed(8)
          }));
          setFormSuccess('Current location captured!');
          setTimeout(() => setFormSuccess(''), 3000);
        },
        (error) => {
          setFormError('Unable to get location. Please allow location access.');
          setTimeout(() => setFormError(''), 3000);
        }
      );
    } else {
      setFormError('Geolocation is not supported by your browser');
    }
  };

  const filteredStops = stops.filter(stop => {
    const matchesSearch = stop.stop_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (stop.landmark && stop.landmark.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesBus = selectedBus === 'all' || stop.bus_id.toString() === selectedBus;
    const matchesDirection = selectedDirection === 'all' || stop.direction === selectedDirection;
    return matchesSearch && matchesBus && matchesDirection;
  });

  const getBusName = (busId) => {
    const bus = buses.find(b => b.id === busId);
    return bus ? `${bus.bus_number}` : `Bus ${busId}`;
  };

  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        
        * { 
          box-sizing: border-box; 
          margin: 0; 
          padding: 0; 
        }
        
        :root {
          --bg-primary: #0a0a0f;
          --bg-secondary: #11111f;
          --bg-card: #16162a;
          --bg-card-hover: #1c1c34;
          --border: rgba(255,255,255,0.08);
          --border-hover: rgba(255,255,255,0.15);
          --text-primary: #ffffff;
          --text-secondary: #a0a0c0;
          --text-muted: #6b6b8b;
          --accent-blue: #3b82f6;
          --accent-cyan: #06b6d4;
          --accent-purple: #8b5cf6;
          --accent-orange: #f59e0b;
          --accent-green: #10b981;
          --accent-red: #ef4444;
        }
        
        body { 
          font-family: 'Inter', sans-serif; 
          background: var(--bg-primary);
          color: var(--text-primary);
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes float {
          0%,100% { transform: translateY(0px); }
          50% { transform: translateY(-5px); }
        }
        
        @keyframes glow {
          0%,100% { filter: blur(60px) opacity(0.5); }
          50% { filter: blur(80px) opacity(0.8); }
        }
        
        .glass-effect {
          background: rgba(22, 22, 42, 0.8);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        
        .stat-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 20px;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }
        
        .stat-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, #3b82f6, #06b6d4);
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        
        .stat-card:hover {
          transform: translateY(-4px);
          background: var(--bg-card-hover);
          border-color: var(--border-hover);
        }
        
        .stat-card:hover::before {
          opacity: 1;
        }
        
        .stop-table {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 20px;
          overflow: hidden;
        }
        
        .stop-table th {
          background: var(--bg-primary);
          padding: 16px;
          text-align: left;
          font-size: 12px;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 1px solid var(--border);
        }
        
        .stop-table td {
          padding: 16px;
          border-bottom: 1px solid var(--border);
          color: var(--text-secondary);
          font-size: 14px;
        }
        
        .stop-table tr:hover {
          background: var(--bg-card-hover);
        }
        
        .action-button {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 40px;
          padding: 8px 16px;
          font-size: 13px;
          font-weight: 500;
          color: var(--text-secondary);
          display: inline-flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .action-button:hover {
          background: var(--bg-card-hover);
          border-color: #3b82f6;
          color: #3b82f6;
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
        
        .input-field {
          width: 100%;
          padding: 12px 16px;
          background: var(--bg-primary);
          border: 1px solid var(--border);
          border-radius: 12px;
          font-size: 14px;
          color: var(--text-primary);
          outline: none;
          transition: all 0.2s ease;
        }
        
        .input-field:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59,130,246,0.2);
        }
        
        .input-field::placeholder {
          color: var(--text-muted);
        }
        
        .info-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          background: rgba(255,255,255,0.02);
          border: 1px solid var(--border);
          border-radius: 30px;
          font-size: 11px;
          color: var(--text-secondary);
        }
        
        .badge-morning {
          background: rgba(245,158,11,0.1);
          border: 1px solid rgba(245,158,11,0.2);
          color: #f59e0b;
        }
        
        .badge-evening {
          background: rgba(59,130,246,0.1);
          border: 1px solid rgba(59,130,246,0.2);
          color: #3b82f6;
        }
        
        @media (max-width: 768px) {
          .stat-card { padding: 16px; }
          .stop-table th, .stop-table td { padding: 12px; }
        }
      `}</style>

      <div style={{ 
        minHeight: '100vh', 
        background: 'radial-gradient(circle at 50% 50%, #1a1a2e, #0a0a0f)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Background Orbs */}
        <div style={{
          position: 'fixed',
          width: 600,
          height: 600,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)',
          top: -200,
          left: -200,
          filter: 'blur(80px)',
          pointerEvents: 'none',
          zIndex: 0,
          animation: 'glow 8s ease-in-out infinite'
        }}></div>
        <div style={{
          position: 'fixed',
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(6,182,212,0.1) 0%, transparent 70%)',
          bottom: -150,
          right: -150,
          filter: 'blur(80px)',
          pointerEvents: 'none',
          zIndex: 0,
          animation: 'glow 10s ease-in-out infinite reverse'
        }}></div>

        {/* Header */}
        <div className="glass-effect" style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          padding: '12px 16px',
          borderBottom: '1px solid var(--border)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                onClick={() => router.back()}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)'
                }}
              >
                <ChevronLeft size={18} />
              </button>
              <div>
                <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Bus Stops</h1>
                <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{currentTime}</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <Link href="/bus-route-mapper">
                <button className="action-button primary">
                  <Map size={16} />
                  <span>Build Route from Map</span>
                </button>
              </Link>
              <button onClick={openAddModal} className="action-button primary">
                <Plus size={16} />
                <span>Add Stop</span>
              </button>
            </div>
          </div>
        </div>

        <div style={{ position: 'relative', zIndex: 10, maxWidth: 1400, margin: '0 auto', padding: '16px' }}>
          {/* Success/Error Messages */}
          {formSuccess && (
            <div style={{ 
              marginBottom: 20, 
              padding: '12px 16px', 
              background: 'rgba(16,185,129,0.1)', 
              border: '1px solid rgba(16,185,129,0.2)',
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <CheckCircle size={16} color="#10b981" />
              <span style={{ color: '#10b981', fontSize: 13 }}>{formSuccess}</span>
            </div>
          )}
          {formError && (
            <div style={{ 
              marginBottom: 20, 
              padding: '12px 16px', 
              background: 'rgba(239,68,68,0.1)', 
              border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <AlertCircle size={16} color="#ef4444" />
              <span style={{ color: '#ef4444', fontSize: 13 }}>{formError}</span>
            </div>
          )}

          {/* Stats Cards */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 12,
            marginBottom: 20
          }}>
            <div className="stat-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Total Stops</p>
                  <p style={{ fontSize: 28, fontWeight: 700, color: '#3b82f6', marginTop: 4 }}>{stops.length}</p>
                </div>
                <div style={{ 
                  width: 40, 
                  height: 40, 
                  borderRadius: 12, 
                  background: 'rgba(59,130,246,0.1)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center'
                }}>
                  <MapPin size={20} color="#3b82f6" />
                </div>
              </div>
            </div>

            <div className="stat-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Active Buses</p>
                  <p style={{ fontSize: 28, fontWeight: 700, color: '#06b6d4', marginTop: 4 }}>{buses.filter(b => b.is_active).length}</p>
                </div>
                <div style={{ 
                  width: 40, 
                  height: 40, 
                  borderRadius: 12, 
                  background: 'rgba(6,182,212,0.1)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center'
                }}>
                  <Bus size={20} color="#06b6d4" />
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div style={{ 
            background: 'var(--bg-card)',
            borderRadius: 20,
            border: '1px solid var(--border)',
            padding: 16,
            marginBottom: 20
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              <div className="info-chip" style={{ background: 'var(--bg-primary)' }}>
                <Search size={14} />
                <input
                  type="text"
                  placeholder="Search stops..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: 'var(--text-primary)',
                    fontSize: 13,
                    width: '100%'
                  }}
                />
              </div>
              
              <select
                value={selectedBus}
                onChange={(e) => setSelectedBus(e.target.value)}
                className="input-field"
                style={{ fontSize: 13 }}
              >
                <option value="all">All Buses</option>
                {buses.map(bus => (
                  <option key={bus.id} value={bus.id}>
                    {bus.bus_number}
                  </option>
                ))}
              </select>

              <select
                value={selectedDirection}
                onChange={(e) => setSelectedDirection(e.target.value)}
                className="input-field"
                style={{ fontSize: 13 }}
              >
                <option value="all">All Directions</option>
                <option value="morning">🌅 Morning (Aland → College)</option>
                <option value="evening">🌙 Evening (College → Aland)</option>
              </select>

              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedBus('all');
                  setSelectedDirection('all');
                }}
                className="action-button"
                style={{ justifyContent: 'center' }}
              >
                <RefreshCw size={14} />
                <span>Reset</span>
              </button>
            </div>
          </div>

          {/* Stops Table */}
          <div className="stop-table">
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Bus</th>
                    <th>Stop Name</th>
                    <th>Seq</th>
                    <th>Direction</th>
                    <th>Major</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: 40 }}>
                        <div className="animate-spin" style={{ width: 24, height: 24, border: '2px solid #3b82f6', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto' }}></div>
                        <p style={{ marginTop: 12, color: 'var(--text-muted)' }}>Loading stops...</p>
                       </td>
                    </tr>
                  ) : filteredStops.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                        No stops found. Click "Add New Stop" to create one.
                       </td>
                    </tr>
                  ) : (
                    filteredStops.map((stop, idx) => (
                      <tr key={stop.id}>
                        <td>{idx + 1}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Bus size={14} color="var(--text-muted)" />
                            <span>{getBusName(stop.bus_id)}</span>
                          </div>
                        </td>
                        <td>
                          <div>
                            <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{stop.stop_name}</span>
                            {stop.landmark && (
                              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{stop.landmark}</div>
                            )}
                          </div>
                        </td>
                        <td>{stop.sequence}</td>
                        <td>
                          <span className={`info-chip ${stop.direction === 'morning' ? 'badge-morning' : 'badge-evening'}`}>
                            {stop.direction === 'morning' ? '🌅 Morning' : '🌙 Evening'}
                          </span>
                        </td>
                        <td>
                          {stop.is_major ? (
                            <Star size={14} fill="#f59e0b" color="#f59e0b" />
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>—</span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              onClick={() => handleEdit(stop)}
                              className="action-button"
                              style={{ padding: '6px 12px' }}
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              onClick={() => {
                                setStopToDelete(stop);
                                setShowDeleteModal(true);
                              }}
                              className="action-button"
                              style={{ padding: '6px 12px', background: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.2)', color: '#ef4444' }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ marginTop: 16, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
            Showing {filteredStops.length} of {stops.length} stops
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 16,
          overflowY: 'auto'
        }}>
          <div style={{
            background: 'var(--bg-card)',
            borderRadius: 24,
            maxWidth: 800,
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            border: '1px solid var(--border)'
          }}>
            <div style={{
              position: 'sticky',
              top: 0,
              background: 'var(--bg-card)',
              borderBottom: '1px solid var(--border)',
              padding: '16px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>
                {editingStop ? 'Edit Bus Stop' : 'Add New Bus Stop'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setShowMapPicker(false);
                  if (mapInstance) mapInstance.remove();
                  resetForm();
                }}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <X size={18} color="var(--text-secondary)" />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8, display: 'block' }}>
                    Select Bus *
                  </label>
                  <select
                    name="bus_id"
                    value={formData.bus_id}
                    onChange={handleInputChange}
                    required
                    className="input-field"
                  >
                    <option value="">Select a bus</option>
                    {buses.map(bus => (
                      <option key={bus.id} value={bus.id}>
                        {bus.bus_number} - {bus.route_name || 'No Route'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8, display: 'block' }}>
                    Direction *
                  </label>
                  <select
                    name="direction"
                    value={formData.direction}
                    onChange={handleInputChange}
                    required
                    className="input-field"
                  >
                    <option value="morning">🌅 Morning (Aland Checkpost → College)</option>
                    <option value="evening">🌙 Evening (College → Aland Checkpost)</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8, display: 'block' }}>
                    Stop Name *
                  </label>
                  <input
                    type="text"
                    name="stop_name"
                    value={formData.stop_name}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g., SGI College"
                    className="input-field"
                  />
                </div>

                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8, display: 'block' }}>
                    Sequence Number *
                  </label>
                  <input
                    type="number"
                    name="sequence"
                    value={formData.sequence}
                    onChange={handleInputChange}
                    required
                    placeholder="1, 2, 3..."
                    className="input-field"
                  />
                </div>

                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8, display: 'block' }}>
                    Estimated Time (minutes)
                  </label>
                  <input
                    type="number"
                    name="estimated_time"
                    value={formData.estimated_time}
                    onChange={handleInputChange}
                    placeholder="Minutes from start"
                    className="input-field"
                  />
                </div>

                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8, display: 'block' }}>
                    Landmark
                  </label>
                  <input
                    type="text"
                    name="landmark"
                    value={formData.landmark}
                    onChange={handleInputChange}
                    placeholder="Nearby landmark"
                    className="input-field"                  />
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8, display: 'block' }}>
                    Location Coordinates *
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12 }}>
                    <input
                      type="text"
                      name="latitude"
                      value={formData.latitude}
                      onChange={handleInputChange}
                      placeholder="Latitude"
                      className="input-field"
                    />
                    <input
                      type="text"
                      name="longitude"
                      value={formData.longitude}
                      onChange={handleInputChange}
                      placeholder="Longitude"
                      className="input-field"
                    />
                    <button
                      type="button"
                      onClick={getCurrentLocation}
                      className="action-button"
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      <Navigation size={14} />
                      <span>My Location</span>
                    </button>
                  </div>
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                  <button
                    type="button"
                    onClick={() => setShowMapPicker(true)}
                    className="action-button"
                    style={{ width: '100%', justifyContent: 'center', marginBottom: 12 }}
                  >
                    <Map size={16} />
                    <span>Open Map to Pick Location</span>
                  </button>
                  
                  {formData.latitude && formData.longitude && (
                    <div className="info-chip" style={{ width: '100%', justifyContent: 'center', background: 'rgba(59,130,246,0.1)' }}>
                      <MapPin size={12} />
                      <span>Selected: {parseFloat(formData.latitude).toFixed(6)}, {parseFloat(formData.longitude).toFixed(6)}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="checkbox"
                      name="is_major"
                      checked={formData.is_major}
                      onChange={handleInputChange}
                      style={{ width: 18, height: 18 }}
                    />
                    Mark as Major Stop
                  </label>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    Major stops are highlighted and shown on the main route
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
                <button
                  type="submit"
                  className="action-button primary"
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  <Save size={16} />
                  <span>{editingStop ? 'Update Stop' : 'Add Stop'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setShowMapPicker(false);
                    if (mapInstance) mapInstance.remove();
                    resetForm();
                  }}
                  className="action-button"
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  <X size={16} />
                  <span>Cancel</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Map Picker Modal */}
      {showMapPicker && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.9)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: 16
        }}>
          <div style={{
            background: 'var(--bg-card)',
            borderRadius: 24,
            width: '90%',
            height: '80%',
            display: 'flex',
            flexDirection: 'column',
            border: '1px solid var(--border)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 600 }}>Pick Location on Map</h3>
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Click or drag marker to select coordinates</p>
              </div>
              <button
                onClick={() => {
                  setShowMapPicker(false);
                  if (mapInstance) {
                    mapInstance.remove();
                    setMapInstance(null);
                    setMarkerInstance(null);
                  }
                }}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <X size={18} color="var(--text-secondary)" />
              </button>
            </div>
            
            <div ref={mapContainerRef} style={{ flex: 1, width: '100%', minHeight: 400 }}></div>
            
            <div style={{
              padding: '16px 20px',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              gap: 12,
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => {
                  setShowMapPicker(false);
                  if (mapInstance) {
                    mapInstance.remove();
                    setMapInstance(null);
                    setMarkerInstance(null);
                  }
                }}
                className="action-button"
              >
                Confirm & Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && stopToDelete && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 16
        }}>
          <div style={{
            background: 'var(--bg-card)',
            borderRadius: 24,
            maxWidth: 400,
            width: '100%',
            border: '1px solid var(--border)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: 20,
              textAlign: 'center'
            }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: 'rgba(239,68,68,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px'
              }}>
                <Trash2 size={24} color="#ef4444" />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Delete Bus Stop</h3>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20 }}>
                Are you sure you want to delete <strong>{stopToDelete.stop_name}</strong>?<br />
                This action cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={handleDelete}
                  className="action-button"
                  style={{ flex: 1, justifyContent: 'center', background: '#ef4444', color: 'white', border: 'none' }}
                >
                  <Trash2 size={14} />
                  <span>Delete</span>
                </button>
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setStopToDelete(null);
                  }}
                  className="action-button"
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  <X size={14} />
                  <span>Cancel</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default withAuth(BusStopsPage);