'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  MapPin, Navigation, Plus, Edit, Trash2, Users, Phone, 
  AlertTriangle, Menu, X, ArrowLeft, Bus, Wifi, WifiOff,
  Clock, ChevronRight, Search, Filter, RefreshCw, Gauge,
  User, Shield, Calendar, Car, Speed, Layers, Map as MapIcon
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import withAuth from '../../components/withAuth';
import dynamic from 'next/dynamic';
import { getAdminInstitution } from '../lib/getInstitution';

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
  const [mapStyle, setMapStyle] = useState('streets'); // Changed default to streets
  const [mapCenter, setMapCenter] = useState([17.3616, 78.4747]);
  const [mapZoom, setMapZoom] = useState(12);
  const mapRef = useRef(null);
  const markersRef = useRef({});
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [institutionId, setInstitutionId] = useState(null);
  const router = useRouter();

  // Tile layer configurations
  const tileLayers = {
    streets: {
      url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      name: 'Street Map'
    },
    satellite: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: '&copy; <a href="https://www.esri.com">Esri</a> | &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      name: 'Satellite'
    }
  };

  // Load Leaflet CSS and icons
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
    link.crossOrigin = '';
    document.head.appendChild(link);

    import('leaflet').then(L => {
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const activeIcon = L.divIcon({
        className: 'custom-bus-icon',
        html: `<div style="
          background: #2563EB;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 3px solid white;
          box-shadow: 0 0 15px rgba(37,99,235,0.6);
          animation: pulse 1.5s infinite;
        ">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
            <rect x="4" y="6" width="16" height="12" rx="2" />
            <circle cx="8" cy="18" r="2" />
            <circle cx="16" cy="18" r="2" />
            <path d="M8 6V4M16 6V4" />
          </svg>
        </div>
        <style>
          @keyframes pulse {
            0%,100% { transform: scale(1); box-shadow: 0 0 15px rgba(37,99,235,0.6); }
            50% { transform: scale(1.1); box-shadow: 0 0 25px rgba(37,99,235,0.9); }
          }
        </style>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16]
      });

      const offlineIcon = L.divIcon({
        className: 'custom-bus-icon',
        html: `<div style="
          background: #64748B;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid white;
          opacity: 0.7;
        ">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
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

  useEffect(() => {
    setMounted(true);
    
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
      loadInstitutionData();
    }
  }, [mounted]);

  useEffect(() => {
    if (!leafletLoaded || !mapRef.current || !busIcons.active) return;

    import('leaflet').then(L => {
      const map = mapRef.current;
      
      Object.values(markersRef.current).forEach(marker => marker.remove());
      markersRef.current = {};

      busLocations.forEach(location => {
        const bus = buses.find(b => b.id === location.bus_id);
        if (!bus) return;

        const status = getBusStatus(bus.id);
        const icon = status === 'active' ? busIcons.active : busIcons.offline;

        const marker = L.marker([location.latitude, location.longitude], { icon })
          .addTo(map)
          .bindPopup(`
            <div style="font-family: Inter, sans-serif; padding: 12px; min-width: 200px;">
              <div style="font-weight: 700; font-size: 16px; margin-bottom: 8px; color: #2563EB;">Bus ${bus.bus_number}</div>
              <div style="font-size: 12px; margin-bottom: 4px;">
                <span style="color: #666;">Route:</span> 
                <span style="color: #fff;">${bus.route_name || 'Not set'}</span>
              </div>
              <div style="font-size: 12px; margin-bottom: 4px;">
                <span style="color: #666;">Speed:</span> 
                <span style="color: #10b981;">${location.speed?.toFixed(1) || 0} km/h</span>
              </div>
              <div style="font-size: 12px; margin-bottom: 8px;">
                <span style="color: #666;">Last Update:</span> 
                <span style="color: #fff;">${formatTimeAgo(location.updated_at)}</span>
              </div>
              <button onclick="window.viewBusDetails(${bus.id})" style="width: 100%; padding: 6px; background: #2563EB; border: none; border-radius: 6px; color: white; cursor: pointer; font-size: 11px; font-weight: 600;">
                View Details →
              </button>
            </div>
          `);

        marker.on('click', () => {
          setSelectedBus(bus);
        });

        markersRef.current[bus.id] = marker;
      });

      if (busLocations.length > 0 && busLocations.length === Object.keys(markersRef.current).length) {
        const bounds = L.latLngBounds(busLocations.map(loc => [loc.latitude, loc.longitude]));
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [50, 50] });
        }
      }
    });
  }, [busLocations, leafletLoaded, busIcons, buses]);

  useEffect(() => {
    window.viewBusDetails = (busId) => {
      const bus = buses.find(b => b.id === busId);
      if (bus) setSelectedBus(bus);
    };
    return () => { delete window.viewBusDetails; };
  }, [buses]);

  const loadInstitutionData = async () => {
    try {
      const adminData = await getAdminInstitution();

      if (!adminData?.institution_id) {
        setLoading(false);
        return;
      }

      setInstitutionId(adminData.institution_id);

      await Promise.all([
        fetchBuses(adminData.institution_id),
        fetchDrivers(adminData.institution_id),
        fetchBusLocations(adminData.institution_id)
      ]);

      const interval = setInterval(() => {
        fetchBusLocations(adminData.institution_id);
      }, 5000);

      return () => clearInterval(interval);

    } catch (error) {
      console.error('Error loading institution data:', error);
      setLoading(false);
    }
  };

  const fetchBuses = async (instId) => {
    try {
      const { data, error } = await supabase
        .from('buses')
        .select('*')
        .eq('institution_id', instId)
        .order('bus_number');

      if (error) throw error;
      setBuses(data || []);
    } catch (error) {
      console.error('Error fetching buses:', error);
    }
  };

  const fetchDrivers = async (instId) => {
    try {
      const { data, error } = await supabase
        .from('drivers_new')
        .select('id, name, contact, license_no')
        .eq('institution_id', instId)
        .order('name');

      if (error) throw error;
      setDrivers(data || []);
    } catch (error) {
      console.error('Error fetching drivers:', error);
    }
  };

  const fetchBusLocations = async (instId) => {
    try {
      const thirtySecondsAgo = new Date(Date.now() - 30000).toISOString();

      const { data, error } = await supabase
        .from('bus_locations')
        .select('*')
        .eq('institution_id', instId)
        .gte('updated_at', thirtySecondsAgo)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const latestLocations = {};

      data?.forEach(location => {
        if (
          !latestLocations[location.bus_id] ||
          new Date(location.updated_at) >
            new Date(latestLocations[location.bus_id].updated_at)
        ) {
          latestLocations[location.bus_id] = location;
        }
      });

      setBusLocations(Object.values(latestLocations));

    } catch (error) {
      console.error('Error fetching bus locations:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDriverById = (driverId) => {
    return drivers.find(d => d.id === driverId);
  };

  const deleteBus = async (busId) => {
    if (!confirm('Are you sure you want to delete this bus?')) return;
    
    try {
      const { error } = await supabase
        .from('buses')
        .delete()
        .eq('id', busId)
        .eq('institution_id', institutionId);

      if (error) throw error;

      alert('Bus deleted successfully!');
      await fetchBuses(institutionId);
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
      ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-800' 
      : 'bg-slate-800/50 text-slate-400 border border-slate-700';
  };

  const getStatusIcon = (status) => {
    return status === 'active' ? <Wifi size={14} className="text-emerald-400" /> : <WifiOff size={14} className="text-slate-400" />;
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

  const centerMap = () => {
    if (mapRef.current && busLocations.length > 0) {
      import('leaflet').then(L => {
        const bounds = L.latLngBounds(busLocations.map(loc => [loc.latitude, loc.longitude]));
        if (bounds.isValid()) {
          mapRef.current.fitBounds(bounds, { padding: [50, 50] });
        }
      });
    }
  };

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

  const activeBuses = buses.filter(bus => getBusStatus(bus.id) === 'active').length;
  const offlineBuses = buses.filter(bus => getBusStatus(bus.id) === 'offline').length;
  const uniqueRoutes = [...new Set(buses.map(bus => bus.route_name).filter(Boolean))].length;

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-5">
            <div className="absolute inset-0 border-4 border-slate-700 border-t-blue-600 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 bg-blue-600 rounded-full animate-pulse"></div>
            </div>
          </div>
          <p className="text-blue-400 font-semibold">Loading bus management...</p>
        </div>
      </div>
    );
  }

  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <div className="bg-slate-800/50 border-b border-slate-700 sticky top-0 z-40 p-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="p-2 text-slate-400 hover:text-blue-400 transition-all rounded-xl hover:bg-slate-800 border border-slate-700"
            >
              <ArrowLeft size={18} />
            </button>
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 text-slate-400 hover:text-blue-400 transition-all rounded-xl hover:bg-slate-800 border border-slate-700 lg:hidden"
            >
              {isSidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <div>
              <h1 className="text-lg font-bold text-white sm:text-xl">Bus Management</h1>
              <p className="text-xs text-slate-400">{currentTime}</p>
            </div>
          </div>
          <div className="hidden lg:flex items-center gap-3">
            <span className="text-sm text-slate-400">{dateStr}</span>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all">
              <Plus size={16} />
              Add Bus
            </button>
          </div>
          <button className="lg:hidden flex items-center justify-center w-10 h-10 bg-blue-600 text-white rounded-xl">
            <Plus size={18} />
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Map Style Selector */}
        <div className="flex justify-end gap-2 mb-4">
          {Object.entries(tileLayers).map(([key, layer]) => (
            <button
              key={key}
              onClick={() => setMapStyle(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                mapStyle === key 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-slate-800 text-slate-400 hover:text-blue-400 border border-slate-700'
              }`}
            >
              {key === 'streets' ? 'Street Map' : 'Satellite'}
            </button>
          ))}
          <button
            onClick={centerMap}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 text-slate-400 hover:text-blue-400 border border-slate-700 transition-all"
          >
            <Navigation size={12} className="inline mr-1" />
            Center Map
          </button>
        </div>

        {/* Search and Filters */}
        <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-4 mb-5">
          <div className="flex items-center gap-3 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 mb-3">
            <Search size={16} className="text-slate-500" />
            <input
              type="text"
              placeholder="Search by bus number or route..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none text-slate-200 text-sm"
            />
          </div>
          
          <div className="flex gap-2 flex-wrap">
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Filter size={10} /> Status:
            </span>
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-2 py-1 rounded-full text-xs font-medium transition-all ${
                filterStatus === 'all' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-slate-800 text-slate-400 hover:text-blue-400'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterStatus('active')}
              className={`px-2 py-1 rounded-full text-xs font-medium transition-all ${
                filterStatus === 'active' 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-slate-800 text-slate-400 hover:text-emerald-400'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setFilterStatus('offline')}
              className={`px-2 py-1 rounded-full text-xs font-medium transition-all ${
                filterStatus === 'offline' 
                  ? 'bg-slate-600 text-white' 
                  : 'bg-slate-800 text-slate-400 hover:text-slate-300'
              }`}
            >
              Offline
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-slate-400">Total Buses</p>
                <p className="text-2xl font-bold text-white mt-1">{buses.length}</p>
              </div>
              <div className="p-2 bg-blue-600 rounded-xl">
                <Bus size={18} className="text-white" />
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-slate-400">Active</p>
                <p className="text-2xl font-bold text-emerald-400 mt-1">{activeBuses}</p>
              </div>
              <div className="p-2 bg-emerald-600 rounded-xl">
                <Wifi size={18} className="text-white" />
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-slate-400">Offline</p>
                <p className="text-2xl font-bold text-slate-400 mt-1">{offlineBuses}</p>
              </div>
              <div className="p-2 bg-slate-600 rounded-xl">
                <WifiOff size={18} className="text-white" />
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-slate-400">Routes</p>
                <p className="text-2xl font-bold text-cyan-400 mt-1">{uniqueRoutes}</p>
              </div>
              <div className="p-2 bg-cyan-600 rounded-xl">
                <MapPin size={18} className="text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-col lg:flex-row gap-5">
          {/* Map */}
          <div className="flex-1 bg-slate-800/50 rounded-2xl border border-slate-700 overflow-hidden">
            <div className="p-4 border-b border-slate-700">
              <h3 className="font-semibold text-white">Live Bus Tracking</h3>
              <p className="text-xs text-slate-400">{busLocations.length} buses active • Updates every 5 seconds</p>
            </div>
            <div style={{ height: 400, width: '100%' }}>
              {mapReady && leafletLoaded && (
                <MapContainer
                  center={mapCenter}
                  zoom={mapZoom}
                  style={{ height: '100%', width: '100%' }}
                  whenCreated={(map) => {
                    mapRef.current = map;
                  }}
                >
                  <TileLayer
                    key={mapStyle}
                    url={tileLayers[mapStyle].url}
                    attribution={tileLayers[mapStyle].attribution}
                  />
                </MapContainer>
              )}
            </div>
          </div>

          {/* Bus List - Desktop */}
          <div className="hidden lg:block w-80 bg-slate-800/50 rounded-2xl border border-slate-700 overflow-hidden">
            <div className="p-4 border-b border-slate-700">
              <h3 className="font-semibold text-white">All Buses ({filteredBuses.length})</h3>
            </div>
            <div className="max-h-[500px] overflow-y-auto">
              {filteredBuses.map((bus) => {
                const status = getBusStatus(bus.id);
                const location = busLocations.find(loc => loc.bus_id === bus.id);
                const driver = bus.driver_id ? getDriverById(bus.driver_id) : null;
                
                return (
                  <div 
                    key={bus.id}
                    className={`p-4 border-b border-slate-700 cursor-pointer transition-all hover:bg-slate-700/50 ${
                      selectedBus?.id === bus.id ? 'bg-blue-600/10 border-l-4 border-l-blue-500' : ''
                    }`}
                    onClick={() => setSelectedBus(bus)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-semibold text-white">Bus {bus.bus_number}</h4>
                        <p className="text-xs text-slate-400">{bus.route_name || 'No route'}</p>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                        {getStatusIcon(status)}
                        {status === 'active' ? 'LIVE' : 'OFF'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 space-y-1">
                      {driver && <div>Driver: {driver.name}</div>}
                      {location && <div>Speed: {location.speed?.toFixed(1) || 0} km/h</div>}
                      <div>{location ? formatTimeAgo(location.updated_at) : 'No data'}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Selected Bus Details */}
        {selectedBus && (
          <div className="mt-5 bg-slate-800/50 rounded-2xl border border-slate-700 p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-white">Bus {selectedBus.bus_number} Details</h3>
              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(getBusStatus(selectedBus.id))}`}>
                {getStatusIcon(getBusStatus(selectedBus.id))}
                {getBusStatus(selectedBus.id) === 'active' ? 'Live' : 'Offline'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex justify-between items-center p-3 bg-slate-900 rounded-xl border border-slate-700">
                <span className="text-sm text-slate-400">Route</span>
                <span className="text-sm text-white font-medium">{selectedBus.route_name || 'Not assigned'}</span>
              </div>

              {selectedBus.driver_id && (
                <>
                  <div className="flex justify-between items-center p-3 bg-slate-900 rounded-xl border border-slate-700">
                    <span className="text-sm text-slate-400">Driver</span>
                    <span className="text-sm text-white font-medium">{getDriverById(selectedBus.driver_id)?.name || 'Unknown'}</span>
                  </div>
                  {getDriverById(selectedBus.driver_id)?.contact && (
                    <div className="flex justify-between items-center p-3 bg-slate-900 rounded-xl border border-slate-700">
                      <span className="text-sm text-slate-400">Contact</span>
                      <span className="text-sm text-white font-medium">{getDriverById(selectedBus.driver_id)?.contact}</span>
                    </div>
                  )}
                </>
              )}

              <div className="flex justify-between items-center p-3 bg-slate-900 rounded-xl border border-slate-700">
                <span className="text-sm text-slate-400">Current KM</span>
                <span className="text-sm text-white font-medium">{selectedBus.current_km || 'N/A'}</span>
              </div>

              {busLocations.find(loc => loc.bus_id === selectedBus.id) && (
                <>
                  <div className="flex justify-between items-center p-3 bg-slate-900 rounded-xl border border-slate-700">
                    <span className="text-sm text-slate-400">Speed</span>
                    <span className="text-sm text-emerald-400 font-medium">{busLocations.find(loc => loc.bus_id === selectedBus.id)?.speed?.toFixed(1) || 0} km/h</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-slate-900 rounded-xl border border-slate-700">
                    <span className="text-sm text-slate-400">Last Updated</span>
                    <span className="text-sm text-white font-medium">{formatTimeAgo(busLocations.find(loc => loc.bus_id === selectedBus.id)?.updated_at)}</span>
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
                className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
              >
                <Navigation size={14} />
                Open in OpenStreetMap
              </button>
            )}
          </div>
        )}
      </div>

      {/* Mobile Sidebar */}
      {isSidebarOpen && (
        <>
          <div className="fixed inset-0 bg-black/80 z-45" onClick={() => setIsSidebarOpen(false)} />
          <div className="fixed top-0 left-0 bottom-0 w-80 bg-slate-800 border-r border-slate-700 z-50 flex flex-col">
            <div className="p-4 border-b border-slate-700 flex justify-between items-center">
              <h3 className="font-semibold text-white">All Buses ({filteredBuses.length})</h3>
              <button onClick={() => setIsSidebarOpen(false)} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {filteredBuses.map((bus) => {
                const status = getBusStatus(bus.id);
                const location = busLocations.find(loc => loc.bus_id === bus.id);
                const driver = bus.driver_id ? getDriverById(bus.driver_id) : null;
                
                return (
                  <div 
                    key={bus.id}
                    className={`p-4 border-b border-slate-700 cursor-pointer transition-all hover:bg-slate-700/50 ${
                      selectedBus?.id === bus.id ? 'bg-blue-600/10 border-l-4 border-l-blue-500' : ''
                    }`}
                    onClick={() => {
                      setSelectedBus(bus);
                      setIsSidebarOpen(false);
                    }}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-semibold text-white">Bus {bus.bus_number}</h4>
                        <p className="text-xs text-slate-400">{bus.route_name || 'No route'}</p>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                        {getStatusIcon(status)}
                        {status === 'active' ? 'LIVE' : 'OFF'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 space-y-1">
                      {driver && <div>Driver: {driver.name}</div>}
                      {location && <div>Speed: {location.speed?.toFixed(1) || 0} km/h</div>}
                      <div>{location ? formatTimeAgo(location.updated_at) : 'No data'}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default withAuth(BusManagement);