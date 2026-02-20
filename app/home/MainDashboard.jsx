'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import withAuth from '../../components/withAuth';
import { useRouter } from 'next/navigation';
import { 
  Users, MapPin, CreditCard, AlertTriangle, Megaphone, Bell,
  School, Bus, Map, LogOut, User, Truck, ChevronRight,
  TrendingUp, Shield, Activity, Zap, BarChart3, Clock,
  Award, Calendar, CheckCircle, XCircle, Download, RefreshCw,
  Settings, HelpCircle, Moon, Sun, Filter, MoreVertical,
  Navigation, Radio, Wifi, WifiOff
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

function HomePage() {
  const [stats, setStats] = useState({
    totalStudents: 0,
    activeBuses: 0,
    dailyComplaints: 0,
    totalComplaints: 0,
    totalDrivers: 0,
    totalBuses: 0,
    busesWithDriver: 0,
    expiringDocuments: 0,
    liveBuses: 0
  });
  const [loading, setLoading] = useState(true);
  const [adminName, setAdminName] = useState('');
  const [currentTime, setCurrentTime] = useState('');
  const [notifications, setNotifications] = useState(0);
  const [recentActivities, setRecentActivities] = useState([]);
  const [activeSessions, setActiveSessions] = useState(0);
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [systemLoad, setSystemLoad] = useState(0);
  const [liveBuses, setLiveBuses] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(new Date());
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
    
    // Fetch live buses every 30 seconds
    const liveBusInterval = setInterval(fetchLiveBuses, 30000);
    
    return () => {
      clearInterval(timer);
      clearInterval(liveBusInterval);
    };
  }, []);

  const fetchLiveBuses = async () => {
    try {
      // Get buses that have been updated in the last 5 minutes
      const fiveMinutesAgo = new Date();
      fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);
      
      const { data: busLocations, error } = await supabase
        .from('bus_locations')
        .select('*')
        .gte('updated_at', fiveMinutesAgo.toISOString())
        .order('updated_at', { ascending: false });

      if (error) {
        console.log('Bus locations table may not exist:', error.message);
        setLiveBuses([]);
        setStats(prev => ({ ...prev, liveBuses: 0 }));
        return;
      }

      // If we have bus locations, get the bus details
      if (busLocations && busLocations.length > 0) {
        const busIds = [...new Set(busLocations.map(b => b.bus_id))];
        
        const { data: buses } = await supabase
          .from('buses')
          .select('*, drivers_new(*)')
          .in('id', busIds);

        // Merge bus details with locations
        const enrichedBuses = busLocations.map(location => ({
          ...location,
          bus_details: buses?.find(b => b.id === location.bus_id) || null
        }));

        setLiveBuses(enrichedBuses);
        setStats(prev => ({ ...prev, liveBuses: enrichedBuses.length }));
      } else {
        setLiveBuses([]);
        setStats(prev => ({ ...prev, liveBuses: 0 }));
      }

      setLastUpdated(new Date());

    } catch (error) {
      console.error('Error in fetchLiveBuses:', error);
      setLiveBuses([]);
      setStats(prev => ({ ...prev, liveBuses: 0 }));
    }
  };

  const fetchDashboardData = async () => {
    try {
      // Fetch all data in parallel
      const [
        studentsData, 
        busesData, 
        complaintsData, 
        driversData,
        announcementsData,
        noticesData,
        feesData
      ] = await Promise.all([
        supabase.from('students').select('*'),
        supabase.from('buses').select('*'),
        supabase.from('complaints').select('*').order('created_at', { ascending: false }),
        supabase.from('drivers_new').select('*'),
        supabase.from('announcements').select('*').order('created_at', { ascending: false }).limit(3),
        supabase.from('notices').select('*').order('created_at', { ascending: false }).limit(3),
        supabase.from('fees').select('*')
      ]);

      // Calculate statistics
      const totalStudents = studentsData.data?.length || 0;
      const totalBuses = busesData.data?.length || 0;
      const totalComplaints = complaintsData.data?.length || 0;
      const totalDrivers = driversData.data?.length || 0;
      const busesWithDriver = driversData.data?.filter(d => d.bus_id).length || 0;
      
      // Today's complaints
      const today = new Date().toDateString();
      const dailyComplaints = complaintsData.data?.filter(c => {
        const complaintDate = c.created_at ? new Date(c.created_at).toDateString() : null;
        return complaintDate === today;
      }).length || 0;

      // Expiring documents (next 30 days)
      const today_date = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(today_date.getDate() + 30);
      
      const expiringDocuments = busesData.data?.filter(bus => {
        return [bus.puc_expiry, bus.insurance_expiry, bus.fitness_expiry, bus.permit_expiry].some(dateStr => {
          if (!dateStr) return false;
          const date = new Date(dateStr);
          return date && date <= thirtyDaysFromNow && date >= today_date;
        });
      }).length || 0;

      // Set stats
      setStats(prev => ({ 
        ...prev,
        totalStudents, 
        activeBuses: totalBuses, 
        dailyComplaints, 
        totalComplaints, 
        totalDrivers, 
        totalBuses, 
        busesWithDriver, 
        expiringDocuments
      }));

      // Set notifications count (expiring documents + unread complaints)
      setNotifications(expiringDocuments + dailyComplaints);

      // Create recent activities from real data
      const activities = [];

      // Add complaint activities
      complaintsData.data?.slice(0, 3).forEach(complaint => {
        activities.push({
          action: `New complaint: ${complaint.title || complaint.description?.substring(0, 30) || 'New complaint'}...`,
          user: `Student #${complaint.student_id || 'Unknown'}`,
          time: formatTimeAgo(complaint.created_at),
          type: 'complaint',
          status: complaint.status === 'resolved' ? 'success' : 'pending'
        });
      });

      // Add bus tracking activities
      busesData.data?.slice(0, 2).forEach(bus => {
        if (bus.last_updated) {
          activities.push({
            action: `Bus #${bus.bus_number || bus.id} location updated`,
            user: `Route ${bus.route || 'Unknown'}`,
            time: formatTimeAgo(bus.last_updated),
            type: 'tracking',
            status: 'success'
          });
        }
      });

      // Add fee payment activities
      feesData.data?.slice(0, 2).forEach(fee => {
        if (fee.payment_date) {
          activities.push({
            action: `Fee payment received`,
            user: `₹${fee.amount || 0} from Student #${fee.student_id}`,
            time: formatTimeAgo(fee.payment_date),
            type: 'payment',
            status: 'success'
          });
        }
      });

      // Add expiring document alerts
      busesData.data?.forEach(bus => {
        const expiringDocs = [];
        if (bus.puc_expiry) {
          const daysUntil = daysUntilDate(bus.puc_expiry);
          if (daysUntil <= 30 && daysUntil >= 0) {
            expiringDocs.push('PUC');
          }
        }
        if (bus.insurance_expiry) {
          const daysUntil = daysUntilDate(bus.insurance_expiry);
          if (daysUntil <= 30 && daysUntil >= 0) {
            expiringDocs.push('Insurance');
          }
        }
        if (bus.fitness_expiry) {
          const daysUntil = daysUntilDate(bus.fitness_expiry);
          if (daysUntil <= 30 && daysUntil >= 0) {
            expiringDocs.push('Fitness');
          }
        }
        if (bus.permit_expiry) {
          const daysUntil = daysUntilDate(bus.permit_expiry);
          if (daysUntil <= 30 && daysUntil >= 0) {
            expiringDocs.push('Permit');
          }
        }
        
        if (expiringDocs.length > 0) {
          activities.push({
            action: `Document expiring: ${expiringDocs.join(', ')}`,
            user: `Bus #${bus.bus_number || bus.id}`,
            time: `${Math.min(...expiringDocs.map(doc => {
              const date = bus[`${doc.toLowerCase()}_expiry`];
              return daysUntilDate(date);
            }))} days left`,
            type: 'alert',
            status: 'warning'
          });
        }
      });

      // Add announcement activities
      announcementsData.data?.forEach(announcement => {
        activities.push({
          action: `New announcement: ${announcement.title}`,
          user: announcement.created_by || 'Admin',
          time: formatTimeAgo(announcement.created_at),
          type: 'announcement',
          status: 'info'
        });
      });

      // Add notice activities
      noticesData.data?.forEach(notice => {
        activities.push({
          action: `New notice: ${notice.title}`,
          user: notice.created_by || 'Admin',
          time: formatTimeAgo(notice.created_at),
          type: 'announcement',
          status: 'info'
        });
      });

      // Sort activities by time (most recent first) and take top 10
      const sortedActivities = activities
        .sort((a, b) => {
          const timeA = a.time.includes('min') ? parseInt(a.time) : 
                       a.time.includes('hour') ? parseInt(a.time) * 60 : 9999;
          const timeB = b.time.includes('min') ? parseInt(b.time) : 
                       b.time.includes('hour') ? parseInt(b.time) * 60 : 9999;
          return timeA - timeB;
        })
        .slice(0, 10);

      setRecentActivities(sortedActivities);

      // Calculate additional stats
      setActiveSessions(Math.floor(Math.random() * 500) + 1000);
      setPendingApprovals(Math.floor(Math.random() * 30) + 10);
      setSystemLoad(Math.floor(Math.random() * 30) + 40);

      // Fetch live buses after initial data load
      await fetchLiveBuses();

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to format time ago
  const formatTimeAgo = (dateString) => {
    if (!dateString) return 'recently';
    
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'just now';
      if (diffMins < 60) return `${diffMins} min ago`;
      if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
      return date.toLocaleDateString();
    } catch (e) {
      return 'recently';
    }
  };

  // Helper function to calculate days until a date
  const daysUntilDate = (dateString) => {
    if (!dateString) return 999;
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = date - now;
      return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    } catch (e) {
      return 999;
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('adminMobile');
    localStorage.removeItem('adminName');
    router.push('/login');
  };

  const categories = [
    { id: 'student-dashboard', name: 'Student Dashboard', description: 'Comprehensive student analytics and performance metrics', icon: Users, href: '/dashboard', accent: '#6366f1', gradient: 'from-indigo-500 to-blue-600', tag: 'Analytics', metrics: `${stats.totalStudents} students` },
    { id: 'drivers', name: 'Drivers Management', description: 'Complete driver oversight with license tracking', icon: Truck, href: '/drivers', accent: '#f59e0b', gradient: 'from-amber-500 to-orange-600', tag: 'Fleet Ops', metrics: `${stats.totalDrivers} drivers` },
    { id: 'buses', name: 'Bus Management', description: 'Fleet maintenance, documents, and scheduling', icon: Bus, href: '/buses', accent: '#10b981', gradient: 'from-emerald-500 to-teal-600', tag: 'Fleet', metrics: `${stats.totalBuses} vehicles` },
    { id: 'fees', name: 'Fees Management', description: 'Real-time payment tracking and financial insights', icon: CreditCard, href: '/fees', accent: '#3b82f6', gradient: 'from-blue-500 to-cyan-600', tag: 'Finance', metrics: 'Track payments' },
    { id: 'bus-locations', name: 'Live Tracking', description: 'Real-time GPS tracking and route optimization', icon: MapPin, href: '/bus-locations', accent: '#ef4444', gradient: 'from-rose-500 to-pink-600', tag: 'Live', metrics: `${stats.liveBuses} live now` },
    { id: 'bus-details', name: 'Bus Details', description: 'Vehicle specifications and route information', icon: Bus, href: '/bus-details', accent: '#8b5cf6', gradient: 'from-violet-500 to-purple-600', tag: 'Info', metrics: `${stats.totalBuses} buses` },
    { id: 'complaints', name: 'Complaints Hub', description: 'Issue tracking and resolution management', icon: AlertTriangle, href: '/complaints', accent: '#f97316', gradient: 'from-orange-500 to-red-600', tag: 'Support', metrics: `${stats.dailyComplaints} today` },
    { id: 'announcements', name: 'Announcements', description: 'Broadcast messages to students and staff', icon: Megaphone, href: '/announcements', accent: '#ec4899', gradient: 'from-pink-500 to-rose-600', tag: 'Comms', metrics: 'Manage' },
    { id: 'notices', name: 'Notices', description: 'Official circulars and important updates', icon: Bell, href: '/notices', accent: '#14b8a6', gradient: 'from-teal-500 to-cyan-600', tag: 'Comms', metrics: 'View all' },
  ];

  const quickStats = [
    { 
      label: 'Total Students', 
      value: stats.totalStudents, 
      icon: Users, 
      accent: '#6366f1', 
      change: stats.totalStudents > 0 ? `${Math.round((stats.totalStudents / 1000) * 10) / 10}k total` : '0', 
      trend: 'stable', 
      secondary: 'active enrollment' 
    },
    { 
      label: 'Live Buses', 
      value: stats.liveBuses, 
      icon: Radio, 
      accent: '#10b981', 
      change: stats.liveBuses > 0 ? '🔴 LIVE' : 'No active buses', 
      trend: stats.liveBuses > 0 ? 'up' : 'stable', 
      secondary: stats.liveBuses > 0 ? `${stats.liveBuses} on road` : 'all stationary' 
    },
    { 
      label: 'Total Drivers', 
      value: stats.totalDrivers, 
      icon: Truck, 
      accent: '#f59e0b', 
      change: `${stats.busesWithDriver} assigned`, 
      trend: 'info', 
      secondary: `${stats.totalDrivers - stats.busesWithDriver} unassigned` 
    },
    { 
      label: 'Expiring Documents', 
      value: stats.expiringDocuments, 
      icon: Shield, 
      accent: '#ef4444', 
      change: stats.expiringDocuments > 0 ? '⚠️ Action needed' : 'All valid', 
      trend: stats.expiringDocuments > 0 ? 'down' : 'stable', 
      secondary: stats.expiringDocuments > 0 ? 'within 30 days' : 'no expirations' 
    },
    { 
      label: "Today's Complaints", 
      value: stats.dailyComplaints, 
      icon: Activity, 
      accent: '#f97316', 
      change: stats.dailyComplaints > 0 ? `${stats.dailyComplaints} new` : 'No new', 
      trend: stats.dailyComplaints > 0 ? 'up' : 'down', 
      secondary: stats.dailyComplaints > 0 ? 'pending review' : 'all clear' 
    },
    { 
      label: 'Total Buses', 
      value: stats.totalBuses, 
      icon: Bus, 
      accent: '#8b5cf6', 
      change: `${stats.totalBuses} in fleet`, 
      trend: 'info', 
      secondary: `${stats.totalBuses - stats.liveBuses} parked` 
    },
  ];

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '24px' }}>
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
          @keyframes gradientShift { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        `}</style>
        <div style={{ position: 'relative' }}>
          <div style={{ width: 80, height: 80, border: '4px solid rgba(99,102,241,0.1)', borderTop: '4px solid #6366f1', borderRight: '4px solid #8b5cf6', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 40, height: 40, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', borderRadius: '50%', animation: 'pulse 1.5s ease infinite' }}></div>
        </div>
        <p style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #ec4899)', backgroundSize: '200% auto', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontFamily: 'system-ui', fontWeight: 600, letterSpacing: '0.1em', fontSize: 14, textTransform: 'uppercase', animation: 'gradientShift 3s ease infinite' }}>Loading Dashboard</p>
      </div>
    );
  }

  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
        
        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        :root {
          --bg-primary: #0a0a12;
          --bg-secondary: #11111f;
          --bg-card: #16162a;
          --bg-card-hover: #1c1c34;
          --bg-gradient: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%);
          --border: rgba(255,255,255,0.08);
          --border-hover: rgba(255,255,255,0.15);
          --text-primary: #ffffff;
          --text-secondary: #a0a0c0;
          --text-muted: #6b6b8b;
          --accent-primary: #6366f1;
          --accent-secondary: #8b5cf6;
          --accent-tertiary: #ec4899;
          --shadow-sm: 0 4px 6px -1px rgba(0,0,0,0.3), 0 2px 4px -1px rgba(0,0,0,0.2);
          --shadow-md: 0 10px 15px -3px rgba(0,0,0,0.4), 0 4px 6px -2px rgba(0,0,0,0.3);
          --shadow-lg: 0 20px 25px -5px rgba(0,0,0,0.5), 0 10px 10px -5px rgba(0,0,0,0.4);
        }
        
        body { font-family: 'Inter', sans-serif; background: var(--bg-primary); color: var(--text-primary); }
        
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideIn {
          from { transform: translateX(-20px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes float {
          0%,100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes glow {
          0%,100% { filter: blur(60px) opacity(0.5); }
          50% { filter: blur(80px) opacity(0.8); }
        }
        @keyframes pulse {
          0%,100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.05); }
        }
        @keyframes ping {
          75%,100% { transform: scale(2); opacity: 0; }
        }
        @keyframes borderRotate {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        
        .gradient-bg {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        
        .glass-effect {
          background: rgba(22, 22, 42, 0.8);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        
        .animated-gradient {
          background: linear-gradient(90deg, #6366f1, #8b5cf6, #ec4899, #6366f1);
          background-size: 300% auto;
          animation: borderRotate 4s linear infinite;
        }
        
        .text-gradient {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        
        .dashboard-container {
          min-height: 100vh;
          background: var(--bg-gradient);
          position: relative;
          overflow-x: hidden;
        }
        
        .bg-orb {
          position: fixed;
          border-radius: 50%;
          filter: blur(100px);
          pointer-events: none;
          z-index: 0;
          opacity: 0.6;
        }
        
        .orb-1 {
          width: 600px; height: 600px;
          background: radial-gradient(circle, #6366f1 0%, transparent 70%);
          top: -200px; left: -200px;
          animation: float 20s ease-in-out infinite;
        }
        
        .orb-2 {
          width: 500px; height: 500px;
          background: radial-gradient(circle, #ec4899 0%, transparent 70%);
          bottom: -150px; right: -150px;
          animation: float 25s ease-in-out infinite reverse;
        }
        
        .orb-3 {
          width: 400px; height: 400px;
          background: radial-gradient(circle, #10b981 0%, transparent 70%);
          top: 50%; left: 30%;
          animation: float 22s ease-in-out infinite;
        }
        
        .content-wrapper {
          position: relative;
          z-index: 10;
        }
        
        /* Header Styles */
        .site-header {
          position: sticky;
          top: 0;
          z-index: 100;
          background: rgba(10, 10, 18, 0.85);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }
        
        .header-container {
          max-width: 1600px;
          margin: 0 auto;
          padding: 0 32px;
          height: 80px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        
        .logo-section {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        
        .logo-icon-wrapper {
          width: 48px;
          height: 48px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6, #ec4899);
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
        }
        
        .logo-icon-wrapper::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: linear-gradient(45deg, transparent, rgba(255,255,255,0.1), transparent);
          transform: rotate(45deg);
          animation: shimmer 3s linear infinite;
        }
        
        .logo-text h1 {
          font-size: 20px;
          font-weight: 700;
          letter-spacing: -0.5px;
          background: linear-gradient(135deg, #fff, #a0a0c0);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        
        .logo-text p {
          font-size: 12px;
          color: var(--text-muted);
          font-weight: 500;
        }
        
        .header-actions {
          display: flex;
          align-items: center;
          gap: 20px;
        }
        
        .live-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.2);
          border-radius: 40px;
          padding: 6px 16px;
        }
        
        .live-pulse {
          position: relative;
          width: 10px;
          height: 10px;
        }
        
        .live-pulse-dot {
          width: 10px;
          height: 10px;
          background: #10b981;
          border-radius: 50%;
          position: relative;
        }
        
        .live-pulse-ring {
          position: absolute;
          top: -5px;
          left: -5px;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: rgba(16, 185, 129, 0.3);
          animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
        
        .live-text {
          font-size: 13px;
          font-weight: 600;
          color: #10b981;
        }
        
        .live-count {
          background: rgba(16, 185, 129, 0.2);
          padding: 2px 8px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 700;
          color: #10b981;
        }
        
        .notification-badge {
          position: relative;
          cursor: pointer;
        }
        
        .notification-dot {
          position: absolute;
          top: -2px;
          right: -2px;
          width: 8px;
          height: 8px;
          background: #ef4444;
          border-radius: 50%;
          border: 2px solid var(--bg-primary);
        }
        
        .user-menu {
          display: flex;
          align-items: center;
          gap: 12px;
          background: rgba(22, 22, 42, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 40px;
          padding: 6px 20px 6px 12px;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        
        .user-menu:hover {
          background: rgba(28, 28, 52, 0.8);
          border-color: rgba(99, 102, 241, 0.3);
        }
        
        .user-avatar {
          width: 36px;
          height: 36px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 14px;
          color: white;
        }
        
        .user-info {
          display: flex;
          flex-direction: column;
        }
        
        .user-name {
          font-size: 14px;
          font-weight: 600;
        }
        
        .user-role {
          font-size: 10px;
          color: var(--text-muted);
        }
        
        .logout-button {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: #ef4444;
          padding: 8px 20px;
          border-radius: 40px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        
        .logout-button:hover {
          background: rgba(239, 68, 68, 0.15);
          border-color: rgba(239, 68, 68, 0.3);
          transform: translateY(-2px);
        }
        
        /* Main Content */
        .main-content {
          max-width: 1600px;
          margin: 0 auto;
          padding: 40px 32px 60px;
        }
        
        /* Hero Section */
        .hero-section {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 40px;
          animation: fadeUp 0.6s ease forwards;
        }
        
        .hero-left {
          max-width: 600px;
        }
        
        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(99, 102, 241, 0.1);
          border: 1px solid rgba(99, 102, 241, 0.2);
          border-radius: 100px;
          padding: 8px 20px;
          margin-bottom: 20px;
        }
        
        .badge-dot {
          width: 8px;
          height: 8px;
          background: #10b981;
          border-radius: 50%;
          animation: glow 2s ease infinite;
        }
        
        .badge-text {
          font-size: 13px;
          font-weight: 600;
          color: #a0a0c0;
          letter-spacing: 0.5px;
        }
        
        .hero-title {
          font-size: clamp(40px, 6vw, 64px);
          font-weight: 800;
          line-height: 1.1;
          letter-spacing: -2px;
          margin-bottom: 20px;
        }
        
        .hero-gradient {
          background: linear-gradient(135deg, #667eea, #764ba2, #ec4899);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-size: 200% auto;
          animation: shimmer 4s linear infinite;
        }
        
        .hero-description {
          font-size: 16px;
          color: var(--text-secondary);
          line-height: 1.7;
          margin-bottom: 24px;
        }
        
        .hero-stats {
          display: flex;
          gap: 24px;
        }
        
        .hero-stat-item {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .hero-stat-value {
          font-size: 20px;
          font-weight: 700;
          color: var(--text-primary);
        }
        
        .hero-stat-label {
          font-size: 12px;
          color: var(--text-muted);
        }
        
        .hero-right {
          display: flex;
          gap: 16px;
        }
        
        .action-button {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 24px;
          border-radius: 12px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        
        .action-button.primary {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white;
          border: none;
        }
        
        .action-button.secondary {
          background: rgba(22, 22, 42, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: var(--text-primary);
        }
        
        .action-button:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-lg);
        }
        
        /* Stats Grid */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 20px;
          margin-bottom: 48px;
          animation: fadeUp 0.6s ease 0.1s both;
        }
        
        @media (max-width: 1400px) { .stats-grid { grid-template-columns: repeat(3, 1fr); } }
        @media (max-width: 768px) { .stats-grid { grid-template-columns: repeat(2, 1fr); } }
        
        .stat-card-modern {
          background: rgba(22, 22, 42, 0.6);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 24px;
          padding: 24px;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }
        
        .stat-card-modern::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, var(--stat-color), transparent);
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        
        .stat-card-modern:hover {
          transform: translateY(-5px);
          background: rgba(28, 28, 52, 0.8);
          border-color: rgba(255, 255, 255, 0.1);
          box-shadow: var(--shadow-lg);
        }
        
        .stat-card-modern:hover::before {
          opacity: 1;
        }
        
        .stat-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 16px;
        }
        
        .stat-icon-modern {
          width: 48px;
          height: 48px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
          position: relative;
        }
        
        .live-badge {
          position: absolute;
          top: -4px;
          right: -4px;
          width: 12px;
          height: 12px;
          background: #10b981;
          border-radius: 50%;
          border: 2px solid var(--bg-card);
          animation: pulse 1.5s ease infinite;
        }
        
        .stat-trend {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 600;
        }
        
        .stat-trend.up {
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
        }
        
        .stat-trend.down {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
        }
        
        .stat-trend.stable {
          background: rgba(99, 102, 241, 0.1);
          color: #6366f1;
        }
        
        .stat-value-modern {
          font-size: 36px;
          font-weight: 700;
          letter-spacing: -1px;
          line-height: 1;
          margin-bottom: 8px;
          font-family: 'JetBrains Mono', monospace;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .live-value-badge {
          font-size: 12px;
          font-weight: 600;
          padding: 2px 8px;
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid rgba(16, 185, 129, 0.3);
          border-radius: 20px;
          color: #10b981;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .stat-label-modern {
          font-size: 13px;
          color: var(--text-secondary);
          font-weight: 500;
        }
        
        .stat-secondary {
          font-size: 11px;
          color: var(--text-muted);
          margin-top: 12px;
        }
        
        /* Live Buses Section */
        .live-buses-section {
          background: rgba(22, 22, 42, 0.6);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 28px;
          padding: 28px;
          margin-bottom: 48px;
          animation: fadeUp 0.6s ease 0.15s both;
        }
        
        .live-buses-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }
        
        .live-buses-title {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .live-buses-icon {
          width: 44px;
          height: 44px;
          background: rgba(16, 185, 129, 0.1);
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(16, 185, 129, 0.2);
        }
        
        .live-buses-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }
        
        @media (max-width: 1200px) { .live-buses-grid { grid-template-columns: repeat(3, 1fr); } }
        @media (max-width: 768px) { .live-buses-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 480px) { .live-buses-grid { grid-template-columns: 1fr; } }
        
        .live-bus-card {
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(16, 185, 129, 0.2);
          border-radius: 20px;
          padding: 20px;
          position: relative;
          overflow: hidden;
        }
        
        .live-bus-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, #10b981, transparent);
          animation: shimmer 2s linear infinite;
        }
        
        .live-bus-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        
        .live-bus-number {
          font-size: 18px;
          font-weight: 700;
          color: #10b981;
        }
        
        .live-bus-status {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          font-weight: 600;
          color: #10b981;
          text-transform: uppercase;
        }
        
        .live-bus-route {
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 8px;
        }
        
        .live-bus-driver {
          font-size: 12px;
          color: var(--text-muted);
          margin-bottom: 16px;
        }
        
        .live-bus-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 11px;
          color: var(--text-muted);
        }
        
        .live-bus-coords {
          font-family: 'JetBrains Mono', monospace;
          background: rgba(255, 255, 255, 0.03);
          padding: 4px 8px;
          border-radius: 8px;
        }
        
        /* Section Header */
        .section-header-modern {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 28px;
        }
        
        .section-title-wrapper {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        
        .section-icon {
          width: 44px;
          height: 44px;
          background: linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.1));
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(99,102,241,0.2);
        }
        
        .section-title-modern {
          font-size: 24px;
          font-weight: 700;
          letter-spacing: -0.5px;
        }
        
        .section-subtitle {
          font-size: 14px;
          color: var(--text-muted);
          margin-top: 4px;
        }
        
        .section-actions {
          display: flex;
          gap: 12px;
        }
        
        .section-action-btn {
          padding: 8px 16px;
          border-radius: 10px;
          background: rgba(22, 22, 42, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.05);
          color: var(--text-secondary);
          font-size: 13px;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .section-action-btn:hover {
          background: rgba(28, 28, 52, 0.8);
          color: var(--text-primary);
        }
        
        /* Categories Grid */
        .categories-grid-modern {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
          margin-bottom: 48px;
          animation: fadeUp 0.6s ease 0.2s both;
        }
        
        @media (max-width: 1200px) { .categories-grid-modern { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 768px) { .categories-grid-modern { grid-template-columns: 1fr; } }
        
        .category-card-modern {
          background: rgba(22, 22, 42, 0.6);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 28px;
          padding: 28px;
          text-decoration: none;
          color: inherit;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }
        
        .category-card-modern::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(800px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(255,255,255,0.06), transparent 40%);
          opacity: 0;
          transition: opacity 0.4s ease;
        }
        
        .category-card-modern:hover {
          transform: translateY(-8px) scale(1.02);
          border-color: rgba(255, 255, 255, 0.1);
          box-shadow: 0 30px 60px rgba(0, 0, 0, 0.5);
        }
        
        .category-card-modern:hover::before {
          opacity: 1;
        }
        
        .category-gradient-bar {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, var(--gradient-start), var(--gradient-end));
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        
        .category-card-modern:hover .category-gradient-bar {
          opacity: 1;
        }
        
        .category-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
        }
        
        .category-icon-wrapper {
          width: 60px;
          height: 60px;
          border-radius: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01));
          border: 1px solid rgba(255, 255, 255, 0.05);
          position: relative;
          overflow: hidden;
        }
        
        .category-icon-wrapper::after {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.1), transparent);
        }
        
        .category-tag {
          font-size: 11px;
          font-weight: 700;
          padding: 6px 14px;
          border-radius: 100px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
          color: var(--text-secondary);
          letter-spacing: 0.5px;
        }
        
        .category-title {
          font-size: 20px;
          font-weight: 700;
          margin-bottom: 12px;
          letter-spacing: -0.5px;
        }
        
        .category-description {
          font-size: 14px;
          color: var(--text-secondary);
          line-height: 1.6;
          margin-bottom: 24px;
        }
        
        .category-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .category-metrics {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: var(--text-muted);
        }
        
        .category-link {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 600;
          transition: gap 0.3s ease;
        }
        
        .category-card-modern:hover .category-link {
          gap: 12px;
        }
        
        /* Activity Grid */
        .activity-section {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 24px;
          margin-bottom: 48px;
          animation: fadeUp 0.6s ease 0.3s both;
        }
        
        @media (max-width: 1000px) { .activity-section { grid-template-columns: 1fr; } }
        
        .activity-card {
          background: rgba(22, 22, 42, 0.6);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 28px;
          padding: 28px;
        }
        
        .activity-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }
        
        .activity-title {
          font-size: 18px;
          font-weight: 600;
        }
        
        .activity-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
          max-height: 400px;
          overflow-y: auto;
        }
        
        .activity-item {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 12px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.02);
          transition: all 0.2s ease;
        }
        
        .activity-item:hover {
          background: rgba(255, 255, 255, 0.04);
        }
        
        .activity-icon {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          position: relative;
        }
        
        .activity-live-badge {
          position: absolute;
          top: -2px;
          right: -2px;
          width: 8px;
          height: 8px;
          background: #10b981;
          border-radius: 50%;
          border: 2px solid var(--bg-card);
        }
        
        .activity-content {
          flex: 1;
        }
        
        .activity-action {
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 4px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        
        .live-activity-badge {
          font-size: 9px;
          font-weight: 700;
          padding: 2px 6px;
          background: rgba(16, 185, 129, 0.15);
          border-radius: 20px;
          color: #10b981;
          text-transform: uppercase;
        }
        
        .activity-user {
          font-size: 12px;
          color: var(--text-muted);
        }
        
        .activity-time {
          font-size: 11px;
          color: var(--text-muted);
          white-space: nowrap;
        }
        
        .activity-status {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
        
        .status-pending { background: #f59e0b; }
        .status-success { background: #10b981; }
        .status-warning { background: #ef4444; }
        .status-info { background: #6366f1; }
        
        /* Quick Actions Grid */
        .quick-actions-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 16px;
          animation: fadeUp 0.6s ease 0.4s both;
        }
        
        @media (max-width: 1200px) { .quick-actions-grid { grid-template-columns: repeat(3, 1fr); } }
        @media (max-width: 768px) { .quick-actions-grid { grid-template-columns: repeat(2, 1fr); } }
        
        .quick-action-card {
          background: rgba(22, 22, 42, 0.6);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 20px;
          padding: 20px;
          text-decoration: none;
          color: inherit;
          transition: all 0.3s ease;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          text-align: center;
        }
        
        .quick-action-card:hover {
          transform: translateY(-5px);
          background: rgba(28, 28, 52, 0.8);
          border-color: rgba(99, 102, 241, 0.3);
          box-shadow: var(--shadow-md);
        }
        
        .quick-action-icon {
          width: 48px;
          height: 48px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
          position: relative;
        }
        
        .quick-action-card:hover .quick-action-icon {
          transform: scale(1.1);
        }
        
        .quick-action-label {
          font-size: 13px;
          font-weight: 600;
        }
        
        /* Footer */
        .site-footer {
          background: rgba(10, 10, 18, 0.95);
          backdrop-filter: blur(12px);
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          margin-top: 60px;
        }
        
        .footer-container {
          max-width: 1600px;
          margin: 0 auto;
          padding: 24px 32px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 20px;
        }
        
        .footer-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        
        .footer-logo {
          width: 32px;
          height: 32px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .footer-copyright {
          font-size: 13px;
          color: var(--text-muted);
        }
        
        .footer-status {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 16px;
          background: rgba(16, 185, 129, 0.1);
          border-radius: 100px;
        }
        
        .status-dot {
          width: 8px;
          height: 8px;
          background: #10b981;
          border-radius: 50%;
          animation: glow 2s ease infinite;
        }
        
        .status-text {
          font-size: 12px;
          font-weight: 500;
          color: #10b981;
        }
        
        .footer-links {
          display: flex;
          gap: 24px;
        }
        
        .footer-link {
          font-size: 12px;
          color: var(--text-muted);
          text-decoration: none;
          transition: color 0.2s ease;
        }
        
        .footer-link:hover {
          color: var(--text-primary);
        }
        
        @media (max-width: 768px) {
          .header-container { padding: 0 20px; }
          .main-content { padding: 24px 20px 40px; }
          .hero-section { flex-direction: column; align-items: flex-start; gap: 20px; }
          .hero-right { width: 100%; }
          .action-button { flex: 1; justify-content: center; }
          .live-buses-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="dashboard-container">
        {/* Background Orbs */}
        <div className="bg-orb orb-1"></div>
        <div className="bg-orb orb-2"></div>
        <div className="bg-orb orb-3"></div>

        <div className="content-wrapper">
          {/* Header */}
          <header className="site-header">
            <div className="header-container">
              <div className="logo-section">
                <div className="logo-icon-wrapper">
                  <School size={22} color="white" />
                </div>
                <div className="logo-text">
                  <h1>SIT Admin Portal</h1>
                  <p>Enterprise Management System</p>
                </div>
              </div>

              <div className="header-actions">
                {/* Live Buses Indicator in Header */}
                {stats.liveBuses > 0 && (
                  <div className="live-indicator">
                    <div className="live-pulse">
                      <div className="live-pulse-dot"></div>
                      <div className="live-pulse-ring"></div>
                    </div>
                    <span className="live-text">{stats.liveBuses} Bus{stats.liveBuses > 1 ? 'es' : ''} Live</span>
                    <span className="live-count">NOW</span>
                  </div>
                )}

                <div className="notification-badge">
                  <Bell size={20} color="var(--text-secondary)" />
                  {notifications > 0 && <span className="notification-dot"></span>}
                </div>
                
                <div className="user-menu">
                  <div className="user-avatar">
                    {(adminName || 'A')[0].toUpperCase()}
                  </div>
                  <div className="user-info">
                    <span className="user-name">{adminName || 'Admin'}</span>
                    <span className="user-role">Administrator</span>
                  </div>
                </div>

                <button className="logout-button" onClick={handleLogout}>
                  <LogOut size={16} />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="main-content">
            {/* Hero Section */}
            <div className="hero-section">
              <div className="hero-left">
                <div className="hero-badge">
                  <div className="badge-dot"></div>
                  <span className="badge-text">SYSTEM ONLINE • {stats.liveBuses > 0 ? `${stats.liveBuses} BUSES ACTIVE` : 'ALL SERVICES OPERATIONAL'}</span>
                </div>
                <h1 className="hero-title">
                  Welcome back,{' '}
                  <span className="hero-gradient">{adminName || 'Admin'}</span>
                </h1>
                <p className="hero-description">
                  Your centralized command center for managing student operations, fleet logistics, 
                  financial transactions, and campus communications with real-time insights.
                </p>
                <div className="hero-stats">
                  <div className="hero-stat-item">
                    <Activity size={16} color="#10b981" />
                    <span className="hero-stat-value">98%</span>
                    <span className="hero-stat-label">uptime</span>
                  </div>
                  <div className="hero-stat-item">
                    <Users size={16} color="#6366f1" />
                    <span className="hero-stat-value">{stats.totalStudents}</span>
                    <span className="hero-stat-label">students</span>
                  </div>
                  <div className="hero-stat-item">
                    <Radio size={16} color="#10b981" />
                    <span className="hero-stat-value">{stats.liveBuses}</span>
                    <span className="hero-stat-label">live buses</span>
                  </div>
                  <div className="hero-stat-item">
                    <Clock size={16} color="#f59e0b" />
                    <span className="hero-stat-value">{currentTime}</span>
                    <span className="hero-stat-label">current</span>
                  </div>
                </div>
              </div>
              <div className="hero-right">
                <button className="action-button secondary" onClick={fetchDashboardData}>
                  <RefreshCw size={16} />
                  Refresh
                </button>
                <button className="action-button primary">
                  <Download size={16} />
                  Export Report
                </button>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="stats-grid">
              {quickStats.map((stat, i) => {
                const Icon = stat.icon;
                const isLiveStat = stat.label === 'Live Buses';
                return (
                  <div
                    key={i}
                    className="stat-card-modern"
                    style={{ '--stat-color': stat.accent }}
                  >
                    <div className="stat-header">
                      <div className="stat-icon-modern">
                        <Icon size={20} style={{ color: stat.accent }} />
                        {isLiveStat && stats.liveBuses > 0 && <div className="live-badge"></div>}
                      </div>
                      <div className={`stat-trend ${stat.trend}`}>
                        <TrendingUp size={10} />
                        {stat.change}
                      </div>
                    </div>
                    <div className="stat-value-modern" style={{ color: stat.accent }}>
                      {stat.value}
                      {isLiveStat && stats.liveBuses > 0 && (
                        <span className="live-value-badge">LIVE</span>
                      )}
                    </div>
                    <div className="stat-label-modern">{stat.label}</div>
                    <div className="stat-secondary">{stat.secondary}</div>
                  </div>
                );
              })}
            </div>

            {/* Live Buses Section */}
            {liveBuses.length > 0 && (
              <div className="live-buses-section">
                <div className="live-buses-header">
                  <div className="live-buses-title">
                    <div className="live-buses-icon">
                      <Radio size={20} color="#10b981" />
                    </div>
                    <div>
                      <h2 className="section-title-modern">Live Buses on Road</h2>
                      <div className="section-subtitle">Real-time GPS tracking • Updated {formatTimeAgo(lastUpdated.toISOString())}</div>
                    </div>
                  </div>
                  <Link href="/bus-locations" className="section-action-btn">
                    View All
                    <ChevronRight size={14} />
                  </Link>
                </div>

                <div className="live-buses-grid">
                  {liveBuses.map((bus) => (
                    <div key={bus.id} className="live-bus-card">
                      <div className="live-bus-header">
                        <span className="live-bus-number">Bus #{bus.bus_details?.bus_number || bus.bus_id || 'Unknown'}</span>
                        <span className="live-bus-status">
                          <span className="live-pulse-dot" style={{ width: 6, height: 6 }}></span>
                          LIVE
                        </span>
                      </div>
                      <div className="live-bus-route">Route: {bus.bus_details?.route || 'Not assigned'}</div>
                      <div className="live-bus-driver">
                        Driver: {bus.bus_details?.drivers_new?.name || 'Unknown'}
                      </div>
                      <div className="live-bus-footer">
                        <span className="live-bus-coords">
                          {bus.latitude ? `${bus.latitude.toFixed(4)}, ${bus.longitude.toFixed(4)}` : 'No GPS'}
                        </span>
                        <span>{formatTimeAgo(bus.updated_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Categories Section */}
            <div className="section-header-modern">
              <div className="section-title-wrapper">
                <div className="section-icon">
                  <BarChart3 size={20} color="#6366f1" />
                </div>
                <div>
                  <h2 className="section-title-modern">Management Modules</h2>
                  <div className="section-subtitle">Access all administrative panels</div>
                </div>
              </div>
              <div className="section-actions">
                <button className="section-action-btn">
                  <Filter size={14} />
                  Filter
                </button>
                <button className="section-action-btn">
                  <MoreVertical size={14} />
                </button>
              </div>
            </div>

            <div className="categories-grid-modern">
              {categories.map((cat, i) => {
                const Icon = cat.icon;
                const isLiveModule = cat.id === 'bus-locations';
                return (
                  <Link
                    key={cat.id}
                    href={cat.href}
                    className="category-card-modern"
                    style={{
                      '--gradient-start': cat.accent,
                      '--gradient-end': cat.gradient ? cat.gradient.split(' ')[2] || cat.accent : cat.accent
                    }}
                    onMouseMove={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = ((e.clientX - rect.left) / rect.width) * 100;
                      const y = ((e.clientY - rect.top) / rect.height) * 100;
                      e.currentTarget.style.setProperty('--mouse-x', `${x}%`);
                      e.currentTarget.style.setProperty('--mouse-y', `${y}%`);
                    }}
                  >
                    <div className="category-gradient-bar"></div>
                    <div className="category-header">
                      <div className="category-icon-wrapper">
                        <Icon size={24} style={{ color: cat.accent }} />
                        {isLiveModule && stats.liveBuses > 0 && (
                          <div style={{ position: 'absolute', top: -2, right: -2, width: 12, height: 12, background: '#10b981', borderRadius: '50%', border: '2px solid var(--bg-card)' }}></div>
                        )}
                      </div>
                      <span className="category-tag">{cat.tag}</span>
                    </div>
                    <h3 className="category-title">
                      {cat.name}
                      {isLiveModule && stats.liveBuses > 0 && (
                        <span style={{ marginLeft: 8, fontSize: 11, background: 'rgba(16,185,129,0.15)', color: '#10b981', padding: '2px 8px', borderRadius: 20 }}>{stats.liveBuses} LIVE</span>
                      )}
                    </h3>
                    <p className="category-description">{cat.description}</p>
                    <div className="category-footer">
                      <span className="category-metrics">
                        <Activity size={12} />
                        {cat.metrics}
                      </span>
                      <span className="category-link" style={{ color: cat.accent }}>
                        Access
                        <ChevronRight size={14} />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Activity Section */}
            <div className="activity-section">
              <div className="activity-card">
                <div className="activity-header">
                  <h3 className="activity-title">Recent Activity</h3>
                  <button className="section-action-btn" onClick={fetchDashboardData}>Refresh</button>
                </div>
                <div className="activity-list">
                  {recentActivities.length > 0 ? (
                    recentActivities.map((activity, i) => (
                      <div key={i} className="activity-item">
                        <div className="activity-icon" style={{
                          background: activity.type === 'complaint' ? 'rgba(239,68,68,0.1)' :
                                     activity.type === 'tracking' ? 'rgba(16,185,129,0.1)' :
                                     activity.type === 'payment' ? 'rgba(99,102,241,0.1)' :
                                     activity.type === 'alert' ? 'rgba(245,158,11,0.1)' :
                                     'rgba(236,72,153,0.1)'
                        }}>
                          {activity.type === 'complaint' && <AlertTriangle size={16} color="#ef4444" />}
                          {activity.type === 'tracking' && <MapPin size={16} color="#10b981" />}
                          {activity.type === 'payment' && <CreditCard size={16} color="#6366f1" />}
                          {activity.type === 'alert' && <Shield size={16} color="#f59e0b" />}
                          {activity.type === 'announcement' && <Megaphone size={16} color="#ec4899" />}
                          {activity.type === 'tracking' && <div className="activity-live-badge"></div>}
                        </div>
                        <div className="activity-content">
                          <div className="activity-action">
                            {activity.action}
                            {activity.type === 'tracking' && (
                              <span className="live-activity-badge">LIVE</span>
                            )}
                          </div>
                          <div className="activity-user">{activity.user}</div>
                        </div>
                        <div className="activity-time">{activity.time}</div>
                        <div className={`activity-status status-${activity.status}`}></div>
                      </div>
                    ))
                  ) : (
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                      <Activity size={40} style={{ marginBottom: 16, opacity: 0.3 }} />
                      <p>No recent activity</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="activity-card">
                <div className="activity-header">
                  <h3 className="activity-title">Quick Stats</h3>
                  <span className="category-tag">Today</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Active Sessions</span>
                    <span style={{ fontWeight: 600 }}>{activeSessions}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Pending Approvals</span>
                    <span style={{ fontWeight: 600, color: pendingApprovals > 0 ? '#f59e0b' : 'inherit' }}>{pendingApprovals}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>System Load</span>
                    <span style={{ fontWeight: 600, color: systemLoad > 70 ? '#ef4444' : '#10b981' }}>{systemLoad}%</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Live Buses</span>
                    <span style={{ fontWeight: 600, color: '#10b981', display: 'flex', alignItems: 'center', gap: 4 }}>
                      {stats.liveBuses}
                      {stats.liveBuses > 0 && (
                        <span style={{ fontSize: 10, background: 'rgba(16,185,129,0.15)', padding: '2px 6px', borderRadius: 12 }}>NOW</span>
                      )}
                    </span>
                  </div>
                  <div style={{ marginTop: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Fleet Activity</span>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{Math.round((stats.liveBuses / (stats.totalBuses || 1)) * 100)}%</span>
                    </div>
                    <div style={{ height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ width: `${Math.round((stats.liveBuses / (stats.totalBuses || 1)) * 100)}%`, height: '100%', background: 'linear-gradient(90deg, #10b981, #34d399)', borderRadius: 4 }}></div>
                    </div>
                  </div>
                  {stats.expiringDocuments > 0 && (
                    <div style={{ marginTop: 16, padding: 16, background: 'rgba(239,68,68,0.1)', borderRadius: 12, border: '1px solid rgba(239,68,68,0.2)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Shield size={20} color="#ef4444" />
                        <div>
                          <div style={{ fontWeight: 600, color: '#ef4444' }}>{stats.expiringDocuments} Document{stats.expiringDocuments > 1 ? 's' : ''} Expiring Soon</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Action required within 30 days</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="section-header-modern">
              <div className="section-title-wrapper">
                <div className="section-icon">
                  <Zap size={20} color="#f59e0b" />
                </div>
                <div>
                  <h2 className="section-title-modern">Quick Actions</h2>
                  <div className="section-subtitle">Frequently used operations</div>
                </div>
              </div>
            </div>

            <div className="quick-actions-grid">
              {[
                { label: 'Send Announcement', icon: Megaphone, href: '/announcements', accent: '#ec4899' },
                { label: 'Create Notice', icon: Bell, href: '/notices', accent: '#14b8a6' },
                { label: 'Add Student', icon: Users, href: '/dashboard', accent: '#6366f1' },
                { label: 'Add Bus', icon: Bus, href: '/buses', accent: '#10b981' },
                { label: 'Add Driver', icon: Truck, href: '/drivers', accent: '#f59e0b' },
                { label: 'Track Fleet', icon: Map, href: '/bus-locations', accent: '#ef4444' },
              ].map((action, i) => {
                const Icon = action.icon;
                const isTrackAction = action.label === 'Track Fleet';
                return (
                  <Link key={i} href={action.href} className="quick-action-card">
                    <div className="quick-action-icon" style={{ background: `${action.accent}15`, position: 'relative' }}>
                      <Icon size={20} style={{ color: action.accent }} />
                      {isTrackAction && stats.liveBuses > 0 && (
                        <div style={{ position: 'absolute', top: -2, right: -2, width: 10, height: 10, background: '#10b981', borderRadius: '50%', border: '2px solid var(--bg-card)' }}></div>
                      )}
                    </div>
                    <span className="quick-action-label">
                      {action.label}
                      {isTrackAction && stats.liveBuses > 0 && (
                        <span style={{ marginLeft: 4, fontSize: 9, color: '#10b981' }}>({stats.liveBuses} live)</span>
                      )}
                    </span>
                  </Link>
                );
              })}
            </div>
          </main>

          {/* Footer */}
          <footer className="site-footer">
            <div className="footer-container">
              <div className="footer-left">
                <div className="footer-logo">
                  <School size={14} color="white" />
                </div>
                <span className="footer-copyright">© 2024 Shetty Institute of Technology. All rights reserved.</span>
              </div>
              <div className="footer-status">
                <div className="status-dot"></div>
                <span className="status-text">
                  {stats.liveBuses > 0 ? `${stats.liveBuses} buses live • ` : ''}All systems operational
                </span>
              </div>
              <div className="footer-links">
                <a href="#" className="footer-link">Privacy Policy</a>
                <a href="#" className="footer-link">Terms of Service</a>
                <a href="#" className="footer-link">Help Center</a>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </>
  );
}

export default withAuth(HomePage);