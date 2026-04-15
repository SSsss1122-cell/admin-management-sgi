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
  Info,
  Edit,
  Trash2,
  Save,
  X,
  Users,
  Battery,
  Wind,
  Thermometer,
  CheckCircle,
  AlertCircle,
  XCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import withAuth from '../../components/withAuth';

function BusDetails() {
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedBus, setExpandedBus] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentTime, setCurrentTime] = useState('');
  const [editingBus, setEditingBus] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [editFormData, setEditFormData] = useState({
    bus_number: '',
    route_name: '',
    puc_expiry: '',
    insurance_expiry: '',
    fitness_expiry: '',
    permit_expiry: '',
    current_km: '',
    last_service_date: '',
    last_service_km: '',
    next_service_due: '',
    next_service_km: '',
    remarks: ''
  });

  const router = useRouter();

  useEffect(() => {
    fetchBuses();
    
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => {
        setToast({ show: false, message: '', type: 'success' });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast.show]);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
  };

  const fetchBuses = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('buses')
        .select('*')
        .order('bus_number');

      if (error) throw error;

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

  const getRemainingDays = (expiryDate) => {
    if (!expiryDate) return null;
    
    const today = new Date();
    const expiry = new Date(expiryDate);
    const timeDiff = expiry.getTime() - today.getTime();
    const daysUntilExpiry = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
    
    return daysUntilExpiry;
  };

  const getExpiryInfo = (expiryDate) => {
    if (!expiryDate) {
      return {
        status: 'not-set',
        text: 'Not Set',
        badgeClass: 'badge-not-set',
        icon: '⚠️',
        daysText: '',
        days: null,
        color: '#9ca3af'
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
        days: days,
        color: '#ef4444'
      };
    } else if (days <= 7) {
      return {
        status: 'critical',
        text: 'Critical',
        badgeClass: 'badge-critical',
        icon: '🔥',
        daysText: `${days} days left`,
        days: days,
        color: '#f97316'
      };
    } else if (days <= 30) {
      return {
        status: 'warning',
        text: 'Warning',
        badgeClass: 'badge-warning',
        icon: '⚠️',
        daysText: `${days} days left`,
        days: days,
        color: '#eab308'
      };
    } else {
      return {
        status: 'valid',
        text: 'Valid',
        badgeClass: 'badge-valid',
        icon: '✅',
        daysText: `${days} days left`,
        days: days,
        color: '#10b981'
      };
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  };

  const getServiceInfo = (nextServiceDate, currentKm, nextServiceKm) => {
    if (!nextServiceDate && !nextServiceKm) {
      return {
        status: 'not-set',
        text: 'Not Set',
        badgeClass: 'badge-not-set',
        icon: '⚙️',
        daysText: '',
        kmText: '',
        color: '#9ca3af'
      };
    }

    let status = 'valid';
    let daysText = '';
    let kmText = '';

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
      kmText,
      color: status === 'critical' ? '#ef4444' : status === 'warning' ? '#eab308' : '#10b981'
    };
  };

  const filteredBuses = buses.filter(bus =>
    bus.bus_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bus.route_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  const deleteBus = async (busId, busNumber) => {
    if (!window.confirm(`⚠️ Are you sure you want to delete Bus ${busNumber}?\n\nThis action cannot be undone.`)) return;
    
    try {
      const { error } = await supabase
        .from('buses')
        .delete()
        .eq('id', busId);

      if (error) throw error;

      showToast(`Bus ${busNumber} deleted successfully!`, 'success');
      fetchBuses();
    } catch (error) {
      console.error('Error deleting bus:', error);
      showToast('Error deleting bus: ' + error.message, 'error');
    }
  };

  const openEditModal = (bus) => {
    setEditingBus(bus);
    setEditFormData({
      bus_number: bus.bus_number || '',
      route_name: bus.route_name || '',
      puc_expiry: formatDateForInput(bus.puc_expiry) || '',
      insurance_expiry: formatDateForInput(bus.insurance_expiry) || '',
      fitness_expiry: formatDateForInput(bus.fitness_expiry) || '',
      permit_expiry: formatDateForInput(bus.permit_expiry) || '',
      current_km: bus.current_km || '',
      last_service_date: formatDateForInput(bus.last_service_date) || '',
      last_service_km: bus.last_service_km || '',
      next_service_due: formatDateForInput(bus.next_service_due) || '',
      next_service_km: bus.next_service_km || '',
      remarks: bus.remarks || ''
    });
    setShowEditModal(true);
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    
    try {
      const updateData = {
        bus_number: editFormData.bus_number,
        route_name: editFormData.route_name || null,
        puc_expiry: editFormData.puc_expiry || null,
        insurance_expiry: editFormData.insurance_expiry || null,
        fitness_expiry: editFormData.fitness_expiry || null,
        permit_expiry: editFormData.permit_expiry || null,
        current_km: editFormData.current_km || null,
        last_service_date: editFormData.last_service_date || null,
        last_service_km: editFormData.last_service_km || null,
        next_service_due: editFormData.next_service_due || null,
        next_service_km: editFormData.next_service_km || null,
        remarks: editFormData.remarks || null
      };

      const { error } = await supabase
        .from('buses')
        .update(updateData)
        .eq('id', editingBus.id);

      if (error) throw error;

      showToast(`Bus ${editFormData.bus_number} updated successfully!`, 'success');
      setShowEditModal(false);
      setEditingBus(null);
      fetchBuses();
    } catch (error) {
      console.error('Error updating bus:', error);
      showToast('Error updating bus: ' + error.message, 'error');
    }
  };

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
        
        @keyframes scaleIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        
        @keyframes float {
          0%,100% { transform: translateY(0px); }
          50% { transform: translateY(-5px); }
        }
        
        @keyframes glow {
          0%,100% { filter: blur(60px) opacity(0.5); }
          50% { filter: blur(80px) opacity(0.8); }
        }
        
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        
        .animate-fade-in { animation: fadeIn 0.3s ease forwards; }
        .animate-slide-in { animation: slideIn 0.3s ease forwards; }
        .animate-scale-in { animation: scaleIn 0.2s ease forwards; }
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
          background: rgba(249, 115, 22, 0.1);
          color: #f97316;
          border: 1px solid rgba(249, 115, 22, 0.2);
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
        
        .status-card {
          background: linear-gradient(135deg, var(--bg-card) 0%, var(--bg-secondary) 100%);
          border-radius: 20px;
          padding: 20px;
          position: relative;
          overflow: hidden;
          transition: all 0.3s ease;
          border: 1px solid var(--border);
        }
        
        .status-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, var(--accent-orange), var(--accent-yellow));
          transform: scaleX(0);
          transition: transform 0.3s ease;
        }
        
        .status-card:hover::before {
          transform: scaleX(1);
        }
        
        .status-card:hover {
          transform: translateY(-4px);
          border-color: var(--border-hover);
          box-shadow: 0 20px 40px -12px rgba(0,0,0,0.3);
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
          transform: translateY(-2px);
        }
        
        .bus-header {
          background: linear-gradient(135deg, rgba(249,115,22,0.05) 0%, rgba(234,179,8,0.02) 100%);
          border-bottom: 1px solid var(--border);
          padding: 16px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .bus-header:hover {
          background: linear-gradient(135deg, rgba(249,115,22,0.1) 0%, rgba(234,179,8,0.05) 100%);
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
          transform: translateY(-1px);
        }
        
        .action-button.primary {
          background: linear-gradient(135deg, #f97316, #eab308);
          color: white;
          border: none;
          box-shadow: 0 4px 12px rgba(249,115,22,0.3);
        }
        
        .action-button.primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px -5px #f97316;
        }
        
        .action-button.edit {
          background: rgba(59, 130, 246, 0.1);
          color: #3b82f6;
          border: 1px solid rgba(59, 130, 246, 0.2);
        }
        
        .action-button.edit:hover {
          background: rgba(59, 130, 246, 0.2);
          border-color: rgba(59, 130, 246, 0.4);
        }
        
        .action-button.delete {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.2);
        }
        
        .action-button.delete:hover {
          background: rgba(239, 68, 68, 0.2);
          border-color: rgba(239, 68, 68, 0.4);
        }
        
        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
        }
        
        .info-card {
          background: rgba(255,255,255,0.02);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 16px;
          transition: all 0.2s ease;
        }
        
        .info-card:hover {
          background: rgba(255,255,255,0.04);
          border-color: rgba(249,115,22,0.3);
        }
        
        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.8);
          backdrop-filter: blur(8px);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
        }
        
        .modal-content {
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 32px;
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
          max-width: 800px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          animation: scaleIn 0.2s ease;
        }
        
        .toast-success {
          background: #10b981;
          color: white;
        }
        
        .toast-error {
          background: #ef4444;
          color: white;
        }
        
        @media (max-width: 768px) {
          .info-grid { grid-template-columns: 1fr; gap: 12px; }
          .status-card { padding: 16px; }
          .bus-card { margin-bottom: 12px; }
        }
      `}</style>

      {/* Toast Notification */}
      {toast.show && (
        <div style={{
          position: 'fixed',
          top: 20,
          right: 20,
          zIndex: 1100,
          animation: 'slideIn 0.3s ease'
        }}>
          <div style={{
            background: toast.type === 'success' ? '#10b981' : '#ef4444',
            color: 'white',
            padding: '14px 24px',
            borderRadius: 16,
            boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            minWidth: 320,
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            {toast.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
            <span style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{toast.message}</span>
            <button
              onClick={() => setToast({ show: false, message: '', type: 'success' })}
              style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div style={{
              padding: 24,
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h3 style={{ fontSize: 24, fontWeight: 700, color: '#f97316', margin: 0 }}>
                  Edit Bus {editingBus?.bus_number}
                </h3>
                <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 4 }}>
                  Update bus details and documents
                </p>
              </div>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingBus(null);
                }}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  border: '1px solid var(--border)',
                  background: 'var(--bg-card)',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--bg-card-hover)';
                  e.currentTarget.style.color = '#ef4444';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--bg-card)';
                  e.currentTarget.style.color = 'var(--text-muted)';
                }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} style={{ padding: 24 }}>
              <div className="info-grid">
                {/* Basic Info */}
                <div style={{ gridColumn: 'span 2' }}>
                  <h4 style={{ fontSize: 16, fontWeight: 600, color: '#f97316', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Bus size={18} />
                    Basic Information
                  </h4>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 8 }}>
                    Bus Number <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    name="bus_number"
                    required
                    value={editFormData.bus_number}
                    onChange={handleEditInputChange}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid var(--border)',
                      borderRadius: 12,
                      fontSize: 14,
                      outline: 'none',
                      transition: 'all 0.2s ease',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#f97316'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                    placeholder="e.g., KA01AB1234"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 8 }}>Route Name</label>
                  <input
                    type="text"
                    name="route_name"
                    value={editFormData.route_name}
                    onChange={handleEditInputChange}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid var(--border)',
                      borderRadius: 12,
                      fontSize: 14,
                      outline: 'none',
                      transition: 'all 0.2s ease',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#f97316'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                    placeholder="e.g., Route 1 - Amritsar"
                  />
                </div>

                {/* Documents Section */}
                <div style={{ gridColumn: 'span 2', marginTop: 8 }}>
                  <h4 style={{ fontSize: 16, fontWeight: 600, color: '#f97316', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FileText size={18} />
                    Document Expiry Dates
                  </h4>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 8 }}>PUC Expiry</label>
                  <input
                    type="date"
                    name="puc_expiry"
                    value={editFormData.puc_expiry}
                    onChange={handleEditInputChange}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid var(--border)',
                      borderRadius: 12,
                      fontSize: 14,
                      outline: 'none',
                      transition: 'all 0.2s ease',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#f97316'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 8 }}>Insurance Expiry</label>
                  <input
                    type="date"
                    name="insurance_expiry"
                    value={editFormData.insurance_expiry}
                    onChange={handleEditInputChange}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid var(--border)',
                      borderRadius: 12,
                      fontSize: 14,
                      outline: 'none',
                      transition: 'all 0.2s ease',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#f97316'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 8 }}>Fitness Expiry</label>
                  <input
                    type="date"
                    name="fitness_expiry"
                    value={editFormData.fitness_expiry}
                    onChange={handleEditInputChange}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid var(--border)',
                      borderRadius: 12,
                      fontSize: 14,
                      outline: 'none',
                      transition: 'all 0.2s ease',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#f97316'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 8 }}>Permit Expiry</label>
                  <input
                    type="date"
                    name="permit_expiry"
                    value={editFormData.permit_expiry}
                    onChange={handleEditInputChange}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid var(--border)',
                      borderRadius: 12,
                      fontSize: 14,
                      outline: 'none',
                      transition: 'all 0.2s ease',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#f97316'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                  />
                </div>

                {/* Service Section */}
                <div style={{ gridColumn: 'span 2', marginTop: 8 }}>
                  <h4 style={{ fontSize: 16, fontWeight: 600, color: '#f97316', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Wrench size={18} />
                    Service Information
                  </h4>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 8 }}>Current KM</label>
                  <input
                    type="number"
                    name="current_km"
                    value={editFormData.current_km}
                    onChange={handleEditInputChange}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid var(--border)',
                      borderRadius: 12,
                      fontSize: 14,
                      outline: 'none',
                      transition: 'all 0.2s ease',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#f97316'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                    placeholder="e.g., 15000"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 8 }}>Last Service Date</label>
                  <input
                    type="date"
                    name="last_service_date"
                    value={editFormData.last_service_date}
                    onChange={handleEditInputChange}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid var(--border)',
                      borderRadius: 12,
                      fontSize: 14,
                      outline: 'none',
                      transition: 'all 0.2s ease',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#f97316'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 8 }}>Last Service KM</label>
                  <input
                    type="number"
                    name="last_service_km"
                    value={editFormData.last_service_km}
                    onChange={handleEditInputChange}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid var(--border)',
                      borderRadius: 12,
                      fontSize: 14,
                      outline: 'none',
                      transition: 'all 0.2s ease',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#f97316'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                    placeholder="e.g., 14500"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 8 }}>Next Service Due Date</label>
                  <input
                    type="date"
                    name="next_service_due"
                    value={editFormData.next_service_due}
                    onChange={handleEditInputChange}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid var(--border)',
                      borderRadius: 12,
                      fontSize: 14,
                      outline: 'none',
                      transition: 'all 0.2s ease',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#f97316'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 8 }}>Next Service Due KM</label>
                  <input
                    type="number"
                    name="next_service_km"
                    value={editFormData.next_service_km}
                    onChange={handleEditInputChange}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid var(--border)',
                      borderRadius: 12,
                      fontSize: 14,
                      outline: 'none',
                      transition: 'all 0.2s ease',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#f97316'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                    placeholder="e.g., 20000"
                  />
                </div>

                {/* Remarks */}
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 8 }}>Remarks</label>
                  <textarea
                    name="remarks"
                    value={editFormData.remarks}
                    onChange={handleEditInputChange}
                    rows="3"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid var(--border)',
                      borderRadius: 12,
                      fontSize: 14,
                      outline: 'none',
                      transition: 'all 0.2s ease',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      resize: 'vertical'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#f97316'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                    placeholder="Any additional notes or remarks..."
                  />
                </div>
              </div>

              <div style={{
                marginTop: 24,
                paddingTop: 20,
                borderTop: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 12
              }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingBus(null);
                  }}
                  className="action-button"
                  style={{ padding: '12px 24px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="action-button primary"
                  style={{ padding: '12px 24px' }}
                >
                  <Save size={16} style={{ marginRight: 6 }} />
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 16,
            marginBottom: 24
          }}>
            <div className="status-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ 
                  width: 48, 
                  height: 48, 
                  borderRadius: 16, 
                  background: 'rgba(239,68,68,0.1)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center'
                }}>
                  <XCircle size={24} color="#ef4444" />
                </div>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#ef4444' }}>{expiredDocumentsCount}</div>
              </div>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Expired Documents</h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Documents past expiry date</p>
            </div>

            <div className="status-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ 
                  width: 48, 
                  height: 48, 
                  borderRadius: 16, 
                  background: 'rgba(249,115,22,0.1)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center'
                }}>
                  <AlertCircle size={24} color="#f97316" />
                </div>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#f97316' }}>{criticalAlertsCount}</div>
              </div>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Critical Alerts</h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Requires immediate attention</p>
            </div>

            <div className="status-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ 
                  width: 48, 
                  height: 48, 
                  borderRadius: 16, 
                  background: 'rgba(234,179,8,0.1)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center'
                }}>
                  <Wrench size={24} color="#eab308" />
                </div>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#eab308' }}>{dueForServiceCount}</div>
              </div>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Service Due</h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Buses requiring maintenance</p>
            </div>

            <div className="status-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ 
                  width: 48, 
                  height: 48, 
                  borderRadius: 16, 
                  background: 'rgba(59,130,246,0.1)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center'
                }}>
                  <Bus size={24} color="#3b82f6" />
                </div>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#3b82f6' }}>{buses.length}</div>
              </div>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Total Buses</h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Active fleet vehicles</p>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {filteredBuses.map((bus) => (
                <div key={bus.id} className="bus-card animate-fade-in">
                  {/* Bus Header */}
                  <div 
                    className="bus-header"
                    onClick={() => toggleBusExpansion(bus.id)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                          <div style={{
                            width: 48,
                            height: 48,
                            borderRadius: 12,
                            background: 'linear-gradient(135deg, #f97316, #eab308)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <Bus size={24} color="white" />
                          </div>
                          <div>
                            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
                              Bus {bus.bus_number}
                            </h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                              <MapPin size={12} color="var(--text-muted)" />
                              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                                {bus.route_name || 'No route assigned'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div className={`badge-${getExpiryInfo(bus.puc_expiry).status === 'expired' ? 'expired' : getExpiryInfo(bus.puc_expiry).status}`} style={{
                          padding: '6px 12px',
                          borderRadius: 20,
                          fontSize: 11,
                          fontWeight: 600,
                          whiteSpace: 'nowrap'
                        }}>
                          {getExpiryInfo(bus.puc_expiry).status === 'expired' ? '⚠️ EXPIRED' : 
                           getExpiryInfo(bus.puc_expiry).status === 'critical' ? '🔥 CRITICAL' : 
                           getExpiryInfo(bus.puc_expiry).status === 'warning' ? '⚠️ WARNING' : '✅ OK'}
                        </div>
                        {expandedBus === bus.id ? 
                          <ChevronUp size={20} color="var(--text-muted)" /> : 
                          <ChevronDown size={20} color="var(--text-muted)" />
                        }
                      </div>
                    </div>
                  </div>

                  {/* Expandable Content */}
                  {expandedBus === bus.id && (
                    <div style={{ padding: 20 }}>
                      {/* Action Buttons */}
                      <div style={{ 
                        display: 'flex', 
                        gap: 12, 
                        marginBottom: 24,
                        paddingBottom: 20,
                        borderBottom: '1px solid var(--border)'
                      }}>
                        <button
                          onClick={() => openEditModal(bus)}
                          className="action-button edit"
                          style={{ padding: '10px 20px' }}
                        >
                          <Edit size={16} />
                          <span>Edit Bus</span>
                        </button>
                        <button
                          onClick={() => deleteBus(bus.id, bus.bus_number)}
                          className="action-button delete"
                          style={{ padding: '10px 20px' }}
                        >
                          <Trash2 size={16} />
                          <span>Delete Bus</span>
                        </button>
                      </div>

                      <div className="info-grid">
                        {/* Document Expiry */}
                        <div className="info-card">
                          <h4 style={{ fontSize: 15, fontWeight: 600, color: '#f97316', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <FileText size={16} />
                            Document Expiry
                          </h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {[
                              { label: 'PUC Certificate', expiry: bus.puc_expiry, icon: '📄' },
                              { label: 'Insurance', expiry: bus.insurance_expiry, icon: '🛡️' },
                              { label: 'Fitness Certificate', expiry: bus.fitness_expiry, icon: '✅' },
                              { label: 'Permit', expiry: bus.permit_expiry, icon: '📋' }
                            ].map((doc) => {
                              const info = getExpiryInfo(doc.expiry);
                              return (
                                <div key={doc.label} style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  padding: '8px 0',
                                  borderBottom: '1px solid var(--border)'
                                }}>
                                  <div>
                                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{doc.label}</div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatDate(doc.expiry)}</div>
                                  </div>
                                  <div>
                                    <span className={info.badgeClass} style={{
                                      padding: '4px 12px',
                                      borderRadius: 20,
                                      fontSize: 11,
                                      fontWeight: 600,
                                      display: 'inline-block'
                                    }}>
                                      {info.text}
                                    </span>
                                    {info.daysText && (
                                      <div style={{ fontSize: 10, color: info.color, marginTop: 4, textAlign: 'center' }}>
                                        {info.daysText}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Service Information */}
                        <div className="info-card">
                          <h4 style={{ fontSize: 15, fontWeight: 600, color: '#f97316', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Wrench size={16} />
                            Service Information
                          </h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '8px 0',
                              borderBottom: '1px solid var(--border)'
                            }}>
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>Current KM</div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Odometer reading</div>
                              </div>
                              <div style={{ fontSize: 16, fontWeight: 700, color: '#3b82f6' }}>
                                {bus.current_km ? `${parseInt(bus.current_km).toLocaleString()} km` : 'Not set'}
                              </div>
                            </div>

                            {bus.last_service_date && (
                              <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '8px 0',
                                borderBottom: '1px solid var(--border)'
                              }}>
                                <div>
                                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>Last Service</div>
                                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatDate(bus.last_service_date)}</div>
                                </div>
                                <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                                  {bus.last_service_km && `${parseInt(bus.last_service_km).toLocaleString()} km`}
                                </div>
                              </div>
                            )}

                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '8px 0'
                            }}>
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>Next Service</div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                  {bus.next_service_due ? formatDate(bus.next_service_due) : 'Not scheduled'}
                                </div>
                              </div>
                              <div>
                                <span className={getServiceInfo(bus.next_service_due, bus.current_km, bus.next_service_km).badgeClass} style={{
                                  padding: '4px 12px',
                                  borderRadius: 20,
                                  fontSize: 11,
                                  fontWeight: 600,
                                  display: 'inline-block'
                                }}>
                                  {getServiceInfo(bus.next_service_due, bus.current_km, bus.next_service_km).text}
                                </span>
                                {getServiceInfo(bus.next_service_due, bus.current_km, bus.next_service_km).kmText && (
                                  <div style={{ fontSize: 10, color: '#eab308', marginTop: 4, textAlign: 'center' }}>
                                    {getServiceInfo(bus.next_service_due, bus.current_km, bus.next_service_km).kmText}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Remarks */}
                        {bus.remarks && (
                          <div className="info-card" style={{ gridColumn: 'span 2' }}>
                            <h4 style={{ fontSize: 15, fontWeight: 600, color: '#f97316', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                              <Info size={16} />
                              Remarks
                            </h4>
                            <p style={{ 
                              fontSize: 13, 
                              color: 'var(--text-secondary)',
                              lineHeight: 1.6
                            }}>
                              {bus.remarks}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default withAuth(BusDetails);