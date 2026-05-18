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
    fuel_type: '',
    registration_date: '',
    insurance_expiry: '',
    last_maintenance: '',
    next_maintenance: '',
    notes: ''
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
// =========================================
// FETCH INSTITUTION
// =========================================

const fetchInstitution = async () => {
  try {
    // GET FROM LOCAL STORAGE
    const storedInstitutionId =
      localStorage.getItem('institutionId');

    // NO LOGIN
    if (!storedInstitutionId) {
      console.error('No institution found');

      router.push('/login');

      return null;
    }

    console.log(
      'Institution ID:',
      storedInstitutionId
    );

    // SAVE STATE
    setInstitutionId(storedInstitutionId);

    return storedInstitutionId;

  } catch (err) {
    console.error(
      'Institution fetch failed:',
      err
    );

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

    // SEARCH
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();

      filtered = filtered.filter((bus) =>
        bus.bus_number?.toLowerCase().includes(search) ||
        bus.route_name?.toLowerCase().includes(search) ||
        bus.driver?.name?.toLowerCase().includes(search)
      );
    }

    // STATUS FILTER
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

    if (!institutionId) return;

    if (!newBus.bus_number.trim()) {
      setError('Bus number required');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      const { error } = await supabase
        .from('buses')
        .insert([
          {
            ...newBus,
            institution_id: institutionId,
            bus_number: newBus.bus_number.toUpperCase(),
            capacity: newBus.capacity
              ? parseInt(newBus.capacity)
              : null
          }
        ]);

      if (error) throw error;

      setShowAddModal(false);
      setNewBus(initialBusState);

      await fetchBuses(institutionId);
    } catch (err) {
      console.error(err);
      setError(err.message);
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
      fuel_type: bus.fuel_type || '',
      registration_date: bus.registration_date || '',
      insurance_expiry: bus.insurance_expiry || '',
      last_maintenance: bus.last_maintenance || '',
      next_maintenance: bus.next_maintenance || '',
      notes: bus.notes || ''
    });

    setShowEditModal(true);
  };

  const handleEditBus = async (e) => {
    e.preventDefault();

    try {
      setIsSubmitting(true);

      const { error } = await supabase
        .from('buses')
        .update({
          ...editForm,
          capacity: editForm.capacity
            ? parseInt(editForm.capacity)
            : null
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
    }
  };

  // =========================================
  // EXPORT CSV
  // =========================================

  const exportBuses = () => {
    const headers = ['Bus Number', 'Route', 'Driver', 'Status'];

    const rows = filteredBuses.map((bus) => [
      bus.bus_number,
      bus.route_name || '',
      bus.driver?.name || '',
      bus.is_active ? 'Active' : 'Inactive'
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
            className="p-2 bg-gray-800 rounded-lg"
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
            className="px-4 py-2 bg-gray-800 rounded-lg"
          >
            <Download size={18} />
          </button>

          <button
            onClick={() =>
              setViewMode(
                viewMode === 'grid' ? 'list' : 'grid'
              )
            }
            className="px-4 py-2 bg-gray-800 rounded-lg"
          >
            {viewMode === 'grid'
              ? <List size={18} />
              : <LayoutGrid size={18} />
            }
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-600 rounded-lg flex items-center gap-2"
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
            className="w-full pl-10 pr-4 py-3 bg-gray-900 border border-gray-700 rounded-xl"
          />
        </div>

        <select
          value={filterStatus}
          onChange={(e) =>
            setFilterStatus(e.target.value)
          }
          className="px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl"
        >
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="assigned">Assigned</option>
          <option value="unassigned">Unassigned</option>
        </select>
      </div>

      {/* STATS */}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">

        <div className="bg-gray-800 p-4 rounded-2xl">
          <p className="text-gray-400 text-sm">Total</p>
          <p className="text-2xl font-bold">{buses.length}</p>
        </div>

        <div className="bg-gray-800 p-4 rounded-2xl">
          <p className="text-gray-400 text-sm">Active</p>
          <p className="text-2xl font-bold">{activeCount}</p>
        </div>

        <div className="bg-gray-800 p-4 rounded-2xl">
          <p className="text-gray-400 text-sm">Assigned</p>
          <p className="text-2xl font-bold">{assignedCount}</p>
        </div>

      </div>

      {/* BUSES */}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">

        {filteredBuses.map((bus) => (
          <div
            key={bus.id}
            className="bg-gray-800 rounded-2xl p-5"
          >
            <div className="flex justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold">
                  {bus.bus_number}
                </h2>

                <p className="text-gray-400 text-sm">
                  {bus.route_name || 'No Route'}
                </p>
              </div>

              <button
                onClick={() =>
                  handleToggleStatus(bus)
                }
              >
                {bus.is_active
                  ? <Power className="text-green-400" />
                  : <PowerOff className="text-gray-500" />
                }
              </button>
            </div>

            <div className="space-y-2 text-sm">

              <p>
                Driver:
                {' '}
                {bus.driver?.name || 'Not Assigned'}
              </p>

              <p>
                Capacity:
                {' '}
                {bus.capacity || '-'}
              </p>

            </div>

            <div className="flex justify-end gap-2 mt-5">

              <button
                onClick={() =>
                  openEditModal(bus)
                }
                className="p-2 bg-blue-600 rounded-lg"
              >
                <Edit size={16} />
              </button>

              <button
                onClick={() =>
                  handleDeleteBus(bus.id)
                }
                className="p-2 bg-red-600 rounded-lg"
              >
                <Trash2 size={16} />
              </button>

            </div>
          </div>
        ))}

      </div>
    </div>
  );
}

export default withAuth(BusesPage);