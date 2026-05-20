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
  Settings
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

      console.log('Institution ID:', storedInstitutionId);
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

      // Prepare the data for insertion matching your database schema
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

      console.log('Adding bus with data:', busData);

      const { data, error } = await supabase
        .from('buses')
        .insert([busData])
        .select();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Bus added successfully:', data);

      setShowAddModal(false);
      setNewBus(initialBusState);
      await fetchBuses(institutionId);
      
    } catch (err) {
      console.error('Add bus error details:', err);
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
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" size={40} />
      </div>
    );
  }

  // =========================================
  // UI
  // =========================================

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">

      {/* HEADER */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition"
          >
            <ArrowLeft size={18} />
          </button>

          <div>
            <h1 className="text-2xl font-bold">
              Fleet Management
            </h1>

            <p className="text-sm text-gray-400">
              {buses.length} buses
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={exportBuses}
            className="px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition"
          >
            <Download size={18} />
          </button>

          <button
            onClick={() =>
              setViewMode(
                viewMode === 'grid' ? 'list' : 'grid'
              )
            }
            className="px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition"
          >
            {viewMode === 'grid'
              ? <List size={18} />
              : <LayoutGrid size={18} />
            }
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-600 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition"
          >
            <Plus size={18} />
            Add Bus
          </button>
        </div>
      </div>

      {/* SEARCH */}
      <div className="bg-gray-800 p-4 rounded-2xl mb-6 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-3 text-gray-500"
            size={18}
          />

          <input
            type="text"
            placeholder="Search buses..."
            value={searchTerm}
            onChange={(e) =>
              setSearchTerm(e.target.value)
            }
            className="w-full pl-10 pr-4 py-3 bg-gray-900 border border-gray-700 rounded-xl focus:outline-none focus:border-blue-500"
          />
        </div>

        <select
          value={filterStatus}
          onChange={(e) =>
            setFilterStatus(e.target.value)
          }
          className="px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl focus:outline-none focus:border-blue-500"
        >
          <option value="all">All Buses</option>
          <option value="active">Active Only</option>
          <option value="inactive">Inactive Only</option>
          <option value="assigned">Assigned to Driver</option>
          <option value="unassigned">Unassigned</option>
        </select>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-800 p-4 rounded-2xl">
          <p className="text-gray-400 text-sm">Total Buses</p>
          <p className="text-2xl font-bold">{buses.length}</p>
        </div>

        <div className="bg-gray-800 p-4 rounded-2xl">
          <p className="text-gray-400 text-sm">Active Buses</p>
          <p className="text-2xl font-bold">{activeCount}</p>
        </div>

        <div className="bg-gray-800 p-4 rounded-2xl">
          <p className="text-gray-400 text-sm">Assigned Buses</p>
          <p className="text-2xl font-bold">{assignedCount}</p>
        </div>
      </div>

      {/* BUSES GRID */}
      {filteredBuses.length === 0 ? (
        <div className="bg-gray-800 rounded-2xl p-12 text-center">
          <Bus size={48} className="mx-auto text-gray-600 mb-4" />
          <p className="text-gray-400">No buses found</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-4 px-4 py-2 bg-blue-600 rounded-lg inline-flex items-center gap-2"
          >
            <Plus size={18} />
            Add Your First Bus
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredBuses.map((bus) => (
            <div
              key={bus.id}
              className="bg-gray-800 rounded-2xl p-5 hover:bg-gray-750 transition border border-gray-700"
            >
              <div className="flex justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold">
                    {bus.bus_number}
                  </h2>

                  <p className="text-gray-400 text-sm">
                    {bus.route_name || 'No Route Assigned'}
                  </p>
                </div>

                <button
                  onClick={() =>
                    handleToggleStatus(bus)
                  }
                  className="hover:scale-110 transition"
                >
                  {bus.is_active
                    ? <Power className="text-green-400" />
                    : <PowerOff className="text-gray-500" />
                  }
                </button>
              </div>

              <div className="space-y-2 text-sm">
                <p>
                  Driver: {' '}
                  {bus.driver?.name || 'Not Assigned'}
                </p>

                <p>
                  Capacity: {' '}
                  {bus.capacity || '-'} seats
                </p>

                {bus.current_km && (
                  <p>
                    Current KM: {' '}
                    {bus.current_km}
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 mt-5">
                <button
                  onClick={() =>
                    openEditModal(bus)
                  }
                  className="p-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition"
                >
                  <Edit size={16} />
                </button>

                <button
                  onClick={() =>
                    handleDeleteBus(bus.id)
                  }
                  className="p-2 bg-red-600 rounded-lg hover:bg-red-700 transition"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========== ADD BUS MODAL ========== */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gray-800 p-6 border-b border-gray-700 flex justify-between items-center">
              <h2 className="text-xl font-bold">Add New Bus</h2>
              <button 
                onClick={() => setShowAddModal(false)}
                className="p-1 hover:bg-gray-700 rounded transition"
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
                  <label className="block text-sm mb-2 font-medium">Bus Number *</label>
                  <input
                    type="text"
                    value={newBus.bus_number}
                    onChange={(e) => setNewBus({...newBus, bus_number: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
                    placeholder="e.g., BUS-001"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm mb-2 font-medium">Route Name</label>
                  <input
                    type="text"
                    value={newBus.route_name}
                    onChange={(e) => setNewBus({...newBus, route_name: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
                    placeholder="e.g., Downtown - Airport"
                  />
                </div>
                
                <div>
                  <label className="block text-sm mb-2 font-medium">Capacity</label>
                  <input
                    type="text"
                    value={newBus.capacity}
                    onChange={(e) => setNewBus({...newBus, capacity: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
                    placeholder="e.g., 40 seats"
                  />
                </div>
                
                <div>
                  <label className="block text-sm mb-2 font-medium">Assign Driver</label>
                  <select
                    value={newBus.driver_id}
                    onChange={(e) => setNewBus({...newBus, driver_id: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
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
                  <label className="block text-sm mb-2 font-medium">Status</label>
                  <select
                    value={newBus.is_active}
                    onChange={(e) => setNewBus({...newBus, is_active: e.target.value === 'true'})}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm mb-2 font-medium">Current KM</label>
                  <input
                    type="text"
                    value={newBus.current_km}
                    onChange={(e) => setNewBus({...newBus, current_km: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
                    placeholder="e.g., 50000"
                  />
                </div>
                
                <div>
                  <label className="block text-sm mb-2 font-medium">PUC Expiry</label>
                  <input
                    type="date"
                    value={newBus.puc_expiry}
                    onChange={(e) => setNewBus({...newBus, puc_expiry: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm mb-2 font-medium">Insurance Expiry</label>
                  <input
                    type="date"
                    value={newBus.insurance_expiry}
                    onChange={(e) => setNewBus({...newBus, insurance_expiry: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm mb-2 font-medium">Fitness Expiry</label>
                  <input
                    type="date"
                    value={newBus.fitness_expiry}
                    onChange={(e) => setNewBus({...newBus, fitness_expiry: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm mb-2 font-medium">Permit Expiry</label>
                  <input
                    type="date"
                    value={newBus.permit_expiry}
                    onChange={(e) => setNewBus({...newBus, permit_expiry: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm mb-2 font-medium">Last Service Date</label>
                  <input
                    type="date"
                    value={newBus.last_service_date}
                    onChange={(e) => setNewBus({...newBus, last_service_date: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm mb-2 font-medium">Next Service Due</label>
                  <input
                    type="date"
                    value={newBus.next_service_due}
                    onChange={(e) => setNewBus({...newBus, next_service_due: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm mb-2 font-medium">Last Service KM</label>
                  <input
                    type="text"
                    value={newBus.last_service_km}
                    onChange={(e) => setNewBus({...newBus, last_service_km: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
                    placeholder="e.g., 45000"
                  />
                </div>

                <div>
                  <label className="block text-sm mb-2 font-medium">Next Service KM</label>
                  <input
                    type="text"
                    value={newBus.next_service_km}
                    onChange={(e) => setNewBus({...newBus, next_service_km: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
                    placeholder="e.g., 55000"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm mb-2 font-medium">Remarks</label>
                <textarea
                  value={newBus.remarks}
                  onChange={(e) => setNewBus({...newBus, remarks: e.target.value})}
                  rows="3"
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
                  placeholder="Any additional information about this bus..."
                />
              </div>
              
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setError('');
                    setNewBus(initialBusState);
                  }}
                  className="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gray-800 p-6 border-b border-gray-700 flex justify-between items-center">
              <h2 className="text-xl font-bold">Edit Bus</h2>
              <button 
                onClick={() => setShowEditModal(false)}
                className="p-1 hover:bg-gray-700 rounded transition"
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
                  <label className="block text-sm mb-2 font-medium">Bus Number *</label>
                  <input
                    type="text"
                    value={editForm.bus_number}
                    onChange={(e) => setEditForm({...editForm, bus_number: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm mb-2 font-medium">Route Name</label>
                  <input
                    type="text"
                    value={editForm.route_name}
                    onChange={(e) => setEditForm({...editForm, route_name: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm mb-2 font-medium">Capacity</label>
                  <input
                    type="text"
                    value={editForm.capacity}
                    onChange={(e) => setEditForm({...editForm, capacity: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm mb-2 font-medium">Assign Driver</label>
                  <select
                    value={editForm.driver_id}
                    onChange={(e) => setEditForm({...editForm, driver_id: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
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
                  <label className="block text-sm mb-2 font-medium">Status</label>
                  <select
                    value={editForm.is_active}
                    onChange={(e) => setEditForm({...editForm, is_active: e.target.value === 'true'})}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm mb-2 font-medium">Current KM</label>
                  <input
                    type="text"
                    value={editForm.current_km}
                    onChange={(e) => setEditForm({...editForm, current_km: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm mb-2 font-medium">PUC Expiry</label>
                  <input
                    type="date"
                    value={editForm.puc_expiry}
                    onChange={(e) => setEditForm({...editForm, puc_expiry: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm mb-2 font-medium">Insurance Expiry</label>
                  <input
                    type="date"
                    value={editForm.insurance_expiry}
                    onChange={(e) => setEditForm({...editForm, insurance_expiry: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm mb-2 font-medium">Fitness Expiry</label>
                  <input
                    type="date"
                    value={editForm.fitness_expiry}
                    onChange={(e) => setEditForm({...editForm, fitness_expiry: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm mb-2 font-medium">Permit Expiry</label>
                  <input
                    type="date"
                    value={editForm.permit_expiry}
                    onChange={(e) => setEditForm({...editForm, permit_expiry: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm mb-2 font-medium">Last Service Date</label>
                  <input
                    type="date"
                    value={editForm.last_service_date}
                    onChange={(e) => setEditForm({...editForm, last_service_date: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm mb-2 font-medium">Next Service Due</label>
                  <input
                    type="date"
                    value={editForm.next_service_due}
                    onChange={(e) => setEditForm({...editForm, next_service_due: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm mb-2 font-medium">Last Service KM</label>
                  <input
                    type="text"
                    value={editForm.last_service_km}
                    onChange={(e) => setEditForm({...editForm, last_service_km: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm mb-2 font-medium">Next Service KM</label>
                  <input
                    type="text"
                    value={editForm.next_service_km}
                    onChange={(e) => setEditForm({...editForm, next_service_km: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm mb-2 font-medium">Remarks</label>
                <textarea
                  value={editForm.remarks}
                  onChange={(e) => setEditForm({...editForm, remarks: e.target.value})}
                  rows="3"
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>
              
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setError('');
                  }}
                  className="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
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