'use client';

import { useState, useEffect } from 'react';
import { Users, Plus, Edit, Trash2, Search, MapPin, UserPlus, X, Save, ArrowLeft, Menu, LogOut, User, Key, Bus, CheckCircle, AlertCircle, Phone } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';

export default function StudentDashboard() {
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [branchFilter, setBranchFilter] = useState('all');
  const [routeFilter, setRouteFilter] = useState('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [adminName, setAdminName] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalBranches: 0,
    route1Count: 0,
    route2Count: 0
  });
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [showPassword, setShowPassword] = useState({});

  const router = useRouter();

  const [newStudent, setNewStudent] = useState({
    full_name: '',
    usn: '',
    branch: '',
    phone: '',
    password: '',
    routes: ''
  });

  // Predefined routes
  const routes = [
    { id: 'route1', name: 'Route 1 - router am mandir' },
    { id: 'route2', name: 'Route 2 - in city' }
  ];

  useEffect(() => {
    fetchStudents();
    // Get admin name from localStorage
    const storedAdminName = localStorage.getItem('adminName');
    if (storedAdminName) {
      setAdminName(storedAdminName);
    }
  }, []);

  useEffect(() => {
    filterStudents();
  }, [students, searchTerm, branchFilter, routeFilter]);

  // Auto-hide toast after 3 seconds
  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => {
        setToast({ show: false, message: '', type: 'success' });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast.show]);

  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .order('usn');

      if (error) throw error;
      setStudents(data || []);
      updateStats(data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
      showToast('Error fetching students', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
  };

  const updateStats = (studentData) => {
    const totalStudents = studentData.length;
    const branches = [...new Set(studentData.map(student => student.branch).filter(Boolean))];
    const route1Count = studentData.filter(student => student.routes === 'route1').length;
    const route2Count = studentData.filter(student => student.routes === 'route2').length;

    setStats({
      totalStudents,
      totalBranches: branches.length,
      route1Count,
      route2Count
    });
  };

  const filterStudents = () => {
    let filtered = students;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(student =>
        student.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.usn?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.phone?.includes(searchTerm)
      );
    }

    // Apply branch filter
    if (branchFilter !== 'all') {
      filtered = filtered.filter(student => student.branch === branchFilter);
    }

    // Apply route filter
    if (routeFilter !== 'all') {
      filtered = filtered.filter(student => student.routes === routeFilter);
    }

    setFilteredStudents(filtered);
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    try {
      // Check if USN already exists
      const { data: existingStudent } = await supabase
        .from('students')
        .select('usn')
        .eq('usn', newStudent.usn.toUpperCase())
        .maybeSingle();

      if (existingStudent) {
        showToast('USN already exists. Please use a different USN.', 'error');
        return;
      }

      // Prepare data - REMOVED division field completely
      const studentData = {
        full_name: newStudent.full_name,
        usn: newStudent.usn.toUpperCase(),
        branch: newStudent.branch || null,
        phone: newStudent.phone || null,
        password: newStudent.password || null,
        routes: newStudent.routes || null
      };

      const { data, error } = await supabase
        .from('students')
        .insert([studentData])
        .select();

      if (error) throw error;

      showToast('Student added successfully!', 'success');
      
      // Reset form
      setNewStudent({
        full_name: '',
        usn: '',
        branch: '',
        phone: '',
        password: '',
        routes: ''
      });
      setShowAddForm(false);
      fetchStudents();
    } catch (error) {
      console.error('Error adding student:', error);
      showToast('Error adding student: ' + error.message, 'error');
    }
  };

  const handleEditStudent = async (e) => {
    e.preventDefault();
    try {
      // Check if USN is being changed and if it's already taken
      if (newStudent.usn.toUpperCase() !== editingStudent.usn) {
        const { data: existingStudent } = await supabase
          .from('students')
          .select('usn')
          .eq('usn', newStudent.usn.toUpperCase())
          .maybeSingle();

        if (existingStudent) {
          showToast('USN already exists. Please use a different USN.', 'error');
          return;
        }
      }

      // Prepare update data - REMOVED division field
      const updateData = {
        full_name: newStudent.full_name,
        usn: newStudent.usn.toUpperCase(),
        branch: newStudent.branch || null,
        phone: newStudent.phone || null,
        routes: newStudent.routes || null
      };

      // Only update password if it's provided (not empty)
      if (newStudent.password) {
        updateData.password = newStudent.password;
      }

      const { error } = await supabase
        .from('students')
        .update(updateData)
        .eq('id', editingStudent.id);

      if (error) throw error;

      showToast('Student updated successfully!', 'success');
      
      setEditingStudent(null);
      setNewStudent({
        full_name: '',
        usn: '',
        branch: '',
        phone: '',
        password: '',
        routes: ''
      });
      fetchStudents();
    } catch (error) {
      console.error('Error updating student:', error);
      showToast('Error updating student: ' + error.message, 'error');
    }
  };

  const deleteStudent = async (studentId) => {
    if (!window.confirm('⚠️ Are you sure you want to delete this student?\n\nThis action cannot be undone.')) return;
    
    try {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', studentId);

      if (error) throw error;

      showToast('Student deleted successfully!', 'success');
      fetchStudents();
    } catch (error) {
      console.error('Error deleting student:', error);
      showToast('Error deleting student: ' + error.message, 'error');
    }
  };

  const openEditForm = (student) => {
    setEditingStudent(student);
    setNewStudent({
      full_name: student.full_name || '',
      usn: student.usn || '',
      branch: student.branch || '',
      phone: student.phone || '',
      password: '', // Don't pre-fill password for security
      routes: student.routes || ''
    });
  };

  const getBranches = () => {
    const branches = [...new Set(students.map(student => student.branch).filter(Boolean))];
    return branches;
  };

  const getRouteName = (routeId) => {
    const route = routes.find(r => r.id === routeId);
    return route ? route.name : 'Not Assigned';
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

  const togglePasswordVisibility = (studentId) => {
    setShowPassword(prev => ({
      ...prev,
      [studentId]: !prev[studentId]
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed top-4 right-4 z-50 animate-slide-in">
          <div className={`flex items-center p-4 rounded-lg shadow-lg ${
            toast.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          }`}>
            <div className={`flex-shrink-0 ${
              toast.type === 'success' ? 'text-green-400' : 'text-red-400'
            }`}>
              {toast.type === 'success' ? (
                <CheckCircle className="h-5 w-5" />
              ) : (
                <AlertCircle className="h-5 w-5" />
              )}
            </div>
            <div className="ml-3">
              <p className={`text-sm font-medium ${
                toast.type === 'success' ? 'text-green-800' : 'text-red-800'
              }`}>
                {toast.message}
              </p>
            </div>
            <button
              onClick={() => setToast({ show: false, message: '', type: 'success' })}
              className={`ml-4 inline-flex flex-shrink-0 ${
                toast.type === 'success' ? 'text-green-400 hover:text-green-600' : 'text-red-400 hover:text-red-600'
              }`}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

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
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Student Dashboard</h1>
                <p className="text-gray-600 text-xs sm:text-sm mt-1">Manage all student information and records</p>
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
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="text-blue-600" size={16} />
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
                
                {/* Desktop Add Student Button */}
                <button
                  onClick={() => setShowAddForm(true)}
                  className="hidden sm:flex bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors items-center"
                >
                  <UserPlus size={16} className="mr-2" />
                  Add Student
                </button>
                {/* Mobile Add Button */}
                <button
                  onClick={() => setShowAddForm(true)}
                  className="sm:hidden bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                  title="Add Student"
                >
                  <Plus size={20} />
                </button>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Total Students</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.totalStudents}</p>
                </div>
                <Users className="text-blue-400" size={20} />
              </div>
            </div>
            <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Branches</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.totalBranches}</p>
                </div>
                <MapPin className="text-green-400" size={20} />
              </div>
            </div>
            <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Route 1</p>
                  <p className="text-xl sm:text-2xl font-bold text-amber-600">{stats.route1Count}</p>
                </div>
                <Bus className="text-amber-400" size={20} />
              </div>
            </div>
            <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Route 2</p>
                  <p className="text-xl sm:text-2xl font-bold text-purple-600">{stats.route2Count}</p>
                </div>
                <Bus className="text-purple-400" size={20} />
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-4 border border-gray-200">
            {/* Mobile Filters Toggle */}
            <button
              onClick={() => setIsFiltersOpen(!isFiltersOpen)}
              className="lg:hidden w-full flex items-center justify-between p-2 bg-gray-50 rounded-lg mb-3"
            >
              <span className="text-sm font-medium text-gray-700">Filters</span>
              <Menu size={16} className={`transform transition-transform ${isFiltersOpen ? 'rotate-180' : ''}`} />
            </button>

            <div className={`${isFiltersOpen ? 'block' : 'hidden'} lg:block`}>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      type="text"
                      placeholder="Search by name, USN, or phone..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white text-sm"
                    />
                  </div>
                </div>
                <select
                  value={branchFilter}
                  onChange={(e) => setBranchFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white text-sm"
                >
                  <option value="all">All Branches</option>
                  {getBranches().map(branch => (
                    <option key={branch} value={branch}>{branch}</option>
                  ))}
                </select>
                <select
                  value={routeFilter}
                  onChange={(e) => setRouteFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white text-sm"
                >
                  <option value="all">All Routes</option>
                  <option value="route1">Route 1 -router am mandir  </option>
                  <option value="route2">Route 2 - in city</option>
                  <option value="null">Not Assigned</option>
                </select>
              </div>
            </div>
          </div>

          {/* Students Table */}
          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                All Students <span className="text-blue-600">({filteredStudents.length})</span>
              </h3>
            </div>
            <div className="overflow-x-auto">
              {/* Mobile Card View */}
              <div className="lg:hidden">
                {filteredStudents.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="mx-auto text-gray-400 mb-3" size={40} />
                    <h3 className="text-base font-semibold text-gray-900 mb-1">No Students Found</h3>
                    <p className="text-gray-600 text-sm">Try adjusting your search criteria</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {filteredStudents.map((student) => (
                      <div key={student.id} className="p-4 hover:bg-gray-50">
                        {/* Student Info and Actions */}
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1 min-w-0 pr-2">
                            <h4 className="font-semibold text-gray-900 text-base truncate">{student.full_name}</h4>
                            <p className="text-gray-600 text-sm">{student.usn}</p>
                          </div>
                          {/* Actions */}
                          <div className="flex space-x-2 flex-shrink-0">
                            <button 
                              onClick={() => openEditForm(student)}
                              className="text-blue-600 hover:text-blue-900 bg-blue-50 p-2 rounded-lg"
                              title="Edit Student"
                            >
                              <Edit size={18} />
                            </button>
                            <button 
                              onClick={() => deleteStudent(student.id)}
                              className="text-red-600 hover:text-red-900 bg-red-50 p-2 rounded-lg"
                              title="Delete Student"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                        
                        {/* Student Details */}
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          {/* Branch */}
                          <div className="bg-gray-50 p-2 rounded-lg">
                            <span className="text-gray-500 text-xs block">Branch</span>
                            <span className="font-medium text-gray-900">{student.branch || 'N/A'}</span>
                          </div>
                          
                          {/* Route */}
                          <div className="bg-gray-50 p-2 rounded-lg">
                            <span className="text-gray-500 text-xs block flex items-center">
                              <Bus size={12} className="mr-1" /> Route
                            </span>
                            <span className={`font-medium ${
                              student.routes === 'route1' ? 'text-amber-600' :
                              student.routes === 'route2' ? 'text-purple-600' :
                              'text-gray-500'
                            }`}>
                              {getRouteName(student.routes)}
                            </span>
                          </div>
                          
                          {/* Phone */}
                          {student.phone && (
                            <div className="bg-gray-50 p-2 rounded-lg col-span-2">
                              <span className="text-gray-500 text-xs block flex items-center">
                                <Phone size={12} className="mr-1" /> Phone
                              </span>
                              <span className="font-medium text-gray-900">{student.phone}</span>
                            </div>
                          )}
                          
                          {/* Password */}
                          <div className="bg-gray-50 p-2 rounded-lg col-span-2">
                            <span className="text-gray-500 text-xs block flex items-center">
                              <Key size={12} className="mr-1" /> Password
                            </span>
                            <div className="flex items-center">
                              <span className="font-medium text-gray-900 mr-2">
                                {showPassword[student.id] ? student.password || 'Not set' : '••••••••'}
                              </span>
                              <button
                                onClick={() => togglePasswordVisibility(student.id)}
                                className="text-blue-600 hover:text-blue-800 text-xs bg-white px-2 py-1 rounded border border-blue-200"
                              >
                                {showPassword[student.id] ? 'Hide' : 'Show'}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Desktop Table View - FIXED HYDRATION ERROR AND REMOVED DIVISION COLUMN */}
              <table className="hidden lg:table w-full">
                <thead className="bg-gray-50">
                  <tr>{/* NO WHITESPACE BETWEEN TAGS */}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">USN *</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name *</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Branch</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Route</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Password *</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-gray-50">{/* NO WHITESPACE BETWEEN TAGS */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{student.usn}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{student.full_name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {student.branch || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Bus size={14} className="mr-1 text-gray-500" />
                          <span className={`text-sm font-medium ${
                            student.routes === 'route1' ? 'text-amber-600' :
                            student.routes === 'route2' ? 'text-purple-600' :
                            'text-gray-500'
                          }`}>
                            {getRouteName(student.routes)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {student.phone ? (
                          <div className="flex items-center">
                            <Phone size={12} className="mr-1" />
                            {student.phone}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          <Key size={14} className="mr-1 text-gray-500" />
                          <span>
                            {showPassword[student.id] ? student.password || 'Not set' : '••••••••'}
                          </span>
                          <button
                            onClick={() => togglePasswordVisibility(student.id)}
                            className="ml-2 text-blue-600 hover:text-blue-800 text-xs font-medium"
                          >
                            {showPassword[student.id] ? 'Hide' : 'Show'}
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => openEditForm(student)}
                            className="text-blue-600 hover:text-blue-900 p-1"
                            title="Edit Student"
                          >
                            <Edit size={16} />
                          </button>
                          <button 
                            onClick={() => deleteStudent(student.id)}
                            className="text-red-600 hover:text-red-900 p-1"
                            title="Delete Student"
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
            {filteredStudents.length === 0 && (
              <div className="hidden lg:block text-center py-12">
                <Users className="mx-auto text-gray-400 mb-4" size={48} />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Students Found</h3>
                <p className="text-gray-600">Try adjusting your search criteria or add a new student.</p>
              </div>
            )}
          </div>
        </div>

        {/* Floating Mobile Add Button */}
        <div className="fixed bottom-6 right-6 z-40 sm:hidden">
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
            title="Add Student"
          >
            <Plus size={24} />
          </button>
        </div>
      </div>

      {/* Add/Edit Student Modal - REMOVED division field */}
      {(showAddForm || editingStudent) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[95vh] overflow-y-auto">
            {/* Sticky Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 sm:px-6 sm:py-4 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingStudent ? 'Edit Student' : 'Add New Student'}
              </h3>
              <button 
                onClick={() => {
                  setShowAddForm(false);
                  setEditingStudent(null);
                  setNewStudent({
                    full_name: '',
                    usn: '',
                    branch: '',
                    phone: '',
                    password: '',
                    routes: ''
                  });
                }}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={editingStudent ? handleEditStudent : handleAddStudent} className="p-4 sm:p-6 space-y-4">
              {/* Required Fields Section */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-4">
                <h4 className="text-sm font-semibold text-blue-800 mb-2 flex items-center">
                  <AlertCircle size={16} className="mr-1" />
                  Required Information
                </h4>
                <p className="text-xs text-blue-600">Fields marked with * are mandatory</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name - Required */}
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newStudent.full_name}
                    onChange={(e) => setNewStudent(prev => ({ ...prev, full_name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white text-sm"
                    placeholder="Enter full name"
                  />
                </div>
                
                {/* USN - Required */}
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    USN <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newStudent.usn}
                    onChange={(e) => setNewStudent(prev => ({ ...prev, usn: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white text-sm"
                    placeholder="Enter USN"
                  />
                  <p className="text-xs text-gray-500 mt-1">Must be unique</p>
                </div>
              </div>

              {/* Optional Fields Section */}
              <div className="border-t border-gray-200 pt-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Optional Information</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                    <input
                      type="text"
                      value={newStudent.branch}
                      onChange={(e) => setNewStudent(prev => ({ ...prev, branch: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white text-sm"
                      placeholder="e.g., Computer Science"
                    />
                  </div>
                </div>

                {/* Route Selection - Optional */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Bus size={16} className="inline mr-1" />
                    Bus Route
                  </label>
                  <select
                    value={newStudent.routes}
                    onChange={(e) => setNewStudent(prev => ({ ...prev, routes: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white text-sm"
                  >
                    <option value="">Not Assigned</option>
                    {routes.map(route => (
                      <option key={route.id} value={route.id}>
                        {route.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Phone - Optional */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      type="tel"
                      value={newStudent.phone}
                      onChange={(e) => setNewStudent(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white text-sm"
                      placeholder="Enter phone number (optional)"
                    />
                  </div>
                </div>

                {/* Password - Required for new students, optional for edits */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password {!editingStudent && <span className="text-red-500">*</span>}
                    {editingStudent && <span className="text-xs text-gray-500 ml-2">(Leave blank to keep current password)</span>}
                  </label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      type="password"
                      required={!editingStudent}
                      value={newStudent.password}
                      onChange={(e) => setNewStudent(prev => ({ ...prev, password: e.target.value }))}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white text-sm"
                      placeholder={editingStudent ? "Enter new password (optional)" : "Enter student password"}
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingStudent(null);
                    setNewStudent({
                      full_name: '',
                      usn: '',
                      branch: '',
                      phone: '',
                      password: '',
                      routes: ''
                    });
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg w-full sm:w-auto text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center w-full sm:w-auto text-sm"
                >
                  <Save size={16} className="mr-2" />
                  {editingStudent ? 'Update Student' : 'Add Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}