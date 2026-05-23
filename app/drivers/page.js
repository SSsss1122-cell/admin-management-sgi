'use client';

import { useState, useEffect } from 'react';
import { 
  Users, Plus, Edit, Trash2, Search, Mail, Phone, MapPin, UserPlus, 
  X, Save, ArrowLeft, Menu, LogOut, User, Key, Truck, IdCard, CreditCard, 
  Home, Bus, Award, TrendingUp, Clock, Shield, Wrench, FileText,
  MoreVertical, Eye, Printer, Download, Filter, Calendar, CheckCircle,
  AlertCircle, BarChart3, Settings, UserCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import withAuth from '../../components/withAuth';

function DriversDashboard() {
  const [drivers, setDrivers] = useState([]);
  const [buses, setBuses] = useState([]);
  const [filteredDrivers, setFilteredDrivers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingDriver, setEditingDriver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [adminName, setAdminName] = useState('');
  const [institutionId, setInstitutionId] = useState(null);
  const [stats, setStats] = useState({
    totalDrivers: 0,
    totalWithLicense: 0,
    assignedDrivers: 0,
    experiencedDrivers: 0
  });
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [showPassword, setShowPassword] = useState({});
  const [viewMode, setViewMode] = useState('grid');
  const [selectedDrivers, setSelectedDrivers] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const router = useRouter();

  const [newDriver, setNewDriver] = useState({
    name: '',
    contact: '',
    password: '',
    driver_code: '',
    license_no: '',
    address: '',
    bus_id: '',
    experience_years: '',
    license_expiry: '',
  });

  useEffect(() => {
    const storedInstitutionId = localStorage.getItem("institutionId");
    const storedAdminName = localStorage.getItem("adminName");

    if (!storedInstitutionId) {
      console.error("No institutionId found in localStorage");
      router.push("/login");
      setLoading(false);
      return;
    }

    setInstitutionId(storedInstitutionId);
    setAdminName(storedAdminName || "Admin");

    fetchDrivers(storedInstitutionId);
    fetchBuses(storedInstitutionId);
  }, []);

  // Auto-hide toast after 3 seconds
  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => {
        setToast({ show: false, message: '', type: 'success' });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast.show]);

  // Show toast helper function
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
  };

  const fetchDrivers = async (instId) => {
    try {
      setLoading(true);

      if (!instId) {
        console.error("Institution ID missing");
        return;
      }

      const cleanInstitutionId = String(instId).trim();

      const { data: driversData, error: driversError } = await supabase
        .from('drivers_new')
        .select('*')
        .eq('institution_id', cleanInstitutionId)
        .order('created_at', { ascending: false });

      if (driversError) {
        console.error(driversError);
        showToast(driversError.message, 'error');
        return;
      }

      const { data: busesData, error: busesError } = await supabase
        .from('buses')
        .select('id, bus_number, route_name')
        .eq('institution_id', cleanInstitutionId);

      if (busesError) {
        console.error("Buses fetch error:", busesError);
      }

      const mergedDrivers = (driversData || []).map(driver => ({
        ...driver,
        bus: (busesData || []).find(bus => bus.id === driver.bus_id) || null
      }));

      setDrivers(mergedDrivers);
      setFilteredDrivers(mergedDrivers);
      updateStats(mergedDrivers);

    } catch (err) {
      console.error("Unexpected error:", err);
      showToast('Error fetching drivers', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchBuses = async (instId) => {
    try {
      const { data, error } = await supabase
        .from('buses')
        .select('id, bus_number, route_name, status')
        .eq('institution_id', instId)
        .order('bus_number');

      if (error) {
        console.warn('Error fetching buses:', error);
        setBuses([]);
        return;
      }
      setBuses(data || []);
    } catch (error) {
      console.error('Error fetching buses:', error);
      setBuses([]);
    }
  };

  const updateStats = (driverData) => {
    const totalDrivers = driverData?.length || 0;
    
    const totalWithLicense = driverData?.filter(driver => 
      driver?.license_no && driver.license_no.trim() !== ''
    ).length || 0;
    
    const assignedDrivers = driverData?.filter(driver => 
      driver?.bus_id !== null && driver?.bus_id !== undefined && driver?.bus_id !== ''
    ).length || 0;
    
    const experiencedDrivers = driverData?.filter(driver => {
      const exp = parseInt(driver?.experience_years);
      return !isNaN(exp) && exp > 5;
    }).length || 0;

    setStats({
      totalDrivers,
      totalWithLicense,
      assignedDrivers,
      experiencedDrivers
    });
  };

  const filterDrivers = () => {
    if (!drivers || drivers.length === 0) {
      setFilteredDrivers([]);
      return;
    }

    let filtered = [...drivers];

    if (searchTerm && searchTerm.trim() !== '') {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(driver => 
        (driver?.name?.toLowerCase() || '').includes(searchLower) ||
        (driver?.driver_code?.toLowerCase() || '').includes(searchLower) ||
        (driver?.license_no?.toLowerCase() || '').includes(searchLower) ||
        (driver?.contact || '').includes(searchTerm) ||
        (driver?.bus?.bus_number?.toLowerCase() || '').includes(searchLower)
      );
    }

    if (filterStatus === 'assigned') {
      filtered = filtered.filter(driver => driver?.bus_id);
    } else if (filterStatus === 'unassigned') {
      filtered = filtered.filter(driver => !driver?.bus_id);
    } else if (filterStatus === 'experienced') {
      filtered = filtered.filter(driver => {
        const exp = parseInt(driver?.experience_years);
        return !isNaN(exp) && exp > 5;
      });
    }

    setFilteredDrivers(filtered);
  };

  useEffect(() => {
    filterDrivers();
  }, [searchTerm, filterStatus, drivers]);

  const handleAddDriver = async (e) => {
    e.preventDefault();
    try {
      const { data: existingDriver } = await supabase
        .from('drivers_new')
        .select('driver_code')
        .eq('driver_code', newDriver.driver_code.toUpperCase())
        .maybeSingle();

      if (existingDriver) {
        showToast('Driver code already exists. Please use a different code.', 'error');
        return;
      }

      const insertData = {
        institution_id: institutionId,
        name: newDriver.name,
        contact: newDriver.contact || null,
        password: newDriver.password,
        driver_code: newDriver.driver_code.toUpperCase(),
        license_no: newDriver.license_no || null,
        address: newDriver.address || null,
        bus_id: newDriver.bus_id || null,
        updated_at: new Date().toISOString()
      };

      if (newDriver.experience_years) {
        insertData.experience_years = newDriver.experience_years;
      }
      if (newDriver.license_expiry) {
        insertData.license_expiry = newDriver.license_expiry;
      }

      const { error } = await supabase
        .from('drivers_new')
        .insert([insertData]);

      if (error) throw error;

      showToast('Driver added successfully!', 'success');
      resetForm();
      setShowAddForm(false);
      fetchDrivers(institutionId);
      fetchBuses(institutionId);
    } catch (error) {
      console.error('Error adding driver:', error);
      showToast('Error adding driver: ' + error.message, 'error');
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
          .eq('institution_id', institutionId)
          .maybeSingle();

        if (existingDriver) {
          showToast('Driver code already exists. Please use a different code.', 'error');
          return;
        }
      }

      const updateData = {
        name: newDriver.name,
        contact: newDriver.contact || null,
        driver_code: newDriver.driver_code.toUpperCase(),
        license_no: newDriver.license_no || null,
        address: newDriver.address || null,
        bus_id: newDriver.bus_id || null,
        updated_at: new Date().toISOString()
      };

      if (newDriver.experience_years) {
        updateData.experience_years = newDriver.experience_years;
      }
      if (newDriver.license_expiry) {
        updateData.license_expiry = newDriver.license_expiry;
      }
      if (newDriver.password) {
        updateData.password = newDriver.password;
      }

      const { error } = await supabase
        .from('drivers_new')
        .update(updateData)
        .eq('id', editingDriver.id)
        .eq('institution_id', institutionId);

      if (error) throw error;

      showToast('Driver updated successfully!', 'success');
      setEditingDriver(null);
      resetForm();
      fetchDrivers(institutionId);
      fetchBuses(institutionId);
    } catch (error) {
      console.error('Error updating driver:', error);
      showToast('Error updating driver: ' + error.message, 'error');
    }
  };

  const deleteDriver = async (driverId) => {
    if (!confirm('Are you sure you want to delete this driver? This action cannot be undone.')) return;
    
    try {
      const { error } = await supabase
        .from('drivers_new')
        .delete()
        .eq('id', driverId)
        .eq('institution_id', institutionId);

      if (error) throw error;

      showToast('Driver deleted successfully!', 'success');
      fetchDrivers(institutionId);
      fetchBuses(institutionId);
    } catch (error) {
      console.error('Error deleting driver:', error);
      showToast('Error deleting driver: ' + error.message, 'error');
    }
  };

  const deleteSelectedDrivers = async () => {
    if (selectedDrivers.length === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedDrivers.length} driver(s)? This action cannot be undone.`)) return;
    
    try {
      const { error } = await supabase
        .from('drivers_new')
        .delete()
        .in('id', selectedDrivers)
        .eq('institution_id', institutionId);

      if (error) throw error;

      showToast(`${selectedDrivers.length} driver(s) deleted successfully!`, 'success');
      setSelectedDrivers([]);
      fetchDrivers(institutionId);
      fetchBuses(institutionId);
    } catch (error) {
      console.error('Error deleting drivers:', error);
      showToast('Error deleting drivers: ' + error.message, 'error');
    }
  };

  const openEditForm = (driver) => {
    if (driver.institution_id !== institutionId) return;
    setEditingDriver(driver);
    setNewDriver({
      name: driver.name || '',
      contact: driver.contact || '',
      password: '',
      driver_code: driver.driver_code || '',
      license_no: driver.license_no || '',
      address: driver.address || '',
      bus_id: driver.bus_id || '',
      experience_years: driver.experience_years || '',
      license_expiry: driver.license_expiry || '',
    });
  };

  const resetForm = () => {
    setNewDriver({
      name: '',
      contact: '',
      password: '',
      driver_code: '',
      license_no: '',
      address: '',
      bus_id: '',
      experience_years: '',
      license_expiry: '',
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

  const toggleDriverSelection = (driverId) => {
    setSelectedDrivers(prev => 
      prev.includes(driverId) 
        ? prev.filter(id => id !== driverId)
        : [...prev, driverId]
    );
  };

  const selectAllDrivers = () => {
    if (selectedDrivers.length === filteredDrivers.length && filteredDrivers.length > 0) {
      setSelectedDrivers([]);
    } else {
      setSelectedDrivers(filteredDrivers.map(d => d.id));
    }
  };

  const getLicenseStatus = (expiryDate) => {
    if (!expiryDate) return 'unknown';
    try {
      const expiry = new Date(expiryDate);
      const today = new Date();
      const threeMonths = new Date();
      threeMonths.setMonth(today.getMonth() + 3);
      
      if (expiry < today) return 'expired';
      if (expiry < threeMonths) return 'expiring';
      return 'valid';
    } catch (error) {
      return 'unknown';
    }
  };

  const exportDrivers = () => {
    if (!filteredDrivers || filteredDrivers.length === 0) {
      showToast('No drivers to export', 'error');
      return;
    }

    const headers = [
      'Driver Code', 'Name', 'Contact', 'License No', 'License Expiry',
      'Experience (Years)', 'Assigned Bus', 'Address', 'Status'
    ];
    
    const csvData = filteredDrivers.map(driver => [
      driver.driver_code || '',
      driver.name || '',
      driver.contact || '',
      driver.license_no || '',
      driver.license_expiry || '',
      driver.experience_years || '0',
      driver.bus?.bus_number || 'Not Assigned',
      driver.address || '',
      driver.bus_id ? 'Assigned' : 'Unassigned'
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `drivers_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast(`Exported ${filteredDrivers.length} drivers successfully!`, 'success');
  };

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

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
        <div className="space-y-6 lg:space-y-8">
          {/* Header */}
          <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-5 lg:p-6">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={handleBack}
                  className="p-2 text-slate-400 hover:text-blue-400 transition-all rounded-xl hover:bg-slate-800 border border-slate-700"
                >
                  <ArrowLeft size={20} />
                </button>
                <div>
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-600/20">
                      <Truck className="text-white" size={24} />
                    </div>
                    <div>
                      <h1 className="text-2xl lg:text-3xl font-bold text-white">
                        Drivers Management
                      </h1>
                      <p className="text-slate-400 text-sm mt-1">
                        Manage driver profiles and bus assignments
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="hidden sm:flex items-center gap-3 bg-slate-800 rounded-xl px-4 py-2 border border-slate-700">
                  <div className="text-right">
                    <p className="text-xs text-slate-400">Welcome,</p>
                    <p className="font-semibold text-white">{adminName || 'Admin'}</p>
                  </div>
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <User className="text-white" size={16} />
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={exportDrivers}
                    className="p-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-400 hover:text-blue-400 hover:border-blue-500/50 transition-all"
                    title="Export Drivers"
                  >
                    <Download size={18} />
                  </button>
                  
                  {selectedDrivers.length > 0 && (
                    <button
                      onClick={deleteSelectedDrivers}
                      className="flex items-center text-sm bg-red-600 text-white px-4 py-2 rounded-xl hover:bg-red-700 transition-all"
                    >
                      <Trash2 size={16} className="mr-2" />
                      Delete ({selectedDrivers.length})
                    </button>
                  )}
                  
                  <button
                    onClick={handleLogout}
                    className="flex items-center text-sm bg-red-600 text-white px-4 py-2 rounded-xl hover:bg-red-700 transition-all"
                  >
                    <LogOut size={16} className="mr-2" />
                    <span className="hidden sm:inline">Logout</span>
                  </button>
                  
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-all flex items-center"
                  >
                    <UserPlus size={16} className="mr-2" />
                    <span className="hidden sm:inline">Add Driver</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-blue-600 rounded-xl">
                  <Users className="text-white" size={18} />
                </div>
                <span className="text-xs font-medium text-blue-400 bg-blue-950/50 px-2 py-0.5 rounded-full border border-blue-800">Total</span>
              </div>
              <h3 className="text-2xl font-bold text-white">{stats.totalDrivers}</h3>
              <p className="text-xs text-slate-400">Total Drivers</p>
            </div>

            <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-cyan-600 rounded-xl">
                  <IdCard className="text-white" size={18} />
                </div>
                <span className="text-xs font-medium text-cyan-400 bg-cyan-950/50 px-2 py-0.5 rounded-full border border-cyan-800">Licensed</span>
              </div>
              <h3 className="text-2xl font-bold text-white">{stats.totalWithLicense}</h3>
              <p className="text-xs text-slate-400">With Valid License</p>
            </div>

            <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-emerald-600 rounded-xl">
                  <Bus className="text-white" size={18} />
                </div>
                <span className="text-xs font-medium text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-800">Assigned</span>
              </div>
              <h3 className="text-2xl font-bold text-white">{stats.assignedDrivers}</h3>
              <p className="text-xs text-slate-400">Assigned to Buses</p>
            </div>

            <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-amber-600 rounded-xl">
                  <Award className="text-white" size={18} />
                </div>
                <span className="text-xs font-medium text-amber-400 bg-amber-950/50 px-2 py-0.5 rounded-full border border-amber-800">Experienced</span>
              </div>
              <h3 className="text-2xl font-bold text-white">{stats.experiencedDrivers}</h3>
              <p className="text-xs text-slate-400">5+ Years Experience</p>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-5">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500" size={18} />
                <input
                  type="text"
                  placeholder="Search by name, code, license, or bus..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 text-slate-200 placeholder-slate-500"
                />
              </div>
              
              <div className="flex flex-wrap gap-3">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 text-slate-200 cursor-pointer"
                >
                  <option value="all">All Drivers</option>
                  <option value="assigned">Assigned</option>
                  <option value="unassigned">Unassigned</option>
                  <option value="experienced">Experienced</option>
                </select>

                <button
                  onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                  className="px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-slate-400 hover:text-blue-400 hover:border-blue-500 transition-all"
                >
                  {viewMode === 'grid' ? 'List View' : 'Grid View'}
                </button>
              </div>
            </div>

            {/* Quick Filters */}
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-700">
              <span className="text-xs font-medium text-slate-500 py-1">Quick filters:</span>
              <button
                onClick={() => setFilterStatus('assigned')}
                className="px-3 py-1 bg-emerald-950/50 text-emerald-400 rounded-lg text-xs font-medium hover:bg-emerald-900/50 transition-colors border border-emerald-800"
              >
                Assigned ({stats.assignedDrivers})
              </button>
              <button
                onClick={() => setFilterStatus('unassigned')}
                className="px-3 py-1 bg-amber-950/50 text-amber-400 rounded-lg text-xs font-medium hover:bg-amber-900/50 transition-colors border border-amber-800"
              >
                Unassigned ({stats.totalDrivers - stats.assignedDrivers})
              </button>
              <button
                onClick={() => setFilterStatus('experienced')}
                className="px-3 py-1 bg-blue-950/50 text-blue-400 rounded-lg text-xs font-medium hover:bg-blue-900/50 transition-colors border border-blue-800"
              >
                Experienced ({stats.experiencedDrivers})
              </button>
              {selectedDrivers.length > 0 && (
                <button
                  onClick={deleteSelectedDrivers}
                  className="px-3 py-1 bg-red-950/50 text-red-400 rounded-lg text-xs font-medium hover:bg-red-900/50 transition-colors border border-red-800 ml-auto"
                >
                  Delete Selected ({selectedDrivers.length})
                </button>
              )}
            </div>
          </div>

          {/* Grid View */}
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredDrivers && filteredDrivers.length > 0 ? (
                filteredDrivers.map((driver) => {
                  const licenseStatus = getLicenseStatus(driver?.license_expiry);
                  return (
                    <div
                      key={driver.id}
                      className="bg-slate-800/50 rounded-2xl border border-slate-700 hover:border-blue-500/30 transition-all overflow-hidden"
                    >
                      <div className={`h-1 ${driver?.bus_id ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                      <div className="p-5">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                              <UserCircle className="text-white" size={24} />
                            </div>
                            <div>
                              <h3 className="font-semibold text-white">{driver?.name || 'N/A'}</h3>
                              <p className="text-xs text-slate-500">{driver?.driver_code || 'No Code'}</p>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <button 
                              onClick={() => openEditForm(driver)}
                              className="p-1.5 text-blue-400 hover:bg-blue-600/20 rounded-lg transition-colors"
                              title="Edit Driver"
                            >
                              <Edit size={14} />
                            </button>
                            <button 
                              onClick={() => deleteDriver(driver.id)}
                              className="p-1.5 text-red-400 hover:bg-red-600/20 rounded-lg transition-colors"
                              title="Delete Driver"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        {driver?.license_expiry && (
                          <div className={`mb-3 inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border ${
                            licenseStatus === 'valid' ? 'bg-emerald-950/50 text-emerald-400 border-emerald-800' :
                            licenseStatus === 'expiring' ? 'bg-amber-950/50 text-amber-400 border-amber-800' :
                            licenseStatus === 'expired' ? 'bg-red-950/50 text-red-400 border-red-800' :
                            'bg-slate-800 text-slate-400 border-slate-700'
                          }`}>
                            <Shield size={10} />
                            License {licenseStatus === 'valid' ? 'Valid' : licenseStatus === 'expiring' ? 'Expiring Soon' : licenseStatus === 'expired' ? 'Expired' : 'Unknown'}
                          </div>
                        )}

                        <div className="space-y-3 mb-4">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="flex items-center gap-2 text-sm">
                              <IdCard size={14} className="text-slate-500" />
                              <span className="text-slate-400">{driver?.license_no || 'No License'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <Phone size={14} className="text-slate-500" />
                              <span className="text-slate-400">{driver?.contact || 'N/A'}</span>
                            </div>
                          </div>

                          {driver?.bus ? (
                            <div className="flex items-center gap-2 text-sm p-2 bg-emerald-950/30 rounded-lg border border-emerald-800">
                              <Bus size={14} className="text-emerald-400" />
                              <span className="text-emerald-400 font-medium">{driver.bus.bus_number}</span>
                              <span className="text-slate-400 text-xs ml-auto">{driver.bus.route_name || 'No Route'}</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-sm p-2 bg-slate-900 rounded-lg border border-slate-700">
                              <Bus size={14} className="text-slate-500" />
                              <span className="text-slate-500">Not Assigned to Bus</span>
                            </div>
                          )}

                          {driver?.experience_years && (
                            <div className="flex items-center gap-2 text-sm">
                              <Award size={14} className="text-slate-500" />
                              <span className="text-slate-400">{driver.experience_years} years experience</span>
                            </div>
                          )}

                          {driver?.address && (
                            <div className="flex items-center gap-2 text-sm">
                              <Home size={14} className="text-slate-500" />
                              <span className="text-slate-400 truncate">{driver.address}</span>
                            </div>
                          )}

                          <div className="flex items-center gap-2 text-sm pt-2 border-t border-slate-700">
                            <Key size={14} className="text-slate-500" />
                            <span className="text-slate-400">
                              {showPassword[driver.id] ? driver.password || 'Not set' : '••••••••'}
                            </span>
                            <button
                              onClick={() => togglePasswordVisibility(driver.id)}
                              className="ml-auto text-xs text-blue-400 hover:text-blue-300"
                            >
                              {showPassword[driver.id] ? 'Hide' : 'Show'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-full text-center py-12 bg-slate-800/50 rounded-2xl border border-slate-700">
                  <div className="w-20 h-20 bg-slate-700/50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-600">
                    <Truck className="text-slate-500" size={32} />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">No Drivers Found</h3>
                  <p className="text-slate-400 mb-4">Try adjusting your search or filter criteria</p>
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setFilterStatus('all');
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Clear Filters
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* List View */
            <div className="bg-slate-800/50 rounded-2xl border border-slate-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-900 border-b border-slate-700">
                      <th className="px-5 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={selectedDrivers.length === filteredDrivers.length && filteredDrivers.length > 0}
                          onChange={selectAllDrivers}
                          disabled={!filteredDrivers || filteredDrivers.length === 0}
                          className="rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-0 disabled:opacity-50"
                        />
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Driver</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">License</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Contact</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Assigned Bus</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Experience</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Password</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {filteredDrivers && filteredDrivers.length > 0 ? (
                      filteredDrivers.map((driver) => {
                        const licenseStatus = getLicenseStatus(driver?.license_expiry);
                        return (
                          <tr key={driver.id} className="hover:bg-slate-700/30 transition-colors">
                            <td className="px-5 py-3">
                              <input
                                type="checkbox"
                                checked={selectedDrivers.includes(driver.id)}
                                onChange={() => toggleDriverSelection(driver.id)}
                                className="rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                              />
                            </td>
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                                  <User className="text-white" size={14} />
                                </div>
                                <div>
                                  <p className="font-medium text-white">{driver?.name || 'N/A'}</p>
                                  <p className="text-xs text-slate-500">{driver?.driver_code || 'No Code'}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-3">
                              <div className="flex flex-col">
                                <span className="text-sm text-slate-300">{driver?.license_no || 'N/A'}</span>
                                {driver?.license_expiry && (
                                  <span className={`text-xs ${
                                    licenseStatus === 'valid' ? 'text-emerald-400' :
                                    licenseStatus === 'expiring' ? 'text-amber-400' :
                                    licenseStatus === 'expired' ? 'text-red-400' :
                                    'text-slate-500'
                                  }`}>
                                    Exp: {new Date(driver.license_expiry).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-5 py-3">
                              <div className="text-sm text-slate-300">{driver?.contact || 'N/A'}</div>
                            </td>
                            <td className="px-5 py-3">
                              {driver?.bus ? (
                                <div className="flex items-center">
                                  <Bus size={14} className="mr-1 text-emerald-400" />
                                  <span className="text-sm font-medium text-emerald-400">{driver.bus.bus_number}</span>
                                </div>
                              ) : (
                                <span className="text-sm text-slate-500">Not Assigned</span>
                              )}
                            </td>
                            <td className="px-5 py-3">
                              <span className="text-sm text-slate-300">
                                {driver?.experience_years ? `${driver.experience_years} years` : 'N/A'}
                              </span>
                            </td>
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2">
                                <Key size={14} className="text-slate-500" />
                                <span className="text-sm text-slate-300">
                                  {showPassword[driver.id] ? driver.password || 'Not set' : '••••••••'}
                                </span>
                                <button
                                  onClick={() => togglePasswordVisibility(driver.id)}
                                  className="text-xs text-blue-400 hover:text-blue-300"
                                >
                                  {showPassword[driver.id] ? 'Hide' : 'Show'}
                                </button>
                              </div>
                            </td>
                            <td className="px-5 py-3">
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => openEditForm(driver)}
                                  className="p-1.5 text-blue-400 hover:bg-blue-600/20 rounded-lg transition-colors"
                                  title="Edit"
                                >
                                  <Edit size={14} />
                                </button>
                                <button 
                                  onClick={() => deleteDriver(driver.id)}
                                  className="p-1.5 text-red-400 hover:bg-red-600/20 rounded-lg transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="8" className="px-5 py-12 text-center">
                          <div className="flex flex-col items-center justify-center">
                            <Truck className="text-slate-600 mb-3" size={40} />
                            <p className="text-slate-400">No drivers found</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Driver Modal */}
      {(showAddForm || editingDriver) && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-slate-800 border-b border-slate-700 px-6 py-4 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-xl">
                  {editingDriver ? <Edit className="text-white" size={20} /> : <UserPlus className="text-white" size={20} />}
                </div>
                <h3 className="text-xl font-bold text-white">
                  {editingDriver ? 'Edit Driver' : 'Add New Driver'}
                </h3>
              </div>
              <button 
                onClick={() => {
                  setShowAddForm(false);
                  setEditingDriver(null);
                  resetForm();
                }}
                className="p-2 text-slate-400 hover:text-slate-300 hover:bg-slate-700 rounded-lg transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={editingDriver ? handleEditDriver : handleAddDriver} className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-2">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={newDriver.name}
                    onChange={(e) => setNewDriver(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 text-slate-200 placeholder-slate-500"
                    placeholder="Enter driver's full name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Driver Code *</label>
                  <input
                    type="text"
                    required
                    value={newDriver.driver_code}
                    onChange={(e) => setNewDriver(prev => ({ ...prev, driver_code: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 text-slate-200 placeholder-slate-500"
                    placeholder="e.g., DRV001"
                  />
                  <p className="text-xs text-slate-500 mt-1">Must be unique</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">License Number</label>
                  <input
                    type="text"
                    value={newDriver.license_no}
                    onChange={(e) => setNewDriver(prev => ({ ...prev, license_no: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 text-slate-200 placeholder-slate-500"
                    placeholder="Enter license number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Contact Number</label>
                  <input
                    type="tel"
                    value={newDriver.contact}
                    onChange={(e) => setNewDriver(prev => ({ ...prev, contact: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 text-slate-200 placeholder-slate-500"
                    placeholder="Enter phone number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Experience (Years)</label>
                  <input
                    type="number"
                    value={newDriver.experience_years}
                    onChange={(e) => setNewDriver(prev => ({ ...prev, experience_years: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 text-slate-200 placeholder-slate-500"
                    placeholder="Years of experience"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">License Expiry Date</label>
                  <input
                    type="date"
                    value={newDriver.license_expiry}
                    onChange={(e) => setNewDriver(prev => ({ ...prev, license_expiry: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 text-slate-200"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-2">Address</label>
                  <textarea
                    value={newDriver.address}
                    onChange={(e) => setNewDriver(prev => ({ ...prev, address: e.target.value }))}
                    rows="2"
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 text-slate-200 placeholder-slate-500"
                    placeholder="Enter complete address"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    <Bus size={16} className="inline mr-1 text-blue-400" />
                    Assign Bus (Optional)
                  </label>
                  <select
                    value={newDriver.bus_id}
                    onChange={(e) => setNewDriver(prev => ({ ...prev, bus_id: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 text-slate-200"
                  >
                    <option value="">No Bus Assigned</option>
                    {buses && buses.map(bus => {
                      const isAssigned = drivers.some(d => 
                        d?.bus_id === bus.id && 
                        (!editingDriver || d.id !== editingDriver?.id)
                      );
                      return (
                        <option 
                          key={bus.id} 
                          value={bus.id}
                          disabled={isAssigned}
                          className={isAssigned ? 'text-slate-500' : ''}
                        >
                          {bus.bus_number} - {bus.route_name || 'No Route'} {bus.status ? `(${bus.status})` : ''}
                          {isAssigned ? ' (Already Assigned)' : ''}
                        </option>
                      );
                    })}
                  </select>
                  <p className="text-xs text-slate-500 mt-1">Each bus can be assigned to only one driver</p>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Password {!editingDriver && '*'}
                    {editingDriver && <span className="text-xs text-slate-500 ml-2">(Leave blank to keep current)</span>}
                  </label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" size={16} />
                    <input
                      type="password"
                      required={!editingDriver}
                      value={newDriver.password}
                      onChange={(e) => setNewDriver(prev => ({ ...prev, password: e.target.value }))}
                      className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 text-slate-200 placeholder-slate-500"
                      placeholder={editingDriver ? "Enter new password (optional)" : "Enter driver password"}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingDriver(null);
                    resetForm();
                  }}
                  className="px-6 py-3 text-slate-300 bg-slate-700 rounded-xl hover:bg-slate-600 transition-all font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-medium"
                >
                  <Save size={16} className="inline mr-2" />
                  {editingDriver ? 'Update Driver' : 'Add Driver'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Mobile Add Button */}
      <div className="fixed bottom-6 right-6 z-40 sm:hidden">
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-all"
          title="Add Driver"
        >
          <Plus size={24} />
        </button>
      </div>

      {/* Toast Notification Component */}
      {toast.show && (
        <div className="fixed top-5 right-5 z-50 animate-slide-in">
          <div className={`flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl border-l-4 ${
            toast.type === 'success' 
              ? 'bg-emerald-900/95 border-emerald-500 text-emerald-200' 
              : 'bg-red-900/95 border-red-500 text-red-200'
          } backdrop-blur-sm`}>
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
      `}</style>
    </div>
  );
}

export default withAuth(DriversDashboard);