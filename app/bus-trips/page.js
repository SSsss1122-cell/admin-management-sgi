'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import withAuth from '../../components/withAuth';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, Search, Filter, ChevronDown, Download, RefreshCw,
  BookOpen, User, Truck, Clock, Calendar, CheckCircle, XCircle,
  AlertCircle, MoreVertical, Edit, Trash2, Eye, PlusCircle,
  Sun, Moon, Activity, Users, MapPin, Bell, LogOut, ChevronRight,
  Play, StopCircle, AlertTriangle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

function BusTripsPage() {
  const [trips, setTrips] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [dateRange, setDateRange] = useState('today');
  const [adminName, setAdminName] = useState('');
  const [stats, setStats] = useState({
    totalTrips: 0,
    activeTrips: 0,
    morningTrips: 0,
    eveningTrips: 0,
    otherTrips: 0,
    avgDuration: '0 min'
  });
  const router = useRouter();

  useEffect(() => {
    fetchTrips();
    fetchDriversAndBuses();
    const storedAdminName = localStorage.getItem('adminName');
    setAdminName(storedAdminName || 'Admin');
  }, []);

  const fetchTrips = async () => {
    try {
      setLoading(true);

      const institutionId = localStorage.getItem('institutionId');

      if (!institutionId) {
        console.error('No institutionId found in localStorage');
        return;
      }

      const { data: tripsData, error: tripsError } = await supabase
        .from('driver_trips')
        .select('*')
        .eq('institution_id', institutionId)
        .order('start_time', { ascending: false });

      if (tripsError) throw tripsError;

      const { data: driversData } = await supabase
        .from('drivers_new')
        .select('id, name, contact, license_no')
        .eq('institution_id', institutionId);

      const { data: busesData } = await supabase
        .from('buses')
        .select('id, bus_number, bus_name')
        .eq('institution_id', institutionId);

      setDrivers(driversData || []);
      setBuses(busesData || []);

      const tripsWithDetails = (tripsData || []).map(trip => ({
        ...trip,
        driver: driversData?.find(d => d.id === trip.driver_id) || null,
        bus: busesData?.find(b => b.id === trip.bus_id) || null
      }));

      setTrips(tripsWithDetails);

      const total = tripsWithDetails.length;
      const active = tripsWithDetails.filter(t => !t.end_time).length;
      const morning = tripsWithDetails.filter(t => t.trip_type === 'morning').length;
      const evening = tripsWithDetails.filter(t => t.trip_type === 'evening').length;
      const other = tripsWithDetails.filter(t => t.trip_type === 'other').length;

      const completedTrips = tripsWithDetails.filter(t => t.end_time) || [];

      let totalDuration = 0;

      completedTrips.forEach(trip => {
        const start = new Date(trip.start_time);
        const end = new Date(trip.end_time);
        totalDuration += (end - start) / (1000 * 60);
      });

      const avgDuration = completedTrips.length > 0 ? Math.round(totalDuration / completedTrips.length) : 0;

      setStats({
        totalTrips: total,
        activeTrips: active,
        morningTrips: morning,
        eveningTrips: evening,
        otherTrips: other,
        avgDuration: avgDuration > 0 ? `${avgDuration} min` : 'N/A'
      });

    } catch (error) {
      console.error('Error fetching trips:', error);
      alert('Error loading trips');
    } finally {
      setLoading(false);
    }
  };

  const fetchDriversAndBuses = async () => {
    try {
      const institutionId = localStorage.getItem('institutionId');

      if (!institutionId) {
        console.error('No institutionId found');
        return;
      }

      const [driversData, busesData] = await Promise.all([
        supabase
          .from('drivers_new')
          .select('id, name, contact, license_no')
          .eq('institution_id', institutionId),
        supabase
          .from('buses')
          .select('id, bus_number, bus_name')
          .eq('institution_id', institutionId)
      ]);

      setDrivers(driversData.data || []);
      setBuses(busesData.data || []);

    } catch (error) {
      console.error('Error fetching drivers/buses:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('adminMobile');
    localStorage.removeItem('adminName');
    localStorage.removeItem('institutionId');
    router.push('/login');
  };

  const formatDateTime = (timestamp) => {
    if (!timestamp) return '—';
    try {
      const date = new Date(timestamp);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '—';
    }
  };

  const calculateDuration = (start, end) => {
    if (!start || !end) return '—';
    try {
      const startDate = new Date(start);
      const endDate = new Date(end);
      const diffMs = endDate - startDate;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      
      if (diffHours > 0) {
        return `${diffHours}h ${mins}m`;
      }
      return `${diffMins}m`;
    } catch {
      return '—';
    }
  };

  const getDriverName = (driverId) => {
    const driver = drivers.find(d => d.id === driverId);
    return driver ? driver.name : `Driver #${driverId?.substring(0, 8)}`;
  };

  const getDriverContact = (driverId) => {
    const driver = drivers.find(d => d.id === driverId);
    return driver ? driver.contact : 'N/A';
  };

  const getBusNumber = (busId) => {
    const bus = buses.find(b => b.id === busId);
    return bus ? bus.bus_number : `Bus #${busId}`;
  };

  const getBusName = (busId) => {
    const bus = buses.find(b => b.id === busId);
    return bus ? bus.bus_name : '';
  };

  const getTripTypeColor = (type) => {
    switch(type) {
      case 'morning': return { bg: 'rgba(249,115,22,0.15)', color: '#f97316', label: 'Morning' };
      case 'evening': return { bg: 'rgba(59,130,246,0.15)', color: '#3b82f6', label: 'Evening' };
      case 'other': return { bg: 'rgba(100,116,139,0.15)', color: '#64748b', label: 'Other' };
      default: return { bg: 'rgba(100,116,139,0.15)', color: '#64748b', label: 'Unknown' };
    }
  };

  const getStatusBadge = (trip) => {
    if (!trip.end_time) {
      return {
        bg: 'rgba(16,185,129,0.15)',
        color: '#10b981',
        label: 'Active',
        icon: Play
      };
    }
    return {
      bg: 'rgba(100,116,139,0.15)',
      color: '#94a3b8',
      label: 'Completed',
      icon: CheckCircle
    };
  };

  const handleEndTrip = async (tripId) => {
    if (!confirm('Are you sure you want to end this trip?')) return;
    
    try {
      const institutionId = localStorage.getItem('institutionId');
      const { error } = await supabase
        .from('driver_trips')
        .update({ end_time: new Date().toISOString() })
        .eq('id', tripId)
        .eq('institution_id', institutionId);

      if (error) throw error;
      
      fetchTrips();
      alert('Trip ended successfully');
    } catch (error) {
      console.error('Error ending trip:', error);
      alert('Error ending trip');
    }
  };

  const handleDeleteTrip = async (tripId) => {
    if (!confirm('Are you sure you want to delete this trip? This action cannot be undone.')) return;
    
    try {
      const institutionId = localStorage.getItem('institutionId');
      const { error } = await supabase
        .from('driver_trips')
        .delete()
        .eq('id', tripId)
        .eq('institution_id', institutionId);

      if (error) throw error;
      
      fetchTrips();
      alert('Trip deleted successfully');
    } catch (error) {
      console.error('Error deleting trip:', error);
      alert('Error deleting trip');
    }
  };

  const filteredTrips = trips.filter(trip => {
    const driverName = getDriverName(trip.driver_id).toLowerCase();
    const busNumber = getBusNumber(trip.bus_id).toLowerCase();
    const tripType = (trip.trip_type || '').toLowerCase();
    
    const matchesSearch = searchTerm === '' || 
      driverName.includes(searchTerm.toLowerCase()) ||
      busNumber.includes(searchTerm.toLowerCase()) ||
      tripType.includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === 'all' ||
      (filterStatus === 'active' && !trip.end_time) ||
      (filterStatus === 'completed' && trip.end_time);

    const matchesType = filterType === 'all' || trip.trip_type === filterType;

    let matchesDate = true;
    if (dateRange !== 'all') {
      const tripDate = new Date(trip.start_time).toDateString();
      const today = new Date().toDateString();
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      
      if (dateRange === 'today') {
        matchesDate = tripDate === today;
      } else if (dateRange === 'yesterday') {
        matchesDate = tripDate === yesterday;
      } else if (dateRange === 'week') {
        const weekAgo = new Date(Date.now() - 7 * 86400000);
        matchesDate = new Date(trip.start_time) >= weekAgo;
      }
    }

    return matchesSearch && matchesStatus && matchesType && matchesDate;
  });

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
        {/* Header */}
        <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-5 lg:p-6 mb-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex items-center gap-4">
              <Link
                href="/home"
                className="p-2 text-slate-400 hover:text-blue-400 transition-all rounded-xl hover:bg-slate-800 border border-slate-700"
              >
                <ArrowLeft size={20} />
              </Link>
              <div>
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-600 rounded-2xl">
                    <BookOpen className="text-white" size={24} />
                  </div>
                  <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-white">
                      Bus Trips Management
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">
                      Track driver attendance and trip history
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={fetchTrips}
                className="p-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-400 hover:text-blue-400 hover:border-blue-500 transition-all"
                title="Refresh"
              >
                <RefreshCw size={18} />
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center text-sm bg-red-600 text-white px-4 py-2 rounded-xl hover:bg-red-700 transition-all"
              >
                <LogOut size={16} className="mr-2" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-600 rounded-xl">
                <BookOpen className="text-white" size={16} />
              </div>
              <span className="text-xs font-medium text-blue-400 bg-blue-950/50 px-2 py-0.5 rounded-full border border-blue-800">Total</span>
            </div>
            <p className="text-2xl font-bold text-white">{stats.totalTrips}</p>
            <p className="text-xs text-slate-400">All time</p>
          </div>

          <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-emerald-600 rounded-xl">
                <Activity className="text-white" size={16} />
              </div>
              <span className="text-xs font-medium text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-800">Active</span>
            </div>
            <p className="text-2xl font-bold text-white">{stats.activeTrips}</p>
            <p className="text-xs text-slate-400">{stats.activeTrips > 0 ? '● Live now' : 'No active trips'}</p>
          </div>

          <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-orange-600 rounded-xl">
                <Sun className="text-white" size={16} />
              </div>
              <span className="text-xs font-medium text-orange-400 bg-orange-950/50 px-2 py-0.5 rounded-full border border-orange-800">Morning</span>
            </div>
            <p className="text-2xl font-bold text-white">{stats.morningTrips}</p>
            <p className="text-xs text-slate-400">8:00 - 9:30 AM</p>
          </div>

          <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-cyan-600 rounded-xl">
                <Moon className="text-white" size={16} />
              </div>
              <span className="text-xs font-medium text-cyan-400 bg-cyan-950/50 px-2 py-0.5 rounded-full border border-cyan-800">Evening</span>
            </div>
            <p className="text-2xl font-bold text-white">{stats.eveningTrips}</p>
            <p className="text-xs text-slate-400">4:30 - 6:00 PM</p>
          </div>

          <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-slate-600 rounded-xl">
                <Clock className="text-white" size={16} />
              </div>
              <span className="text-xs font-medium text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">Avg Duration</span>
            </div>
            <p className="text-2xl font-bold text-white">{stats.avgDuration}</p>
            <p className="text-xs text-slate-400">Completed trips</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-5 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" size={18} />
              <input
                type="text"
                placeholder="Search by driver, bus, or trip type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 text-slate-200 placeholder-slate-500"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 text-slate-200 cursor-pointer"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </select>

              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 text-slate-200 cursor-pointer"
              >
                <option value="all">All Types</option>
                <option value="morning">Morning</option>
                <option value="evening">Evening</option>
                <option value="other">Other</option>
              </select>

              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 text-slate-200 cursor-pointer"
              >
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="week">Last 7 Days</option>
                <option value="all">All Time</option>
              </select>
            </div>
          </div>
        </div>

        {/* Trips Table */}
        <div className="bg-slate-800/50 rounded-2xl border border-slate-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <h3 className="font-semibold text-white">Driver Trips</h3>
              <span className="px-2 py-0.5 bg-blue-950/50 text-blue-400 rounded-full text-xs border border-blue-800">
                {filteredTrips.length} trips
              </span>
            </div>
            <button onClick={fetchTrips} className="p-2 text-slate-400 hover:text-blue-400 transition-colors">
              <RefreshCw size={16} />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-700 border-t-blue-600"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-900 border-b border-slate-700">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Driver & Bus</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Trip Type</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Start Time</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">End Time</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Duration</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Date</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {filteredTrips.length > 0 ? (
                    filteredTrips.map((trip) => {
                      const typeStyle = getTripTypeColor(trip.trip_type);
                      const status = getStatusBadge(trip);
                      const StatusIcon = status.icon;
                      
                      return (
                        <tr key={trip.id} className="hover:bg-slate-700/30 transition-colors">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                                {getDriverName(trip.driver_id).charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-medium text-white">{getDriverName(trip.driver_id)}</div>
                                <div className="text-xs text-slate-500">{getDriverContact(trip.driver_id)}</div>
                                <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                  <Truck size={10} />
                                  {getBusNumber(trip.bus_id)} {getBusName(trip.bus_id)}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium" style={{ 
                              background: typeStyle.bg,
                              color: typeStyle.color
                            }}>
                              {typeStyle.label}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-slate-300 text-sm">{formatDateTime(trip.start_time)}</td>
                          <td className="px-5 py-4 text-slate-300 text-sm">{trip.end_time ? formatDateTime(trip.end_time) : '—'}</td>
                          <td className="px-5 py-4 text-slate-300 text-sm">{calculateDuration(trip.start_time, trip.end_time)}</td>
                          <td className="px-5 py-4 text-slate-300 text-sm">{new Date(trip.start_time).toLocaleDateString()}</td>
                          <td className="px-5 py-4">
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium" style={{ 
                              background: status.bg,
                              color: status.color
                            }}>
                              <StatusIcon size={10} />
                              {status.label}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex gap-2">
                              {!trip.end_time && (
                                <button
                                  onClick={() => handleEndTrip(trip.id)}
                                  className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-600/20 transition-colors"
                                  title="End Trip"
                                >
                                  <StopCircle size={14} />
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteTrip(trip.id)}
                                className="p-1.5 rounded-lg text-red-400 hover:bg-red-600/20 transition-colors"
                                title="Delete"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="8" className="px-5 py-12 text-center">
                        <BookOpen size={48} className="mx-auto text-slate-600 mb-4" />
                        <h3 className="text-lg font-semibold text-white mb-2">No trips found</h3>
                        <p className="text-slate-400">Try adjusting your filters or search criteria</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Info Footer */}
        <div className="mt-6 bg-slate-800/30 rounded-xl border border-slate-700 p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-blue-400" />
            <span className="text-xs text-slate-400">
              Trip types are automatically determined by start time:
              <span className="text-orange-400 ml-1">Morning (8:00-9:30)</span>
              <span className="text-cyan-400 ml-2">Evening (16:30-18:00)</span>
              <span className="text-slate-400 ml-2">Other</span>
            </span>
          </div>
          <div className="flex gap-4">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
              <span className="text-xs text-slate-400">Active</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-slate-500 rounded-full"></div>
              <span className="text-xs text-slate-400">Completed</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default withAuth(BusTripsPage);