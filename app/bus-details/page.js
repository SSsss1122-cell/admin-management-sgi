'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getAdminInstitution } from '../lib/getInstitution';
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
  const [adminData, setAdminData] = useState(null);
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
    initializePage();

    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })
      );
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

  const initializePage = async () => {
    try {
      const admin = await getAdminInstitution();

      console.log('ADMIN DATA:', admin);

      if (!admin) {
        showToast('Admin institution not found', 'error');
        setLoading(false);
        return;
      }

      setAdminData(admin);
      fetchBuses(admin.institution_id);
    } catch (error) {
      console.error('Error initializing page:', error);
      setLoading(false);
    }
  };

  const fetchBuses = async (institutionId) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('buses')
        .select('*')
        .eq('institution_id', institutionId)
        .order('bus_number');

      if (error) throw error;

      console.log('BUSES DATA:', data);

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
        color: '#64748b'
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
        color: '#64748b'
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
        .eq('id', busId)
        .eq('institution_id', adminData.institution_id);

      if (error) throw error;

      showToast(`Bus ${busNumber} deleted successfully!`, 'success');
      fetchBuses(adminData.institution_id);
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
        .eq('id', editingBus.id)
        .eq('institution_id', adminData.institution_id);

      if (error) throw error;

      showToast(`Bus ${editFormData.bus_number} updated successfully!`, 'success');
      setShowEditModal(false);
      setEditingBus(null);
      fetchBuses(adminData.institution_id);
    } catch (error) {
      console.error('Error updating bus:', error);
      showToast('Error updating bus: ' + error.message, 'error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-5">
            <div className="absolute inset-0 border-4 border-slate-700 border-t-blue-600 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 bg-blue-600 rounded-full animate-pulse"></div>
            </div>
          </div>
          <p className="text-blue-400 font-semibold">Loading buses...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center bg-slate-800/50 rounded-2xl border border-slate-700 p-10 max-w-md">
          <AlertTriangle size={48} className="mx-auto text-red-400 mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Error Loading Buses</h3>
          <p className="text-slate-400 mb-6">{error}</p>
          <button
            onClick={() => fetchBuses(adminData?.institution_id)}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all mx-auto"
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
    <div className="min-h-screen bg-slate-900">
      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed top-5 right-5 z-50 animate-slide-in">
          <div className={`flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl border-l-4 backdrop-blur-sm ${
            toast.type === 'success' 
              ? 'bg-emerald-950/90 border-emerald-500 text-emerald-200' 
              : 'bg-red-950/90 border-red-500 text-red-200'
          }`}>
            {toast.type === 'success' ? (
              <CheckCircle className="text-emerald-400" size={20} />
            ) : (
              <AlertCircle className="text-red-400" size={20} />
            )}
            <span className="font-medium">{toast.message}</span>
            <button
              onClick={() => setToast({ show: false, message: '', type: 'success' })}
              className="ml-2 opacity-70 hover:opacity-100 transition-opacity"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-slate-800 border-b border-slate-700 px-6 py-4 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-blue-400">Edit Bus {editingBus?.bus_number}</h3>
                <p className="text-xs text-slate-400 mt-1">Update bus details and documents</p>
              </div>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingBus(null);
                }}
                className="p-2 text-slate-400 hover:text-slate-300 hover:bg-slate-700 rounded-lg transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Basic Info */}
                <div className="md:col-span-2">
                  <h4 className="text-sm font-semibold text-blue-400 mb-3 flex items-center gap-2">
                    <Bus size={14} />
                    Basic Information
                  </h4>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Bus Number *</label>
                  <input
                    type="text"
                    name="bus_number"
                    required
                    value={editFormData.bus_number}
                    onChange={handleEditInputChange}
                    className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 text-slate-200"
                    placeholder="e.g., KA01AB1234"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Route Name</label>
                  <input
                    type="text"
                    name="route_name"
                    value={editFormData.route_name}
                    onChange={handleEditInputChange}
                    className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 text-slate-200"
                    placeholder="e.g., Route 1 - Amritsar"
                  />
                </div>

                {/* Documents Section */}
                <div className="md:col-span-2 mt-2">
                  <h4 className="text-sm font-semibold text-blue-400 mb-3 flex items-center gap-2">
                    <FileText size={14} />
                    Document Expiry Dates
                  </h4>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">PUC Expiry</label>
                  <input
                    type="date"
                    name="puc_expiry"
                    value={editFormData.puc_expiry}
                    onChange={handleEditInputChange}
                    className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Insurance Expiry</label>
                  <input
                    type="date"
                    name="insurance_expiry"
                    value={editFormData.insurance_expiry}
                    onChange={handleEditInputChange}
                    className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Fitness Expiry</label>
                  <input
                    type="date"
                    name="fitness_expiry"
                    value={editFormData.fitness_expiry}
                    onChange={handleEditInputChange}
                    className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Permit Expiry</label>
                  <input
                    type="date"
                    name="permit_expiry"
                    value={editFormData.permit_expiry}
                    onChange={handleEditInputChange}
                    className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 text-slate-200"
                  />
                </div>

                {/* Service Section */}
                <div className="md:col-span-2 mt-2">
                  <h4 className="text-sm font-semibold text-blue-400 mb-3 flex items-center gap-2">
                    <Wrench size={14} />
                    Service Information
                  </h4>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Current KM</label>
                  <input
                    type="number"
                    name="current_km"
                    value={editFormData.current_km}
                    onChange={handleEditInputChange}
                    className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 text-slate-200"
                    placeholder="e.g., 15000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Last Service Date</label>
                  <input
                    type="date"
                    name="last_service_date"
                    value={editFormData.last_service_date}
                    onChange={handleEditInputChange}
                    className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Last Service KM</label>
                  <input
                    type="number"
                    name="last_service_km"
                    value={editFormData.last_service_km}
                    onChange={handleEditInputChange}
                    className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 text-slate-200"
                    placeholder="e.g., 14500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Next Service Due Date</label>
                  <input
                    type="date"
                    name="next_service_due"
                    value={editFormData.next_service_due}
                    onChange={handleEditInputChange}
                    className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Next Service Due KM</label>
                  <input
                    type="number"
                    name="next_service_km"
                    value={editFormData.next_service_km}
                    onChange={handleEditInputChange}
                    className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 text-slate-200"
                    placeholder="e.g., 20000"
                  />
                </div>

                {/* Remarks */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-2">Remarks</label>
                  <textarea
                    name="remarks"
                    value={editFormData.remarks}
                    onChange={handleEditInputChange}
                    rows="3"
                    className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 text-slate-200 resize-vertical"
                    placeholder="Any additional notes or remarks..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingBus(null);
                  }}
                  className="px-5 py-2.5 text-slate-300 bg-slate-700 rounded-lg hover:bg-slate-600 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all flex items-center gap-2"
                >
                  <Save size={16} />
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
            <div>
              <h1 className="text-lg font-bold text-white sm:text-xl">Bus Details</h1>
              <p className="text-xs text-slate-400">{dateStr}</p>
            </div>
          </div>
          <Link
            href="/bus-details/add"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Add Bus</span>
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Search Bar */}
        <div className="flex items-center gap-3 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 mb-5 focus-within:border-blue-500 transition-all">
          <Search size={18} className="text-slate-500" />
          <input
            type="text"
            placeholder="Search by bus number or route..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-slate-200 text-sm"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="text-slate-400 hover:text-slate-300">
              <X size={16} />
            </button>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-slate-400">Expired Docs</p>
                <p className="text-2xl font-bold text-red-400 mt-1">{expiredDocumentsCount}</p>
              </div>
              <div className="p-2 bg-red-600 rounded-xl">
                <XCircle size={18} className="text-white" />
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-slate-400">Critical Alerts</p>
                <p className="text-2xl font-bold text-orange-400 mt-1">{criticalAlertsCount}</p>
              </div>
              <div className="p-2 bg-orange-600 rounded-xl">
                <AlertCircle size={18} className="text-white" />
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-slate-400">Service Due</p>
                <p className="text-2xl font-bold text-amber-400 mt-1">{dueForServiceCount}</p>
              </div>
              <div className="p-2 bg-amber-600 rounded-xl">
                <Wrench size={18} className="text-white" />
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-slate-400">Total Buses</p>
                <p className="text-2xl font-bold text-blue-400 mt-1">{buses.length}</p>
              </div>
              <div className="p-2 bg-blue-600 rounded-xl">
                <Bus size={18} className="text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Buses List */}
        {filteredBuses.length === 0 ? (
          <div className="text-center py-12 bg-slate-800/50 rounded-2xl border border-slate-700">
            <Bus size={48} className="mx-auto text-slate-600 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No buses found</h3>
            <p className="text-slate-400 mb-6">
              {searchTerm ? 'Try adjusting your search criteria' : 'Get started by adding your first bus'}
            </p>
            <Link
              href="/bus-details/add"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
            >
              <Plus size={16} />
              Add Your First Bus
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredBuses.map((bus) => (
              <div key={bus.id} className="bg-slate-800/50 rounded-2xl border border-slate-700 overflow-hidden">
                {/* Bus Header */}
                <div 
                  className="p-4 cursor-pointer hover:bg-slate-700/30 transition-colors"
                  onClick={() => toggleBusExpansion(bus.id)}
                >
                  <div className="flex justify-between items-center flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                        <Bus size={22} className="text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">Bus {bus.bus_number}</h3>
                        <div className="flex items-center gap-1 mt-1">
                          <MapPin size={10} className="text-slate-400" />
                          <p className="text-xs text-slate-400">{bus.route_name || 'No route assigned'}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        getExpiryInfo(bus.puc_expiry).status === 'expired' ? 'bg-red-950/50 text-red-400 border border-red-800' :
                        getExpiryInfo(bus.puc_expiry).status === 'critical' ? 'bg-orange-950/50 text-orange-400 border border-orange-800' :
                        getExpiryInfo(bus.puc_expiry).status === 'warning' ? 'bg-amber-950/50 text-amber-400 border border-amber-800' :
                        'bg-emerald-950/50 text-emerald-400 border border-emerald-800'
                      }`}>
                        {getExpiryInfo(bus.puc_expiry).status === 'expired' ? '⚠️ EXPIRED' : 
                         getExpiryInfo(bus.puc_expiry).status === 'critical' ? '🔥 CRITICAL' : 
                         getExpiryInfo(bus.puc_expiry).status === 'warning' ? '⚠️ WARNING' : '✅ OK'}
                      </span>
                      {expandedBus === bus.id ? 
                        <ChevronUp size={18} className="text-slate-400" /> : 
                        <ChevronDown size={18} className="text-slate-400" />
                      }
                    </div>
                  </div>
                </div>

                {/* Expandable Content */}
                {expandedBus === bus.id && (
                  <div className="p-4 pt-0 border-t border-slate-700">
                    {/* Action Buttons */}
                    <div className="flex gap-3 mb-5 pb-4 border-b border-slate-700">
                      <button
                        onClick={() => openEditModal(bus)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-blue-600/20 rounded-lg text-blue-400 hover:bg-blue-600 hover:text-white transition-all text-sm"
                      >
                        <Edit size={14} />
                        Edit Bus
                      </button>
                      <button
                        onClick={() => deleteBus(bus.id, bus.bus_number)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-red-600/20 rounded-lg text-red-400 hover:bg-red-600 hover:text-white transition-all text-sm"
                      >
                        <Trash2 size={14} />
                        Delete Bus
                      </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* Document Expiry */}
                      <div className="bg-slate-900 rounded-xl border border-slate-700 p-4">
                        <h4 className="text-sm font-semibold text-blue-400 mb-3 flex items-center gap-2">
                          <FileText size={14} />
                          Document Expiry
                        </h4>
                        <div className="space-y-3">
                          {[
                            { label: 'PUC Certificate', expiry: bus.puc_expiry },
                            { label: 'Insurance', expiry: bus.insurance_expiry },
                            { label: 'Fitness Certificate', expiry: bus.fitness_expiry },
                            { label: 'Permit', expiry: bus.permit_expiry }
                          ].map((doc) => {
                            const info = getExpiryInfo(doc.expiry);
                            return (
                              <div key={doc.label} className="flex justify-between items-center py-2 border-b border-slate-700 last:border-0">
                                <div>
                                  <div className="text-sm font-medium text-white">{doc.label}</div>
                                  <div className="text-xs text-slate-400">{formatDate(doc.expiry)}</div>
                                </div>
                                <div className="text-right">
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${info.badgeClass}`}>
                                    {info.text}
                                  </span>
                                  {info.daysText && (
                                    <div className="text-xs mt-1" style={{ color: info.color }}>{info.daysText}</div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Service Information */}
                      <div className="bg-slate-900 rounded-xl border border-slate-700 p-4">
                        <h4 className="text-sm font-semibold text-blue-400 mb-3 flex items-center gap-2">
                          <Wrench size={14} />
                          Service Information
                        </h4>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center py-2 border-b border-slate-700">
                            <div>
                              <div className="text-sm font-medium text-white">Current KM</div>
                              <div className="text-xs text-slate-400">Odometer reading</div>
                            </div>
                            <div className="text-base font-semibold text-blue-400">
                              {bus.current_km ? `${parseInt(bus.current_km).toLocaleString()} km` : 'Not set'}
                            </div>
                          </div>

                          {bus.last_service_date && (
                            <div className="flex justify-between items-center py-2 border-b border-slate-700">
                              <div>
                                <div className="text-sm font-medium text-white">Last Service</div>
                                <div className="text-xs text-slate-400">{formatDate(bus.last_service_date)}</div>
                              </div>
                              <div className="text-sm text-slate-300">
                                {bus.last_service_km && `${parseInt(bus.last_service_km).toLocaleString()} km`}
                              </div>
                            </div>
                          )}

                          <div className="flex justify-between items-center py-2">
                            <div>
                              <div className="text-sm font-medium text-white">Next Service</div>
                              <div className="text-xs text-slate-400">
                                {bus.next_service_due ? formatDate(bus.next_service_due) : 'Not scheduled'}
                              </div>
                            </div>
                            <div className="text-right">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getServiceInfo(bus.next_service_due, bus.current_km, bus.next_service_km).badgeClass}`}>
                                {getServiceInfo(bus.next_service_due, bus.current_km, bus.next_service_km).text}
                              </span>
                              {getServiceInfo(bus.next_service_due, bus.current_km, bus.next_service_km).kmText && (
                                <div className="text-xs text-amber-400 mt-1">
                                  {getServiceInfo(bus.next_service_due, bus.current_km, bus.next_service_km).kmText}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Remarks */}
                      {bus.remarks && (
                        <div className="lg:col-span-2 bg-slate-900 rounded-xl border border-slate-700 p-4">
                          <h4 className="text-sm font-semibold text-blue-400 mb-2 flex items-center gap-2">
                            <Info size={14} />
                            Remarks
                          </h4>
                          <p className="text-sm text-slate-300 leading-relaxed">{bus.remarks}</p>
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

      <style jsx>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
        
        .badge-valid {
          background: rgba(16, 185, 129, 0.15);
          color: #10b981;
          border: 1px solid rgba(16, 185, 129, 0.3);
        }
        
        .badge-warning {
          background: rgba(234, 179, 8, 0.15);
          color: #eab308;
          border: 1px solid rgba(234, 179, 8, 0.3);
        }
        
        .badge-critical {
          background: rgba(249, 115, 22, 0.15);
          color: #f97316;
          border: 1px solid rgba(249, 115, 22, 0.3);
        }
        
        .badge-expired {
          background: rgba(239, 68, 68, 0.15);
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }
        
        .badge-not-set {
          background: rgba(100, 116, 139, 0.15);
          color: #94a3b8;
          border: 1px solid rgba(100, 116, 139, 0.3);
        }
      `}</style>
    </div>
  );
}

export default withAuth(BusDetails);