'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  MapPin, Navigation, Plus, Edit, Trash2, Users, Phone, 
  AlertTriangle, Menu, X, ArrowLeft, Bus, Wifi, WifiOff,
  Clock, ChevronRight, Search, Filter, RefreshCw, Gauge,
  User, Shield, Calendar, Car, Speed
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import withAuth from '../../components/withAuth';
import dynamic from 'next/dynamic';

// Dynamically import Leaflet components (to avoid SSR issues)
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });

function BusManagement() {
  const [buses, setBuses] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [busLocations, setBusLocations] = useState([]);
  const [selectedBus, setSelectedBus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [currentTime, setCurrentTime] = useState('');
  const [mapReady, setMapReady] = useState(false);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [busIcons, setBusIcons] = useState({});
  const mapRef = useRef(null);
  const markersRef = useRef({});
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const router = useRouter();

  // Load Leaflet CSS and icons
  useEffect(() => {
    // Load Leaflet CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
    link.crossOrigin = '';
    document.head.appendChild(link);

    // Load Leaflet library
    import('leaflet').then(L => {
      // Fix default icon issues
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      // Create custom bus icons
      const activeIcon = L.divIcon({
        className: 'custom-bus-icon',
        html: `<div style="
          background: #10b981;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 3px solid white;
          box-shadow: 0 0 20px #10b981;
          animation: pulse 1.5s infinite;
        ">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
            <rect x="4" y="6" width="16" height="12" rx="2" />
            <circle cx="8" cy="18" r="2" />
            <circle cx="16" cy="18" r="2" />
            <path d="M8 6V4M16 6V4" />
          </svg>
        </div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16]
      });

      const offlineIcon = L.divIcon({
        className: 'custom-bus-icon',
        html: `<div style="
          background: #6b7280;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid white;
          opacity: 0.7;
        ">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
            <rect x="4" y="6" width="16" height="12" rx="2" />
            <circle cx="8" cy="18" r="2" />
            <circle cx="16" cy="18" r="2" />
          </svg>
        </div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        popupAnchor: [0, -14]
      });

      setBusIcons({ active: activeIcon, offline: offlineIcon });
      setLeafletLoaded(true);
      setMapReady(true);
    });

    return () => {
      document.head.removeChild(link);
    };
  }, []);

  // Fix hydration error
  useEffect(() => {
    setMounted(true);
    
    // Update time
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (mounted) {
      fetchBuses();
      fetchDrivers();
      fetchBusLocations();
      
      // Refresh bus locations every 5 seconds for smooth updates
      const interval = setInterval(fetchBusLocations, 5000);
      
      return () => clearInterval(interval);
    }
  }, [mounted]);

  // Update map markers when locations change
  useEffect(() => {
    if (!leafletLoaded || !mapRef.current || !busIcons.active) return;

    import('leaflet').then(L => {
      const map = mapRef.current;
      
      // Clear existing markers
      Object.values(markersRef.current).forEach(marker => marker.remove());
      markersRef.current = {};

      // Add new markers for each bus location
      busLocations.forEach(location => {
        const bus = buses.find(b => b.id === location.bus_id);
        if (!bus) return;

        const status = getBusStatus(bus.id);
        const icon = status === 'active' ? busIcons.active : busIcons.offline;

        const marker = L.marker([location.latitude, location.longitude], { icon })
          .addTo(map)
          .bindPopup(`
            <div style="font-family: Inter, sans-serif; padding: 8px;">
              <div style="font-weight: 600; font-size: 14px; margin-bottom: 4px;">Bus ${bus.bus_number}</div>
              <div style="font-size: 12px; color: #666;">Route: ${bus.route_name || 'Not set'}</div>
              <div style="font-size: 12px; color: #666;">Speed: ${location.speed?.toFixed(1) || 0} km/h</div>
              <div style="font-size: 12px; color: #666;">Last: ${formatTimeAgo(location.updated_at)}</div>
            </div>
          `);

        marker.on('click', () => {
          setSelectedBus(bus);
        });

        markersRef.current[bus.id] = marker;
      });

      // Fit bounds to show all markers
      if (busLocations.length > 0) {
        const bounds = L.latLngBounds(busLocations.map(loc => [loc.latitude, loc.longitude]));
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    });
  }, [busLocations, leafletLoaded, busIcons]);

  const fetchBuses = async () => {
    try {
      const { data, error } = await supabase
        .from('buses')
        .select('*')
        .order('bus_number');

      if (error) throw error;
      setBuses(data || []);
    } catch (error) {
      console.error('Error fetching buses:', error);
    }
  };

  const fetchDrivers = async () => {
    try {
      const { data, error } = await supabase
        .from('drivers_new')
        .select('id, name, contact, license_no')
        .order('name');

      if (error) throw error;
      setDrivers(data || []);
    } catch (error) {
      console.error('Error fetching drivers:', error);
    }
  };

  const fetchBusLocations = async () => {
    try {
      const thirtySecondsAgo = new Date(Date.now() - 30000).toISOString();
      
      const { data, error } = await supabase
        .from('bus_locations')
        .select('*')
        .gte('updated_at', thirtySecondsAgo)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Get latest location for each bus
      const latestLocations = {};
      data?.forEach(location => {
        if (!latestLocations[location.bus_id] || new Date(location.updated_at) > new Date(latestLocations[location.bus_id].updated_at)) {
          latestLocations[location.bus_id] = location;
        }
      });

      setBusLocations(Object.values(latestLocations));
      setLoading(false);
    } catch (error) {
      console.error('Error fetching bus locations:', error);
      setLoading(false);
    }
  };

  const getDriverById = (driverId) => {
    return drivers.find(d => d.id === driverId);
  };

  const deleteBus = async (busId) => {
    if (!confirm('Are you sure you want to delete this bus? This will also delete all associated locations and stops.')) return;
    
    try {
      const { error } = await supabase
        .from('buses')
        .delete()
        .eq('id', busId);

      if (error) throw error;

      alert('Bus deleted successfully!');
      fetchBuses();
    } catch (error) {
      console.error('Error deleting bus:', error);
      alert('Error deleting bus: ' + error.message);
    }
  };

  const getBusStatus = (busId) => {
    const location = busLocations.find(loc => loc.bus_id === busId);
    if (!location) return 'offline';
    
    const lastUpdate = new Date(location.updated_at);
    const now = new Date();
    const diffMinutes = (now - lastUpdate) / (1000 * 60);
    
    return diffMinutes < 5 ? 'active' : 'offline';
  };

  const getStatusColor = (status) => {
    return status === 'active' 
      ? 'bg-green-500/10 text-green-500 border border-green-500/20' 
      : 'bg-gray-500/10 text-gray-400 border border-gray-500/20';
  };

  const getStatusIcon = (status) => {
    return status === 'active' ? <Wifi size={14} /> : <WifiOff size={14} />;
  };

  const formatTimeAgo = (dateString) => {
    if (!dateString) return 'No data';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffSeconds = Math.floor(diffMs / 1000);
    
    if (diffSeconds < 10) return 'Just now';
    if (diffSeconds < 60) return `${diffSeconds} seconds ago`;
    if (diffMins < 60) return `${diffMins} min ago`;
    return new Date(dateString).toLocaleTimeString();
  };

  const handleBack = () => {
    router.back();
  };

  // Filter buses based on search and status
  const filteredBuses = buses.filter(bus => {
    const matchesSearch = 
      (bus.bus_number?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (bus.route_name?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    
    const status = getBusStatus(bus.id);
    let matchesStatus = true;
    
    if (filterStatus === 'active') {
      matchesStatus = status === 'active';
    } else if (filterStatus === 'offline') {
      matchesStatus = status === 'offline';
    }
    
    return matchesSearch && matchesStatus;
  });

  // Calculate stats
  const activeBuses = buses.filter(bus => getBusStatus(bus.id) === 'active').length;
  const offlineBuses = buses.filter(bus => getBusStatus(bus.id) === 'offline').length;
  const uniqueRoutes = [...new Set(buses.map(bus => bus.route_name).filter(Boolean))].length;

  // Show loading until mounted
  if (!mounted || loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: '#0a0a0f',
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
        `}</style>
        <div style={{ textAlign: 'center' }}>
          <div style={{ position: 'relative', width: 80, height: 80, margin: '0 auto 20px' }}>
            <div style={{ 
              width: 80, 
              height: 80, 
              border: '4px solid #1e1e2e', 
              borderTop: '4px solid #3b82f6', 
              borderRadius: '50%', 
              animation: 'spin 1s linear infinite' 
            }}></div>
            <div style={{ 
              position: 'absolute', 
              top: '50%', 
              left: '50%', 
              transform: 'translate(-50%, -50%)', 
              width: 40, 
              height: 40, 
              background: '#3b82f6', 
              borderRadius: '50%', 
              animation: 'pulse 1.5s ease infinite' 
            }}></div>
          </div>
          <p style={{ color: '#3b82f6', fontWeight: 600 }}>Loading bus management...</p>
        </div>
      </div>
    );
  }

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
          --accent-green: #10b981;
          --accent-red: #ef4444;
          --accent-yellow: #eab308;
          --accent-purple: #8b5cf6;
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
        
        @keyframes slideIn {
          from { transform: translateX(20px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes float {
          0%,100% { transform: translateY(0px); }
          50% { transform: translateY(-5px); }
        }
        
        @keyframes glow {
          0%,100% { filter: blur(60px) opacity(0.5); }
          50% { filter: blur(80px) opacity(0.8); }
        }
        
        @keyframes pulse {
          0%,100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        
        .animate-fade-in { animation: fadeIn 0.3s ease forwards; }
        .animate-float { animation: float 3s ease-in-out infinite; }
        .animate-pulse-slow { animation: pulse 2s ease-in-out infinite; }
        
        .glass-effect {
          background: rgba(22, 22, 42, 0.8);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        
        .search-bar {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 40px;
          padding: 8px 20px;
          transition: all 0.3s ease;
        }
        
        .search-bar:focus-within {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59,130,246,0.2);
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
          background: linear-gradient(90deg, #3b82f6, #8b5cf6);
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
        
        .bus-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 16px;
          transition: all 0.3s ease;
          cursor: pointer;
        }
        
        .bus-card:hover {
          background: var(--bg-card-hover);
          border-color: #3b82f6;
          transform: translateX(4px);
        }
        
        .bus-card.selected {
          background: rgba(59,130,246,0.1);
          border-color: #3b82f6;
          box-shadow: 0 0 20px -5px rgba(59,130,246,0.3);
        }
        
        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          border-radius: 30px;
          font-size: 11px;
          font-weight: 600;
        }
        
        .info-item {
          display: flex;
          justify-content: space-between;
          padding: 8px 12px;
          background: rgba(255,255,255,0.02);
          border: 1px solid var(--border);
          border-radius: 12px;
          transition: all 0.2s ease;
        }
        
        .info-item:hover {
          background: rgba(59,130,246,0.05);
          border-color: rgba(59,130,246,0.2);
        }
        
        .filter-chip {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 30px;
          padding: 6px 14px;
          font-size: 12px;
          font-weight: 500;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .filter-chip:hover {
          border-color: #3b82f6;
          color: #3b82f6;
        }
        
        .filter-chip.active {
          background: #3b82f6;
          color: white;
          border-color: #3b82f6;
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
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          color: white;
          border: none;
        }
        
        .action-button.primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px -5px #3b82f6;
        }

        .leaflet-container {
          background: #1a1a2e !important;
        }

        .leaflet-popup-content-wrapper {
          background: var(--bg-card) !important;
          color: var(--text-primary) !important;
          border: 1px solid var(--border) !important;
          border-radius: 12px !important;
        }

        .leaflet-popup-tip {
          background: var(--bg-card) !important;
        }

        @keyframes pulse {
          0%,100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.8; }
        }

        .custom-bus-icon {
          background: transparent;
          border: none;
        }
        
        @media (max-width: 768px) {
          .stat-card { padding: 16px; }
          .bus-card { padding: 14px; }
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
          background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)',
          bottom: -150,
          right: -150,
          filter: 'blur(80px)',
          pointerEvents: 'none',
          zIndex: 0,
          animation: 'glow 10s ease-in-out infinite reverse'
        }}></div>

        {/* Mobile Header */}
        <div className="glass-effect" style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          padding: '12px 16px',
          borderBottom: '1px solid var(--border)',
          display: 'block'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                onClick={handleBack}
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
                <ArrowLeft size={18} />
              </button>
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
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
                {isSidebarOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
              <div>
                <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Bus Management</h1>
                <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{currentTime}</p>
              </div>
            </div>
            <button className="action-button primary" style={{ width: 40, height: 40, padding: 0, justifyContent: 'center' }}>
              <Plus size={18} />
            </button>
          </div>
        </div>

        <div style={{ position: 'relative', zIndex: 10, maxWidth: 1400, margin: '0 auto', padding: '16px' }}>
          {/* Desktop Header */}
          <div style={{ 
            display: 'none',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 24,
            background: 'var(--bg-card)',
            borderRadius: 20,
            padding: 20,
            border: '1px solid var(--border)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <button
                onClick={handleBack}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)'
                }}
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)' }}>Bus Management</h1>
                <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 4 }}>{dateStr} • {currentTime}</p>
              </div>
            </div>
            <button className="action-button primary" style={{ padding: '10px 20px' }}>
              <Plus size={18} />
              <span>Add Bus</span>
            </button>
          </div>

          {/* Search and Filters */}
          <div style={{ 
            background: 'var(--bg-card)',
            borderRadius: 20,
            padding: 16,
            marginBottom: 20,
            border: '1px solid var(--border)'
          }}>
            <div className="search-bar" style={{ 
              marginBottom: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 12
            }}>
              <Search size={16} color="var(--text-muted)" />
              <input
                type="text"
                placeholder="Search by bus number or route..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  fontSize: 13,
                  background: 'transparent',
                  color: 'var(--text-primary)'
                }}
              />
            </div>
            
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Filter size={12} />
                Status:
              </span>
              <button
                onClick={() => setFilterStatus('all')}
                className={`filter-chip ${filterStatus === 'all' ? 'active' : ''}`}
              >
                All
              </button>
              <button
                onClick={() => setFilterStatus('active')}
                className={`filter-chip ${filterStatus === 'active' ? 'active' : ''}`}
              >
                Active
              </button>
              <button
                onClick={() => setFilterStatus('offline')}
                className={`filter-chip ${filterStatus === 'offline' ? 'active' : ''}`}
              >
                Offline
              </button>
            </div>
          </div>

          {/* Stats */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 12,
            marginBottom: 20
          }}>
            <div className="stat-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Total Buses</p>
                  <p style={{ fontSize: 28, fontWeight: 700, color: '#3b82f6', marginTop: 4 }}>{buses.length}</p>
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
                  <Bus size={20} color="#3b82f6" />
                </div>
              </div>
            </div>

            <div className="stat-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Active</p>
                  <p style={{ fontSize: 28, fontWeight: 700, color: '#10b981', marginTop: 4 }}>{activeBuses}</p>
                </div>
                <div style={{ 
                  width: 40, 
                  height: 40, 
                  borderRadius: 12, 
                  background: 'rgba(16,185,129,0.1)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center'
                }}>
                  <Wifi size={20} color="#10b981" />
                </div>
              </div>
            </div>

            <div className="stat-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Offline</p>
                  <p style={{ fontSize: 28, fontWeight: 700, color: '#6b7280', marginTop: 4 }}>{offlineBuses}</p>
                </div>
                <div style={{ 
                  width: 40, 
                  height: 40, 
                  borderRadius: 12, 
                  background: 'rgba(107,114,128,0.1)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center'
                }}>
                  <WifiOff size={20} color="#9ca3af" />
                </div>
              </div>
            </div>

            <div className="stat-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Routes</p>
                  <p style={{ fontSize: 28, fontWeight: 700, color: '#8b5cf6', marginTop: 4 }}>{uniqueRoutes}</p>
                </div>
                <div style={{ 
                  width: 40, 
                  height: 40, 
                  borderRadius: 12, 
                  background: 'rgba(139,92,246,0.1)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center'
                }}>
                  <MapPin size={20} color="#8b5cf6" />
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Mobile Bus List Toggle */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="action-button"
              style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
            >
              <Menu size={16} />
              <span>Show Bus List ({filteredBuses.length})</span>
            </button>

            {/* Main Content Area */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Map with Moving Icons */}
              <div style={{ 
                background: 'var(--bg-card)',
                borderRadius: 20,
                border: '1px solid var(--border)',
                overflow: 'hidden',
                height: 400
              }}>
                <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
                      Live Bus Tracking
                    </h3>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      {busLocations.length} buses active • Updates every 5 seconds
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <span className="status-badge" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
                      <Wifi size={12} />
                      {activeBuses} Live
                    </span>
                  </div>
                </div>
                <div style={{ height: 332, width: '100%' }}>
                  {mapReady && leafletLoaded && (
                    <MapContainer
                      center={[17.3616, 78.4747]}
                      zoom={12}
                      style={{ height: '100%', width: '100%' }}
                      whenCreated={(map) => {
                        mapRef.current = map;
                      }}
                      zoomControl={true}
                      attributionControl={true}
                    >
                      <TileLayer
                        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      />
                      {/* Markers are added programmatically via useEffect */}
                    </MapContainer>
                  )}
                </div>
              </div>

              {/* Selected Bus Details */}
              {selectedBus ? (
                <div style={{ 
                  background: 'var(--bg-card)',
                  borderRadius: 20,
                  border: '1px solid var(--border)',
                  padding: 20
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>
                      Bus {selectedBus.bus_number} Details
                    </h3>
                    <span className={`status-badge ${getStatusColor(getBusStatus(selectedBus.id))}`}>
                      {getStatusIcon(getBusStatus(selectedBus.id))}
                      {getBusStatus(selectedBus.id) === 'active' ? 'Live' : 'Offline'}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gap: 12 }}>
                    <div className="info-item">
                      <span style={{ color: 'var(--text-muted)' }}>Route</span>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                        {selectedBus.route_name || 'Not assigned'}
                      </span>
                    </div>

                    {selectedBus.driver_id && (
                      <>
                        <div className="info-item">
                          <span style={{ color: 'var(--text-muted)' }}>Driver</span>
                          <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                            {getDriverById(selectedBus.driver_id)?.name || 'Unknown'}
                          </span>
                        </div>
                        {getDriverById(selectedBus.driver_id)?.contact && (
                          <div className="info-item">
                            <span style={{ color: 'var(--text-muted)' }}>Contact</span>
                            <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                              {getDriverById(selectedBus.driver_id)?.contact}
                            </span>
                          </div>
                        )}
                      </>
                    )}

                    <div className="info-item">
                      <span style={{ color: 'var(--text-muted)' }}>Current KM</span>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                        {selectedBus.current_km || 'N/A'}
                      </span>
                    </div>

                    {busLocations.find(loc => loc.bus_id === selectedBus.id) && (
                      <>
                        <div className="info-item">
                          <span style={{ color: 'var(--text-muted)' }}>Speed</span>
                          <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                            {busLocations.find(loc => loc.bus_id === selectedBus.id)?.speed?.toFixed(1) || '0'} km/h
                          </span>
                        </div>
                        <div className="info-item">
                          <span style={{ color: 'var(--text-muted)' }}>Last Updated</span>
                          <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                            {formatTimeAgo(busLocations.find(loc => loc.bus_id === selectedBus.id)?.updated_at)}
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  {busLocations.find(loc => loc.bus_id === selectedBus.id) && (
                    <button
                      onClick={() => {
                        const location = busLocations.find(loc => loc.bus_id === selectedBus.id);
                        if (location) {
                          window.open(`https://www.openstreetmap.org/?mlat=${location.latitude}&mlon=${location.longitude}#map=15/${location.latitude}/${location.longitude}`, '_blank');
                        }
                      }}
                      className="action-button primary"
                      style={{ width: '100%', marginTop: 16, justifyContent: 'center' }}
                    >
                      <Navigation size={14} />
                      Open in OpenStreetMap
                    </button>
                  )}
                </div>
              ) : (
                <div style={{ 
                  background: 'var(--bg-card)',
                  borderRadius: 20,
                  border: '1px solid var(--border)',
                  padding: 32,
                  textAlign: 'center'
                }}>
                  <MapPin size={40} color="var(--text-muted)" style={{ marginBottom: 12, opacity: 0.5 }} />
                  <h4 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                    No Bus Selected
                  </h4>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    Select a bus from the list to view details
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bus List Sidebar for Mobile */}
        {isSidebarOpen && (
          <>
            <div 
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.8)',
                backdropFilter: 'blur(4px)',
                zIndex: 45
              }}
              onClick={() => setIsSidebarOpen(false)}
            />
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              bottom: 0,
              width: '85%',
              maxWidth: 400,
              background: 'var(--bg-secondary)',
              borderRight: '1px solid var(--border)',
              zIndex: 50,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div style={{
                padding: 16,
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
                  All Buses ({filteredBuses.length})
                </h3>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: 'var(--text-muted)'
                  }}
                >
                  <X size={16} />
                </button>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {filteredBuses.map((bus) => {
                    const status = getBusStatus(bus.id);
                    const location = busLocations.find(loc => loc.bus_id === bus.id);
                    const driver = bus.driver_id ? getDriverById(bus.driver_id) : null;
                    
                    return (
                      <div 
                        key={bus.id}
                        className={`bus-card ${selectedBus?.id === bus.id ? 'selected' : ''}`}
                        onClick={() => {
                          setSelectedBus(bus);
                          setIsSidebarOpen(false);
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                          <div>
                            <h4 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
                              Bus {bus.bus_number}
                            </h4>
                            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                              {bus.route_name || 'No route'}
                            </p>
                          </div>
                          <span className={`status-badge ${getStatusColor(status)}`} style={{ fontSize: 10 }}>
                            {status === 'active' ? 'LIVE' : 'OFF'}
                          </span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
                          {driver && (
                            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                              <span style={{ color: 'var(--text-muted)' }}>Driver:</span>{' '}
                              <span style={{ color: 'var(--text-primary)' }}>{driver.name}</span>
                            </div>
                          )}
                          {location && (
                            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                              <span style={{ color: 'var(--text-muted)' }}>Speed:</span>{' '}
                              <span style={{ color: 'var(--text-primary)' }}>{location.speed?.toFixed(1) || 0} km/h</span>
                            </div>
                          )}
                        </div>

                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          marginTop: 12,
                          paddingTop: 8,
                          borderTop: '1px solid var(--border)',
                          fontSize: 10,
                          color: 'var(--text-muted)'
                        }}>
                          <span>
                            {location ? formatTimeAgo(location.updated_at) : 'No data'}
                          </span>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                // Edit functionality
                              }}
                              style={{ color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer' }}
                            >
                              <Edit size={12} />
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteBus(bus.id);
                              }}
                              style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
export default withAuth(BusManagement);