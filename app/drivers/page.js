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
    emergency_contact: '',
    blood_group: ''
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

  // 🔥 FIXED: Added error handling for missing columns and table structure
  const fetchDrivers = async () => {
    try {
      // First, check if the drivers_new table exists and get its structure
      const { data: tableInfo, error: tableError } = await supabase
        .from('drivers_new')
        .select('*')
        .limit(1);

      if (tableError) {
        console.error('Table error:', tableError);
        // If table doesn't exist, set empty array and return
        setDrivers([]);
        updateStats([]);
        setLoading(false);
        return;
      }

      // Try to fetch with bus relation - if it fails, fetch without relation
      let data;
      try {
        const { data: driversData, error } = await supabase
          .from('drivers_new')
          .select(`
            *,
            bus:buses!drivers_new_bus_id_fkey (
              id,
              bus_number,
              route_name,
              capacity
            )
          `)
          .order('name');

        if (error) throw error;
        data = driversData;
      } catch (relationError) {
        console.warn('Bus relation fetch failed, fetching without relation:', relationError);
        // Fallback: fetch drivers without bus relation
        const { data: driversData, error } = await supabase
          .from('drivers_new')
          .select('*')
          .order('name');

        if (error) throw error;
        data = driversData;
      }

      setDrivers(data || []);
      updateStats(data || []);
    } catch (error) {
      console.error('Error fetching drivers:', error);
      setDrivers([]);
      updateStats([]);
    } finally {
      setLoading(false);
    }
  };

  // 🔥 FIXED: Added error handling for buses table
  const fetchBuses = async () => {
    try {
      const { data, error } = await supabase
        .from('buses')
        .select('id, bus_number, route_name, capacity, status')
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

  // 🔥 FIXED: Added null checks for all stats calculations
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

    // Apply search filter
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

    // Apply status filter
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

  const handleAddDriver = async (e) => {
    e.preventDefault();
    try {
      // Check if driver code already exists
      const { data: existingDriver } = await supabase
        .from('drivers_new')
        .select('driver_code')
        .eq('driver_code', newDriver.driver_code.toUpperCase())
        .maybeSingle();

      if (existingDriver) {
        alert('Driver code already exists. Please use a different code.');
        return;
      }

      // Prepare insert data - only include fields that exist in the table
      const insertData = {
        name: newDriver.name,
        contact: newDriver.contact || null,
        password: newDriver.password,
        driver_code: newDriver.driver_code.toUpperCase(),
        license_no: newDriver.license_no || null,
        address: newDriver.address || null,
        bus_id: newDriver.bus_id || null,
        updated_at: new Date().toISOString()
      };

      // Only add optional fields if they exist in the table structure
      // You may need to adjust these based on your actual table schema
      if (newDriver.experience_years) {
        insertData.experience_years = newDriver.experience_years;
      }
      if (newDriver.license_expiry) {
        insertData.license_expiry = newDriver.license_expiry;
      }
      if (newDriver.emergency_contact) {
        insertData.emergency_contact = newDriver.emergency_contact;
      }
      if (newDriver.blood_group) {
        insertData.blood_group = newDriver.blood_group;
      }

      const { data, error } = await supabase
        .from('drivers_new')
        .insert([insertData])
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
      // Check if driver code is being changed and if it's already taken
      if (newDriver.driver_code.toUpperCase() !== editingDriver.driver_code) {
        const { data: existingDriver } = await supabase
          .from('drivers_new')
          .select('driver_code')
          .eq('driver_code', newDriver.driver_code.toUpperCase())
          .maybeSingle();

        if (existingDriver) {
          alert('Driver code already exists. Please use a different code.');
          return;
        }
      }

      // Prepare update data
      const updateData = {
        name: newDriver.name,
        contact: newDriver.contact || null,
        driver_code: newDriver.driver_code.toUpperCase(),
        license_no: newDriver.license_no || null,
        address: newDriver.address || null,
        bus_id: newDriver.bus_id || null,
        updated_at: new Date().toISOString()
      };

      // Only update optional fields if they have values
      if (newDriver.experience_years) {
        updateData.experience_years = newDriver.experience_years;
      }
      if (newDriver.license_expiry) {
        updateData.license_expiry = newDriver.license_expiry;
      }
      if (newDriver.emergency_contact) {
        updateData.emergency_contact = newDriver.emergency_contact;
      }
      if (newDriver.blood_group) {
        updateData.blood_group = newDriver.blood_group;
      }

      // Only update password if it's not empty
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
      fetchBuses();
    } catch (error) {
      console.error('Error updating driver:', error);
      alert('Error updating driver: ' + error.message);
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
      fetchBuses();
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
      bus_id: driver.bus_id || '',
      experience_years: driver.experience_years || '',
      license_expiry: driver.license_expiry || '',
      emergency_contact: driver.emergency_contact || '',
      blood_group: driver.blood_group || ''
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
      emergency_contact: '',
      blood_group: ''
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
    if (selectedDrivers.length === filteredDrivers.length) {
      setSelectedDrivers([]);
    } else {
      setSelectedDrivers(filteredDrivers.map(d => d.id));
    }
  };

  const getBusNumber = (busId) => {
    if (!busId || !buses) return null;
    const bus = buses.find(b => b.id === busId);
    return bus ? bus.bus_number : null;
  };

  // 🔥 FIXED: Added null checks for license expiry
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
      alert('No drivers to export');
      return;
    }

    const headers = [
      'Driver Code', 'Name', 'Contact', 'License No', 'License Expiry',
      'Experience (Years)', 'Blood Group', 'Emergency Contact',
      'Assigned Bus', 'Address', 'Status'
    ];
    
    const csvData = filteredDrivers.map(driver => [
      driver.driver_code || '',
      driver.name || '',
      driver.contact || '',
      driver.license_no || '',
      driver.license_expiry || '',
      driver.experience_years || '0',
      driver.blood_group || '',
      driver.emergency_contact || '',
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
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-700 border-t-purple-500"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-8 w-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Dark decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-purple-600/10 to-pink-600/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-blue-600/10 to-cyan-600/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-amber-600/5 to-orange-600/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
        <div className="space-y-6 lg:space-y-8">
          {/* Dark Header */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBack}
                className="group flex items-center text-gray-400 hover:text-purple-400 transition-all p-2 rounded-xl hover:bg-gray-800/50 backdrop-blur-sm border border-gray-800 hover:border-purple-500/30"
              >
                <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
              </button>
              <div>
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl shadow-lg shadow-purple-600/20">
                    <Truck className="text-white" size={24} />
                  </div>
                  <div>
                    <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-rose-400 bg-clip-text text-transparent">
                      Drivers Management
                    </h1>
                    <p className="text-gray-400 text-sm mt-1 flex items-center gap-2">
                      <span>Manage driver profiles and bus assignments</span>
                      <span className="w-1 h-1 bg-gray-600 rounded-full"></span>
                      <span className="text-purple-400 font-medium">{filteredDrivers.length} drivers</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Admin Info */}
              <div className="hidden sm:flex items-center gap-3 bg-gray-800/50 backdrop-blur-xl rounded-xl px-4 py-2 border border-gray-700/50">
                <div className="text-right">
                  <p className="text-xs text-gray-400">Welcome,</p>
                  <p className="font-semibold text-gray-200">
                    {adminName || 'Admin'}
                  </p>
                </div>
                <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center">
                  <User className="text-white" size={16} />
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={exportDrivers}
                  className="p-2 bg-gray-800/50 backdrop-blur-xl border border-gray-700 rounded-xl text-gray-400 hover:text-purple-400 hover:border-purple-500/50 transition-all"
                  title="Export Drivers"
                >
                  <Download size={18} />
                </button>
                
                <button
                  onClick={handleLogout}
                  className="flex items-center text-sm bg-rose-600/90 text-white px-4 py-2 rounded-xl hover:bg-rose-700 transition-all shadow-lg shadow-rose-600/20"
                >
                  <LogOut size={16} className="mr-2" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
                
                <button
                  onClick={() => setShowAddForm(true)}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg shadow-purple-600/20 flex items-center"
                >
                  <UserPlus size={16} className="mr-2" />
                  <span className="hidden sm:inline">Add Driver</span>
                </button>
              </div>
            </div>
          </div>

          {/* Dark Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="group relative bg-gray-800/50 backdrop-blur-xl rounded-2xl shadow-xl hover:shadow-2xl transition-all border border-gray-700/50 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 to-pink-600/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl shadow-lg shadow-purple-600/20">
                    <Users className="text-white" size={20} />
                  </div>
                  <span className="text-xs font-medium text-purple-400 bg-purple-950/50 px-2 py-1 rounded-full border border-purple-800/50">Total</span>
                </div>
                <h3 className="text-3xl font-bold text-white mb-1">{stats.totalDrivers}</h3>
                <p className="text-sm text-gray-400">Total Drivers</p>
                <div className="mt-3 flex items-center gap-2 text-xs">
                  <span className="text-emerald-400 font-medium">↑ 8%</span>
                  <span className="text-gray-500">vs last month</span>
                </div>
              </div>
            </div>

            <div className="group relative bg-gray-800/50 backdrop-blur-xl rounded-2xl shadow-xl hover:shadow-2xl transition-all border border-gray-700/50 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-cyan-600/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl shadow-lg shadow-blue-600/20">
                    <IdCard className="text-white" size={20} />
                  </div>
                  <span className="text-xs font-medium text-blue-400 bg-blue-950/50 px-2 py-1 rounded-full border border-blue-800/50">Licensed</span>
                </div>
                <h3 className="text-3xl font-bold text-white mb-1">{stats.totalWithLicense}</h3>
                <p className="text-sm text-gray-400">With Valid License</p>
                <div className="mt-3 flex items-center gap-2 text-xs">
                  <span className="text-blue-400 font-medium">
                    {stats.totalDrivers > 0 ? ((stats.totalWithLicense/stats.totalDrivers)*100).toFixed(1) : 0}%
                  </span>
                  <span className="text-gray-500">of total</span>
                </div>
              </div>
            </div>

            <div className="group relative bg-gray-800/50 backdrop-blur-xl rounded-2xl shadow-xl hover:shadow-2xl transition-all border border-gray-700/50 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/10 to-teal-600/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-xl shadow-lg shadow-emerald-600/20">
                    <Bus className="text-white" size={20} />
                  </div>
                  <span className="text-xs font-medium text-emerald-400 bg-emerald-950/50 px-2 py-1 rounded-full border border-emerald-800/50">Assigned</span>
                </div>
                <h3 className="text-3xl font-bold text-white mb-1">{stats.assignedDrivers}</h3>
                <p className="text-sm text-gray-400">Assigned to Buses</p>
                <div className="mt-3 flex items-center gap-2 text-xs">
                  <span className="text-emerald-400 font-medium">{stats.assignedDrivers}/{buses?.length || 0}</span>
                  <span className="text-gray-500">buses covered</span>
                </div>
              </div>
            </div>

            <div className="group relative bg-gray-800/50 backdrop-blur-xl rounded-2xl shadow-xl hover:shadow-2xl transition-all border border-gray-700/50 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-600/10 to-orange-600/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-amber-600 to-orange-600 rounded-xl shadow-lg shadow-amber-600/20">
                    <Award className="text-white" size={20} />
                  </div>
                  <span className="text-xs font-medium text-amber-400 bg-amber-950/50 px-2 py-1 rounded-full border border-amber-800/50">Experienced</span>
                </div>
                <h3 className="text-3xl font-bold text-white mb-1">{stats.experiencedDrivers}</h3>
                <p className="text-sm text-gray-400">5+ Years Experience</p>
                <div className="mt-3 flex items-center gap-2 text-xs">
                  <span className="text-amber-400 font-medium">Senior</span>
                  <span className="text-gray-500">drivers</span>
                </div>
              </div>
            </div>
          </div>

          {/* Dark Filters */}
          <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-700/50 p-5">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
                <input
                  type="text"
                  placeholder="Search by name, code, license, or bus..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-200 placeholder-gray-500 transition-all"
                />
              </div>
              
              <div className="flex flex-wrap gap-3">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500 text-gray-200 cursor-pointer min-w-[140px]"
                >
                  <option value="all">All Drivers</option>
                  <option value="assigned">Assigned</option>
                  <option value="unassigned">Unassigned</option>
                  <option value="experienced">Experienced</option>
                </select>

                <button
                  onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                  className="px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-gray-400 hover:bg-purple-600/20 hover:border-purple-500 hover:text-purple-400 transition-all"
                >
                  {viewMode === 'grid' ? 'List View' : 'Grid View'}
                </button>
              </div>
            </div>

            {/* Quick Filters */}
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-700/50">
              <span className="text-xs font-medium text-gray-500 py-1">Quick filters:</span>
              <button
                onClick={() => setFilterStatus('assigned')}
                className="px-3 py-1 bg-emerald-950/50 text-emerald-400 rounded-lg text-xs font-medium hover:bg-emerald-900/50 transition-colors border border-emerald-800/50"
              >
                Assigned ({stats.assignedDrivers})
              </button>
              <button
                onClick={() => setFilterStatus('unassigned')}
                className="px-3 py-1 bg-amber-950/50 text-amber-400 rounded-lg text-xs font-medium hover:bg-amber-900/50 transition-colors border border-amber-800/50"
              >
                Unassigned ({stats.totalDrivers - stats.assignedDrivers})
              </button>
              <button
                onClick={() => setFilterStatus('experienced')}
                className="px-3 py-1 bg-purple-950/50 text-purple-400 rounded-lg text-xs font-medium hover:bg-purple-900/50 transition-colors border border-purple-800/50"
              >
                Experienced ({stats.experiencedDrivers})
              </button>
            </div>
          </div>

          {/* Dark Grid View */}
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredDrivers && filteredDrivers.length > 0 ? (
                filteredDrivers.map((driver) => {
                  const licenseStatus = getLicenseStatus(driver?.license_expiry);
                  return (
                    <div
                      key={driver.id}
                      className="group relative bg-gray-800/50 backdrop-blur-xl rounded-2xl shadow-xl hover:shadow-2xl transition-all border border-gray-700/50 overflow-hidden"
                    >
                      {/* Status Indicator */}
                      <div className={`absolute top-0 left-0 w-1 h-full ${
                        driver?.bus_id ? 'bg-gradient-to-b from-emerald-500 to-emerald-600' :
                        'bg-gradient-to-b from-amber-500 to-amber-600'
                      }`}></div>

                      <div className="p-6 pl-7">
                        {/* Header */}
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-600/20">
                              <UserCircle className="text-white" size={24} />
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-200">{driver?.name || 'N/A'}</h3>
                              <p className="text-xs text-gray-500">{driver?.driver_code || 'No Code'}</p>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <button 
                              onClick={() => openEditForm(driver)}
                              className="p-1.5 text-purple-400 hover:bg-purple-600/20 rounded-lg transition-colors"
                              title="Edit Driver"
                            >
                              <Edit size={14} />
                            </button>
                            <button 
                              onClick={() => deleteDriver(driver.id)}
                              className="p-1.5 text-rose-400 hover:bg-rose-600/20 rounded-lg transition-colors"
                              title="Delete Driver"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        {/* License Status Badge */}
                        {driver?.license_expiry && (
                          <div className={`mb-3 inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                            licenseStatus === 'valid' ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-800/50' :
                            licenseStatus === 'expiring' ? 'bg-amber-950/50 text-amber-400 border border-amber-800/50' :
                            licenseStatus === 'expired' ? 'bg-rose-950/50 text-rose-400 border border-rose-800/50' :
                            'bg-gray-800/50 text-gray-400 border border-gray-700'
                          }`}>
                            <Shield size={10} />
                            License {licenseStatus === 'valid' ? 'Valid' : licenseStatus === 'expiring' ? 'Expiring Soon' : licenseStatus === 'expired' ? 'Expired' : 'Unknown'}
                          </div>
                        )}

                        {/* Details Grid */}
                        <div className="space-y-3 mb-4">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="flex items-center gap-2 text-sm">
                              <IdCard size={14} className="text-gray-600" />
                              <span className="text-gray-400">{driver?.license_no || 'No License'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <Phone size={14} className="text-gray-600" />
                              <span className="text-gray-400">{driver?.contact || 'N/A'}</span>
                            </div>
                          </div>

                          {/* Bus Assignment */}
                          {driver?.bus ? (
                            <div className="flex items-center gap-2 text-sm p-2 bg-emerald-950/30 rounded-lg border border-emerald-800/50">
                              <Bus size={14} className="text-emerald-400" />
                              <span className="text-emerald-400 font-medium">{driver.bus.bus_number}</span>
                              <span className="text-gray-400 text-xs ml-auto">{driver.bus.route_name || 'No Route'}</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-sm p-2 bg-gray-900/50 rounded-lg border border-gray-700/50">
                              <Bus size={14} className="text-gray-500" />
                              <span className="text-gray-500">Not Assigned to Bus</span>
                            </div>
                          )}

                          {/* Experience */}
                          {driver?.experience_years && (
                            <div className="flex items-center gap-2 text-sm">
                              <Award size={14} className="text-gray-600" />
                              <span className="text-gray-400">{driver.experience_years} years experience</span>
                            </div>
                          )}

                          {/* Address */}
                          {driver?.address && (
                            <div className="flex items-center gap-2 text-sm">
                              <Home size={14} className="text-gray-600" />
                              <span className="text-gray-400 truncate">{driver.address}</span>
                            </div>
                          )}

                          {/* Emergency Contact */}
                          {driver?.emergency_contact && (
                            <div className="flex items-center gap-2 text-sm">
                              <Phone size={14} className="text-gray-600" />
                              <span className="text-gray-400">Emergency: {driver.emergency_contact}</span>
                            </div>
                          )}

                          {/* Password */}
                          <div className="flex items-center gap-2 text-sm pt-2 border-t border-gray-700/50">
                            <Key size={14} className="text-gray-500" />
                            <span className="text-gray-400">
                              {showPassword[driver.id] ? driver.password || 'Not set' : '••••••••'}
                            </span>
                            <button
                              onClick={() => togglePasswordVisibility(driver.id)}
                              className="ml-auto text-xs text-purple-400 hover:text-purple-300"
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
                <div className="col-span-full text-center py-12 bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700/50">
                  <div className="w-20 h-20 bg-gradient-to-br from-purple-600/20 to-pink-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-purple-500/30">
                    <Truck className="text-purple-400" size={32} />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-200 mb-2">No Drivers Found</h3>
                  <p className="text-gray-400 mb-4">Try adjusting your search or filter criteria</p>
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setFilterStatus('all');
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-colors shadow-lg shadow-purple-600/20"
                  >
                    Clear Filters
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Dark List View */
            <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-700/50 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-900/50 border-b border-gray-700">
                      <th className="px-6 py-4 text-left">
                        <input
                          type="checkbox"
                          checked={selectedDrivers.length === filteredDrivers.length && filteredDrivers.length > 0}
                          onChange={selectAllDrivers}
                          disabled={!filteredDrivers || filteredDrivers.length === 0}
                          className="rounded bg-gray-800 border-gray-600 text-purple-500 focus:ring-purple-500 focus:ring-offset-gray-800 disabled:opacity-50"
                        />
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Driver</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">License</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Contact</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Assigned Bus</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Experience</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Password</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700/50">
                    {filteredDrivers && filteredDrivers.length > 0 ? (
                      filteredDrivers.map((driver) => {
                        const licenseStatus = getLicenseStatus(driver?.license_expiry);
                        return (
                          <tr key={driver.id} className="hover:bg-gray-700/30 transition-colors">
                            <td className="px-6 py-4">
                              <input
                                type="checkbox"
                                checked={selectedDrivers.includes(driver.id)}
                                onChange={() => toggleDriverSelection(driver.id)}
                                className="rounded bg-gray-800 border-gray-600 text-purple-500 focus:ring-purple-500 focus:ring-offset-gray-800"
                              />
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
                                  <User className="text-white" size={14} />
                                </div>
                                <div>
                                  <p className="font-medium text-gray-200">{driver?.name || 'N/A'}</p>
                                  <p className="text-xs text-gray-500">{driver?.driver_code || 'No Code'}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col">
                                <span className="text-sm text-gray-300">{driver?.license_no || 'N/A'}</span>
                                {driver?.license_expiry && (
                                  <span className={`text-xs ${
                                    licenseStatus === 'valid' ? 'text-emerald-400' :
                                    licenseStatus === 'expiring' ? 'text-amber-400' :
                                    licenseStatus === 'expired' ? 'text-rose-400' :
                                    'text-gray-500'
                                  }`}>
                                    Exp: {new Date(driver.license_expiry).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-300">
                                {driver?.contact || 'N/A'}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              {driver?.bus ? (
                                <div className="flex items-center">
                                  <Bus size={14} className="mr-1 text-emerald-400" />
                                  <span className="text-sm font-medium text-emerald-400">{driver.bus.bus_number}</span>
                                </div>
                              ) : (
                                <span className="text-sm text-gray-500">Not Assigned</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm text-gray-300">
                                {driver?.experience_years ? `${driver.experience_years} years` : 'N/A'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <Key size={14} className="text-gray-500" />
                                <span className="text-sm text-gray-300">
                                  {showPassword[driver.id] ? driver.password || 'Not set' : '••••••••'}
                                </span>
                                <button
                                  onClick={() => togglePasswordVisibility(driver.id)}
                                  className="text-xs text-purple-400 hover:text-purple-300"
                                >
                                  {showPassword[driver.id] ? 'Hide' : 'Show'}
                                </button>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => openEditForm(driver)}
                                  className="p-1.5 text-purple-400 hover:bg-purple-600/20 rounded-lg transition-colors"
                                  title="Edit"
                                >
                                  <Edit size={14} />
                                </button>
                                <button 
                                  onClick={() => deleteDriver(driver.id)}
                                  className="p-1.5 text-rose-400 hover:bg-rose-600/20 rounded-lg transition-colors"
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
                        <td colSpan="8" className="px-6 py-12 text-center">
                          <div className="flex flex-col items-center justify-center">
                            <Truck className="text-gray-600 mb-3" size={40} />
                            <p className="text-gray-400">No drivers found</p>
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

      {/* Dark Add/Edit Driver Modal */}
      {(showAddForm || editingDriver) && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gray-800 border-b border-gray-700 px-6 py-4 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl">
                  {editingDriver ? <Edit className="text-white" size={20} /> : <UserPlus className="text-white" size={20} />}
                </div>
                <h3 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  {editingDriver ? 'Edit Driver' : 'Add New Driver'}
                </h3>
              </div>
              <button 
                onClick={() => {
                  setShowAddForm(false);
                  setEditingDriver(null);
                  resetForm();
                }}
                className="p-2 text-gray-400 hover:text-gray-300 hover:bg-gray-700 rounded-lg transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={editingDriver ? handleEditDriver : handleAddDriver} className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={newDriver.name}
                    onChange={(e) => setNewDriver(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-200 placeholder-gray-500 transition-all"
                    placeholder="Enter driver's full name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Driver Code *</label>
                  <input
                    type="text"
                    required
                    value={newDriver.driver_code}
                    onChange={(e) => setNewDriver(prev => ({ ...prev, driver_code: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-200 placeholder-gray-500 transition-all"
                    placeholder="e.g., DRV001"
                  />
                  <p className="text-xs text-gray-500 mt-1">Must be unique</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">License Number</label>
                  <input
                    type="text"
                    value={newDriver.license_no}
                    onChange={(e) => setNewDriver(prev => ({ ...prev, license_no: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-200 placeholder-gray-500 transition-all"
                    placeholder="Enter license number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Contact Number</label>
                  <input
                    type="tel"
                    value={newDriver.contact}
                    onChange={(e) => setNewDriver(prev => ({ ...prev, contact: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-200 placeholder-gray-500 transition-all"
                    placeholder="Enter phone number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Experience (Years)</label>
                  <input
                    type="number"
                    value={newDriver.experience_years}
                    onChange={(e) => setNewDriver(prev => ({ ...prev, experience_years: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-200 placeholder-gray-500 transition-all"
                    placeholder="Years of experience"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">License Expiry Date</label>
                  <input
                    type="date"
                    value={newDriver.license_expiry}
                    onChange={(e) => setNewDriver(prev => ({ ...prev, license_expiry: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-200 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Blood Group</label>
                  <select
                    value={newDriver.blood_group}
                    onChange={(e) => setNewDriver(prev => ({ ...prev, blood_group: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-200 transition-all"
                  >
                    <option value="">Select Blood Group</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Emergency Contact</label>
                  <input
                    type="tel"
                    value={newDriver.emergency_contact}
                    onChange={(e) => setNewDriver(prev => ({ ...prev, emergency_contact: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-200 placeholder-gray-500 transition-all"
                    placeholder="Emergency contact number"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Address</label>
                  <textarea
                    value={newDriver.address}
                    onChange={(e) => setNewDriver(prev => ({ ...prev, address: e.target.value }))}
                    rows="2"
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-200 placeholder-gray-500 transition-all"
                    placeholder="Enter complete address"
                  />
                </div>
                
                {/* Bus Assignment Dropdown */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <Bus size={16} className="inline mr-1 text-purple-400" />
                    Assign Bus (Optional)
                  </label>
                  <select
                    value={newDriver.bus_id}
                    onChange={(e) => setNewDriver(prev => ({ ...prev, bus_id: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-200 transition-all"
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
                          className={isAssigned ? 'text-gray-500' : ''}
                        >
                          {bus.bus_number} - {bus.route_name || 'No Route'} {bus.capacity ? `(${bus.capacity} seats)` : ''}
                          {isAssigned ? ' (Already Assigned)' : ''}
                        </option>
                      );
                    })}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Each bus can be assigned to only one driver</p>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Password {!editingDriver && '*'}
                    {editingDriver && <span className="text-xs text-gray-500 ml-2">(Leave blank to keep current)</span>}
                  </label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={16} />
                    <input
                      type="password"
                      required={!editingDriver}
                      value={newDriver.password}
                      onChange={(e) => setNewDriver(prev => ({ ...prev, password: e.target.value }))}
                      className="w-full pl-10 pr-4 py-3 bg-gray-900/50 border border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-200 placeholder-gray-500 transition-all"
                      placeholder={editingDriver ? "Enter new password (optional)" : "Enter driver password"}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-gray-700">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingDriver(null);
                    resetForm();
                  }}
                  className="px-6 py-3 text-gray-300 bg-gray-700 rounded-xl hover:bg-gray-600 transition-all font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all font-medium shadow-lg shadow-purple-600/20"
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
          className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4 rounded-full shadow-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-purple-600/20"
          title="Add Driver"
        >
          <Plus size={24} />
        </button>
      </div>
    </div>
  );
}

export default withAuth(DriversDashboard);