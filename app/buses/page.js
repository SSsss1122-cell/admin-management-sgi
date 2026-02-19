'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Bus, ArrowLeft, Search, Loader2, Plus, 
  X, Save, AlertCircle, Edit, Trash2,
  Power, PowerOff
} from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function BusesPage() {
  const router = useRouter();
  const [buses, setBuses] = useState([]);
  const [filteredBuses, setFilteredBuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Add bus modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newBus, setNewBus] = useState({
    bus_number: '',
    route_name: '',
    is_active: true // Default to active
  });
  
  // Edit bus modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingBus, setEditingBus] = useState(null);
  const [editForm, setEditForm] = useState({
    id: '',
    bus_number: '',
    route_name: '',
    is_active: true
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchBuses();
  }, []);

  useEffect(() => {
    filterBuses();
  }, [searchTerm, buses]);

  const fetchBuses = async () => {
    try {
      const { data, error } = await supabase
        .from('buses')
        .select('id, bus_number, route_name, is_active')
        .order('bus_number');

      if (error) throw error;
      setBuses(data || []);
      setFilteredBuses(data || []);
    } catch (error) {
      console.error('Error fetching buses:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterBuses = () => {
    if (!searchTerm.trim()) {
      setFilteredBuses(buses);
      return;
    }

    const filtered = buses.filter(bus =>
      bus.bus_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bus.route_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
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
          is_active: newBus.is_active
        }]);

      if (error) throw error;

      // Reset and close modal
      setNewBus({ bus_number: '', route_name: '', is_active: true });
      setShowAddModal(false);
      
      // Refresh list
      await fetchBuses();

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
      bus_number: bus.bus_number,
      route_name: bus.route_name || '',
      is_active: bus.is_active
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
          is_active: editForm.is_active
        })
        .eq('id', editForm.id);

      if (error) throw error;

      setShowEditModal(false);
      await fetchBuses();

    } catch (error) {
      console.error('Error updating bus:', error);
      setError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // TOGGLE ACTIVE STATUS
  const handleToggleActive = async (bus) => {
    try {
      const newStatus = !bus.is_active;
      
      const { error } = await supabase
        .from('buses')
        .update({ is_active: newStatus })
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
    if (!confirm(`Are you sure you want to delete Bus ${busNumber}?`)) return;

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

  const goBack = () => {
    router.back();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading buses...</p>
        </div>
      </div>
    );
  }

  // Count active and inactive buses
  const activeCount = buses.filter(b => b.is_active).length;
  const inactiveCount = buses.filter(b => !b.is_active).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={goBack}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors mr-3"
              >
                <ArrowLeft className="text-gray-600" size={20} />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Buses</h1>
                <p className="text-sm text-gray-500">
                  Total {buses.length} buses 
                  <span className="ml-2 text-green-600">● {activeCount} active</span>
                  <span className="ml-2 text-gray-400">○ {inactiveCount} inactive</span>
                </p>
              </div>
            </div>
            
            {/* Add Bus Button */}
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <Plus size={18} />
              <span className="hidden sm:inline">Add Bus</span>
            </button>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search by bus number or route..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900"
          />
        </div>
      </div>

      {/* Buses List */}
      <div className="max-w-4xl mx-auto px-4 pb-8">
        {filteredBuses.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm">
            <Bus className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No buses found</h3>
            <p className="text-gray-500 mb-4">Try adjusting your search or add a new bus</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg inline-flex items-center space-x-2"
            >
              <Plus size={18} />
              <span>Add Your First Bus</span>
            </button>
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredBuses.map((bus) => (
              <div
                key={bus.id}
                className={`bg-white rounded-xl shadow-sm border ${
                  bus.is_active ? 'border-gray-200' : 'border-gray-200 bg-gray-50'
                } p-4 hover:shadow-md transition-shadow`}
              >
                <div className="flex items-start">
                  <div className={`p-3 rounded-xl mr-4 ${
                    bus.is_active ? 'bg-blue-100' : 'bg-gray-200'
                  }`}>
                    <Bus className={bus.is_active ? 'text-blue-600' : 'text-gray-500'} size={24} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center mb-1">
                      <h3 className="text-lg font-semibold text-gray-900 mr-3">
                        Bus {bus.bus_number}
                      </h3>
                      {/* Status Badge */}
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        bus.is_active 
                          ? 'bg-green-100 text-green-800 border border-green-200' 
                          : 'bg-gray-100 text-gray-600 border border-gray-200'
                      }`}>
                        {bus.is_active ? (
                          <>
                            <Power size={12} className="mr-1" />
                            Active
                          </>
                        ) : (
                          <>
                            <PowerOff size={12} className="mr-1" />
                            Inactive
                          </>
                        )}
                      </span>
                    </div>
                    <p className="text-gray-600">
                      {bus.route_name || 'No route assigned'}
                    </p>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex items-center space-x-2 ml-4">
                    {/* Toggle Active Status Button */}
                    <button
                      onClick={() => handleToggleActive(bus)}
                      className={`p-2 rounded-lg transition-colors ${
                        bus.is_active 
                          ? 'text-green-600 hover:bg-green-50' 
                          : 'text-gray-500 hover:bg-gray-100'
                      }`}
                      title={bus.is_active ? 'Deactivate Bus' : 'Activate Bus'}
                    >
                      {bus.is_active ? <Power size={18} /> : <PowerOff size={18} />}
                    </button>
                    
                    {/* Edit Button */}
                    <button
                      onClick={() => openEditModal(bus)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit Bus"
                    >
                      <Edit size={18} />
                    </button>
                    
                    {/* Delete Button */}
                    <button
                      onClick={() => handleDeleteBus(bus.id, bus.bus_number)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Bus"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Bus Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="bg-white/20 p-2 rounded-lg">
                    <Bus className="text-white" size={20} />
                  </div>
                  <h2 className="text-lg font-semibold text-white">Add New Bus</h2>
                </div>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleAddBus} className="p-5">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bus Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newBus.bus_number}
                    onChange={(e) => setNewBus({ ...newBus, bus_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900 bg-white"
                    placeholder="e.g., BUS001"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Route Name
                  </label>
                  <input
                    type="text"
                    value={newBus.route_name}
                    onChange={(e) => setNewBus({ ...newBus, route_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900 bg-white"
                    placeholder="e.g., City Route - North"
                  />
                </div>

                {/* Active Status Toggle in Add Modal */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Power size={18} className={newBus.is_active ? 'text-green-600' : 'text-gray-400'} />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Active Status</p>
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
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-start space-x-2">
                      <AlertCircle className="text-red-500 flex-shrink-0" size={18} />
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setError('');
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-green-600 to-teal-600 p-4 rounded-t-xl">
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
            <form onSubmit={handleEditBus} className="p-5">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bus Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editForm.bus_number}
                    onChange={(e) => setEditForm({ ...editForm, bus_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-gray-900 bg-white"
                    placeholder="e.g., BUS001"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Route Name
                  </label>
                  <input
                    type="text"
                    value={editForm.route_name}
                    onChange={(e) => setEditForm({ ...editForm, route_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-gray-900 bg-white"
                    placeholder="e.g., City Route - North"
                  />
                </div>

                {/* Active Status Toggle in Edit Modal */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Power size={18} className={editForm.is_active ? 'text-green-600' : 'text-gray-400'} />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Active Status</p>
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
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                  </label>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-start space-x-2">
                      <AlertCircle className="text-red-500 flex-shrink-0" size={18} />
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setError('');
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
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
    </div>
  );
}