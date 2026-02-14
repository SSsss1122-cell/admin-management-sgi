'use client';

import { useState, useEffect } from 'react';
import { 
  Users, Plus, Edit, Trash2, Search, Mail, Phone, MapPin, 
  UserPlus, X, Save, ArrowLeft, Menu, LogOut, User, Key, 
  Truck, IdCard, Home, BusFront, RefreshCw, Eye, EyeOff,
  Shield, Settings, Download, Upload, Filter
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';

export default function DriversDashboard() {
  const [drivers, setDrivers] = useState([]);
  const [buses, setBuses] = useState([]);
  const [filteredDrivers, setFilteredDrivers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingDriver, setEditingDriver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [adminName, setAdminName] = useState('');
  const [stats, setStats] = useState({
    totalDrivers: 0,
    assignedDrivers: 0,
    availableDrivers: 0,
    totalBuses: 0,
    busesWithDrivers: 0
  });
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [showPassword, setShowPassword] = useState({});
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const router = useRouter();

  const [newDriver, setNewDriver] = useState({
    name: '',
    contact: '',
    password: '',
    driver_code: '',
    license_no: '',
    address: '',
    bus_id: ''
  });

  useEffect(() => {
    fetchDrivers();
    fetchBuses();
    const storedAdminName = localStorage.getItem('adminName');
    if (storedAdminName) {
      setAdminName(storedAdminName);
    }
  }, []);

  useEffect(() => {
    filterDrivers();
  }, [drivers, searchTerm, filterStatus]);

  const fetchDrivers = async () => {
    try {
      const { data, error } = await supabase
        .from('drivers_new')
        .select(`
          *,
          bus:buses!drivers_new_bus_id_fkey (
            id,
            bus_number,
            route_name
          )
        `)
        .order('name');

      if (error) throw error;
      setDrivers(data || []);
      updateStats(data || []);
    } catch (error) {
      console.error('Error fetching drivers:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBuses = async () => {
    try {
      const { data, error } = await supabase
        .from('buses')
        .select('id, bus_number, route_name')
        .order('bus_number');

      if (error) throw error;
      setBuses(data || []);
    } catch (error) {
      console.error('Error fetching buses:', error);
    }
  };

  const updateStats = (driverData) => {
    const totalDrivers = driverData.length;
    const assignedDrivers = driverData.filter(driver => driver.bus_id).length;
    const availableDrivers = totalDrivers - assignedDrivers;
    
    const uniqueBusesWithDrivers = new Set(
      driverData.filter(d => d.bus_id).map(d => d.bus_id)
    ).size;

    setStats({
      totalDrivers,
      assignedDrivers,
      availableDrivers,
      totalBuses: buses.length,
      busesWithDrivers: uniqueBusesWithDrivers
    });
  };

  const filterDrivers = () => {
    let filtered = drivers;

    if (searchTerm) {
      filtered = filtered.filter(driver =>
        driver.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        driver.driver_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        driver.license_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        driver.contact?.includes(searchTerm) ||
        driver.bus?.bus_number?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterStatus === 'assigned') {
      filtered = filtered.filter(driver => driver.bus_id);
    } else if (filterStatus === 'unassigned') {
      filtered = filtered.filter(driver => !driver.bus_id);
    }

    setFilteredDrivers(filtered);
  };

  // Get ALL buses - no restrictions
  const getAllBuses = () => {
    return buses;
  };

  // Get driver count for a bus
  const getDriverCountForBus = (busId) => {
    return drivers.filter(d => d.bus_id === busId).length;
  };

  const handleAddDriver = async (e) => {
    e.preventDefault();
    try {
      const { data: existingDriver } = await supabase
        .from('drivers_new')
        .select('driver_code')
        .eq('driver_code', newDriver.driver_code.toUpperCase())
        .maybeSingle();

      if (existingDriver) {
        alert('Driver code already exists. Please use a different code.');
        return;
      }

      // ✅ MULTIPLE DRIVERS ALLOWED - No bus uniqueness check
      const { data, error } = await supabase
        .from('drivers_new')
        .insert([{
          name: newDriver.name,
          contact: newDriver.contact,
          password: newDriver.password,
          driver_code: newDriver.driver_code.toUpperCase(),
          license_no: newDriver.license_no,
          address: newDriver.address,
          bus_id: newDriver.bus_id || null
        }])
        .select();

      if (error) throw error;

      alert('Driver added successfully!');
      resetForm();
      setShowAddForm(false);
      fetchDrivers();
      fetchBuses();
    } catch (error) {
      console.error('Error adding driver:', error);
      alert('Error adding driver: ' + error.message);
    }
  };

  const handleEditDriver = async (e) => {
    e.preventDefault();
    try {
      if (newDriver.driver_code.toUpperCase() !== editingDriver.driver_code) {
        const { data: existingDriver } = await supabase
          .from('drivers_new')
          .select('driver_code')
          .eq('driver_code', newDriver.driver_code.toUpperCase())
          .maybeSingle();

        if (existingDriver) {
          alert('Driver code already exists.');
          return;
        }
      }

      // ✅ MULTIPLE DRIVERS ALLOWED - No bus uniqueness check
      const updateData = {
        name: newDriver.name,
        contact: newDriver.contact,
        driver_code: newDriver.driver_code.toUpperCase(),
        license_no: newDriver.license_no,
        address: newDriver.address,
        bus_id: newDriver.bus_id || null
      };

      if (newDriver.password) {
        updateData.password = newDriver.password;
      }

      const { error } = await supabase
        .from('drivers_new')
        .update(updateData)
        .eq('id', editingDriver.id);

      if (error) throw error;

      alert('Driver updated successfully!');
      setEditingDriver(null);
      resetForm();
      fetchDrivers();
    } catch (error) {
      console.error('Error updating driver:', error);
      alert('Error updating driver: ' + error.message);
    }
  };

  // Quick assign - no restrictions
  const handleQuickAssign = async (driverId, busId) => {
    try {
      const { error } = await supabase
        .from('drivers_new')
        .update({ bus_id: busId || null })
        .eq('id', driverId);

      if (error) throw error;

      alert(busId ? 'Bus assigned successfully!' : 'Bus unassigned successfully!');
      fetchDrivers();
    } catch (error) {
      console.error('Error assigning bus:', error);
      alert('Error assigning bus: ' + error.message);
    }
  };

  const deleteDriver = async (driverId) => {
    if (!confirm('Are you sure you want to delete this driver? This action cannot be undone.')) return;
    
    try {
      const { error } = await supabase
        .from('drivers_new')
        .delete()
        .eq('id', driverId);

      if (error) throw error;

      alert('Driver deleted successfully!');
      fetchDrivers();
    } catch (error) {
      console.error('Error deleting driver:', error);
      alert('Error deleting driver: ' + error.message);
    }
  };

  const openEditForm = (driver) => {
    setEditingDriver(driver);
    setNewDriver({
      name: driver.name || '',
      contact: driver.contact || '',
      password: '',
      driver_code: driver.driver_code || '',
      license_no: driver.license_no || '',
      address: driver.address || '',
      bus_id: driver.bus_id || ''
    });
  };

  const viewDriverDetails = (driver) => {
    setSelectedDriver(driver);
    setShowDetailsModal(true);
  };

  const resetForm = () => {
    setNewDriver({
      name: '',
      contact: '',
      password: '',
      driver_code: '',
      license_no: '',
      address: '',
      bus_id: ''
    });
  };

  const handleBack = () => {
    router.push('/home');
  };

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('adminMobile');
    localStorage.removeItem('adminName');
    router.push('/login');
  };

  const togglePasswordVisibility = (driverId) => {
    setShowPassword(prev => ({
      ...prev,
      [driverId]: !prev[driverId]
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 lg:py-8">
        <div className="space-y-4 lg:space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center gap-3">
              <button
                onClick={handleBack}
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors p-2 rounded-lg hover:bg-gray-100"
                title="Go back to Main Dashboard"
              >
                <ArrowLeft size={20} />
                <span className="hidden sm:block ml-2 text-sm font-medium text-gray-700">Dashboard</span>
              </button>
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
                  <Shield className="inline mr-2 text-purple-600" size={28} />
                  Drivers Management
                </h1>
                <p className="text-gray-600 text-xs sm:text-sm mt-1">
                  Multiple drivers can share the same bus ✓
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-3 bg-purple-50 px-4 py-2 rounded-lg">
                <div className="text-right">
                  <p className="text-xs text-gray-600">Administrator</p>
                  <p className="font-semibold text-gray-900">
                    {adminName || 'Super Admin'}
                  </p>
                </div>
                <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
                  <Shield className="text-white" size={20} />
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={handleLogout}
                  className="flex items-center text-sm bg-red-500 text-white px-3 py-2 rounded-lg hover:bg-red-600 transition-colors"
                >
                  <LogOut size={16} className="mr-2" />
                  <span className="hidden sm:inline text-white">Logout</span>
                </button>
                
                <button
                  onClick={() => setShowAddForm(true)}
                  className="hidden sm:flex bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors items-center"
                >
                  <UserPlus size={16} className="mr-2 text-white" />
                  <span className="text-white">Add Driver</span>
                </button>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="sm:hidden bg-purple-600 text-white p-3 rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <Plus size={20} className="text-white" />
                </button>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
            <StatCard 
              label="Total Drivers" 
              value={stats.totalDrivers} 
              icon={Users} 
              color="purple" 
            />
            <StatCard 
              label="Assigned" 
              value={stats.assignedDrivers} 
              icon={Truck} 
              color="green" 
            />
            <StatCard 
              label="Available" 
              value={stats.availableDrivers} 
              icon={User} 
              color="blue" 
            />
            <StatCard 
              label="Total Buses" 
              value={stats.totalBuses} 
              icon={BusFront} 
              color="orange" 
            />
            <StatCard 
              label="Buses with Drivers" 
              value={stats.busesWithDrivers} 
              icon={Users2} 
              color="indigo" 
            />
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    placeholder="Search drivers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500 text-gray-900"
                  />
                </div>
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500 text-gray-900"
              >
                <option value="all" className="text-gray-900">All Drivers</option>
                <option value="assigned" className="text-gray-900">With Bus</option>
                <option value="unassigned" className="text-gray-900">Without Bus</option>
              </select>
            </div>
          </div>

          {/* Drivers Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Drivers List ({filteredDrivers.length})
              </h3>
            </div>

            {/* Mobile View */}
            <div className="lg:hidden">
              {filteredDrivers.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="mx-auto text-gray-400 mb-3" size={48} />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Drivers Found</h3>
                  <p className="text-gray-600">Click "Add Driver" to get started</p>
                </div>
              ) : (
                filteredDrivers.map((driver) => (
                  <div key={driver.id} className="p-4 border-b hover:bg-gray-50">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-semibold text-gray-900">{driver.name}</h4>
                        <p className="text-sm text-gray-600">{driver.driver_code}</p>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => openEditForm(driver)} className="p-1 text-blue-600 hover:text-blue-800">
                          <Edit size={16} />
                        </button>
                        <button onClick={() => deleteDriver(driver.id)} className="p-1 text-red-600 hover:text-red-800">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Bus Assignment */}
                    <div className="mt-3 bg-purple-50 p-3 rounded-lg">
                      <label className="block text-sm font-medium text-purple-700 mb-2">
                        <BusFront size={14} className="inline mr-1" />
                        Assign Bus
                      </label>
                      <select
                        className="w-full px-3 py-2 border border-purple-200 rounded-lg text-gray-900"
                        onChange={(e) => handleQuickAssign(driver.id, e.target.value)}
                        value={driver.bus_id || ''}
                      >
                        <option value="" className="text-gray-900">— No Bus —</option>
                        {buses.map(bus => {
                          const driverCount = drivers.filter(d => d.bus_id === bus.id).length;
                          return (
                            <option key={bus.id} value={bus.id} className="text-gray-900">
                              {bus.bus_number} - {bus.route_name || 'No Route'} 
                              {driverCount > 0 ? ` (${driverCount} driver${driverCount > 1 ? 's' : ''})` : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    {/* Other details */}
                    <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500">License:</span>{' '}
                        <span className="text-gray-900">{driver.license_no || '—'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Contact:</span>{' '}
                        <span className="text-gray-900">{driver.contact || '—'}</span>
                      </div>
                    </div>
                    
                    {driver.address && (
                      <div className="mt-1 text-xs text-gray-600">
                        <Home size={12} className="inline mr-1" />
                        {driver.address}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Desktop Table View */}
            <table className="hidden lg:table w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">License</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigned Bus</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredDrivers.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                      No drivers found
                    </td>
                  </tr>
                ) : (
                  filteredDrivers.map((driver) => (
                    <tr key={driver.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-900">{driver.driver_code}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{driver.name}</div>
                        {driver.address && (
                          <div className="text-xs text-gray-500 flex items-center mt-1">
                            <Home size={10} className="mr-1" />
                            {driver.address.substring(0, 30)}...
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-900">{driver.license_no || '—'}</td>
                      <td className="px-4 py-3 text-gray-900">{driver.contact || '—'}</td>
                      
                      {/* Bus Assignment Dropdown */}
                      <td className="px-4 py-3">
                        <select
                          className="w-48 px-2 py-1.5 border border-gray-300 rounded-lg text-gray-900"
                          onChange={(e) => handleQuickAssign(driver.id, e.target.value)}
                          value={driver.bus_id || ''}
                        >
                          <option value="" className="text-gray-900">— Not Assigned —</option>
                          {buses.map(bus => {
                            const driverCount = drivers.filter(d => d.bus_id === bus.id).length;
                            const isCurrent = driver.bus_id === bus.id;
                            
                            return (
                              <option key={bus.id} value={bus.id} className="text-gray-900">
                                {bus.bus_number} - {bus.route_name || 'No Route'}
                                {driverCount > 0 ? ` (${driverCount} driver${driverCount > 1 ? 's' : ''})` : ''}
                                {isCurrent ? ' (Current)' : ''}
                              </option>
                            );
                          })}
                        </select>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button 
                            onClick={() => openEditForm(driver)}
                            className="text-blue-600 hover:text-blue-900 p-1"
                            title="Edit"
                          >
                            <Edit size={16} />
                          </button>
                          <button 
                            onClick={() => viewDriverDetails(driver)}
                            className="text-purple-600 hover:text-purple-900 p-1"
                            title="View Details"
                          >
                            <Eye size={16} />
                          </button>
                          <button 
                            onClick={() => deleteDriver(driver.id)}
                            className="text-red-600 hover:text-red-900 p-1"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {(showAddForm || editingDriver) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                {editingDriver ? 'Edit Driver' : 'Add New Driver'}
              </h3>
              
              <form onSubmit={editingDriver ? handleEditDriver : handleAddDriver}>
                {/* Form fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                    <input
                      type="text"
                      required
                      value={newDriver.name}
                      onChange={(e) => setNewDriver({...newDriver, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Driver Code *</label>
                    <input
                      type="text"
                      required
                      value={newDriver.driver_code}
                      onChange={(e) => setNewDriver({...newDriver, driver_code: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">License</label>
                    <input
                      type="text"
                      value={newDriver.license_no}
                      onChange={(e) => setNewDriver({...newDriver, license_no: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact</label>
                    <input
                      type="text"
                      value={newDriver.contact}
                      onChange={(e) => setNewDriver({...newDriver, contact: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                    />
                  </div>
                  
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                    <textarea
                      value={newDriver.address}
                      onChange={(e) => setNewDriver({...newDriver, address: e.target.value})}
                      rows="2"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                    />
                  </div>
                  
                  {/* Bus Assignment */}
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <BusFront size={16} className="inline mr-1" />
                      Assign Bus (Optional)
                    </label>
                    <select
                      value={newDriver.bus_id}
                      onChange={(e) => setNewDriver({...newDriver, bus_id: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                    >
                      <option value="" className="text-gray-900">— No Bus —</option>
                      {buses.map(bus => {
                        const driverCount = drivers.filter(d => d.bus_id === bus.id).length;
                        return (
                          <option key={bus.id} value={bus.id} className="text-gray-900">
                            {bus.bus_number} - {bus.route_name || 'No Route'}
                            {driverCount > 0 ? ` (${driverCount} driver${driverCount > 1 ? 's' : ''})` : ''}
                          </option>
                        );
                      })}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Multiple drivers can share the same bus
                    </p>
                  </div>
                  
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password {!editingDriver && '*'}
                    </label>
                    <input
                      type="password"
                      required={!editingDriver}
                      value={newDriver.password}
                      onChange={(e) => setNewDriver({...newDriver, password: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                      placeholder={editingDriver ? "Leave blank to keep current" : "Enter password"}
                    />
                  </div>
                </div>
                
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false);
                      setEditingDriver(null);
                      resetForm();
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >
                    {editingDriver ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Driver Details Modal */}
      {showDetailsModal && selectedDriver && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-lg w-full">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-gray-900">Driver Details</h3>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-purple-50 rounded-lg">
                  <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center">
                    <User className="text-white" size={32} />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg text-gray-900">{selectedDriver.name}</h4>
                    <p className="text-sm text-gray-600">Code: {selectedDriver.driver_code}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">Contact</p>
                    <p className="font-medium text-gray-900">{selectedDriver.contact || '—'}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">License</p>
                    <p className="font-medium text-gray-900">{selectedDriver.license_no || '—'}</p>
                  </div>
                </div>

                {selectedDriver.bus && (
                  <div className="p-4 bg-green-50 rounded-lg">
                    <p className="text-sm font-medium text-green-700 mb-2">Assigned Bus</p>
                    <div className="flex justify-between">
                      <span className="text-lg font-bold text-gray-900">{selectedDriver.bus.bus_number}</span>
                      <span className="text-sm text-gray-600">{selectedDriver.bus.route_name || 'No Route'}</span>
                    </div>
                  </div>
                )}

                {selectedDriver.address && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">Address</p>
                    <p className="text-sm text-gray-900">{selectedDriver.address}</p>
                  </div>
                )}

                <div className="text-xs text-gray-400 pt-2 border-t">
                  Created: {new Date(selectedDriver.created_at).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Stat Card Component
function StatCard({ label, value, icon: Icon, color }) {
  const colors = {
    purple: 'text-purple-600 bg-purple-100',
    green: 'text-green-600 bg-green-100',
    blue: 'text-blue-600 bg-blue-100',
    orange: 'text-orange-600 bg-orange-100',
    indigo: 'text-indigo-600 bg-indigo-100'
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${colors[color]}`}>
          <Icon size={20} className={color === 'purple' ? 'text-purple-600' : 
                                         color === 'green' ? 'text-green-600' :
                                         color === 'blue' ? 'text-blue-600' :
                                         color === 'orange' ? 'text-orange-600' :
                                         'text-indigo-600'} />
        </div>
      </div>
    </div>
  );
}

// Users2 Icon for stats
function Users2(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 19a6 6 0 0 0-12 0" />
      <circle cx="8" cy="9" r="4" />
      <path d="M22 19a6 6 0 0 0-6-6 4 4 0 1 0 0-8" />
    </svg>
  );
}