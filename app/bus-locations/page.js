'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Navigation, Plus, Edit, Trash2, Users, Phone, AlertTriangle, Menu, X, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import withAuth from '../../components/withAuth';

function BusManagement() {
  const [buses, setBuses] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [busLocations, setBusLocations] = useState([]);
  const [selectedBus, setSelectedBus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const router = useRouter();

  // Fix hydration error
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      fetchBuses();
      fetchDrivers();
      fetchBusLocations();
      
      // Refresh bus locations every 10 seconds
      const interval = setInterval(fetchBusLocations, 10000);
      
      return () => clearInterval(interval);
    }
  }, [mounted]);

  // 🔥 FIXED: Fetch buses without join
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

  // 🔥 NEW: Fetch drivers separately
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
      const tenSecondsAgo = new Date(Date.now() - 10000).toISOString();
      
      const { data, error } = await supabase
        .from('bus_locations')
        .select('*')
        .gte('updated_at', tenSecondsAgo)
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

  // 🔥 Helper to get driver by ID
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
    return status === 'active' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-gray-100 text-gray-800 border border-gray-200';
  };

  const getGoogleMapsUrl = (location) => {
    if (!location) {
      return "https://www.google.com/maps/embed/v1/view?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&center=17.3616,78.4747&zoom=12&maptype=roadmap";
    }
    return `https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${location.latitude},${location.longitude}&zoom=15&maptype=roadmap`;
  };

  const openInGoogleMaps = (lat, lng) => {
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleBack = () => {
    router.back();
  };

  // Show loading until mounted
  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="lg:hidden bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={handleBack}
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors p-2 rounded-lg hover:bg-gray-100"
              title="Go back"
            >
              <ArrowLeft size={20} />
            </button>
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Bus Management</h1>
              <p className="text-xs text-gray-600">Track college buses</p>
            </div>
          </div>
          <button className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-colors">
            <Plus size={16} />
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 lg:py-8">
        {/* Desktop Header */}
        <div className="hidden lg:flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors p-2 rounded-lg hover:bg-gray-100"
              title="Go back"
            >
              <ArrowLeft size={20} />
              <span className="ml-2 text-sm font-medium">Back</span>
            </button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Bus Management</h1>
              <p className="text-gray-600 mt-1">Track and manage college buses</p>
            </div>
          </div>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center w-full sm:w-auto justify-center">
            <Plus size={16} className="mr-2" />
            Add Bus
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4 mb-4 lg:mb-6">
          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-3 sm:p-4 lg:p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">Total Buses</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">{buses.length}</p>
              </div>
              <MapPin className="text-blue-400" size={18} />
            </div>
          </div>
          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-3 sm:p-4 lg:p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">Active</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600">
                  {buses.filter(bus => getBusStatus(bus.id) === 'active').length}
                </p>
              </div>
              <Navigation className="text-green-400" size={18} />
            </div>
          </div>
          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-3 sm:p-4 lg:p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">Offline</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-600">
                  {buses.filter(bus => getBusStatus(bus.id) === 'offline').length}
                </p>
              </div>
              <AlertTriangle className="text-gray-400" size={18} />
            </div>
          </div>
          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-3 sm:p-4 lg:p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">Routes</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
                  {[...new Set(buses.map(bus => bus.route_name).filter(Boolean))].length}
                </p>
              </div>
              <MapPin className="text-purple-400" size={18} />
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:grid lg:grid-cols-2 gap-4 lg:gap-6">
          {/* Bus List */}
          <div className={`lg:block ${isSidebarOpen ? 'block fixed inset-0 z-50 bg-white' : 'hidden'}`}>
            {isSidebarOpen && (
              <div className="lg:hidden flex items-center justify-between p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">All Buses ({buses.length})</h3>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-2 rounded-lg hover:bg-gray-100"
                >
                  <X size={20} />
                </button>
              </div>
            )}
            
            <div className={`space-y-4 ${isSidebarOpen ? 'p-4 h-[calc(100vh-80px)] overflow-y-auto' : ''}`}>
              {!isSidebarOpen && (
                <h3 className="text-lg font-semibold text-gray-900 hidden lg:block">
                  All Buses ({buses.length})
                </h3>
              )}
              <div className="space-y-3 lg:max-h-96 lg:overflow-y-auto">
                {buses.map((bus) => {
                  const status = getBusStatus(bus.id);
                  const location = busLocations.find(loc => loc.bus_id === bus.id);
                  const driver = bus.driver_id ? getDriverById(bus.driver_id) : null;
                  
                  return (
                    <div 
                      key={bus.id}
                      className={`bg-white rounded-lg sm:rounded-xl shadow-sm p-3 sm:p-4 border border-gray-200 cursor-pointer transition-all ${
                        selectedBus?.id === bus.id ? 'border-blue-500 bg-blue-50' : 'hover:shadow-md'
                      }`}
                      onClick={() => {
                        setSelectedBus(bus);
                        setIsSidebarOpen(false);
                      }}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 text-base sm:text-lg truncate">
                            Bus {bus.bus_number}
                          </h4>
                          <p className="text-gray-600 text-xs sm:text-sm truncate">
                            {bus.route_name || 'No route'}
                          </p>
                        </div>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full flex-shrink-0 ml-2 ${getStatusColor(status)}`}>
                          {status === 'active' ? 'Active' : 'Offline'}
                        </span>
                      </div>
                      
                      <div className="space-y-1.5 text-xs sm:text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Driver:</span>
                          <span className="text-gray-900 font-medium text-right truncate ml-2 max-w-[120px] sm:max-w-none">
                            {driver ? driver.name : 'Not assigned'}
                          </span>
                        </div>
                        
                        {driver && driver.contact && (
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">Contact:</span>
                            <span className="text-gray-900 font-medium text-right truncate ml-2 max-w-[120px]">
                              {driver.contact}
                            </span>
                          </div>
                        )}
                        
                        {location && (
                          <>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600">Speed:</span>
                              <span className="text-gray-900 font-medium">{location.speed?.toFixed(1) || '0'} km/h</span>
                            </div>
                            {location.driver_name && (
                              <div className="flex justify-between items-center">
                                <span className="text-gray-600">Current Driver:</span>
                                <span className="text-gray-900 font-medium">{location.driver_name}</span>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                      
                      <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-200">
                        <div className="text-xs text-gray-500 truncate flex-1 mr-2">
                          {location ? `Updated: ${formatDate(location.updated_at)}` : 'No recent data'}
                        </div>
                        <div className="flex space-x-1 flex-shrink-0">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              // Edit functionality here
                            }}
                            className="text-blue-600 hover:text-blue-800 p-1"
                          >
                            <Edit size={12} className="sm:hidden" />
                            <Edit size={14} className="hidden sm:block" />
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteBus(bus.id);
                            }}
                            className="text-red-600 hover:text-red-800 p-1"
                          >
                            <Trash2 size={12} className="sm:hidden" />
                            <Trash2 size={14} className="hidden sm:block" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Map and Bus Details */}
          <div className="space-y-4 flex-1">
            {/* Mobile Bus List Toggle Button */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center w-full"
            >
              <Menu size={16} className="mr-2" />
              Show Bus List ({buses.length})
            </button>

            <h3 className="text-lg font-semibold text-gray-900">
              {selectedBus ? `Bus ${selectedBus.bus_number} Details` : 'Select a Bus'}
            </h3>
              
            {/* Google Maps */}
            <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="h-64 sm:h-80">
                <iframe
                  className="w-full h-full"
                  frameBorder="0"
                  style={{ border: 0 }}
                  allowFullScreen
                  src={getGoogleMapsUrl(
                    selectedBus ? busLocations.find(loc => loc.bus_id === selectedBus.id) : null
                  )}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                ></iframe>
              </div>
            </div>

            {selectedBus && (
              <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200">
                <h4 className="font-semibold text-gray-900 text-lg mb-4">Bus Information</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                  <div>
                    <p className="text-gray-600 text-xs sm:text-sm">Bus Number</p>
                    <p className="font-medium text-gray-900 text-sm sm:text-base">{selectedBus.bus_number}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-xs sm:text-sm">Route</p>
                    <p className="font-medium text-gray-900 text-sm sm:text-base">{selectedBus.route_name || 'Not assigned'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-xs sm:text-sm">Driver</p>
                    <p className="font-medium text-gray-900 text-sm sm:text-base">
                      {selectedBus.driver_id ? getDriverById(selectedBus.driver_id)?.name || 'Not assigned' : 'Not assigned'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-xs sm:text-sm">Driver Contact</p>
                    <p className="font-medium text-gray-900 text-sm sm:text-base">
                      {selectedBus.driver_id ? getDriverById(selectedBus.driver_id)?.contact || 'N/A' : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-xs sm:text-sm">License No</p>
                    <p className="font-medium text-gray-900 text-sm sm:text-base">
                      {selectedBus.driver_id ? getDriverById(selectedBus.driver_id)?.license_no || 'N/A' : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-xs sm:text-sm">Current KM</p>
                    <p className="font-medium text-gray-900 text-sm sm:text-base">{selectedBus.current_km || 'N/A'}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-gray-600 text-xs sm:text-sm">Status</p>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(getBusStatus(selectedBus.id))}`}>
                      {getBusStatus(selectedBus.id) === 'active' ? 'Active' : 'Offline'}
                    </span>
                  </div>
                </div>
                
                {busLocations.find(loc => loc.bus_id === selectedBus.id) && (
                  <button
                    onClick={() => {
                      const location = busLocations.find(loc => loc.bus_id === selectedBus.id);
                      if (location) {
                        openInGoogleMaps(location.latitude, location.longitude);
                      }
                    }}
                    className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm w-full"
                  >
                    Open in Google Maps
                  </button>
                )}
              </div>
            )}

            {/* No Bus Selected Message */}
            {!selectedBus && (
              <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-6 border border-gray-200 text-center">
                <MapPin className="mx-auto text-gray-400 mb-3" size={32} />
                <h4 className="font-semibold text-gray-900 text-lg mb-2">No Bus Selected</h4>
                <p className="text-gray-600 text-sm">
                  Select a bus from the list to view details and location
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}
export default withAuth(BusManagement);