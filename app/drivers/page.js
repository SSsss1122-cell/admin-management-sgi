'use client';

import { useState, useEffect } from 'react';
import { Users, Plus, Edit, Trash2, Search, Mail, Phone, MapPin, UserPlus, X, Save, ArrowLeft, Menu, LogOut, User, Key, Truck, IdCard, CreditCard, Home } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';

export default function DriversDashboard() {
  const [drivers, setDrivers] = useState([]);
  const [filteredDrivers, setFilteredDrivers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingDriver, setEditingDriver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [adminName, setAdminName] = useState('');
  const [stats, setStats] = useState({
    totalDrivers: 0,
    totalWithLicense: 0
  });
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [showPassword, setShowPassword] = useState({});

  const router = useRouter();

  const [newDriver, setNewDriver] = useState({
    name: '',
    contact: '',
    password: '',
    driver_code: '',
    license_no: '',
    address: ''
  });

  useEffect(() => {
    fetchDrivers();
    // Get admin name from localStorage
    const storedAdminName = localStorage.getItem('adminName');
    if (storedAdminName) {
      setAdminName(storedAdminName);
    }
  }, []);

  useEffect(() => {
    filterDrivers();
  }, [drivers, searchTerm]);

  const fetchDrivers = async () => {
    try {
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
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

  const updateStats = (driverData) => {
    const totalDrivers = driverData.length;
    const totalWithLicense = driverData.filter(driver => driver.license_no).length;

    setStats({
      totalDrivers,
      totalWithLicense
    });
  };

  const filterDrivers = () => {
    let filtered = drivers;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(driver =>
        driver.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        driver.driver_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        driver.license_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        driver.contact?.includes(searchTerm)
      );
    }

    setFilteredDrivers(filtered);
  };

  const handleAddDriver = async (e) => {
    e.preventDefault();
    try {
      // Check if driver code already exists
      const { data: existingDriver } = await supabase
        .from('drivers')
        .select('driver_code')
        .eq('driver_code', newDriver.driver_code.toUpperCase())
        .maybeSingle();

      if (existingDriver) {
        alert('Driver code already exists. Please use a different code.');
        return;
      }

      const { data, error } = await supabase
        .from('drivers')
        .insert([{
          name: newDriver.name,
          contact: newDriver.contact,
          password: newDriver.password,
          driver_code: newDriver.driver_code.toUpperCase(),
          license_no: newDriver.license_no,
          address: newDriver.address,
          updated_at: new Date().toISOString()
        }])
        .select();

      if (error) throw error;

      alert('Driver added successfully!');
      setNewDriver({
        name: '',
        contact: '',
        password: '',
        driver_code: '',
        license_no: '',
        address: ''
      });
      setShowAddForm(false);
      fetchDrivers();
    } catch (error) {
      console.error('Error adding driver:', error);
      alert('Error adding driver: ' + error.message);
    }
  };

  const handleEditDriver = async (e) => {
    e.preventDefault();
    try {
      // Check if driver code is being changed and if it's already taken
      if (newDriver.driver_code.toUpperCase() !== editingDriver.driver_code) {
        const { data: existingDriver } = await supabase
          .from('drivers')
          .select('driver_code')
          .eq('driver_code', newDriver.driver_code.toUpperCase())
          .maybeSingle();

        if (existingDriver) {
          alert('Driver code already exists. Please use a different code.');
          return;
        }
      }

      const updateData = {
        name: newDriver.name,
        contact: newDriver.contact,
        driver_code: newDriver.driver_code.toUpperCase(),
        license_no: newDriver.license_no,
        address: newDriver.address,
        updated_at: new Date().toISOString()
      };

      // Only update password if it's not empty
      if (newDriver.password) {
        updateData.password = newDriver.password;
      }

      const { error } = await supabase
        .from('drivers')
        .update(updateData)
        .eq('id', editingDriver.id);

      if (error) throw error;

      alert('Driver updated successfully!');
      setEditingDriver(null);
      setNewDriver({
        name: '',
        contact: '',
        password: '',
        driver_code: '',
        license_no: '',
        address: ''
      });
      fetchDrivers();
    } catch (error) {
      console.error('Error updating driver:', error);
      alert('Error updating driver: ' + error.message);
    }
  };

  const deleteDriver = async (driverId) => {
    if (!confirm('Are you sure you want to delete this driver? This action cannot be undone.')) return;
    
    try {
      const { error } = await supabase
        .from('drivers')
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
      password: '', // Don't pre-fill password for security
      driver_code: driver.driver_code || '',
      license_no: driver.license_no || '',
      address: driver.address || ''
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
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center gap-3">
              {/* Back Button */}
              <button
                onClick={handleBack}
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors p-2 rounded-lg hover:bg-gray-100"
                title="Go back to Main Dashboard"
              >
                <ArrowLeft size={20} />
                <span className="hidden sm:block ml-2 text-sm font-medium">Back to Home</span>
              </button>
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Drivers Management</h1>
                <p className="text-gray-600 text-xs sm:text-sm mt-1">Manage all bus drivers and their information</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Admin Info and Logout */}
              <div className="hidden sm:flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm text-gray-600">Welcome,</p>
                  <p className="font-semibold text-gray-900">
                    {adminName || 'Admin'}
                  </p>
                </div>
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <User className="text-purple-600" size={16} />
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  className="flex items-center text-sm bg-red-500 text-white px-3 py-2 rounded-lg hover:bg-red-600 transition-colors"
                  title="Logout"
                >
                  <LogOut size={16} className="mr-2" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
                
                {/* Desktop Add Driver Button with Text */}
                <button
                  onClick={() => setShowAddForm(true)}
                  className="hidden sm:flex bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors items-center"
                >
                  <UserPlus size={16} className="mr-2" />
                  Add Driver
                </button>
                {/* Mobile Add Button with + Icon */}
                <button
                  onClick={() => setShowAddForm(true)}
                  className="sm:hidden bg-purple-600 text-white p-3 rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center"
                  title="Add Driver"
                >
                  <Plus size={20} />
                </button>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Total Drivers</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.totalDrivers}</p>
                </div>
                <Truck className="text-purple-400" size={20} />
              </div>
            </div>
            <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-600">With License</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.totalWithLicense}</p>
                </div>
                <IdCard className="text-green-400" size={20} />
              </div>
            </div>
          </div>

          {/* Search Filter */}
          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-4 border border-gray-200">
            <button
              onClick={() => setIsFiltersOpen(!isFiltersOpen)}
              className="lg:hidden w-full flex items-center justify-between p-2 bg-gray-50 rounded-lg mb-3"
            >
              <span className="text-sm font-medium text-gray-700">Search Drivers</span>
              <Menu size={16} className={`transform transition-transform ${isFiltersOpen ? 'rotate-180' : ''}`} />
            </button>

            <div className={`${isFiltersOpen ? 'block' : 'hidden'} lg:block`}>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      type="text"
                      placeholder="Search by name, driver code, license no, or phone..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500 text-gray-900 bg-white text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Drivers Table - Mobile Optimized */}
          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                All Drivers <span className="text-purple-600">({filteredDrivers.length})</span>
              </h3>
            </div>
            <div className="overflow-x-auto">
              {/* Mobile Card View */}
              <div className="lg:hidden">
                {filteredDrivers.length === 0 ? (
                  <div className="text-center py-8">
                    <Truck className="mx-auto text-gray-400 mb-3" size={40} />
                    <h3 className="text-base font-semibold text-gray-900 mb-1">No Drivers Found</h3>
                    <p className="text-gray-600 text-sm">Try adjusting your search criteria</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {filteredDrivers.map((driver) => (
                      <div key={driver.id} className="p-4 hover:bg-gray-50">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 text-base">{driver.name}</h4>
                            <p className="text-gray-600 text-sm">{driver.driver_code || 'No Code'}</p>
                          </div>
                          <div className="flex space-x-1 ml-2">
                            <button 
                              onClick={() => openEditForm(driver)}
                              className="text-purple-600 hover:text-purple-900 p-1"
                              title="Edit Driver"
                            >
                              <Edit size={16} />
                            </button>
                            <button 
                              onClick={() => deleteDriver(driver.id)}
                              className="text-red-600 hover:text-red-900 p-1"
                              title="Delete Driver"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">License:</span> {driver.license_no || 'N/A'}
                          </div>
                          <div>
                            <span className="font-medium">Code:</span> {driver.driver_code || 'N/A'}
                          </div>
                          {driver.contact && (
                            <div className="flex items-center col-span-2">
                              <Phone size={12} className="mr-1" />
                              {driver.contact}
                            </div>
                          )}
                          {driver.address && (
                            <div className="flex items-center col-span-2">
                              <Home size={12} className="mr-1" />
                              <span className="truncate">{driver.address}</span>
                            </div>
                          )}
                          {/* Password Field - Mobile */}
                          <div className="flex items-center col-span-2 mt-1 border-t pt-1 border-gray-100">
                            <Key size={12} className="mr-1 text-gray-500" />
                            <span className="font-medium text-gray-700 mr-1">Password:</span>
                            <span className="text-gray-600">
                              {showPassword[driver.id] ? driver.password || 'Not set' : '••••••••'}
                            </span>
                            <button
                              onClick={() => togglePasswordVisibility(driver.id)}
                              className="ml-1 text-purple-600 hover:text-purple-800 text-xs"
                            >
                              {showPassword[driver.id] ? 'Hide' : 'Show'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Desktop Table View */}
              <table className="hidden lg:table w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Driver Code</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">License No</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Password</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredDrivers.map((driver) => (
                    <tr key={driver.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{driver.driver_code || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{driver.name}</div>
                        {driver.address && (
                          <div className="text-xs text-gray-500 flex items-center mt-1">
                            <Home size={10} className="mr-1" />
                            {driver.address}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {driver.license_no || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {driver.contact ? (
                            <div className="flex items-center">
                              <Phone size={12} className="mr-1" />
                              {driver.contact}
                            </div>
                          ) : 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          <Key size={14} className="mr-1 text-gray-500" />
                          <span>
                            {showPassword[driver.id] ? driver.password || 'Not set' : '••••••••'}
                          </span>
                          <button
                            onClick={() => togglePasswordVisibility(driver.id)}
                            className="ml-2 text-purple-600 hover:text-purple-800 text-xs font-medium"
                          >
                            {showPassword[driver.id] ? 'Hide' : 'Show'}
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => openEditForm(driver)}
                            className="text-purple-600 hover:text-purple-900 p-1"
                            title="Edit Driver"
                          >
                            <Edit size={16} />
                          </button>
                          <button 
                            onClick={() => deleteDriver(driver.id)}
                            className="text-red-600 hover:text-red-900 p-1"
                            title="Delete Driver"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredDrivers.length === 0 && (
              <div className="hidden lg:block text-center py-12">
                <Truck className="mx-auto text-gray-400 mb-4" size={48} />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Drivers Found</h3>
                <p className="text-gray-600">Try adjusting your search criteria or add a new driver.</p>
              </div>
            )}
          </div>
        </div>

        {/* Floating Mobile Add Button */}
        <div className="fixed bottom-6 right-6 z-40 sm:hidden">
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-purple-600 text-white p-4 rounded-full shadow-lg hover:bg-purple-700 transition-colors flex items-center justify-center"
            title="Add Driver"
          >
            <Plus size={24} />
          </button>
        </div>
      </div>

      {/* Add/Edit Driver Modal - Mobile Optimized */}
      {(showAddForm || editingDriver) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[95vh] overflow-y-auto">
            {/* Sticky Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 sm:px-6 sm:py-4 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingDriver ? 'Edit Driver' : 'Add New Driver'}
              </h3>
              <button 
                onClick={() => {
                  setShowAddForm(false);
                  setEditingDriver(null);
                  setNewDriver({
                    name: '',
                    contact: '',
                    password: '',
                    driver_code: '',
                    license_no: '',
                    address: ''
                  });
                }}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={editingDriver ? handleEditDriver : handleAddDriver} className="p-4 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={newDriver.name}
                    onChange={(e) => setNewDriver(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500 text-gray-900 bg-white text-sm"
                    placeholder="Enter driver's full name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Driver Code *</label>
                  <input
                    type="text"
                    required
                    value={newDriver.driver_code}
                    onChange={(e) => setNewDriver(prev => ({ ...prev, driver_code: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500 text-gray-900 bg-white text-sm"
                    placeholder="e.g., DRV001"
                  />
                  <p className="text-xs text-gray-500 mt-1">Must be unique</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">License Number</label>
                  <input
                    type="text"
                    value={newDriver.license_no}
                    onChange={(e) => setNewDriver(prev => ({ ...prev, license_no: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500 text-gray-900 bg-white text-sm"
                    placeholder="Enter license number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number</label>
                  <input
                    type="tel"
                    value={newDriver.contact}
                    onChange={(e) => setNewDriver(prev => ({ ...prev, contact: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500 text-gray-900 bg-white text-sm"
                    placeholder="Enter phone number"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <textarea
                    value={newDriver.address}
                    onChange={(e) => setNewDriver(prev => ({ ...prev, address: e.target.value }))}
                    rows="2"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500 text-gray-900 bg-white text-sm"
                    placeholder="Enter complete address"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password {!editingDriver && '*'}
                    {editingDriver && <span className="text-xs text-gray-500 ml-2">(Leave blank to keep current password)</span>}
                  </label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      type="password"
                      required={!editingDriver}
                      value={newDriver.password}
                      onChange={(e) => setNewDriver(prev => ({ ...prev, password: e.target.value }))}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500 text-gray-900 bg-white text-sm"
                      placeholder={editingDriver ? "Enter new password (optional)" : "Enter driver password"}
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingDriver(null);
                    setNewDriver({
                      name: '',
                      contact: '',
                      password: '',
                      driver_code: '',
                      license_no: '',
                      address: ''
                    });
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg w-full sm:w-auto text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center w-full sm:w-auto text-sm"
                >
                  <Save size={16} className="mr-2" />
                  {editingDriver ? 'Update Driver' : 'Add Driver'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}