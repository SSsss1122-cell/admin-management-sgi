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
      
      // First fetch all trips
      const { data: tripsData, error: tripsError } = await supabase
        .from('driver_trips')
        .select('*')
        .order('start_time', { ascending: false });

      if (tripsError) throw tripsError;

      // Then fetch drivers and buses separately to avoid join issues
      const { data: driversData } = await supabase
        .from('drivers_new')
        .select('id, name, contact, license_no');

      const { data: busesData } = await supabase
        .from('buses')
        .select('id, bus_number, bus_name');

      setDrivers(driversData || []);
      setBuses(busesData || []);
      
      // Combine the data
      const tripsWithDetails = (tripsData || []).map(trip => ({
        ...trip,
        driver: driversData?.find(d => d.id === trip.driver_id) || null,
        bus: busesData?.find(b => b.id === trip.bus_id) || null
      }));

      setTrips(tripsWithDetails);

      // Calculate stats
      const total = tripsWithDetails.length;
      const active = tripsWithDetails.filter(t => !t.end_time).length;
      const morning = tripsWithDetails.filter(t => t.trip_type === 'morning').length;
      const evening = tripsWithDetails.filter(t => t.trip_type === 'evening').length;
      const other = tripsWithDetails.filter(t => t.trip_type === 'other').length;

      // Calculate average duration for completed trips
      const completedTrips = tripsWithDetails.filter(t => t.end_time) || [];
      let totalDuration = 0;
      completedTrips.forEach(trip => {
        const start = new Date(trip.start_time);
        const end = new Date(trip.end_time);
        const duration = (end - start) / (1000 * 60); // minutes
        totalDuration += duration;
      });
      const avgDuration = completedTrips.length > 0 
        ? Math.round(totalDuration / completedTrips.length) 
        : 0;

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
      // Show user-friendly error
      alert('Error loading trips. Please check your database connection.');
    } finally {
      setLoading(false);
    }
  };

  const fetchDriversAndBuses = async () => {
    try {
      const [driversData, busesData] = await Promise.all([
        supabase.from('drivers_new').select('id, name, contact, license_no'),
        supabase.from('buses').select('id, bus_number, bus_name')
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

  const formatTimeOnly = (timestamp) => {
    if (!timestamp) return '—';
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString('en-US', {
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
      case 'morning': return { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b', label: 'Morning' };
      case 'evening': return { bg: 'rgba(59,130,246,0.15)', color: '#3b82f6', label: 'Evening' };
      case 'other': return { bg: 'rgba(156,163,175,0.15)', color: '#9ca3af', label: 'Other' };
      default: return { bg: 'rgba(156,163,175,0.15)', color: '#9ca3af', label: 'Unknown' };
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
      bg: 'rgba(107,114,128,0.15)',
      color: '#6b7280',
      label: 'Completed',
      icon: CheckCircle
    };
  };

  const handleEndTrip = async (tripId) => {
    if (!confirm('Are you sure you want to end this trip?')) return;
    
    try {
      const { error } = await supabase
        .from('driver_trips')
        .update({ end_time: new Date().toISOString() })
        .eq('id', tripId);

      if (error) throw error;
      
      fetchTrips(); // Refresh data
      alert('Trip ended successfully');
    } catch (error) {
      console.error('Error ending trip:', error);
      alert('Error ending trip');
    }
  };

  const handleDeleteTrip = async (tripId) => {
    if (!confirm('Are you sure you want to delete this trip? This action cannot be undone.')) return;
    
    try {
      const { error } = await supabase
        .from('driver_trips')
        .delete()
        .eq('id', tripId);

      if (error) throw error;
      
      fetchTrips(); // Refresh data
      alert('Trip deleted successfully');
    } catch (error) {
      console.error('Error deleting trip:', error);
      alert('Error deleting trip');
    }
  };

  // Filter trips based on search, status, type, and date
  const filteredTrips = trips.filter(trip => {
    // Search filter
    const driverName = getDriverName(trip.driver_id).toLowerCase();
    const busNumber = getBusNumber(trip.bus_id).toLowerCase();
    const tripType = (trip.trip_type || '').toLowerCase();
    
    const matchesSearch = searchTerm === '' || 
      driverName.includes(searchTerm.toLowerCase()) ||
      busNumber.includes(searchTerm.toLowerCase()) ||
      tripType.includes(searchTerm.toLowerCase());

    // Status filter
    const matchesStatus = filterStatus === 'all' ||
      (filterStatus === 'active' && !trip.end_time) ||
      (filterStatus === 'completed' && trip.end_time);

    // Type filter
    const matchesType = filterType === 'all' || trip.trip_type === filterType;

    // Date filter
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
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%)' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        
        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        body { font-family: 'Inter', sans-serif; }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .page-container {
          max-width: 1600px;
          margin: 0 auto;
          padding: 24px 32px;
          animation: fadeIn 0.4s ease;
        }
        
        /* Header */
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 32px;
        }
        
        .header-left {
          display: flex;
          align-items: center;
          gap: 20px;
        }
        
        .back-button {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.05);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #a0a0c0;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .back-button:hover {
          background: rgba(255,255,255,0.05);
          border-color: rgba(139,92,246,0.3);
          color: #8b5cf6;
        }
        
        .header-title h1 {
          font-size: 28px;
          font-weight: 700;
          color: white;
          margin-bottom: 4px;
        }
        
        .header-title p {
          font-size: 14px;
          color: #6b6b8b;
        }
        
        .header-actions {
          display: flex;
          gap: 12px;
        }
        
        .header-button {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          border-radius: 40px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.05);
          color: #a0a0c0;
        }
        
        .header-button:hover {
          background: rgba(255,255,255,0.05);
          border-color: rgba(139,92,246,0.3);
          color: white;
        }
        
        .header-button.primary {
          background: linear-gradient(135deg, #8b5cf6, #6366f1);
          border: none;
          color: white;
        }
        
        .header-button.primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 20px -10px #8b5cf6;
        }
        
        /* Stats Grid */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 20px;
          margin-bottom: 32px;
        }
        
        @media (max-width: 1200px) { .stats-grid { grid-template-columns: repeat(3, 1fr); } }
        @media (max-width: 768px) { .stats-grid { grid-template-columns: repeat(2, 1fr); } }
        
        .stat-card {
          background: rgba(22,22,42,0.6);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 20px;
          padding: 20px;
          transition: all 0.3s ease;
        }
        
        .stat-card:hover {
          transform: translateY(-5px);
          background: rgba(28,28,52,0.8);
          border-color: rgba(139,92,246,0.3);
        }
        
        .stat-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }
        
        .stat-icon {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .stat-label {
          font-size: 14px;
          color: #a0a0c0;
          font-weight: 500;
        }
        
        .stat-value {
          font-size: 32px;
          font-weight: 700;
          font-family: monospace;
          margin-bottom: 4px;
        }
        
        .stat-trend {
          font-size: 12px;
          color: #6b6b8b;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        
        /* Filters Bar */
        .filters-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          flex-wrap: wrap;
          gap: 16px;
        }
        
        .search-box {
          flex: 1;
          min-width: 300px;
          display: flex;
          align-items: center;
          gap: 12px;
          background: rgba(22,22,42,0.6);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 40px;
          padding: 8px 20px;
        }
        
        .search-box input {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          color: white;
          font-size: 14px;
        }
        
        .search-box input::placeholder {
          color: #6b6b8b;
        }
        
        .filter-group {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }
        
        .filter-select {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: rgba(22,22,42,0.6);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 40px;
          color: #a0a0c0;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .filter-select:hover {
          background: rgba(28,28,52,0.8);
          border-color: rgba(139,92,246,0.3);
        }
        
        .filter-select select {
          background: transparent;
          border: none;
          outline: none;
          color: white;
          font-size: 13px;
          cursor: pointer;
        }
        
        .filter-select select option {
          background: #1a1a2e;
          color: white;
        }
        
        /* Trips Table */
        .trips-table-container {
          background: rgba(22,22,42,0.6);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 24px;
          overflow: hidden;
          margin-bottom: 32px;
        }
        
        .table-header {
          padding: 20px 24px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(0,0,0,0.2);
        }
        
        .table-title {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .table-title h3 {
          font-size: 18px;
          font-weight: 600;
          color: white;
        }
        
        .trip-count {
          padding: 4px 12px;
          background: rgba(139,92,246,0.15);
          border-radius: 40px;
          font-size: 12px;
          color: #8b5cf6;
          font-weight: 600;
        }
        
        .table-actions {
          display: flex;
          gap: 8px;
        }
        
        .table-action-btn {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.05);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #a0a0c0;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .table-action-btn:hover {
          background: rgba(139,92,246,0.15);
          color: #8b5cf6;
        }
        
        .trips-table {
          width: 100%;
          border-collapse: collapse;
        }
        
        .trips-table th {
          text-align: left;
          padding: 16px 24px;
          font-size: 12px;
          font-weight: 600;
          color: #6b6b8b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        
        .trips-table td {
          padding: 20px 24px;
          font-size: 14px;
          color: white;
          border-bottom: 1px solid rgba(255,255,255,0.03);
        }
        
        .trips-table tr:last-child td {
          border-bottom: none;
        }
        
        .trips-table tr:hover td {
          background: rgba(255,255,255,0.02);
        }
        
        .driver-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .driver-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, #8b5cf6, #6366f1);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 14px;
          color: white;
        }
        
        .driver-details {
          display: flex;
          flex-direction: column;
        }
        
        .driver-name {
          font-weight: 600;
          margin-bottom: 2px;
        }
        
        .driver-contact {
          font-size: 11px;
          color: #a0a0c0;
        }
        
        .bus-number {
          font-size: 12px;
          color: #a0a0c0;
          display: flex;
          align-items: center;
          gap: 4px;
          margin-top: 2px;
        }
        
        .type-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 40px;
          font-size: 12px;
          font-weight: 600;
        }
        
        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 12px;
          border-radius: 40px;
          font-size: 12px;
          font-weight: 600;
        }
        
        .action-buttons {
          display: flex;
          gap: 8px;
        }
        
        .action-btn {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.05);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #a0a0c0;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .action-btn:hover {
          background: rgba(139,92,246,0.15);
          color: #8b5cf6;
        }
        
        .action-btn.delete:hover {
          background: rgba(239,68,68,0.15);
          color: #ef4444;
        }
        
        .action-btn.end:hover {
          background: rgba(16,185,129,0.15);
          color: #10b981;
        }
        
        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: #6b6b8b;
        }
        
        .empty-state svg {
          margin-bottom: 16px;
          opacity: 0.3;
        }
        
        .empty-state h3 {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 8px;
          color: #a0a0c0;
        }
        
        .empty-state p {
          font-size: 14px;
        }
        
        /* Loading */
        .loading-container {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 400px;
        }
        
        .loading-spinner {
          width: 48px;
          height: 48px;
          border: 3px solid rgba(139,92,246,0.1);
          border-top: 3px solid #8b5cf6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      <div className="page-container">
        {/* Header */}
        <div className="page-header">
          <div className="header-left">
            <Link href="/" className="back-button">
              <ArrowLeft size={20} />
            </Link>
            <div className="header-title">
              <h1>Bus Trips Management</h1>
              <p>Track driver attendance and trip history</p>
            </div>
          </div>
          <div className="header-actions">
            <button className="header-button" onClick={fetchTrips}>
              <RefreshCw size={16} />
              Refresh
            </button>
            <button className="header-button">
              <Download size={16} />
              Export
            </button>
            <button className="header-button" onClick={handleLogout}>
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-header">
              <div className="stat-icon" style={{ background: 'rgba(139,92,246,0.1)' }}>
                <BookOpen size={20} color="#8b5cf6" />
              </div>
              <div className="stat-label">Total Trips</div>
            </div>
            <div className="stat-value" style={{ color: '#8b5cf6' }}>{stats.totalTrips}</div>
            <div className="stat-trend">All time</div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.1)' }}>
                <Activity size={20} color="#10b981" />
              </div>
              <div className="stat-label">Active Trips</div>
            </div>
            <div className="stat-value" style={{ color: '#10b981' }}>{stats.activeTrips}</div>
            <div className="stat-trend">
              {stats.activeTrips > 0 ? '● Live now' : 'No active trips'}
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <div className="stat-icon" style={{ background: 'rgba(245,158,11,0.1)' }}>
                <Sun size={20} color="#f59e0b" />
              </div>
              <div className="stat-label">Morning Trips</div>
            </div>
            <div className="stat-value" style={{ color: '#f59e0b' }}>{stats.morningTrips}</div>
            <div className="stat-trend">8:00 - 9:30 AM</div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <div className="stat-icon" style={{ background: 'rgba(59,130,246,0.1)' }}>
                <Moon size={20} color="#3b82f6" />
              </div>
              <div className="stat-label">Evening Trips</div>
            </div>
            <div className="stat-value" style={{ color: '#3b82f6' }}>{stats.eveningTrips}</div>
            <div className="stat-trend">4:30 - 6:00 PM</div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <div className="stat-icon" style={{ background: 'rgba(156,163,175,0.1)' }}>
                <Clock size={20} color="#9ca3af" />
              </div>
              <div className="stat-label">Avg. Duration</div>
            </div>
            <div className="stat-value" style={{ color: '#9ca3af' }}>{stats.avgDuration}</div>
            <div className="stat-trend">Completed trips</div>
          </div>
        </div>

        {/* Filters */}
        <div className="filters-bar">
          <div className="search-box">
            <Search size={18} color="#6b6b8b" />
            <input 
              type="text" 
              placeholder="Search by driver, bus, or trip type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="filter-group">
            <div className="filter-select">
              <Filter size={14} />
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </select>
              <ChevronDown size={14} />
            </div>

            <div className="filter-select">
              <Filter size={14} />
              <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                <option value="all">All Types</option>
                <option value="morning">Morning</option>
                <option value="evening">Evening</option>
                <option value="other">Other</option>
              </select>
              <ChevronDown size={14} />
            </div>

            <div className="filter-select">
              <Calendar size={14} />
              <select value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="week">Last 7 Days</option>
                <option value="all">All Time</option>
              </select>
              <ChevronDown size={14} />
            </div>
          </div>
        </div>

        {/* Trips Table */}
        <div className="trips-table-container">
          <div className="table-header">
            <div className="table-title">
              <h3>Driver Trips</h3>
              <span className="trip-count">{filteredTrips.length} trips</span>
            </div>
            <div className="table-actions">
              <button className="table-action-btn">
                <Download size={16} />
              </button>
              <button className="table-action-btn" onClick={fetchTrips}>
                <RefreshCw size={16} />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
            </div>
          ) : (
            <table className="trips-table">
              <thead>
                <tr>
                  <th>Driver & Bus</th>
                  <th>Trip Type</th>
                  <th>Start Time</th>
                  <th>End Time</th>
                  <th>Duration</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTrips.length > 0 ? (
                  filteredTrips.map((trip) => {
                    const typeStyle = getTripTypeColor(trip.trip_type);
                    const status = getStatusBadge(trip);
                    const StatusIcon = status.icon;
                    
                    return (
                      <tr key={trip.id}>
                        <td>
                          <div className="driver-info">
                            <div className="driver-avatar">
                              {getDriverName(trip.driver_id).charAt(0)}
                            </div>
                            <div>
                              <div className="driver-name">{getDriverName(trip.driver_id)}</div>
                              <div className="driver-contact">{getDriverContact(trip.driver_id)}</div>
                              <div className="bus-number">
                                <Truck size={10} />
                                {getBusNumber(trip.bus_id)} {getBusName(trip.bus_id) && `- ${getBusName(trip.bus_id)}`}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="type-badge" style={{ 
                            background: typeStyle.bg,
                            color: typeStyle.color
                          }}>
                            {typeStyle.label}
                          </span>
                        </td>
                        <td>{formatDateTime(trip.start_time)}</td>
                        <td>{trip.end_time ? formatDateTime(trip.end_time) : '—'}</td>
                        <td>{calculateDuration(trip.start_time, trip.end_time)}</td>
                        <td>{new Date(trip.start_time).toLocaleDateString()}</td>
                        <td>
                          <span className="status-badge" style={{ 
                            background: status.bg,
                            color: status.color
                          }}>
                            <StatusIcon size={12} />
                            {status.label}
                          </span>
                        </td>
                        <td>
                          <div className="action-buttons">
                            {!trip.end_time && (
                              <button 
                                className="action-btn end" 
                                title="End Trip"
                                onClick={() => handleEndTrip(trip.id)}
                              >
                                <StopCircle size={16} />
                              </button>
                            )}
                            <button className="action-btn" title="View Details">
                              <Eye size={16} />
                            </button>
                            <button className="action-btn delete" title="Delete" onClick={() => handleDeleteTrip(trip.id)}>
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="8">
                      <div className="empty-state">
                        <BookOpen size={48} />
                        <h3>No trips found</h3>
                        <p>Try adjusting your filters or search criteria</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Quick Info */}
        <div style={{ 
          background: 'rgba(22,22,42,0.4)', 
          borderRadius: '16px', 
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <AlertCircle size={18} color="#8b5cf6" />
            <span style={{ fontSize: '14px', color: '#a0a0c0' }}>
              Trip types are automatically determined by start time: 
              <span style={{ color: '#f59e0b', marginLeft: '8px' }}>Morning (8:00-9:30)</span>, 
              <span style={{ color: '#3b82f6', marginLeft: '8px' }}>Evening (16:30-18:00)</span>, 
              <span style={{ color: '#9ca3af', marginLeft: '8px' }}>Other</span>
            </span>
          </div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '10px', height: '10px', background: '#10b981', borderRadius: '50%' }}></div>
              <span style={{ fontSize: '12px', color: '#a0a0c0' }}>Active</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '10px', height: '10px', background: '#6b7280', borderRadius: '50%' }}></div>
              <span style={{ fontSize: '12px', color: '#a0a0c0' }}>Completed</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default withAuth(BusTripsPage);