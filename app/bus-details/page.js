'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Bus, 
  Plus, 
  Search,
  AlertTriangle,
  RefreshCw,
  Calendar,
  Gauge,
  Wrench,
  Clock,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Shield,
  FileText,
  Truck,
  Fuel,
  Settings,
  MapPin,
  Info
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import withAuth from '../../components/withAuth';

function BusDetails() {
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedBus, setExpandedBus] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentTime, setCurrentTime] = useState('');

  const router = useRouter();

  useEffect(() => {
    fetchBuses();
    
    // Update time
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // 🔥 SIMPLIFIED: Fetch only bus details (no driver info)
  const fetchBuses = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching buses...');
      
      const { data, error } = await supabase
        .from('buses')
        .select('*')
        .order('bus_number');

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Fetched buses:', data);
      setBuses(data || []);
      
    } catch (error) {
      console.error('Error fetching buses:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const toggleBusExpansion = (busId) => {
    setExpandedBus(expandedBus === busId ? null : busId);
  };

  // Function to calculate remaining days
  const getRemainingDays = (expiryDate) => {
    if (!expiryDate) return null;
    
    const today = new Date();
    const expiry = new Date(expiryDate);
    const timeDiff = expiry.getTime() - today.getTime();
    const daysUntilExpiry = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
    
    return daysUntilExpiry;
  };

  // Function to check expiry status and get display info
  const getExpiryInfo = (expiryDate) => {
    if (!expiryDate) {
      return {
        status: 'not-set',
        text: 'Not set',
        badgeClass: 'badge-not-set',
        icon: '⚠️',
        daysText: '',
        days: null
      };
    }
    
    const days = getRemainingDays(expiryDate);
    
    if (days < 0) {
      return {
        status: 'expired',
        text: 'Expired',
        badgeClass: 'badge-expired',
        icon: '❌',
        daysText: `${Math.abs(days)} days ago`,
        days: days
      };
    } else if (days <= 7) {
      return {
        status: 'critical',
        text: 'Critical',
        badgeClass: 'badge-critical',
        icon: '🔥',
        daysText: `${days} days left`,
        days: days
      };
    } else if (days <= 30) {
      return {
        status: 'warning',
        text: 'Expiring Soon',
        badgeClass: 'badge-warning',
        icon: '⚠️',
        daysText: `${days} days left`,
        days: days
      };
    } else {
      return {
        status: 'valid',
        text: 'Valid',
        badgeClass: 'badge-valid',
        icon: '✅',
        daysText: `${days} days left`,
        days: days
      };
    }
  };

  // Function to format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Function to get service status
  const getServiceInfo = (nextServiceDate, currentKm, nextServiceKm) => {
    if (!nextServiceDate && !nextServiceKm) {
      return {
        status: 'not-set',
        text: 'Not set',
        badgeClass: 'badge-not-set',
        icon: '⚙️',
        daysText: '',
        kmText: ''
      };
    }

    let status = 'valid';
    let daysText = '';
    let kmText = '';

    // Check date-based service
    if (nextServiceDate) {
      const days = getRemainingDays(nextServiceDate);
      if (days <= 0) {
        status = 'critical';
        daysText = `Overdue by ${Math.abs(days)} days`;
      } else if (days <= 7) {
        status = 'warning';
        daysText = `${days} days left`;
      } else {
        daysText = `${days} days left`;
      }
    }

    // Check KM-based service
    if (nextServiceKm && currentKm) {
      const current = parseInt(currentKm);
      const next = parseInt(nextServiceKm);
      const remainingKm = next - current;
      
      if (remainingKm <= 0) {
        status = 'critical';
        kmText = `Overdue by ${Math.abs(remainingKm)} km`;
      } else if (remainingKm <= 500) {
        status = status === 'valid' ? 'warning' : status;
        kmText = `${remainingKm} km left`;
      } else {
        kmText = `${remainingKm} km left`;
      }
    }

    const badgeClass = 
      status === 'critical' ? 'badge-critical' :
      status === 'warning' ? 'badge-warning' :
      status === 'not-set' ? 'badge-not-set' :
      'badge-valid';

    return {
      status,
      text: status === 'critical' ? 'Due Now' : status === 'warning' ? 'Due Soon' : status === 'not-set' ? 'Not Set' : 'Scheduled',
      badgeClass,
      icon: status === 'critical' ? '🔥' : status === 'warning' ? '⚠️' : '✅',
      daysText,
      kmText
    };
  };

  // Filter buses based on search term
  const filteredBuses = buses.filter(bus =>
    bus.bus_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bus.route_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate stats
  const expiredDocumentsCount = buses.filter(bus => 
    getExpiryInfo(bus.puc_expiry).status === 'expired' ||
    getExpiryInfo(bus.insurance_expiry).status === 'expired' ||
    getExpiryInfo(bus.fitness_expiry).status === 'expired' ||
    getExpiryInfo(bus.permit_expiry).status === 'expired'
  ).length;

  const criticalAlertsCount = buses.filter(bus => 
    getExpiryInfo(bus.puc_expiry).status === 'critical' ||
    getExpiryInfo(bus.insurance_expiry).status === 'critical' ||
    getExpiryInfo(bus.fitness_expiry).status === 'critical' ||
    getExpiryInfo(bus.permit_expiry).status === 'critical' ||
    getServiceInfo(bus.next_service_due, bus.current_km, bus.next_service_km).status === 'critical'
  ).length;

  const dueForServiceCount = buses.filter(bus => 
    getServiceInfo(bus.next_service_due, bus.current_km, bus.next_service_km).status !== 'valid'
  ).length;

  if (loading) {
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
              borderTop: '4px solid #f97316', 
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
              background: '#f97316', 
              borderRadius: '50%', 
              animation: 'pulse 1.5s ease infinite' 
            }}></div>
          </div>
          <p style={{ color: '#f97316', fontWeight: 600 }}>Loading buses...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: '#0a0a0f',
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <div style={{ textAlign: 'center', background: '#16162a', padding: 40, borderRadius: 24, border: '1px solid rgba(255,255,255,0.08)' }}>
          <AlertTriangle size={48} color="#ef4444" style={{ marginBottom: 16 }} />
          <h3 style={{ fontSize: 20, fontWeight: 600, color: 'white', marginBottom: 8 }}>Error Loading Buses</h3>
          <p style={{ color: '#a0a0c0', marginBottom: 24 }}>{error}</p>
          <button
            onClick={fetchBuses}
            style={{
              background: '#f97316',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: 12,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#ea580c'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#f97316'}
          >
            <RefreshCw size={16} />
            <span>Retry</span>
          </button>
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
          --accent-orange: #f97316;
          --accent-red: #ef4444;
          --accent-green: #10b981;
          --accent-yellow: #eab308;
          --accent-blue: #3b82f6;
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
        
        .animate-fade-in { animation: fadeIn 0.3s ease forwards; }
        .animate-float { animation: float 3s ease-in-out infinite; }
        
        .glass-effect {
          background: rgba(22, 22, 42, 0.8);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        
        /* Badge Styles */
        .badge-valid {
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
          border: 1px solid rgba(16, 185, 129, 0.2);
        }
        
        .badge-warning {
          background: rgba(234, 179, 8, 0.1);
          color: #eab308;
          border: 1px solid rgba(234, 179, 8, 0.2);
        }
        
        .badge-critical {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.2);
        }
        
        .badge-expired {
          background: rgba(239, 68, 68, 0.15);
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }
        
        .badge-not-set {
          background: rgba(107, 114, 128, 0.1);
          color: #9ca3af;
          border: 1px solid rgba(107, 114, 128, 0.2);
        }
        
        .search-bar {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 40px;
          padding: 8px 20px;
          transition: all 0.3s ease;
        }
        
        .search-bar:focus-within {
          border-color: #f97316;
          box-shadow: 0 0 0 3px rgba(249,115,22,0.2);
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
          background: linear-gradient(90deg, #f97316, #eab308);
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
          overflow: hidden;
          transition: all 0.3s ease;
        }
        
        .bus-card:hover {
          border-color: #f97316;
          box-shadow: 0 10px 30px -10px rgba(249,115,22,0.3);
        }
        
        .bus-header {
          background: rgba(255,255,255,0.02);
          border-bottom: 1px solid var(--border);
          padding: 16px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .bus-header:hover {
          background: rgba(249,115,22,0.05);
        }
        
        .table-header {
          background: rgba(22, 22, 42, 0.95);
          border-bottom: 1px solid var(--border);
        }
        
        .table-row {
          transition: all 0.2s ease;
        }
        
        .table-row:hover {
          background: rgba(249,115,22,0.05);
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
          border-color: #f97316;
          color: #f97316;
        }
        
        .action-button.primary {
          background: linear-gradient(135deg, #f97316, #eab308);
          color: white;
          border: none;
        }
        
        .action-button.primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px -5px #f97316;
        }
        
        .document-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }
        
        .document-item {
          background: rgba(255,255,255,0.02);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 12px;
          text-align: center;
        }
        
        @media (max-width: 768px) {
          .stat-card { padding: 16px; }
          .bus-card { margin-bottom: 12px; }
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
          background: 'radial-gradient(circle, rgba(249,115,22,0.15) 0%, transparent 70%)',
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
          background: 'radial-gradient(circle, rgba(234,179,8,0.1) 0%, transparent 70%)',
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
              <div>
                <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Bus Details</h1>
                <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{dateStr}</p>
              </div>
            </div>
            <Link
              href="/bus-details/add"
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #f97316, #eab308)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white'
              }}
            >
              <Plus size={18} />
            </Link>
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
                <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)' }}>Bus Details</h1>
                <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 4 }}>{dateStr} • {currentTime}</p>
              </div>
            </div>
            <Link
              href="/bus-details/add"
              className="action-button primary"
              style={{ padding: '10px 20px' }}
            >
              <Plus size={18} />
              <span>Add Bus</span>
            </Link>
          </div>

          {/* Search Bar */}
          <div className="search-bar" style={{ 
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 12
          }}>
            <Search size={18} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Search by bus number or route..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                flex: 1,
                border: 'none',
                outline: 'none',
                fontSize: 14,
                background: 'transparent',
                color: 'var(--text-primary)'
              }}
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')} 
                style={{ 
                  border: 'none', 
                  background: 'none', 
                  cursor: 'pointer',
                  color: 'var(--text-muted)'
                }}
              >
                <span style={{ fontSize: 18 }}>×</span>
              </button>
            )}
          </div>

          {/* Summary Cards */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 12,
            marginBottom: 20
          }}>
            {/* Expired Documents Card */}
            <div className="stat-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Expired Docs</p>
                  <p style={{ fontSize: 28, fontWeight: 700, color: '#ef4444', marginTop: 4 }}>{expiredDocumentsCount}</p>
                </div>
                <div style={{ 
                  width: 40, 
                  height: 40, 
                  borderRadius: 12, 
                  background: 'rgba(239,68,68,0.1)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center'
                }}>
                  <AlertTriangle size={20} color="#ef4444" />
                </div>
              </div>
            </div>

            {/* Critical Alerts Card */}
            <div className="stat-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Critical</p>
                  <p style={{ fontSize: 28, fontWeight: 700, color: '#f97316', marginTop: 4 }}>{criticalAlertsCount}</p>
                </div>
                <div style={{ 
                  width: 40, 
                  height: 40, 
                  borderRadius: 12, 
                  background: 'rgba(249,115,22,0.1)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center'
                }}>
                  <Clock size={20} color="#f97316" />
                </div>
              </div>
            </div>

            {/* Service Due Card */}
            <div className="stat-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Service Due</p>
                  <p style={{ fontSize: 28, fontWeight: 700, color: '#eab308', marginTop: 4 }}>{dueForServiceCount}</p>
                </div>
                <div style={{ 
                  width: 40, 
                  height: 40, 
                  borderRadius: 12, 
                  background: 'rgba(234,179,8,0.1)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center'
                }}>
                  <Wrench size={20} color="#eab308" />
                </div>
              </div>
            </div>

            {/* Total Buses Card */}
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
          </div>

          {filteredBuses.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: 60,
              background: 'var(--bg-card)',
              borderRadius: 24,
              border: '1px solid var(--border)'
            }}>
              <Bus size={48} color="var(--text-muted)" style={{ marginBottom: 16 }} />
              <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
                No buses found
              </h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>
                {searchTerm ? 'Try adjusting your search criteria' : 'Get started by adding your first bus'}
              </p>
              <Link
                href="/bus-details/add"
                className="action-button primary"
                style={{ padding: '12px 24px' }}
              >
                <Plus size={18} />
                <span>Add Your First Bus</span>
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Mobile Card View */}
              <div style={{ display: 'block' }}>
                {filteredBuses.map((bus) => (
                  <div key={bus.id} className="bus-card" style={{ marginBottom: 12 }}>
                    {/* Bus Header */}
                    <div 
                      className="bus-header"
                      onClick={() => toggleBusExpansion(bus.id)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
                            Bus {bus.bus_number}
                          </h3>
                          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                            {bus.route_name || 'No route set'}
                          </p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span className={`badge-${getExpiryInfo(bus.puc_expiry).status === 'expired' ? 'expired' : getExpiryInfo(bus.puc_expiry).status}`} style={{
                            padding: '4px 8px',
                            borderRadius: 12,
                            fontSize: 10,
                            fontWeight: 600
                          }}>
                            {getExpiryInfo(bus.puc_expiry).status === 'expired' ? 'EXPIRED' : 
                             getExpiryInfo(bus.puc_expiry).status === 'critical' ? 'CRITICAL' : 'OK'}
                          </span>
                          {expandedBus === bus.id ? 
                            <ChevronUp size={16} color="var(--text-muted)" /> : 
                            <ChevronDown size={16} color="var(--text-muted)" />
                          }
                        </div>
                      </div>
                    </div>

                    {/* Expandable Content */}
                    {expandedBus === bus.id && (
                      <div style={{ padding: 16 }}>
                        {/* Document Expiry */}
                        <div style={{ marginBottom: 16 }}>
                          <h4 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>
                            Document Expiry
                          </h4>
                          <div className="document-grid">
                            {[
                              { label: 'PUC', expiry: bus.puc_expiry, icon: '📄' },
                              { label: 'Insurance', expiry: bus.insurance_expiry, icon: '🛡️' },
                              { label: 'Fitness', expiry: bus.fitness_expiry, icon: '✅' },
                              { label: 'Permit', expiry: bus.permit_expiry, icon: '📋' }
                            ].map((doc) => {
                              const info = getExpiryInfo(doc.expiry);
                              return (
                                <div key={doc.label} className="document-item">
                                  <div style={{ fontSize: 18, marginBottom: 4 }}>{doc.icon}</div>
                                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>{doc.label}</div>
                                  <span className={info.badgeClass} style={{
                                    padding: '2px 6px',
                                    borderRadius: 8,
                                    fontSize: 9,
                                    fontWeight: 600,
                                    display: 'inline-block'
                                  }}>
                                    {info.text}
                                  </span>
                                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                                    {formatDate(doc.expiry)}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Service Information */}
                        <div>
                          <h4 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>
                            Service Information
                          </h4>
                          <div style={{ 
                            background: 'rgba(255,255,255,0.02)', 
                            border: '1px solid var(--border)', 
                            borderRadius: 12,
                            padding: 12
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Next Service</span>
                              <span className={getServiceInfo(bus.next_service_due, bus.current_km, bus.next_service_km).badgeClass} style={{
                                padding: '4px 8px',
                                borderRadius: 12,
                                fontSize: 10,
                                fontWeight: 600
                              }}>
                                {getServiceInfo(bus.next_service_due, bus.current_km, bus.next_service_km).text}
                              </span>
                            </div>
                            {bus.current_km && (
                              <div style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: 8,
                                fontSize: 12,
                                color: 'var(--text-secondary)',
                                marginBottom: 4
                              }}>
                                <Gauge size={14} color="#3b82f6" />
                                <span>Current KM: <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{bus.current_km}</span></span>
                              </div>
                            )}
                            {bus.last_service_date && (
                              <div style={{ 
                                fontSize: 11, 
                                color: 'var(--text-muted)',
                                background: 'rgba(0,0,0,0.2)',
                                padding: '6px 8px',
                                borderRadius: 8,
                                marginTop: 8
                              }}>
                                Last service: {formatDate(bus.last_service_date)}
                                {bus.last_service_km && ` at ${bus.last_service_km} KM`}
                              </div>
                            )}
                          </div>
                        </div>

                        {bus.remarks && (
                          <div style={{ marginTop: 12 }}>
                            <h4 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>Remarks</h4>
                            <p style={{ 
                              fontSize: 12, 
                              color: 'var(--text-secondary)',
                              background: 'rgba(255,255,255,0.02)',
                              border: '1px solid var(--border)',
                              borderRadius: 8,
                              padding: 8
                            }}>
                              {bus.remarks}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default withAuth(BusDetails);