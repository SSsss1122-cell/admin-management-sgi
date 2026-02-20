'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Bus, ArrowLeft, Search, Loader2, Plus, 
  X, Save, AlertCircle, Edit, Trash2,
  Power, PowerOff, LayoutGrid, List, Download,
  BarChart3, TrendingUp, Clock, Shield, Wrench,
  MoreVertical, Eye, Filter, Calendar, CheckCircle,
  Settings, Users, MapPin, Route, Home
} from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function BusesPage() {
  const router = useRouter();
  const [buses, setBuses] = useState([]);
  const [filteredBuses, setFilteredBuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  
  // Add bus modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newBus, setNewBus] = useState({
    bus_number: '',
    route_name: '',
    capacity: '',
    driver_id: '',
    is_active: true,
    last_maintenance: '',
    next_maintenance: '',
    fuel_type: '',
    registration_date: '',
    insurance_expiry: '',
    notes: ''
  });
  
  // Edit bus modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingBus, setEditingBus] = useState(null);
  const [editForm, setEditForm] = useState({
    id: '',
    bus_number: '',
    route_name: '',
    capacity: '',
    driver_id: '',
    is_active: true,
    last_maintenance: '',
    next_maintenance: '',
    fuel_type: '',
    registration_date: '',
    insurance_expiry: '',
    notes: ''
  });

  const [drivers, setDrivers] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchBuses();
    fetchDrivers();
  }, []);

  useEffect(() => {
    filterBuses();
  }, [searchTerm, buses, filterStatus]);

  // 🔥 FIXED: Added error handling for foreign key relation
  const fetchBuses = async () => {
    try {
      // First, try to fetch with driver relation
      let data;
      try {
        const { data: busesData, error } = await supabase
          .from('buses')
          .select(`
            *,
            driver:drivers_new!buses_driver_id_fkey (
              id,
              name,
              driver_code,
              contact
            )
          `)
          .order('bus_number');

        if (error) throw error;
        data = busesData;
      } catch (relationError) {
        console.warn('Driver relation fetch failed, fetching without relation:', relationError);
        // Fallback: fetch buses without driver relation
        const { data: busesData, error } = await supabase
          .from('buses')
          .select('*')
          .order('bus_number');

        if (error) throw error;
        data = busesData;
      }

      setBuses(data || []);
      setFilteredBuses(data || []);
    } catch (error) {
      console.error('Error fetching buses:', error);
      setBuses([]);
      setFilteredBuses([]);
    } finally {
      setLoading(false);
    }
  };

  // 🔥 FIXED: Added error handling for drivers fetch
  const fetchDrivers = async () => {
    try {
      const { data, error } = await supabase
        .from('drivers_new')
        .select('id, name, driver_code, contact, status')
        .order('name');

      if (error) {
        console.warn('Error fetching drivers:', error);
        setDrivers([]);
        return;
      }
      setDrivers(data || []);
    } catch (error) {
      console.error('Error fetching drivers:', error);
      setDrivers([]);
    }
  };

  const filterBuses = () => {
    if (!buses || buses.length === 0) {
      setFilteredBuses([]);
      return;
    }

    let filtered = [...buses];

    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(bus =>
        (bus.bus_number?.toLowerCase() || '').includes(searchLower) ||
        (bus.route_name?.toLowerCase() || '').includes(searchLower) ||
        (bus.driver?.name?.toLowerCase() || '').includes(searchLower) ||
        (bus.driver?.driver_code?.toLowerCase() || '').includes(searchLower)
      );
    }

    // Apply status filter - using is_active field
    if (filterStatus === 'active') {
      filtered = filtered.filter(bus => bus.is_active === true);
    } else if (filterStatus === 'inactive') {
      filtered = filtered.filter(bus => bus.is_active === false);
    } else if (filterStatus === 'assigned') {
      filtered = filtered.filter(bus => bus.driver_id);
    } else if (filterStatus === 'unassigned') {
      filtered = filtered.filter(bus => !bus.driver_id);
    }

    setFilteredBuses(filtered);
  };

  // ADD BUS
  const handleAddBus = async (e) => {
    e.preventDefault();
    
    if (!newBus.bus_number.trim()) {
      setError('Bus number is required');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // Check if bus number already exists
      const { data: existing } = await supabase
        .from('buses')
        .select('bus_number')
        .eq('bus_number', newBus.bus_number.toUpperCase())
        .maybeSingle();

      if (existing) {
        setError('Bus number already exists');
        setIsSubmitting(false);
        return;
      }

      const { error } = await supabase
        .from('buses')
        .insert([{
          bus_number: newBus.bus_number.toUpperCase(),
          route_name: newBus.route_name || null,
          capacity: newBus.capacity ? parseInt(newBus.capacity) : null,
          driver_id: newBus.driver_id || null,
          is_active: newBus.is_active,
          last_maintenance: newBus.last_maintenance || null,
          next_maintenance: newBus.next_maintenance || null,
          fuel_type: newBus.fuel_type || null,
          registration_date: newBus.registration_date || null,
          insurance_expiry: newBus.insurance_expiry || null,
          notes: newBus.notes || null
        }]);

      if (error) throw error;

      // Reset and close modal
      setNewBus({
        bus_number: '',
        route_name: '',
        capacity: '',
        driver_id: '',
        is_active: true,
        last_maintenance: '',
        next_maintenance: '',
        fuel_type: '',
        registration_date: '',
        insurance_expiry: '',
        notes: ''
      });
      setShowAddModal(false);
      
      // Refresh list
      await fetchBuses();
      await fetchDrivers();

    } catch (error) {
      console.error('Error adding bus:', error);
      setError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // EDIT BUS
  const openEditModal = (bus) => {
    setEditingBus(bus);
    setEditForm({
      id: bus.id,
      bus_number: bus.bus_number || '',
      route_name: bus.route_name || '',
      capacity: bus.capacity || '',
      driver_id: bus.driver_id || '',
      is_active: bus.is_active !== undefined ? bus.is_active : true,
      last_maintenance: bus.last_maintenance || '',
      next_maintenance: bus.next_maintenance || '',
      fuel_type: bus.fuel_type || '',
      registration_date: bus.registration_date || '',
      insurance_expiry: bus.insurance_expiry || '',
      notes: bus.notes || ''
    });
    setShowEditModal(true);
    setError('');
  };

  const handleEditBus = async (e) => {
    e.preventDefault();
    
    if (!editForm.bus_number.trim()) {
      setError('Bus number is required');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // Check if bus number already exists (excluding current bus)
      const { data: existing } = await supabase
        .from('buses')
        .select('bus_number')
        .eq('bus_number', editForm.bus_number.toUpperCase())
        .neq('id', editForm.id)
        .maybeSingle();

      if (existing) {
        setError('Bus number already exists');
        setIsSubmitting(false);
        return;
      }

      const { error } = await supabase
        .from('buses')
        .update({
          bus_number: editForm.bus_number.toUpperCase(),
          route_name: editForm.route_name || null,
          capacity: editForm.capacity ? parseInt(editForm.capacity) : null,
          driver_id: editForm.driver_id || null,
          is_active: editForm.is_active,
          last_maintenance: editForm.last_maintenance || null,
          next_maintenance: editForm.next_maintenance || null,
          fuel_type: editForm.fuel_type || null,
          registration_date: editForm.registration_date || null,
          insurance_expiry: editForm.insurance_expiry || null,
          notes: editForm.notes || null
        })
        .eq('id', editForm.id);

      if (error) throw error;

      setShowEditModal(false);
      await fetchBuses();
      await fetchDrivers();

    } catch (error) {
      console.error('Error updating bus:', error);
      setError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // TOGGLE ACTIVE STATUS
  const handleToggleStatus = async (bus) => {
    try {
      const newStatus = !bus.is_active;
      
      const { error } = await supabase
        .from('buses')
        .update({ 
          is_active: newStatus
        })
        .eq('id', bus.id);

      if (error) throw error;

      // Update local state
      setBuses(prev => prev.map(b => 
        b.id === bus.id ? { ...b, is_active: newStatus } : b
      ));

    } catch (error) {
      console.error('Error toggling bus status:', error);
      alert('Error updating bus status: ' + error.message);
    }
  };

  // DELETE BUS
  const handleDeleteBus = async (busId, busNumber) => {
    if (!confirm(`Are you sure you want to delete Bus ${busNumber}? This action cannot be undone.`)) return;

    try {
      const { error } = await supabase
        .from('buses')
        .delete()
        .eq('id', busId);

      if (error) throw error;

      await fetchBuses();

    } catch (error) {
      console.error('Error deleting bus:', error);
      alert('Error deleting bus: ' + error.message);
    }
  };

  const exportBuses = () => {
    if (!filteredBuses || filteredBuses.length === 0) {
      alert('No buses to export');
      return;
    }

    const headers = [
      'Bus Number', 'Route', 'Capacity', 'Status', 'Driver', 'Driver Contact',
      'Fuel Type', 'Registration Date', 'Insurance Expiry', 'Last Maintenance',
      'Next Maintenance', 'Notes'
    ];
    
    const csvData = filteredBuses.map(bus => [
      bus.bus_number || '',
      bus.route_name || '',
      bus.capacity || '',
      bus.is_active ? 'Active' : 'Inactive',
      bus.driver?.name || 'Not Assigned',
      bus.driver?.contact || '',
      bus.fuel_type || '',
      bus.registration_date || '',
      bus.insurance_expiry || '',
      bus.last_maintenance || '',
      bus.next_maintenance || '',
      bus.notes || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `buses_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const goBack = () => {
    router.back();
  };

  const getStatusColor = (isActive) => {
    return isActive 
      ? 'bg-emerald-900/30 text-emerald-400 border-emerald-800/50'
      : 'bg-gray-800/50 text-gray-400 border-gray-700';
  };

  const getStatusIcon = (isActive) => {
    return isActive 
      ? <Power size={14} className="mr-1" />
      : <PowerOff size={14} className="mr-1" />;
  };

  const checkMaintenanceDue = (date) => {
    if (!date) return false;
    try {
      const maintenanceDate = new Date(date);
      const today = new Date();
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);
      return maintenanceDate <= nextWeek;
    } catch (error) {
      return false;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-700 border-t-blue-500"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-8 w-8 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  // Calculate stats
  const activeCount = buses.filter(b => b.is_active === true).length;
  const inactiveCount = buses.filter(b => b.is_active === false).length;
  const assignedCount = buses.filter(b => b.driver_id).length;
  const totalCapacity = buses.reduce((sum, b) => sum + (b.capacity || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Dark decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-600/10 to-cyan-600/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-emerald-600/10 to-teal-600/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-purple-600/5 to-pink-600/5 rounded-full blur-3xl"></div>
      </div>

      {/* Header */}
      <div className="relative bg-gray-800/80 backdrop-blur-xl border-b border-gray-700/50 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            <div className="flex items-center">
              <button
                onClick={goBack}
                className="p-2 hover:bg-gray-700/50 rounded-xl transition-colors mr-3 text-gray-400 hover:text-blue-400"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 className="text-xl lg:text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  Fleet Management
                </h1>
                <p className="text-xs text-gray-400">
                  Total {buses.length} buses • {activeCount} active
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={exportBuses}
                className="p-2 bg-gray-800/50 backdrop-blur-xl border border-gray-700 rounded-xl text-gray-400 hover:text-blue-400 hover:border-blue-500/50 transition-all"
                title="Export Buses"
              >
                <Download size={18} />
              </button>
              
              <button
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                className="p-2 bg-gray-800/50 backdrop-blur-xl border border-gray-700 rounded-xl text-gray-400 hover:text-blue-400 hover:border-blue-500/50 transition-all"
              >
                {viewMode === 'grid' ? <List size={18} /> : <LayoutGrid size={18} />}
              </button>
              
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white px-4 py-2 rounded-xl flex items-center space-x-2 transition-all shadow-lg shadow-blue-600/20"
              >
                <Plus size={18} />
                <span className="hidden sm:inline">Add Bus</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl p-4 border border-gray-700/50">
            <div className="flex items-center justify-between mb-2">
              <Bus className="text-blue-400" size={20} />
              <span className="text-xs text-gray-500">Total</span>
            </div>
            <p className="text-2xl font-bold text-white">{buses.length}</p>
            <p className="text-xs text-gray-400">Fleet Size</p>
          </div>
          
          <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl p-4 border border-gray-700/50">
            <div className="flex items-center justify-between mb-2">
              <Power className="text-emerald-400" size={20} />
              <span className="text-xs text-gray-500">Active</span>
            </div>
            <p className="text-2xl font-bold text-white">{activeCount}</p>
            <p className="text-xs text-gray-400">On Route</p>
          </div>
          
          <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl p-4 border border-gray-700/50">
            <div className="flex items-center justify-between mb-2">
              <Users className="text-purple-400" size={20} />
              <span className="text-xs text-gray-500">Assigned</span>
            </div>
            <p className="text-2xl font-bold text-white">{assignedCount}</p>
            <p className="text-xs text-gray-400">With Drivers</p>
          </div>
          
          <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl p-4 border border-gray-700/50">
            <div className="flex items-center justify-between mb-2">
              <BarChart3 className="text-cyan-400" size={20} />
              <span className="text-xs text-gray-500">Capacity</span>
            </div>
            <p className="text-2xl font-bold text-white">{totalCapacity}</p>
            <p className="text-xs text-gray-400">Total Seats</p>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700/50 p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
              <input
                type="text"
                placeholder="Search by bus number, route, or driver..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-200 placeholder-gray-500 transition-all"
              />
            </div>
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 text-gray-200 cursor-pointer min-w-[160px]"
            >
              <option value="all">All Buses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="assigned">Assigned</option>
              <option value="unassigned">Unassigned</option>
            </select>
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-700/50">
            <span className="text-xs font-medium text-gray-500 py-1">Quick filters:</span>
            <button
              onClick={() => setFilterStatus('active')}
              className="px-3 py-1 bg-emerald-950/50 text-emerald-400 rounded-lg text-xs font-medium hover:bg-emerald-900/50 transition-colors border border-emerald-800/50"
            >
              Active ({activeCount})
            </button>
            <button
              onClick={() => setFilterStatus('assigned')}
              className="px-3 py-1 bg-purple-950/50 text-purple-400 rounded-lg text-xs font-medium hover:bg-purple-900/50 transition-colors border border-purple-800/50"
            >
              Assigned ({assignedCount})
            </button>
            <button
              onClick={() => setFilterStatus('unassigned')}
              className="px-3 py-1 bg-gray-800 text-gray-400 rounded-lg text-xs font-medium hover:bg-gray-700 transition-colors border border-gray-700"
            >
              Unassigned ({buses.length - assignedCount})
            </button>
          </div>
        </div>
      </div>

      {/* Buses List/Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {filteredBuses.length === 0 ? (
          <div className="text-center py-16 bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700/50">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-600/20 to-cyan-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-500/30">
              <Bus className="text-blue-400" size={32} />
            </div>
            <h3 className="text-lg font-semibold text-gray-200 mb-2">No Buses Found</h3>
            <p className="text-gray-400 mb-4">Try adjusting your search or add a new bus</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-colors shadow-lg shadow-blue-600/20"
            >
              Add Your First Bus
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredBuses.map((bus) => {
              const maintenanceDue = checkMaintenanceDue(bus.next_maintenance);
              return (
                <div
                  key={bus.id}
                  className="group relative bg-gray-800/50 backdrop-blur-xl rounded-2xl shadow-xl hover:shadow-2xl transition-all border border-gray-700/50 overflow-hidden"
                >
                  {/* Status Indicator */}
                  <div className={`absolute top-0 left-0 w-1 h-full ${
                    bus.is_active ? 'bg-gradient-to-b from-emerald-500 to-emerald-600' :
                    'bg-gradient-to-b from-gray-600 to-gray-700'
                  }`}></div>

                  <div className="p-6 pl-7">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
                          <Bus className="text-white" size={24} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-200">Bus {bus.bus_number}</h3>
                          <p className="text-xs text-gray-500">{bus.route_name || 'No route'}</p>
                        </div>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full border ${getStatusColor(bus.is_active)}`}>
                        {getStatusIcon(bus.is_active)}
                        {bus.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    {/* Details */}
                    <div className="space-y-3">
                      {/* Driver Info */}
                      {bus.driver ? (
                        <div className="flex items-center gap-2 text-sm p-2 bg-emerald-950/30 rounded-lg border border-emerald-800/50">
                          <Users size={14} className="text-emerald-400" />
                          <span className="text-emerald-400 font-medium">{bus.driver.name}</span>
                          <span className="text-gray-400 text-xs ml-auto">{bus.driver.driver_code}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-sm p-2 bg-gray-900/50 rounded-lg border border-gray-700/50">
                          <Users size={14} className="text-gray-500" />
                          <span className="text-gray-500">No Driver Assigned</span>
                        </div>
                      )}

                      {/* Capacity */}
                      {bus.capacity && (
                        <div className="flex items-center gap-2 text-sm">
                          <Users size={14} className="text-gray-600" />
                          <span className="text-gray-400">Capacity: {bus.capacity} seats</span>
                        </div>
                      )}

                      {/* Maintenance Alert */}
                      {maintenanceDue && bus.is_active && (
                        <div className="flex items-center gap-2 text-sm p-2 bg-amber-950/30 rounded-lg border border-amber-800/50">
                          <Wrench size={14} className="text-amber-400" />
                          <span className="text-amber-400">Maintenance due soon</span>
                        </div>
                      )}

                      {/* Insurance Expiry */}
                      {bus.insurance_expiry && (
                        <div className="flex items-center gap-2 text-sm">
                          <Shield size={14} className="text-gray-600" />
                          <span className="text-gray-400">
                            Insurance: {new Date(bus.insurance_expiry).toLocaleDateString()}
                          </span>
                        </div>
                      )}

                      {/* Fuel Type */}
                      {bus.fuel_type && (
                        <div className="flex items-center gap-2 text-sm">
                          <Settings size={14} className="text-gray-600" />
                          <span className="text-gray-400">{bus.fuel_type}</span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-gray-700/50">
                      <button
                        onClick={() => handleToggleStatus(bus)}
                        className={`p-2 rounded-lg transition-colors ${
                          bus.is_active 
                            ? 'text-emerald-400 hover:bg-emerald-600/20' 
                            : 'text-gray-400 hover:bg-gray-700/50'
                        }`}
                        title={bus.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {bus.is_active ? <Power size={16} /> : <PowerOff size={16} />}
                      </button>
                      <button
                        onClick={() => openEditModal(bus)}
                        className="p-2 text-blue-400 hover:bg-blue-600/20 rounded-lg transition-colors"
                        title="Edit Bus"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteBus(bus.id, bus.bus_number)}
                        className="p-2 text-rose-400 hover:bg-rose-600/20 rounded-lg transition-colors"
                        title="Delete Bus"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* List View */
          <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-700/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-900/50 border-b border-gray-700">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Bus</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Route</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Driver</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Capacity</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Next Maint.</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/50">
                  {filteredBuses.map((bus) => {
                    const maintenanceDue = checkMaintenanceDue(bus.next_maintenance);
                    return (
                      <tr key={bus.id} className="hover:bg-gray-700/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-lg flex items-center justify-center">
                              <Bus className="text-white" size={14} />
                            </div>
                            <div>
                              <p className="font-medium text-gray-200">Bus {bus.bus_number}</p>
                              <p className="text-xs text-gray-500">{bus.route_name || 'No route'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-300">
                          {bus.route_name || '—'}
                        </td>
                        <td className="px-6 py-4">
                          {bus.driver ? (
                            <div className="text-sm">
                              <p className="text-gray-200">{bus.driver.name}</p>
                              <p className="text-xs text-gray-500">{bus.driver.driver_code}</p>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500">Not Assigned</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-300">
                          {bus.capacity || '—'}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full border ${getStatusColor(bus.is_active)}`}>
                            {getStatusIcon(bus.is_active)}
                            {bus.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {bus.next_maintenance ? (
                            <div className="flex items-center">
                              <span className={`text-sm ${maintenanceDue ? 'text-amber-400' : 'text-gray-400'}`}>
                                {new Date(bus.next_maintenance).toLocaleDateString()}
                              </span>
                              {maintenanceDue && (
                                <Wrench size={12} className="ml-1 text-amber-400" />
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleToggleStatus(bus)}
                              className={`p-1.5 rounded-lg transition-colors ${
                                bus.is_active 
                                  ? 'text-emerald-400 hover:bg-emerald-600/20' 
                                  : 'text-gray-400 hover:bg-gray-700/50'
                              }`}
                              title={bus.is_active ? 'Deactivate' : 'Activate'}
                            >
                              {bus.is_active ? <Power size={14} /> : <PowerOff size={14} />}
                            </button>
                            <button
                              onClick={() => openEditModal(bus)}
                              className="p-1.5 text-blue-400 hover:bg-blue-600/20 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteBus(bus.id, bus.bus_number)}
                              className="p-1.5 text-rose-400 hover:bg-rose-600/20 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Add Bus Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-cyan-600 p-5 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="bg-white/20 p-2 rounded-lg">
                    <Bus className="text-white" size={20} />
                  </div>
                  <h2 className="text-lg font-semibold text-white">Add New Bus</h2>
                </div>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setError('');
                  }}
                  className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleAddBus} className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Bus Number <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={newBus.bus_number}
                    onChange={(e) => setNewBus({ ...newBus, bus_number: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-200 placeholder-gray-500 transition-all"
                    placeholder="e.g., BUS001"
                    autoFocus
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Route Name</label>
                  <input
                    type="text"
                    value={newBus.route_name}
                    onChange={(e) => setNewBus({ ...newBus, route_name: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-200 placeholder-gray-500 transition-all"
                    placeholder="e.g., City Route - North"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Capacity (Seats)</label>
                  <input
                    type="number"
                    value={newBus.capacity}
                    onChange={(e) => setNewBus({ ...newBus, capacity: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-200 placeholder-gray-500 transition-all"
                    placeholder="e.g., 40"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Fuel Type</label>
                  <select
                    value={newBus.fuel_type}
                    onChange={(e) => setNewBus({ ...newBus, fuel_type: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-200 transition-all"
                  >
                    <option value="">Select Fuel Type</option>
                    <option value="Diesel">Diesel</option>
                    <option value="Petrol">Petrol</option>
                    <option value="CNG">CNG</option>
                    <option value="Electric">Electric</option>
                    <option value="Hybrid">Hybrid</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Assign Driver</label>
                  <select
                    value={newBus.driver_id}
                    onChange={(e) => setNewBus({ ...newBus, driver_id: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-200 transition-all"
                  >
                    <option value="">No Driver Assigned</option>
                    {drivers.map(driver => (
                      <option key={driver.id} value={driver.id}>
                        {driver.name} ({driver.driver_code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Registration Date</label>
                  <input
                    type="date"
                    value={newBus.registration_date}
                    onChange={(e) => setNewBus({ ...newBus, registration_date: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-200 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Insurance Expiry</label>
                  <input
                    type="date"
                    value={newBus.insurance_expiry}
                    onChange={(e) => setNewBus({ ...newBus, insurance_expiry: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-200 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Last Maintenance</label>
                  <input
                    type="date"
                    value={newBus.last_maintenance}
                    onChange={(e) => setNewBus({ ...newBus, last_maintenance: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-200 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Next Maintenance</label>
                  <input
                    type="date"
                    value={newBus.next_maintenance}
                    onChange={(e) => setNewBus({ ...newBus, next_maintenance: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-200 transition-all"
                  />
                </div>

                {/* Status Toggle */}
                <div className="md:col-span-2">
                  <div className="flex items-center justify-between p-4 bg-gray-900/50 rounded-xl border border-gray-700">
                    <div className="flex items-center space-x-3">
                      <Power size={18} className={newBus.is_active ? 'text-emerald-400' : 'text-gray-500'} />
                      <div>
                        <p className="text-sm font-medium text-gray-300">Active Status</p>
                        <p className="text-xs text-gray-500">Set bus as active immediately</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newBus.is_active}
                        onChange={(e) => setNewBus({ ...newBus, is_active: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Notes</label>
                  <textarea
                    value={newBus.notes}
                    onChange={(e) => setNewBus({ ...newBus, notes: e.target.value })}
                    rows="3"
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-200 placeholder-gray-500 transition-all"
                    placeholder="Additional notes about the bus..."
                  />
                </div>

                {error && (
                  <div className="md:col-span-2 bg-rose-950/30 border border-rose-800/50 rounded-xl p-4">
                    <div className="flex items-start space-x-2">
                      <AlertCircle className="text-rose-400 flex-shrink-0" size={18} />
                      <p className="text-sm text-rose-400">{error}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-700">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setError('');
                  }}
                  className="px-6 py-3 text-gray-300 bg-gray-700 rounded-xl hover:bg-gray-600 transition-all font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:from-blue-700 hover:to-cyan-700 transition-all font-medium shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Adding...</span>
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      <span>Add Bus</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Bus Modal */}
      {showEditModal && editingBus && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-emerald-600 to-teal-600 p-5 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="bg-white/20 p-2 rounded-lg">
                    <Edit className="text-white" size={20} />
                  </div>
                  <h2 className="text-lg font-semibold text-white">Edit Bus</h2>
                </div>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setError('');
                  }}
                  className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleEditBus} className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Bus Number <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={editForm.bus_number}
                    onChange={(e) => setEditForm({ ...editForm, bus_number: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-200 placeholder-gray-500 transition-all"
                    placeholder="e.g., BUS001"
                    autoFocus
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Route Name</label>
                  <input
                    type="text"
                    value={editForm.route_name}
                    onChange={(e) => setEditForm({ ...editForm, route_name: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-200 placeholder-gray-500 transition-all"
                    placeholder="e.g., City Route - North"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Capacity (Seats)</label>
                  <input
                    type="number"
                    value={editForm.capacity}
                    onChange={(e) => setEditForm({ ...editForm, capacity: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-200 placeholder-gray-500 transition-all"
                    placeholder="e.g., 40"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Fuel Type</label>
                  <select
                    value={editForm.fuel_type}
                    onChange={(e) => setEditForm({ ...editForm, fuel_type: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-200 transition-all"
                  >
                    <option value="">Select Fuel Type</option>
                    <option value="Diesel">Diesel</option>
                    <option value="Petrol">Petrol</option>
                    <option value="CNG">CNG</option>
                    <option value="Electric">Electric</option>
                    <option value="Hybrid">Hybrid</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Assign Driver</label>
                  <select
                    value={editForm.driver_id}
                    onChange={(e) => setEditForm({ ...editForm, driver_id: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-200 transition-all"
                  >
                    <option value="">No Driver Assigned</option>
                    {drivers.map(driver => (
                      <option key={driver.id} value={driver.id}>
                        {driver.name} ({driver.driver_code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Registration Date</label>
                  <input
                    type="date"
                    value={editForm.registration_date}
                    onChange={(e) => setEditForm({ ...editForm, registration_date: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-200 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Insurance Expiry</label>
                  <input
                    type="date"
                    value={editForm.insurance_expiry}
                    onChange={(e) => setEditForm({ ...editForm, insurance_expiry: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-200 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Last Maintenance</label>
                  <input
                    type="date"
                    value={editForm.last_maintenance}
                    onChange={(e) => setEditForm({ ...editForm, last_maintenance: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-200 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Next Maintenance</label>
                  <input
                    type="date"
                    value={editForm.next_maintenance}
                    onChange={(e) => setEditForm({ ...editForm, next_maintenance: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-200 transition-all"
                  />
                </div>

                {/* Status Toggle */}
                <div className="md:col-span-2">
                  <div className="flex items-center justify-between p-4 bg-gray-900/50 rounded-xl border border-gray-700">
                    <div className="flex items-center space-x-3">
                      <Power size={18} className={editForm.is_active ? 'text-emerald-400' : 'text-gray-500'} />
                      <div>
                        <p className="text-sm font-medium text-gray-300">Bus Status</p>
                        <p className="text-xs text-gray-500">Toggle to activate/deactivate bus</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editForm.is_active}
                        onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-800 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Notes</label>
                  <textarea
                    value={editForm.notes}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    rows="3"
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-200 placeholder-gray-500 transition-all"
                    placeholder="Additional notes about the bus..."
                  />
                </div>

                {error && (
                  <div className="md:col-span-2 bg-rose-950/30 border border-rose-800/50 rounded-xl p-4">
                    <div className="flex items-start space-x-2">
                      <AlertCircle className="text-rose-400 flex-shrink-0" size={18} />
                      <p className="text-sm text-rose-400">{error}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-700">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setError('');
                  }}
                  className="px-6 py-3 text-gray-300 bg-gray-700 rounded-xl hover:bg-gray-600 transition-all font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all font-medium shadow-lg shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Updating...</span>
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      <span>Update Bus</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Mobile Add Button */}
      <div className="fixed bottom-6 right-6 z-40 sm:hidden">
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-4 rounded-full shadow-lg hover:from-blue-700 hover:to-cyan-700 transition-all shadow-blue-600/20"
          title="Add Bus"
        >
          <Plus size={24} />
        </button>
      </div>
    </div>
  );
}