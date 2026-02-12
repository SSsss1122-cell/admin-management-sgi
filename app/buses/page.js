'use client';

import { useState, useEffect } from 'react';
import { 
  Plus, Edit, Trash2, Search, X, Save, ArrowLeft, Menu, LogOut, User,
  BusFront, Truck, UserPlus, RefreshCw
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';

export default function BusesDashboard() {
  const [buses, setBuses] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [filteredBuses, setFilteredBuses] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingBus, setEditingBus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [adminName, setAdminName] = useState('');
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [assigningDriver, setAssigningDriver] = useState(null);

  const router = useRouter();

  const [newBus, setNewBus] = useState({
    bus_number: '',
    route_name: '',
    driver_id: ''
  });

  useEffect(() => {
    fetchBuses();
    fetchDrivers();
    const storedAdminName = localStorage.getItem('adminName');
    if (storedAdminName) {
      setAdminName(storedAdminName);
    }
  }, []);

  useEffect(() => {
    filterBuses();
  }, [buses, searchTerm]);

  const fetchBuses = async () => {
    try {
      const { data, error } = await supabase
        .from('buses')
        .select(`
          *,
          driver:drivers(id, name, driver_code, contact)
        `)
        .order('bus_number');

      if (error) throw error;
      setBuses(data || []);
    } catch (error) {
      console.error('Error fetching buses:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDrivers = async () => {
    try {
      const { data, error } = await supabase
        .from('drivers')
        .select('id, name, driver_code, contact')
        .order('name');

      if (error) throw error;
      setDrivers(data || []);
    } catch (error) {
      console.error('Error fetching drivers:', error);
    }
  };

  const filterBuses = () => {
    let filtered = buses;

    if (searchTerm) {
      filtered = filtered.filter(bus =>
        bus.bus_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bus.route_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bus.driver?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bus.driver?.driver_code?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredBuses(filtered);
  };

  const handleAddBus = async (e) => {
    e.preventDefault();
    try {
      const { data: existingBus } = await supabase
        .from('buses')
        .select('bus_number')
        .eq('bus_number', newBus.bus_number.toUpperCase())
        .maybeSingle();

      if (existingBus) {
        alert('Bus number already exists. Please use a different number.');
        return;
      }

      const { error } = await supabase
        .from('buses')
        .insert([{
          bus_number: newBus.bus_number.toUpperCase(),
          route_name: newBus.route_name,
          driver_id: newBus.driver_id || null
        }]);

      if (error) throw error;

      alert('Bus added successfully!');
      setNewBus({ bus_number: '', route_name: '', driver_id: '' });
      setShowAddForm(false);
      fetchBuses();
    } catch (error) {
      console.error('Error adding bus:', error);
      alert('Error adding bus: ' + error.message);
    }
  };

  const handleAssignDriver = async (busId, driverId) => {
    try {
      const { error } = await supabase
        .from('buses')
        .update({ driver_id: driverId || null })
        .eq('id', busId);

      if (error) throw error;

      alert(driverId ? 'Driver assigned successfully!' : 'Driver unassigned successfully!');
      setAssigningDriver(null);
      fetchBuses();
    } catch (error) {
      console.error('Error assigning driver:', error);
      alert('Error assigning driver: ' + error.message);
    }
  };

  const deleteBus = async (busId) => {
    if (!confirm('Are you sure you want to delete this bus? This action cannot be undone.')) return;
    
    try {
      const { error } = await supabase
        .from('buses')
        .delete()
        .eq('id', busId);

      if (error) throw error;

      alert('Bus deleted successfully!');
      fetchBuses();
    } catch (error) {
      console.error('Error deleting bus:', error);
      alert('Error deleting bus: ' + error.message);
    }
  };

  const openEditForm = (bus) => {
    setEditingBus(bus);
    setNewBus({
      bus_number: bus.bus_number || '',
      route_name: bus.route_name || '',
      driver_id: bus.driver_id || ''
    });
  };

  const handleEditBus = async (e) => {
    e.preventDefault();
    try {
      if (newBus.bus_number.toUpperCase() !== editingBus.bus_number) {
        const { data: existingBus } = await supabase
          .from('buses')
          .select('bus_number')
          .eq('bus_number', newBus.bus_number.toUpperCase())
          .maybeSingle();

        if (existingBus) {
          alert('Bus number already exists. Please use a different number.');
          return;
        }
      }

      const { error } = await supabase
        .from('buses')
        .update({
          bus_number: newBus.bus_number.toUpperCase(),
          route_name: newBus.route_name,
          driver_id: newBus.driver_id || null
        })
        .eq('id', editingBus.id);

      if (error) throw error;

      alert('Bus updated successfully!');
      setEditingBus(null);
      setNewBus({ bus_number: '', route_name: '', driver_id: '' });
      fetchBuses();
    } catch (error) {
      console.error('Error updating bus:', error);
      alert('Error updating bus: ' + error.message);
    }
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

  const getAvailableDrivers = () => {
    // Get drivers that are not assigned to any bus OR are the current driver of this bus
    const assignedDriverIds = buses
      .filter(bus => bus.driver_id && (!assigningDriver || bus.id !== assigningDriver.id))
      .map(bus => bus.driver_id);
    
    return drivers.filter(driver => !assignedDriverIds.includes(driver.id));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
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
              <button
                onClick={handleBack}
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors p-2 rounded-lg hover:bg-gray-100"
                title="Go back to Main Dashboard"
              >
                <ArrowLeft size={20} />
                <span className="hidden sm:block ml-2 text-sm font-medium">Back to Home</span>
              </button>
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Bus Management</h1>
                <p className="text-gray-600 text-xs sm:text-sm mt-1">Manage buses and driver assignments</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm text-gray-600">Welcome,</p>
                  <p className="font-semibold text-gray-900">{adminName || 'Admin'}</p>
                </div>
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <User className="text-green-600" size={16} />
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={handleLogout}
                  className="flex items-center text-sm bg-red-500 text-white px-3 py-2 rounded-lg hover:bg-red-600 transition-colors"
                  title="Logout"
                >
                  <LogOut size={16} className="mr-2" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
                
                <button
                  onClick={() => setShowAddForm(true)}
                  className="hidden sm:flex bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors items-center"
                >
                  <UserPlus size={16} className="mr-2" />
                  Add Bus
                </button>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="sm:hidden bg-green-600 text-white p-3 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center"
                  title="Add Bus"
                >
                  <Plus size={20} />
                </button>
              </div>
            </div>
          </div>

          {/* Stats Cards - Simple */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Total Buses</p>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900">{buses.length}</p>
                </div>
                <BusFront className="text-green-400" size={28} />
              </div>
            </div>
            <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Assigned Buses</p>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900">
                    {buses.filter(bus => bus.driver_id).length}
                  </p>
                </div>
                <Truck className="text-purple-400" size={28} />
              </div>
            </div>
            <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Available Drivers</p>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900">
                    {drivers.length - buses.filter(bus => bus.driver_id).length}
                  </p>
                </div>
                <User className="text-blue-400" size={28} />
              </div>
            </div>
          </div>

          {/* Search Filter */}
          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-4 border border-gray-200">
            <button
              onClick={() => setIsFiltersOpen(!isFiltersOpen)}
              className="lg:hidden w-full flex items-center justify-between p-2 bg-gray-50 rounded-lg mb-3"
            >
              <span className="text-sm font-medium text-gray-700">Search Buses</span>
              <Menu size={16} className={`transform transition-transform ${isFiltersOpen ? 'rotate-180' : ''}`} />
            </button>

            <div className={`${isFiltersOpen ? 'block' : 'hidden'} lg:block`}>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      type="text"
                      placeholder="Search by bus number, route, or driver..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500 text-gray-900 bg-white text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Buses List - Focus on Driver Assignment */}
          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                Bus Fleet <span className="text-green-600">({filteredBuses.length})</span>
              </h3>
            </div>
            
            {/* Mobile Card View */}
            <div className="lg:hidden">
              {filteredBuses.length === 0 ? (
                <div className="text-center py-8">
                  <BusFront className="mx-auto text-gray-400 mb-3" size={40} />
                  <h3 className="text-base font-semibold text-gray-900 mb-1">No Buses Found</h3>
                  <p className="text-gray-600 text-sm">Add a new bus to get started</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {filteredBuses.map((bus) => (
                    <div key={bus.id} className="p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-semibold text-gray-900 text-lg">{bus.bus_number}</h4>
                          <p className="text-gray-600 text-sm">{bus.route_name || 'No route specified'}</p>
                        </div>
                        <div className="flex space-x-1">
                          <button 
                            onClick={() => openEditForm(bus)}
                            className="text-blue-600 hover:text-blue-900 p-2"
                            title="Edit Bus"
                          >
                            <Edit size={16} />
                          </button>
                          <button 
                            onClick={() => deleteBus(bus.id)}
                            className="text-red-600 hover:text-red-900 p-2"
                            title="Delete Bus"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      
                      {/* Current Driver */}
                      <div className="bg-gray-50 rounded-lg p-3 mb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <Truck size={16} className="text-gray-500 mr-2" />
                            <span className="font-medium text-gray-700">Current Driver:</span>
                          </div>
                          {bus.driver ? (
                            <div className="text-right">
                              <p className="font-medium text-gray-900">{bus.driver.name}</p>
                              <p className="text-xs text-gray-500">{bus.driver.driver_code}</p>
                            </div>
                          ) : (
                            <span className="text-gray-500 italic">Unassigned</span>
                          )}
                        </div>
                      </div>

                      {/* Assign Driver Section */}
                      {assigningDriver?.id === bus.id ? (
                        <div className="border border-green-200 rounded-lg p-3 bg-green-50">
                          <p className="text-sm font-medium text-green-800 mb-2">Select Driver</p>
                          <select
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500 text-gray-900 bg-white text-sm mb-2"
                            onChange={(e) => {
                              handleAssignDriver(bus.id, e.target.value);
                            }}
                            defaultValue={bus.driver_id || ''}
                          >
                            <option value="">Unassign Driver</option>
                            {getAvailableDrivers().map(driver => (
                              <option key={driver.id} value={driver.id}>
                                {driver.name} - {driver.driver_code} {driver.contact ? `(${driver.contact})` : ''}
                              </option>
                            ))}
                            {/* Include current driver in the list */}
                            {bus.driver_id && !getAvailableDrivers().find(d => d.id === bus.driver_id) && (
                              <option value={bus.driver_id} selected>
                                {bus.driver.name} - {bus.driver.driver_code} (Current)
                              </option>
                            )}
                          </select>
                          <button
                            onClick={() => setAssigningDriver(null)}
                            className="text-xs text-gray-600 hover:text-gray-800"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setAssigningDriver(bus)}
                          className="w-full flex items-center justify-center space-x-2 bg-green-100 text-green-700 hover:bg-green-200 px-3 py-2 rounded-lg transition-colors text-sm"
                        >
                          <RefreshCw size={14} />
                          <span>{bus.driver_id ? 'Change Driver' : 'Assign Driver'}</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bus Number</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Route</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current Driver</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Driver Contact</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredBuses.map((bus) => (
                    <tr key={bus.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{bus.bus_number}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{bus.route_name || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {bus.driver ? (
                          <div className="text-sm">
                            <div className="font-medium text-gray-900">{bus.driver.name}</div>
                            <div className="text-xs text-gray-500">{bus.driver.driver_code}</div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {bus.driver?.contact || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-3">
                          {/* Driver Assignment Dropdown */}
                          <select
                            className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500 text-gray-900 bg-white text-sm max-w-[200px]"
                            onChange={(e) => handleAssignDriver(bus.id, e.target.value)}
                            value={bus.driver_id || ''}
                          >
                            <option value="">Unassign Driver</option>
                            {drivers.map(driver => {
                              // Check if driver is already assigned to another bus
                              const isAssignedToOther = buses.some(b => 
                                b.driver_id === driver.id && b.id !== bus.id
                              );
                              return (
                                <option 
                                  key={driver.id} 
                                  value={driver.id}
                                  disabled={isAssignedToOther && bus.driver_id !== driver.id}
                                  className={isAssignedToOther ? 'text-gray-400' : ''}
                                >
                                  {driver.name} - {driver.driver_code}
                                  {isAssignedToOther ? ' (Already Assigned)' : ''}
                                  {bus.driver_id === driver.id ? ' (Current)' : ''}
                                </option>
                              );
                            })}
                          </select>
                          
                          <div className="flex space-x-1">
                            <button 
                              onClick={() => openEditForm(bus)}
                              className="text-blue-600 hover:text-blue-900 p-1"
                              title="Edit Bus"
                            >
                              <Edit size={16} />
                            </button>
                            <button 
                              onClick={() => deleteBus(bus.id)}
                              className="text-red-600 hover:text-red-900 p-1"
                              title="Delete Bus"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Floating Mobile Add Button */}
        <div className="fixed bottom-6 right-6 z-40 sm:hidden">
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-green-600 text-white p-4 rounded-full shadow-lg hover:bg-green-700 transition-colors flex items-center justify-center"
            title="Add Bus"
          >
            <Plus size={24} />
          </button>
        </div>
      </div>

      {/* Add/Edit Bus Modal - Simplified */}
      {(showAddForm || editingBus) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[95vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 sm:px-6 sm:py-4 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingBus ? 'Edit Bus' : 'Add New Bus'}
              </h3>
              <button 
                onClick={() => {
                  setShowAddForm(false);
                  setEditingBus(null);
                  setNewBus({ bus_number: '', route_name: '', driver_id: '' });
                }}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={editingBus ? handleEditBus : handleAddBus} className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bus Number *</label>
                <input
                  type="text"
                  required
                  value={newBus.bus_number}
                  onChange={(e) => setNewBus(prev => ({ ...prev, bus_number: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500 text-gray-900 bg-white text-sm"
                  placeholder="e.g., BUS001"
                />
                <p className="text-xs text-gray-500 mt-1">Must be unique</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Route Name</label>
                <input
                  type="text"
                  value={newBus.route_name}
                  onChange={(e) => setNewBus(prev => ({ ...prev, route_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500 text-gray-900 bg-white text-sm"
                  placeholder="e.g., City Route - North"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assign Driver (Optional)</label>
                <select
                  value={newBus.driver_id}
                  onChange={(e) => setNewBus(prev => ({ ...prev, driver_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500 text-gray-900 bg-white text-sm"
                >
                  <option value="">Unassigned</option>
                  {drivers.map(driver => {
                    // Check if driver is already assigned to another bus
                    const isAssignedToOther = buses.some(b => 
                      b.driver_id === driver.id && (!editingBus || b.id !== editingBus.id)
                    );
                    return (
                      <option 
                        key={driver.id} 
                        value={driver.id}
                        disabled={isAssignedToOther}
                        className={isAssignedToOther ? 'text-gray-400' : ''}
                      >
                        {driver.name} - {driver.driver_code}
                        {isAssignedToOther ? ' (Already Assigned)' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingBus(null);
                    setNewBus({ bus_number: '', route_name: '', driver_id: '' });
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg w-full sm:w-auto text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center w-full sm:w-auto text-sm"
                >
                  <Save size={16} className="mr-2" />
                  {editingBus ? 'Update Bus' : 'Add Bus'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}