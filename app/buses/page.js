'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bus,
  ArrowLeft,
  Search,
  Loader2,
  Plus,
  Edit,
  Trash2,
  Power,
  PowerOff,
  LayoutGrid,
  List,
  Download,
  Users,
  AlertCircle,
  Save,
  X,
  Wrench,
  Shield,
  Settings,
  Home,
  TrendingUp,
  CheckCircle,
  Clock
} from 'lucide-react';

import { supabase } from '../../lib/supabase';
import withAuth from '../../components/withAuth';

function BusesPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [institutionId, setInstitutionId] = useState(null);

  const [buses, setBuses] = useState([]);
  const [drivers, setDrivers] = useState([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewMode, setViewMode] = useState('grid');

  const [error, setError] = useState('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const initialBusState = {
    bus_number: '',
    route_name: '',
    capacity: '',
    driver_id: '',
    is_active: true,
    puc_expiry: '',
    insurance_expiry: '',
    fitness_expiry: '',
    permit_expiry: '',
    last_service_date: '',
    next_service_due: '',
    last_service_km: '',
    next_service_km: '',
    current_km: '',
    remarks: ''
  };

  const [newBus, setNewBus] = useState(initialBusState);
  const [editForm, setEditForm] = useState({
    id: '',
    ...initialBusState
  });

  // =========================================
  // INITIAL LOAD
  // =========================================

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      if (mounted) {
        await initializeData();
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, []);

  const initializeData = async () => {
    try {
      setLoading(true);

      const instId = await fetchInstitution();

      if (!instId) {
        setLoading(false);
        return;
      }

      await Promise.all([
        fetchBuses(instId),
        fetchDrivers(instId),
      ]);
    } catch (err) {
      console.error('Initialization error:', err);
    } finally {
      setLoading(false);
    }
  };

  // =========================================
  // FETCH INSTITUTION
  // =========================================

  const fetchInstitution = async () => {
    try {
      const storedInstitutionId = localStorage.getItem('institutionId');

      if (!storedInstitutionId) {
        console.error('No institution found');
        router.push('/login');
        return null;
      }

      setInstitutionId(storedInstitutionId);
      return storedInstitutionId;

    } catch (err) {
      console.error('Institution fetch failed:', err);
      return null;
    }
  };

  // =========================================
  // FETCH BUSES
  // =========================================

  const fetchBuses = async (instId) => {
    try {
      const { data, error } = await supabase
        .from('buses')
        .select(`
          *,
          driver:drivers_new(
            id,
            name,
            driver_code,
            contact
          )
        `)
        .eq('institution_id', instId)
        .order('bus_number');

      if (error) throw error;

      setBuses(data || []);
    } catch (err) {
      console.error('Fetch buses error:', err);
      setBuses([]);
    }
  };

  // =========================================
  // FETCH DRIVERS
  // =========================================

  const fetchDrivers = async (instId) => {
    try {
      const { data, error } = await supabase
        .from('drivers_new')
        .select(`
          id,
          name,
          driver_code,
          contact
        `)
        .eq('institution_id', instId)
        .order('name');

      if (error) throw error;

      setDrivers(data || []);
    } catch (err) {
      console.error('Fetch drivers error:', err);
      setDrivers([]);
    }
  };

  // =========================================
  // FILTERED BUSES
  // =========================================

  const filteredBuses = useMemo(() => {
    let filtered = [...buses];

    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();

      filtered = filtered.filter((bus) =>
        bus.bus_number?.toLowerCase().includes(search) ||
        bus.route_name?.toLowerCase().includes(search) ||
        bus.driver?.name?.toLowerCase().includes(search)
      );
    }

    if (filterStatus === 'active') {
      filtered = filtered.filter((b) => b.is_active);
    }

    if (filterStatus === 'inactive') {
      filtered = filtered.filter((b) => !b.is_active);
    }

    if (filterStatus === 'assigned') {
      filtered = filtered.filter((b) => b.driver_id);
    }

    if (filterStatus === 'unassigned') {
      filtered = filtered.filter((b) => !b.driver_id);
    }

    return filtered;
  }, [buses, searchTerm, filterStatus]);

  // =========================================
  // ADD BUS
  // =========================================

  const handleAddBus = async (e) => {
    e.preventDefault();

    if (!institutionId) {
      setError('No institution found. Please log in again.');
      return;
    }

    if (!newBus.bus_number.trim()) {
      setError('Bus number required');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      const busData = {
        bus_number: newBus.bus_number.toUpperCase().trim(),
        route_name: newBus.route_name?.trim() || null,
        capacity: newBus.capacity?.trim() || null,
        driver_id: newBus.driver_id || null,
        is_active: newBus.is_active,
        puc_expiry: newBus.puc_expiry || null,
        insurance_expiry: newBus.insurance_expiry || null,
        fitness_expiry: newBus.fitness_expiry || null,
        permit_expiry: newBus.permit_expiry || null,
        last_service_date: newBus.last_service_date || null,
        next_service_due: newBus.next_service_due || null,
        last_service_km: newBus.last_service_km?.trim() || null,
        next_service_km: newBus.next_service_km?.trim() || null,
        current_km: newBus.current_km?.trim() || null,
        remarks: newBus.remarks?.trim() || null,
        institution_id: institutionId
      };

      const { data, error } = await supabase
        .from('buses')
        .insert([busData])
        .select();

      if (error) throw error;

      setShowAddModal(false);
      setNewBus(initialBusState);
      await fetchBuses(institutionId);
      
    } catch (err) {
      console.error('Add bus error:', err);
      setError(err.message || 'Failed to add bus');
    } finally {
      setIsSubmitting(false);
    }
  };

  // =========================================
  // EDIT BUS
  // =========================================

  const openEditModal = (bus) => {
    setEditForm({
      id: bus.id,
      bus_number: bus.bus_number || '',
      route_name: bus.route_name || '',
      capacity: bus.capacity || '',
      driver_id: bus.driver_id || '',
      is_active: bus.is_active,
      puc_expiry: bus.puc_expiry || '',
      insurance_expiry: bus.insurance_expiry || '',
      fitness_expiry: bus.fitness_expiry || '',
      permit_expiry: bus.permit_expiry || '',
      last_service_date: bus.last_service_date || '',
      next_service_due: bus.next_service_due || '',
      last_service_km: bus.last_service_km || '',
      next_service_km: bus.next_service_km || '',
      current_km: bus.current_km || '',
      remarks: bus.remarks || ''
    });

    setShowEditModal(true);
  };

  const handleEditBus = async (e) => {
    e.preventDefault();

    try {
      setIsSubmitting(true);
      setError('');

      const { error } = await supabase
        .from('buses')
        .update({
          bus_number: editForm.bus_number.toUpperCase().trim(),
          route_name: editForm.route_name?.trim() || null,
          capacity: editForm.capacity?.trim() || null,
          driver_id: editForm.driver_id || null,
          is_active: editForm.is_active,
          puc_expiry: editForm.puc_expiry || null,
          insurance_expiry: editForm.insurance_expiry || null,
          fitness_expiry: editForm.fitness_expiry || null,
          permit_expiry: editForm.permit_expiry || null,
          last_service_date: editForm.last_service_date || null,
          next_service_due: editForm.next_service_due || null,
          last_service_km: editForm.last_service_km?.trim() || null,
          next_service_km: editForm.next_service_km?.trim() || null,
          current_km: editForm.current_km?.trim() || null,
          remarks: editForm.remarks?.trim() || null
        })
        .eq('id', editForm.id);

      if (error) throw error;

      setShowEditModal(false);
      await fetchBuses(institutionId);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // =========================================
  // DELETE BUS
  // =========================================

  const handleDeleteBus = async (id) => {
    const confirmDelete = confirm('Delete this bus?');

    if (!confirmDelete) return;

    try {
      const { error } = await supabase
        .from('buses')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchBuses(institutionId);
    } catch (err) {
      console.error(err);
      alert('Failed to delete bus');
    }
  };

  // =========================================
  // TOGGLE STATUS
  // =========================================

  const handleToggleStatus = async (bus) => {
    try {
      const { error } = await supabase
        .from('buses')
        .update({
          is_active: !bus.is_active
        })
        .eq('id', bus.id);

      if (error) throw error;

      await fetchBuses(institutionId);
    } catch (err) {
      console.error(err);
      alert('Failed to update status');
    }
  };

  // =========================================
  // EXPORT CSV
  // =========================================

  const exportBuses = () => {
    const headers = ['Bus Number', 'Route', 'Driver', 'Status', 'Capacity'];

    const rows = filteredBuses.map((bus) => [
      bus.bus_number,
      bus.route_name || '',
      bus.driver?.name || '',
      bus.is_active ? 'Active' : 'Inactive',
      bus.capacity || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((r) => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], {
      type: 'text/csv;charset=utf-8;'
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'buses.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  // =========================================
  // STATS
  // =========================================

  const activeCount = buses.filter((b) => b.is_active).length;
  const assignedCount = buses.filter((b) => b.driver_id).length;

  // =========================================
  // LOADING
  // =========================================

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-700 border-t-blue-600"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-8 w-8 bg-blue-600 rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================
  // UI
  // =========================================

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
        {/* HEADER */}
        <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-5 lg:p-6 mb-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="p-2 text-slate-400 hover:text-blue-400 transition-all rounded-xl hover:bg-slate-800 border border-slate-700"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-600/20">
                    <Bus className="text-white" size={24} />
                  </div>
                  <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-white">
                      Fleet Management
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">
                      Manage buses, routes and driver assignments
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={exportBuses}
                className="p-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-400 hover:text-blue-400 hover:border-blue-500/50 transition-all"
                title="Export CSV"
              >
                <Download size={18} />
              </button>

              <button
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                className="p-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-400 hover:text-blue-400 hover:border-blue-500/50 transition-all"
              >
                {viewMode === 'grid' ? <List size={18} /> : <LayoutGrid size={18} />}
              </button>

              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all"
              >
                <Plus size={18} />
                Add Bus
              </button>
            </div>
          </div>
        </div>

        {/* SEARCH & FILTERS */}
        <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-5 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" size={18} />
              <input
                type="text"
                placeholder="Search buses by number, route or driver..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 text-slate-200 placeholder-slate-500"
              />
            </div>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 text-slate-200 cursor-pointer"
            >
              <option value="all">All Buses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
              <option value="assigned">Assigned to Driver</option>
              <option value="unassigned">Unassigned</option>
            </select>
          </div>
        </div>

        {/* STATS CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-600 rounded-xl">
                <Bus className="text-white" size={18} />
              </div>
              <span className="text-xs font-medium text-blue-400 bg-blue-950/50 px-2 py-0.5 rounded-full">Total</span>
            </div>
            <p className="text-2xl font-bold text-white">{buses.length}</p>
            <p className="text-xs text-slate-400">Total Buses</p>
          </div>

          <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-emerald-600 rounded-xl">
                <Power className="text-white" size={18} />
              </div>
              <span className="text-xs font-medium text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded-full">Active</span>
            </div>
            <p className="text-2xl font-bold text-white">{activeCount}</p>
            <p className="text-xs text-slate-400">Active Buses</p>
          </div>

          <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-cyan-600 rounded-xl">
                <Users className="text-white" size={18} />
              </div>
              <span className="text-xs font-medium text-cyan-400 bg-cyan-950/50 px-2 py-0.5 rounded-full">Assigned</span>
            </div>
            <p className="text-2xl font-bold text-white">{assignedCount}</p>
            <p className="text-xs text-slate-400">Assigned to Driver</p>
          </div>
        </div>

        {/* BUSES DISPLAY */}
        {filteredBuses.length === 0 ? (
          <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-12 text-center">
            <Bus size={48} className="mx-auto text-slate-600 mb-4" />
            <p className="text-slate-400">No buses found</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg inline-flex items-center gap-2 hover:bg-blue-700 transition-all"
            >
              <Plus size={18} />
              Add Your First Bus
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredBuses.map((bus) => (
              <div
                key={bus.id}
                className="bg-slate-800/50 rounded-2xl border border-slate-700 hover:border-blue-500/30 transition-all overflow-hidden"
              >
                <div className={`h-1 ${bus.is_active ? 'bg-emerald-500' : 'bg-slate-600'}`}></div>
                <div className="p-5">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-blue-600 rounded-xl">
                          <Bus className="text-white" size={16} />
                        </div>
                        <h2 className="text-lg font-bold text-white">{bus.bus_number}</h2>
                      </div>
                      <p className="text-slate-400 text-sm mt-1">
                        {bus.route_name || 'No Route Assigned'}
                      </p>
                    </div>
                    <button
                      onClick={() => handleToggleStatus(bus)}
                      className="p-2 rounded-lg transition-all hover:scale-110"
                    >
                      {bus.is_active ? (
                        <Power className="text-emerald-400" size={18} />
                      ) : (
                        <PowerOff className="text-slate-500" size={18} />
                      )}
                    </button>
                  </div>

                  <div className="space-y-2 text-sm mb-4">
                    <div className="flex items-center gap-2">
                      <Users size={14} className="text-slate-500" />
                      <span className="text-slate-300">
                        Driver: {bus.driver?.name || 'Not Assigned'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Shield size={14} className="text-slate-500" />
                      <span className="text-slate-300">Capacity: {bus.capacity || '-'} seats</span>
                    </div>
                    {bus.current_km && (
                      <div className="flex items-center gap-2">
                        <Wrench size={14} className="text-slate-500" />
                        <span className="text-slate-300">Current KM: {bus.current_km}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-slate-700">
                    <button
                      onClick={() => openEditModal(bus)}
                      className="p-2 bg-slate-700 rounded-lg text-blue-400 hover:bg-blue-600 hover:text-white transition-all"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteBus(bus.id)}
                      className="p-2 bg-slate-700 rounded-lg text-red-400 hover:bg-red-600 hover:text-white transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* LIST VIEW */
          <div className="bg-slate-800/50 rounded-2xl border border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-900 border-b border-slate-700">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Bus Number</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Route</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Driver</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Capacity</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {filteredBuses.map((bus) => (
                    <tr key={bus.id} className="hover:bg-slate-700/30 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <Bus size={16} className="text-blue-400" />
                          <span className="font-medium text-white">{bus.bus_number}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-slate-300">{bus.route_name || '—'}</td>
                      <td className="px-5 py-3 text-slate-300">{bus.driver?.name || 'Not Assigned'}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                          bus.is_active 
                            ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-800' 
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}>
                          {bus.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-slate-300">{bus.capacity || '—'}</td>
                      <td className="px-5 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEditModal(bus)}
                            className="p-1.5 rounded-lg text-blue-400 hover:bg-blue-600/20 transition-colors"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(bus)}
                            className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-600/20 transition-colors"
                          >
                            {bus.is_active ? <Power size={14} /> : <PowerOff size={14} />}
                          </button>
                          <button
                            onClick={() => handleDeleteBus(bus.id)}
                            className="p-1.5 rounded-lg text-red-400 hover:bg-red-600/20 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ========== ADD BUS MODAL ========== */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-slate-800 border-b border-slate-700 px-6 py-4 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-xl">
                  <Plus className="text-white" size={20} />
                </div>
                <h2 className="text-xl font-bold text-white">Add New Bus</h2>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="p-2 text-slate-400 hover:text-slate-300 hover:bg-slate-700 rounded-lg transition-all"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleAddBus} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-500/10 border border-red-500 rounded-lg p-3 text-red-500 text-sm flex items-center gap-2">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Bus Number *</label>
                  <input
                    type="text"
                    value={newBus.bus_number}
                    onChange={(e) => setNewBus({...newBus, bus_number: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 text-slate-200"
                    placeholder="e.g., BUS-001"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Route Name</label>
                  <input
                    type="text"
                    value={newBus.route_name}
                    onChange={(e) => setNewBus({...newBus, route_name: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 text-slate-200"
                    placeholder="e.g., Downtown - Airport"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Capacity</label>
                  <input
                    type="text"
                    value={newBus.capacity}
                    onChange={(e) => setNewBus({...newBus, capacity: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 text-slate-200"
                    placeholder="e.g., 40 seats"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Assign Driver</label>
                  <select
                    value={newBus.driver_id}
                    onChange={(e) => setNewBus({...newBus, driver_id: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 text-slate-200"
                  >
                    <option value="">Select a driver (optional)</option>
                    {drivers.map(driver => (
                      <option key={driver.id} value={driver.id}>
                        {driver.name} ({driver.driver_code || driver.contact})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Status</label>
                  <select
                    value={newBus.is_active}
                    onChange={(e) => setNewBus({...newBus, is_active: e.target.value === 'true'})}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 text-slate-200"
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Current KM</label>
                  <input
                    type="text"
                    value={newBus.current_km}
                    onChange={(e) => setNewBus({...newBus, current_km: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 text-slate-200"
                    placeholder="e.g., 50000"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">PUC Expiry</label>
                  <input
                    type="date"
                    value={newBus.puc_expiry}
                    onChange={(e) => setNewBus({...newBus, puc_expiry: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 text-slate-200"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Insurance Expiry</label>
                  <input
                    type="date"
                    value={newBus.insurance_expiry}
                    onChange={(e) => setNewBus({...newBus, insurance_expiry: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Fitness Expiry</label>
                  <input
                    type="date"
                    value={newBus.fitness_expiry}
                    onChange={(e) => setNewBus({...newBus, fitness_expiry: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Permit Expiry</label>
                  <input
                    type="date"
                    value={newBus.permit_expiry}
                    onChange={(e) => setNewBus({...newBus, permit_expiry: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Last Service Date</label>
                  <input
                    type="date"
                    value={newBus.last_service_date}
                    onChange={(e) => setNewBus({...newBus, last_service_date: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Next Service Due</label>
                  <input
                    type="date"
                    value={newBus.next_service_due}
                    onChange={(e) => setNewBus({...newBus, next_service_due: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Last Service KM</label>
                  <input
                    type="text"
                    value={newBus.last_service_km}
                    onChange={(e) => setNewBus({...newBus, last_service_km: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 text-slate-200"
                    placeholder="e.g., 45000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Next Service KM</label>
                  <input
                    type="text"
                    value={newBus.next_service_km}
                    onChange={(e) => setNewBus({...newBus, next_service_km: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 text-slate-200"
                    placeholder="e.g., 55000"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Remarks</label>
                <textarea
                  value={newBus.remarks}
                  onChange={(e) => setNewBus({...newBus, remarks: e.target.value})}
                  rows="3"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 text-slate-200"
                  placeholder="Any additional information about this bus..."
                />
              </div>
              
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setError('');
                    setNewBus(initialBusState);
                  }}
                  className="px-4 py-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition-all text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition-all text-white disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="inline animate-spin mr-2" size={16} />
                      Adding...
                    </>
                  ) : (
                    'Add Bus'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========== EDIT BUS MODAL ========== */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-slate-800 border-b border-slate-700 px-6 py-4 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-xl">
                  <Edit className="text-white" size={20} />
                </div>
                <h2 className="text-xl font-bold text-white">Edit Bus</h2>
              </div>
              <button 
                onClick={() => setShowEditModal(false)}
                className="p-2 text-slate-400 hover:text-slate-300 hover:bg-slate-700 rounded-lg transition-all"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleEditBus} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-500/10 border border-red-500 rounded-lg p-3 text-red-500 text-sm flex items-center gap-2">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Bus Number *</label>
                  <input
                    type="text"
                    value={editForm.bus_number}
                    onChange={(e) => setEditForm({...editForm, bus_number: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 text-slate-200"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Route Name</label>
                  <input
                    type="text"
                    value={editForm.route_name}
                    onChange={(e) => setEditForm({...editForm, route_name: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 text-slate-200"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Capacity</label>
                  <input
                    type="text"
                    value={editForm.capacity}
                    onChange={(e) => setEditForm({...editForm, capacity: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 text-slate-200"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Assign Driver</label>
                  <select
                    value={editForm.driver_id}
                    onChange={(e) => setEditForm({...editForm, driver_id: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 text-slate-200"
                  >
                    <option value="">Select a driver (optional)</option>
                    {drivers.map(driver => (
                      <option key={driver.id} value={driver.id}>
                        {driver.name} ({driver.driver_code || driver.contact})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Status</label>
                  <select
                    value={editForm.is_active}
                    onChange={(e) => setEditForm({...editForm, is_active: e.target.value === 'true'})}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 text-slate-200"
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Current KM</label>
                  <input
                    type="text"
                    value={editForm.current_km}
                    onChange={(e) => setEditForm({...editForm, current_km: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 text-slate-200"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">PUC Expiry</label>
                  <input
                    type="date"
                    value={editForm.puc_expiry}
                    onChange={(e) => setEditForm({...editForm, puc_expiry: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 text-slate-200"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Insurance Expiry</label>
                  <input
                    type="date"
                    value={editForm.insurance_expiry}
                    onChange={(e) => setEditForm({...editForm, insurance_expiry: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Fitness Expiry</label>
                  <input
                    type="date"
                    value={editForm.fitness_expiry}
                    onChange={(e) => setEditForm({...editForm, fitness_expiry: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Permit Expiry</label>
                  <input
                    type="date"
                    value={editForm.permit_expiry}
                    onChange={(e) => setEditForm({...editForm, permit_expiry: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Last Service Date</label>
                  <input
                    type="date"
                    value={editForm.last_service_date}
                    onChange={(e) => setEditForm({...editForm, last_service_date: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Next Service Due</label>
                  <input
                    type="date"
                    value={editForm.next_service_due}
                    onChange={(e) => setEditForm({...editForm, next_service_due: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Last Service KM</label>
                  <input
                    type="text"
                    value={editForm.last_service_km}
                    onChange={(e) => setEditForm({...editForm, last_service_km: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Next Service KM</label>
                  <input
                    type="text"
                    value={editForm.next_service_km}
                    onChange={(e) => setEditForm({...editForm, next_service_km: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 text-slate-200"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Remarks</label>
                <textarea
                  value={editForm.remarks}
                  onChange={(e) => setEditForm({...editForm, remarks: e.target.value})}
                  rows="3"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 text-slate-200"
                />
              </div>
              
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setError('');
                  }}
                  className="px-4 py-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition-all text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition-all text-white disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="inline animate-spin mr-2" size={16} />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default withAuth(BusesPage);