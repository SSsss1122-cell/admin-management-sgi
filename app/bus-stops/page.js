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
import { getAdminInstitution } from '../lib/getInstitution';

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
  const [institutionId, setInstitutionId] = useState(null);
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

  const loadInstitutionData = async () => {
    try {
      const adminData = await getAdminInstitution();
      if (adminData?.institution_id) {
        setInstitutionId(adminData.institution_id);
      } else {
        setFormError('No institution assigned to admin');
      }
    } catch (error) {
      console.error('Error loading institution:', error);
      setFormError('Failed to load institution data');
    }
  };

  const fetchBuses = async () => {
    try {
      const { data, error } = await supabase
        .from('buses')
        .select('id, bus_number, route_name, is_active')
        .eq('institution_id', institutionId)
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
        .select(`
          *,
          buses (
            id,
            bus_number,
            route_name
          )
        `)
        .eq('institution_id', institutionId)
        .order('bus_id', { ascending: true })
        .order('direction', { ascending: true })
        .order('sequence', { ascending: true });

      if (error) throw error;
      setStops(data || []);
    } catch (error) {
      console.error('Error fetching stops:', error);
      setFormError('Failed to fetch stops');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInstitutionData();
  }, []);

  useEffect(() => {
    if (institutionId) {
      fetchBuses();
      fetchStops();
    }
  }, [institutionId]);

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
            institution_id: institutionId,
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
          .eq('id', editingStop.id)
          .eq('institution_id', institutionId);

        if (error) throw error;
        setFormSuccess('Stop updated successfully!');
      } else {
        const { error } = await supabase
          .from('bus_stops')
          .insert([{
            institution_id: institutionId,
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
    if (stop.institution_id !== institutionId) {
      setFormError('Unauthorized access');
      return;
    }
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
      if (stopToDelete.institution_id !== institutionId) {
        setFormError('Unauthorized delete attempt');
        return;
      }

      const { error } = await supabase
        .from('bus_stops')
        .delete()
        .eq('id', stopToDelete.id)
        .eq('institution_id', institutionId);

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
    <div className="min-h-screen bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
        {/* Header */}
        <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-5 lg:p-6 mb-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="p-2 text-slate-400 hover:text-blue-400 transition-all rounded-xl hover:bg-slate-800 border border-slate-700"
              >
                <ChevronLeft size={20} />
              </button>
              <div>
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-600 rounded-2xl">
                    <MapPin className="text-white" size={24} />
                  </div>
                  <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-white">
                      Bus Stops Management
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">
                      Manage bus stops, routes and sequences
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Link href="/bus-route-mapper">
                <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all">
                  <Map size={16} />
                  Build Route from Map
                </button>
              </Link>
              <button onClick={openAddModal} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all">
                <Plus size={16} />
                Add Stop
              </button>
            </div>
          </div>
        </div>

        {/* Success/Error Messages */}
        {formSuccess && (
          <div className="mb-5 p-3 bg-emerald-950/50 border border-emerald-800 rounded-xl flex items-center gap-2">
            <CheckCircle size={16} className="text-emerald-400" />
            <span className="text-emerald-400 text-sm">{formSuccess}</span>
          </div>
        )}
        {formError && (
          <div className="mb-5 p-3 bg-red-950/50 border border-red-800 rounded-xl flex items-center gap-2">
            <AlertCircle size={16} className="text-red-400" />
            <span className="text-red-400 text-sm">{formError}</span>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-slate-400">Total Stops</p>
                <p className="text-2xl font-bold text-white mt-1">{stops.length}</p>
              </div>
              <div className="p-2 bg-blue-600 rounded-xl">
                <MapPin className="text-white" size={18} />
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-slate-400">Active Buses</p>
                <p className="text-2xl font-bold text-white mt-1">{buses.filter(b => b.is_active).length}</p>
              </div>
              <div className="p-2 bg-cyan-600 rounded-xl">
                <Bus className="text-white" size={18} />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-5 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2">
              <Search size={14} className="text-slate-500" />
              <input
                type="text"
                placeholder="Search stops..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-slate-200 text-sm"
              />
            </div>
            
            <select
              value={selectedBus}
              onChange={(e) => setSelectedBus(e.target.value)}
              className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-blue-500"
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
              className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-blue-500"
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
              className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-400 hover:text-blue-400 transition-all text-sm"
            >
              <RefreshCw size={14} />
              Reset
            </button>
          </div>
        </div>

        {/* Stops Table */}
        <div className="bg-slate-800/50 rounded-2xl border border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-900 border-b border-slate-700">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">#</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Bus</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Stop Name</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Seq</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Direction</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Major</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-5 py-12 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent mx-auto mb-3"></div>
                      <p className="text-slate-400 text-sm">Loading stops...</p>
                    </td>
                  </tr>
                ) : filteredStops.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-5 py-12 text-center text-slate-400">
                      No stops found. Click "Add Stop" to create one.
                    </td>
                  </tr>
                ) : (
                  filteredStops.map((stop, idx) => (
                    <tr key={stop.id} className="hover:bg-slate-700/30 transition-colors">
                      <td className="px-5 py-3 text-sm text-slate-400">{idx + 1}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <Bus size={14} className="text-slate-500" />
                          <span className="text-sm text-slate-300">{getBusName(stop.bus_id)}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div>
                          <span className="text-sm font-medium text-white">{stop.stop_name}</span>
                          {stop.landmark && (
                            <div className="text-xs text-slate-500">{stop.landmark}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-300">{stop.sequence}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                          stop.direction === 'morning' 
                            ? 'bg-orange-950/50 text-orange-400 border border-orange-800' 
                            : 'bg-cyan-950/50 text-cyan-400 border border-cyan-800'
                        }`}>
                          {stop.direction === 'morning' ? '🌅 Morning' : '🌙 Evening'}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        {stop.is_major ? (
                          <Star size={14} className="text-amber-400 fill-amber-400" />
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(stop)}
                            className="p-1.5 rounded-lg text-blue-400 hover:bg-blue-600/20 transition-colors"
                            title="Edit"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => {
                              setStopToDelete(stop);
                              setShowDeleteModal(true);
                            }}
                            className="p-1.5 rounded-lg text-red-400 hover:bg-red-600/20 transition-colors"
                            title="Delete"
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

        <div className="mt-4 text-center text-xs text-slate-500">
          Showing {filteredStops.length} of {stops.length} stops
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-slate-800 border-b border-slate-700 px-6 py-4 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-xl">
                  {editingStop ? <Edit className="text-white" size={20} /> : <MapPin className="text-white" size={20} />}
                </div>
                <h2 className="text-xl font-bold text-white">
                  {editingStop ? 'Edit Bus Stop' : 'Add New Bus Stop'}
                </h2>
              </div>
              <button
                onClick={() => {
                  setShowModal(false);
                  setShowMapPicker(false);
                  if (mapInstance) mapInstance.remove();
                  resetForm();
                }}
                className="p-2 text-slate-400 hover:text-slate-300 hover:bg-slate-700 rounded-lg transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Select Bus *</label>
                  <select
                    name="bus_id"
                    value={formData.bus_id}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 text-slate-200"
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
                  <label className="block text-sm font-medium text-slate-300 mb-2">Direction *</label>
                  <select
                    name="direction"
                    value={formData.direction}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 text-slate-200"
                  >
                    <option value="morning">🌅 Morning (Aland → College)</option>
                    <option value="evening">🌙 Evening (College → Aland)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Stop Name *</label>
                  <input
                    type="text"
                    name="stop_name"
                    value={formData.stop_name}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g., SGI College"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Sequence Number *</label>
                  <input
                    type="number"
                    name="sequence"
                    value={formData.sequence}
                    onChange={handleInputChange}
                    required
                    placeholder="1, 2, 3..."
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Estimated Time (minutes)</label>
                  <input
                    type="number"
                    name="estimated_time"
                    value={formData.estimated_time}
                    onChange={handleInputChange}
                    placeholder="Minutes from start"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Landmark</label>
                  <input
                    type="text"
                    name="landmark"
                    value={formData.landmark}
                    onChange={handleInputChange}
                    placeholder="Nearby landmark"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 text-slate-200"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-2">Location Coordinates *</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input
                      type="text"
                      name="latitude"
                      value={formData.latitude}
                      onChange={handleInputChange}
                      placeholder="Latitude"
                      className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 text-slate-200"
                    />
                    <input
                      type="text"
                      name="longitude"
                      value={formData.longitude}
                      onChange={handleInputChange}
                      placeholder="Longitude"
                      className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 text-slate-200"
                    />
                    <button
                      type="button"
                      onClick={getCurrentLocation}
                      className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-700 rounded-lg text-slate-300 hover:text-blue-400 transition-all"
                    >
                      <Navigation size={14} />
                      My Location
                    </button>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <button
                    type="button"
                    onClick={() => setShowMapPicker(true)}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-700 rounded-lg text-slate-300 hover:text-blue-400 transition-all mb-3"
                  >
                    <Map size={16} />
                    Open Map to Pick Location
                  </button>
                  
                  {formData.latitude && formData.longitude && (
                    <div className="flex items-center justify-center gap-2 p-2 bg-blue-950/50 rounded-lg border border-blue-800">
                      <MapPin size={12} className="text-blue-400" />
                      <span className="text-xs text-blue-400">
                        Selected: {parseFloat(formData.latitude).toFixed(6)}, {parseFloat(formData.longitude).toFixed(6)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="is_major"
                      checked={formData.is_major}
                      onChange={handleInputChange}
                      className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-slate-300">Mark as Major Stop</span>
                  </label>
                  <p className="text-xs text-slate-500 mt-1 ml-6">Major stops are highlighted and shown on the main route</p>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-700">
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
                >
                  <Save size={16} />
                  {editingStop ? 'Update Stop' : 'Add Stop'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setShowMapPicker(false);
                    if (mapInstance) mapInstance.remove();
                    resetForm();
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-all"
                >
                  <X size={16} />
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Map Picker Modal */}
      {showMapPicker && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 w-[90vw] h-[80vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-700 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-white">Pick Location on Map</h3>
                <p className="text-xs text-slate-400">Click or drag marker to select coordinates</p>
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
                className="p-2 text-slate-400 hover:text-slate-300 hover:bg-slate-700 rounded-lg transition-all"
              >
                <X size={20} />
              </button>
            </div>
            
            <div ref={mapContainerRef} className="flex-1 w-full min-h-[400px]"></div>
            
            <div className="px-6 py-4 border-t border-slate-700 flex justify-end">
              <button
                onClick={() => {
                  setShowMapPicker(false);
                  if (mapInstance) {
                    mapInstance.remove();
                    setMapInstance(null);
                    setMarkerInstance(null);
                  }
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
              >
                Confirm & Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && stopToDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 max-w-md w-full">
            <div className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-red-950/50 flex items-center justify-center mx-auto mb-4">
                <Trash2 size={24} className="text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Delete Bus Stop</h3>
              <p className="text-sm text-slate-400 mb-4">
                Are you sure you want to delete <span className="font-medium text-white">{stopToDelete.stop_name}</span>?<br />
                This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleDelete}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setStopToDelete(null);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-all"
                >
                  <X size={14} />
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default withAuth(BusStopsPage);