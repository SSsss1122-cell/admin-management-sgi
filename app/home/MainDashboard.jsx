// app/home/page.js
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import withAuth from '../../components/withAuth';
import { useRouter } from 'next/navigation';
import {
  Users, MapPin, CreditCard, AlertTriangle, Megaphone,
  School, Bus, LogOut, Truck, ChevronRight,
  RefreshCw, Navigation, BookOpen, Map, Home, Award, Shield, User
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

function HomePage() {
  const [stats, setStats] = useState({
    totalStudents: 0, activeBuses: 0, dailyComplaints: 0, totalComplaints: 0,
    totalDrivers: 0, totalBuses: 0, busesWithDriver: 0, expiringDocuments: 0, liveBuses: 0
  });
  const [tripStats, setTripStats] = useState({
    totalTrips: 0, activeTrips: 0, morningTrips: 0, eveningTrips: 0, otherTrips: 0
  });
  const [loading, setLoading] = useState(true);
  const [adminName, setAdminName] = useState('');
  const [currentTime, setCurrentTime] = useState('');
  const [recentActivities, setRecentActivities] = useState([]);
  const router = useRouter();

  useEffect(() => {
    fetchDashboardData();
    const storedAdminName = localStorage.getItem('adminName');
    setAdminName(storedAdminName || 'Admin');
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    const refreshInterval = setInterval(fetchDashboardData, 30000);
    return () => { clearInterval(timer); clearInterval(refreshInterval); };
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [studentsData, busesData, complaintsData, driversData, announcementsData, feesData, busLocationsData, tripsData] = await Promise.all([
        supabase.from('students').select('id', { count: 'exact', head: true }),
        supabase.from('buses').select('id, bus_number, puc_expiry, insurance_expiry, fitness_expiry, permit_expiry'),
        supabase.from('complaints').select('id, created_at, title, description, status, student_id').order('created_at', { ascending: false }).limit(200),
        supabase.from('drivers_new').select('id, name, bus_id', { count: 'exact' }),
        supabase.from('announcements').select('*').order('created_at', { ascending: false }).limit(3),
        supabase.from('fees').select('id, amount, student_id, payment_date', { count: 'exact', head: false }).limit(5),
        supabase.from('bus_locations').select('bus_id, updated_at').gte('updated_at', new Date(Date.now() - 5 * 60000).toISOString()),
        supabase.from('driver_trips').select('id, start_time, end_time, trip_type, driver_id, bus_id').order('start_time', { ascending: false })
      ]);

      const totalStudents = studentsData.count || 0;
      const totalBuses = busesData.data?.length || 0;
      const totalDrivers = driversData.count || driversData.data?.length || 0;
      const busesWithDriver = driversData.data?.filter(d => d.bus_id).length || 0;
      const today = new Date().toDateString();
      const dailyComplaints = complaintsData.data?.filter(c => c.created_at && new Date(c.created_at).toDateString() === today).length || 0;
      const today_date = new Date();
      const thirtyDaysFromNow = new Date(); thirtyDaysFromNow.setDate(today_date.getDate() + 30);
      const expiringDocuments = busesData.data?.filter(bus =>
        [bus.puc_expiry, bus.insurance_expiry, bus.fitness_expiry, bus.permit_expiry].some(d => {
          if (!d) return false; const dt = new Date(d); return dt <= thirtyDaysFromNow && dt >= today_date;
        })
      ).length || 0;
      const uniqueBusIds = new Set((busLocationsData.data || []).map(l => l.bus_id).filter(Boolean));
      const liveBusesCount = uniqueBusIds.size;
      const trips = tripsData.data || [];
      const activeTrips = trips.filter(t => !t.end_time).length;

      setTripStats({ totalTrips: trips.length, activeTrips, morningTrips: trips.filter(t => t.trip_type === 'morning').length, eveningTrips: trips.filter(t => t.trip_type === 'evening').length, otherTrips: trips.filter(t => t.trip_type === 'other').length });
      setStats({ totalStudents, activeBuses: totalBuses, dailyComplaints, totalComplaints: complaintsData.data?.length || 0, totalDrivers, totalBuses, busesWithDriver, expiringDocuments, liveBuses: liveBusesCount });

      const activities = [];
      trips.filter(t => !t.end_time).slice(0, 3).forEach(trip => activities.push({ action: `Active ${trip.trip_type || 'unknown'} trip`, user: `Bus #${trip.bus_id}`, time: formatTimeAgo(trip.start_time), type: 'trip', status: 'success' }));
      complaintsData.data?.slice(0, 3).forEach(c => activities.push({ action: c.title || c.description?.substring(0, 40) || 'New complaint', user: `Student #${c.student_id || 'Unknown'}`, time: formatTimeAgo(c.created_at), type: 'complaint', status: c.status === 'resolved' ? 'success' : 'pending' }));
      feesData.data?.filter(f => f.payment_date).slice(0, 2).forEach(fee => activities.push({ action: 'Fee payment received', user: `₹${fee.amount || 0} · Student #${fee.student_id}`, time: formatTimeAgo(fee.payment_date), type: 'payment', status: 'success' }));
      announcementsData.data?.forEach(a => activities.push({ action: a.title, user: a.created_by || 'Admin', time: formatTimeAgo(a.created_at), type: 'announcement', status: 'info' }));
      setRecentActivities(activities.slice(0, 8));
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally { setLoading(false); }
  };

  const formatTimeAgo = (dateString) => {
    if (!dateString) return 'recently';
    try {
      const diffMs = new Date() - new Date(dateString);
      const m = Math.floor(diffMs / 60000), h = Math.floor(diffMs / 3600000), d = Math.floor(diffMs / 86400000);
      if (m < 1) return 'just now'; if (m < 60) return `${m}m ago`; if (h < 24) return `${h}h ago`; if (d < 7) return `${d}d ago`;
      return new Date(dateString).toLocaleDateString();
    } catch { return 'recently'; }
  };

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn'); localStorage.removeItem('adminMobile'); localStorage.removeItem('adminName');
    router.push('/login');
  };

  const handleBack = () => {
    router.push('/home');
  };

  const modules = [
    { id: 'student-dashboard', name: 'Students',      desc: 'Profiles, routes & analytics',      icon: Users,         href: '/dashboard',        metrics: `${stats.totalStudents} enrolled`,   tag: 'Analytics', color: 'from-blue-600 to-cyan-600' },
    { id: 'drivers',           name: 'Drivers',       desc: 'Licenses, assignments & records',    icon: Truck,         href: '/drivers',           metrics: `${stats.totalDrivers} active`,       tag: 'Fleet', color: 'from-purple-600 to-pink-600' },
    { id: 'buses',             name: 'Fleet',         desc: 'Vehicles, docs & maintenance',       icon: Bus,           href: '/buses',             metrics: `${stats.totalBuses} vehicles`,       tag: 'Fleet', color: 'from-emerald-600 to-teal-600' },
    { id: 'bus-trips',         name: 'Trips',         desc: 'Trip logs & attendance tracking',    icon: BookOpen,      href: '/bus-trips',         metrics: `${tripStats.activeTrips} active`,    tag: 'Ops',      live: tripStats.activeTrips > 0, color: 'from-violet-600 to-purple-600' },
    { id: 'bus-stops',         name: 'Stops',         desc: 'Stop management & locations',        icon: MapPin,        href: '/bus-stops',         metrics: 'Manage',                             tag: 'Routes', color: 'from-rose-600 to-pink-600' },
    { id: 'bus-route-mapper',  name: 'Route Planner', desc: 'Visual route builder on map',        icon: Map,           href: '/bus-route-mapper',  metrics: 'Builder',                            tag: 'Planner', color: 'from-sky-600 to-blue-600' },
    { id: 'fees',              name: 'Fees',          desc: 'Payments, dues & reports',           icon: CreditCard,    href: '/fees',              metrics: 'Track',                              tag: 'Finance', color: 'from-amber-600 to-orange-600' },
    { id: 'bus-locations',     name: 'Live Tracking', desc: 'Real-time GPS & routes',             icon: Navigation,    href: '/bus-locations',     metrics: `${stats.liveBuses} live`,            tag: 'Live',     live: stats.liveBuses > 0, color: 'from-red-600 to-rose-600' },
    { id: 'complaints',        name: 'Complaints',    desc: 'Issues, status & resolution',        icon: AlertTriangle, href: '/complaints',        metrics: `${stats.dailyComplaints} today`,     tag: 'Support', color: 'from-fuchsia-600 to-purple-600' },
    { id: 'announcements',     name: 'Announcements', desc: 'Broadcast to students & staff',      icon: Megaphone,     href: '/announcements',     metrics: 'Manage',                             tag: 'Comms', color: 'from-teal-600 to-emerald-600' },
    { id: 'bus-details',       name: 'Bus Details',   desc: 'Specs, routes & information',        icon: Bus,           href: '/bus-details',       metrics: `${stats.totalBuses} buses`,          tag: 'Info', color: 'from-gray-600 to-gray-700' },
  ];

  const quickActions = [
    { label: 'Announcement', icon: Megaphone,     href: '/announcements', color: 'from-teal-600 to-emerald-600' },
    { label: 'Add Student',   icon: Users,         href: '/dashboard', color: 'from-blue-600 to-cyan-600' },
    { label: 'Add Bus',       icon: Bus,           href: '/buses', color: 'from-emerald-600 to-teal-600' },
    { label: 'Add Driver',    icon: Truck,         href: '/drivers', color: 'from-purple-600 to-pink-600' },
    { label: 'View Trips',    icon: BookOpen,      href: '/bus-trips', color: 'from-violet-600 to-purple-600' },
    { label: 'Manage Stops',  icon: MapPin,        href: '/bus-stops', color: 'from-rose-600 to-pink-600' },
    { label: 'Route Planner', icon: Map,           href: '/bus-route-mapper', color: 'from-sky-600 to-blue-600' },
  ];

  const dateStr  = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const hour     = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const fleetPct = Math.round((stats.liveBuses / (stats.totalBuses || 1)) * 100);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-700 border-t-purple-500"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-8 w-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Dark decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-purple-600/10 to-pink-600/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-blue-600/10 to-cyan-600/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-amber-600/5 to-orange-600/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
        <div className="space-y-6 lg:space-y-8">
          {/* Header */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBack}
                className="group flex items-center text-gray-400 hover:text-purple-400 transition-all p-2 rounded-xl hover:bg-gray-800/50 backdrop-blur-sm border border-gray-800 hover:border-purple-500/30"
              >
                <Home size={20} className="group-hover:-translate-x-1 transition-transform" />
              </button>
              <div>
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl shadow-lg shadow-purple-600/20">
                    <School className="text-white" size={24} />
                  </div>
                  <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-white">
                      Admin Dashboard
                    </h1>
                    <p className="text-gray-400 text-sm mt-1 flex items-center gap-2">
                      <span>Welcome back to your command center</span>
                      <span className="w-1 h-1 bg-gray-600 rounded-full"></span>
                      <span className="text-purple-400 font-medium">{stats.totalStudents + stats.totalDrivers} active users</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-3 bg-gray-800/50 backdrop-blur-xl rounded-xl px-4 py-2 border border-gray-700/50">
                <div className="text-right">
                  <p className="text-xs text-gray-400">Welcome,</p>
                  <p className="font-semibold text-gray-200">{adminName || 'Admin'}</p>
                </div>
                <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center">
                  <User className="text-white" size={16} />
                </div>
              </div>
              
              <button
                onClick={handleLogout}
                className="flex items-center text-sm bg-rose-600/90 text-white px-4 py-2 rounded-xl hover:bg-rose-700 transition-all shadow-lg shadow-rose-600/20"
              >
                <LogOut size={16} className="mr-2" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>

          {/* Hero Section */}
          <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-700/50 p-6 lg:p-8">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
              <div>
                <div className="text-sm text-purple-400 font-medium mb-2">{dateStr}</div>
                <h2 className="text-2xl lg:text-3xl font-bold text-white mb-2">
                  {greeting}, {adminName}
                </h2>
                <p className="text-gray-400">Your daily snapshot of fleet activity, student management, and campus operations.</p>
                <div className="flex flex-wrap gap-3 mt-4">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-900/50 rounded-full border border-gray-700">
                    <Users size={14} className="text-purple-400" />
                    <span className="text-sm text-gray-300">{stats.totalStudents} students</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-900/50 rounded-full border border-gray-700">
                    <Bus size={14} className="text-emerald-400" />
                    <span className="text-sm text-gray-300">{stats.totalBuses} buses</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-900/50 rounded-full border border-gray-700">
                    <Navigation size={14} className="text-amber-400" />
                    <span className="text-sm text-gray-300">{tripStats.activeTrips} active trips</span>
                  </div>
                  {stats.dailyComplaints > 0 && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-900/50 rounded-full border border-gray-700">
                      <AlertTriangle size={14} className="text-rose-400" />
                      <span className="text-sm text-gray-300">{stats.dailyComplaints} complaints today</span>
                    </div>
                  )}
                </div>
              </div>
              <button 
                onClick={fetchDashboardData}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-900/50 hover:bg-gray-800/50 rounded-xl text-sm text-gray-400 hover:text-purple-400 transition-all border border-gray-700/50"
              >
                <RefreshCw size={14} /> Refresh Data
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="group relative bg-gray-800/50 backdrop-blur-xl rounded-2xl shadow-xl hover:shadow-2xl transition-all border border-gray-700/50 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 to-pink-600/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl shadow-lg shadow-purple-600/20">
                    <Users className="text-white" size={18} />
                  </div>
                  <span className="text-xs font-medium text-purple-400 bg-purple-950/50 px-2 py-0.5 rounded-full border border-purple-800/50">Total</span>
                </div>
                <h3 className="text-2xl font-bold text-white">{stats.totalStudents}</h3>
                <p className="text-xs text-gray-400">Total Students</p>
              </div>
            </div>

            <div className="group relative bg-gray-800/50 backdrop-blur-xl rounded-2xl shadow-xl hover:shadow-2xl transition-all border border-gray-700/50 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/10 to-teal-600/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-xl shadow-lg shadow-emerald-600/20">
                    <Truck className="text-white" size={18} />
                  </div>
                  <span className="text-xs font-medium text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-800/50">Drivers</span>
                </div>
                <h3 className="text-2xl font-bold text-white">{stats.totalDrivers}</h3>
                <p className="text-xs text-gray-400">Total Drivers</p>
              </div>
            </div>

            <div className="group relative bg-gray-800/50 backdrop-blur-xl rounded-2xl shadow-xl hover:shadow-2xl transition-all border border-gray-700/50 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-cyan-600/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl shadow-lg shadow-blue-600/20">
                    <Bus className="text-white" size={18} />
                  </div>
                  <span className="text-xs font-medium text-blue-400 bg-blue-950/50 px-2 py-0.5 rounded-full border border-blue-800/50">Fleet</span>
                </div>
                <h3 className="text-2xl font-bold text-white">{stats.totalBuses}</h3>
                <p className="text-xs text-gray-400">Total Buses</p>
              </div>
            </div>

            <div className="group relative bg-gray-800/50 backdrop-blur-xl rounded-2xl shadow-xl hover:shadow-2xl transition-all border border-gray-700/50 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-600/10 to-orange-600/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-gradient-to-br from-amber-600 to-orange-600 rounded-xl shadow-lg shadow-amber-600/20">
                    <Navigation className="text-white" size={18} />
                  </div>
                  <span className="text-xs font-medium text-amber-400 bg-amber-950/50 px-2 py-0.5 rounded-full border border-amber-800/50">Live</span>
                </div>
                <h3 className="text-2xl font-bold text-white">{stats.liveBuses}</h3>
                <p className="text-xs text-gray-400">Live Buses</p>
              </div>
            </div>

            <div className="group relative bg-gray-800/50 backdrop-blur-xl rounded-2xl shadow-xl hover:shadow-2xl transition-all border border-gray-700/50 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-rose-600/10 to-pink-600/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-gradient-to-br from-rose-600 to-pink-600 rounded-xl shadow-lg shadow-rose-600/20">
                    <AlertTriangle className="text-white" size={18} />
                  </div>
                  <span className="text-xs font-medium text-rose-400 bg-rose-950/50 px-2 py-0.5 rounded-full border border-rose-800/50">Today</span>
                </div>
                <h3 className="text-2xl font-bold text-white">{stats.dailyComplaints}</h3>
                <p className="text-xs text-gray-400">Complaints Today</p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div>
            <h2 className="text-lg font-semibold text-white mb-5">Quick Actions</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
              {quickActions.map((qa, i) => {
                const Icon = qa.icon;
                return (
                  <Link
                    key={i}
                    href={qa.href}
                    className="group bg-gray-800/50 backdrop-blur-xl rounded-xl border border-gray-700/50 p-4 text-center hover:border-purple-500/30 transition-all hover:bg-gray-700/50"
                  >
                    <div className={`p-2 bg-gradient-to-br ${qa.color} rounded-lg w-10 h-10 mx-auto mb-2 flex items-center justify-center shadow-lg`}>
                      <Icon className="text-white" size={16} />
                    </div>
                    <span className="text-xs text-gray-400 group-hover:text-white transition-colors">{qa.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Management Modules */}
          <div>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-white">Management Modules</h2>
              <span className="text-xs text-gray-500">{modules.length} sections</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {modules.map((mod) => {
                const Icon = mod.icon;
                return (
                  <Link
                    key={mod.id}
                    href={mod.href}
                    className="group block bg-gray-800/50 backdrop-blur-xl rounded-2xl shadow-xl hover:shadow-2xl transition-all border border-gray-700/50 overflow-hidden hover:border-purple-500/30 hover:-translate-y-1 duration-200"
                  >
                    {mod.live && (
                      <div className="absolute top-3 right-3">
                        <div className="relative">
                          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                        </div>
                      </div>
                    )}
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-4">
                        <div className={`p-3 bg-gradient-to-br ${mod.color} rounded-xl shadow-lg flex-shrink-0`}>
                          <Icon className="text-white" size={20} />
                        </div>
                        <span className={`text-xs font-medium px-2 py-1 rounded-full border whitespace-nowrap ${
                          mod.tag === 'Analytics' ? 'bg-blue-950/50 text-blue-400 border-blue-800/50' :
                          mod.tag === 'Fleet' ? 'bg-emerald-950/50 text-emerald-400 border-emerald-800/50' :
                          mod.tag === 'Ops' ? 'bg-violet-950/50 text-violet-400 border-violet-800/50' :
                          mod.tag === 'Routes' ? 'bg-rose-950/50 text-rose-400 border-rose-800/50' :
                          mod.tag === 'Planner' ? 'bg-sky-950/50 text-sky-400 border-sky-800/50' :
                          mod.tag === 'Finance' ? 'bg-amber-950/50 text-amber-400 border-amber-800/50' :
                          mod.tag === 'Live' ? 'bg-red-950/50 text-red-400 border-red-800/50' :
                          mod.tag === 'Support' ? 'bg-fuchsia-950/50 text-fuchsia-400 border-fuchsia-800/50' :
                          mod.tag === 'Comms' ? 'bg-teal-950/50 text-teal-400 border-teal-800/50' :
                          'bg-gray-950/50 text-gray-400 border-gray-800/50'
                        }`}>
                          {mod.tag}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold text-white mb-1">{mod.name}</h3>
                      <p className="text-sm text-gray-400 mb-4 line-clamp-2">{mod.desc}</p>
                      <div className="flex items-center justify-between pt-3 border-t border-gray-700/50">
                        <span className="text-xs text-gray-500 font-mono">{mod.metrics}</span>
                        <span className="text-sm text-purple-400 group-hover:translate-x-1 transition-transform flex items-center gap-1">
                          Open <ChevronRight size={14} />
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Bottom Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Activity */}
            <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-700/50 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-700/50 flex justify-between items-center">
                <h3 className="font-semibold text-white">Recent Activity</h3>
                <button onClick={fetchDashboardData} className="text-xs text-gray-400 hover:text-purple-400 transition-colors">Refresh</button>
              </div>
              <div className="divide-y divide-gray-700/50 max-h-[400px] overflow-y-auto">
                {recentActivities.length > 0 ? recentActivities.map((act, i) => (
                  <div key={i} className="px-6 py-3 hover:bg-gray-700/30 transition-colors flex items-center gap-3">
                    <div className={`p-2 rounded-lg flex-shrink-0 ${
                      act.type === 'complaint' ? 'bg-fuchsia-950/50' :
                      act.type === 'trip' ? 'bg-violet-950/50' :
                      act.type === 'payment' ? 'bg-amber-950/50' :
                      'bg-teal-950/50'
                    }`}>
                      {act.type === 'complaint' && <AlertTriangle size={14} className="text-fuchsia-400" />}
                      {act.type === 'trip' && <BookOpen size={14} className="text-violet-400" />}
                      {act.type === 'payment' && <CreditCard size={14} className="text-amber-400" />}
                      {act.type === 'announcement' && <Megaphone size={14} className="text-teal-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{act.action}</p>
                      <p className="text-xs text-gray-500">{act.user}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-gray-500">{act.time}</p>
                      <div className={`w-2 h-2 rounded-full mt-1 ml-auto ${
                        act.status === 'success' ? 'bg-emerald-500' :
                        act.status === 'pending' ? 'bg-amber-500' : 'bg-blue-500'
                      }`}></div>
                    </div>
                  </div>
                )) : (
                  <div className="px-6 py-12 text-center text-gray-500">No recent activity</div>
                )}
              </div>
            </div>

            {/* System Status */}
            <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-700/50 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-700/50 flex justify-between items-center">
                <h3 className="font-semibold text-white">System Status</h3>
                <span className="text-xs text-emerald-400 bg-emerald-950/50 px-2 py-1 rounded-full border border-emerald-800/50 flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                  Operational
                </span>
              </div>
              <div className="divide-y divide-gray-700/50">
                <div className="px-6 py-3 flex justify-between items-center">
                  <span className="text-sm text-gray-400">Active Trips</span>
                  <span className="text-lg font-semibold text-white">{tripStats.activeTrips}</span>
                </div>
                <div className="px-6 py-3 flex justify-between items-center">
                  <span className="text-sm text-gray-400">Live Buses</span>
                  <span className="text-lg font-semibold text-white">{stats.liveBuses}</span>
                </div>
                <div className="px-6 py-3 flex justify-between items-center">
                  <span className="text-sm text-gray-400">Morning Trips</span>
                  <span className="text-lg font-semibold text-white">{tripStats.morningTrips}</span>
                </div>
                <div className="px-6 py-3 flex justify-between items-center">
                  <span className="text-sm text-gray-400">Evening Trips</span>
                  <span className="text-lg font-semibold text-white">{tripStats.eveningTrips}</span>
                </div>
                <div className="px-6 py-3 flex justify-between items-center">
                  <span className="text-sm text-gray-400">Total Trips</span>
                  <span className="text-lg font-semibold text-white">{tripStats.totalTrips}</span>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-700/50">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400">Fleet Activity</span>
                  <span className="text-white font-mono">{fleetPct}%</span>
                </div>
                <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all" style={{ width: `${fleetPct}%` }}></div>
                </div>
              </div>
              {stats.expiringDocuments > 0 && (
                <div className="mx-6 mb-4 p-3 bg-amber-950/30 border border-amber-800/50 rounded-xl flex items-start gap-3">
                  <AlertTriangle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-amber-400 font-medium">{stats.expiringDocuments} document(s) expiring soon</p>
                    <p className="text-xs text-amber-500/70">Action required within 30 days</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative mt-8 py-6 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-xs text-gray-500">© 2025 Shetty Institute of Technology</p>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
              All systems operational {tripStats.activeTrips > 0 && `· ${tripStats.activeTrips} active trips`}
            </div>
            <p className="text-xs text-gray-500">Enterprise Management System</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default withAuth(HomePage);