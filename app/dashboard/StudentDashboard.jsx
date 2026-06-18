'use client';

import { useState, useEffect } from 'react';
import { 
  Users, Plus, Edit, Trash2, Search, MapPin, UserPlus, X, Save, 
  ArrowLeft, Menu, LogOut, User, Key, Bus, CheckCircle, AlertCircle, 
  Phone, GraduationCap, Filter, Download, RefreshCw, ChevronDown,
  Eye, EyeOff, BookOpen, Route, Hash, Mail, Calendar, CreditCard,
  TrendingUp, Shield, Zap, Settings, Bell, Star, Award, Activity,
  Home, School, Layers, Clock
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import { useInstitution } from '../../app/hooks/useInstitution';

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
  const { institutionId, loading: institutionLoading } = useInstitution();
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalBranches: 0,
    route1Count: 0,
    route2Count: 0,
    assignedToRoute: 0,
    totalIntervals: 0
  });
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [viewMode, setViewMode] = useState('table');
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [currentTime, setCurrentTime] = useState('');
  const [showIntervalModal, setShowIntervalModal] = useState(false);
  const [selectedStudentForInterval, setSelectedStudentForInterval] = useState(null);
  const [intervalData, setIntervalData] = useState({
    interval_number: 1,
    start_date: '',
    end_date: '',
    total_fees: 0,
    due_amount: 0
  });
  const [studentIntervals, setStudentIntervals] = useState({});

  const router = useRouter();

  const [newStudent, setNewStudent] = useState({
    full_name: '',
    usn: '',
    branch: '',
    phone: '',
    password: '',
    routes: '',
    email: '',
    semester: ''
  });

  const routes = [
    { id: 'route1', name: 'Route 1 - Amritsar Mandir', color: '#f97316', glow: 'rgba(249,115,22,0.3)', stops: 12 },
    { id: 'route2', name: 'Route 2 - City Center', color: '#06b6d4', glow: 'rgba(6,182,212,0.3)', stops: 15 }
  ];

  useEffect(() => {
    const storedAdminName = localStorage.getItem('adminName');
    if (storedAdminName) {
      setAdminName(storedAdminName);
    }

    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })
      );
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (institutionId) {
      fetchStudents();
    }
  }, [institutionId]);

  useEffect(() => {
    filterStudents();
  }, [students, searchTerm, branchFilter, routeFilter]);

  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => {
        setToast({ show: false, message: '', type: 'success' });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast.show]);

  const fetchStudents = async () => {
    if (!institutionId) return;
    
    try {
      // Fetch students from new table
      const { data: studentData, error: studentError } = await supabase
        .from('students_new')
        .select('id, full_name, usn, branch, phone, email, password, role, created_at, updated_at, current_interval_id')
        .eq('institution_id', institutionId)
        .order('usn');

      if (studentError) throw studentError;

      // Fetch intervals for all students
      const { data: intervalData, error: intervalError } = await supabase
        .from('student_intervals')
        .select('*')
        .in('student_id', studentData.map(s => s.id));

      if (intervalError) throw intervalError;

      // Group intervals by student
      const intervalsMap = {};
      intervalData.forEach(interval => {
        if (!intervalsMap[interval.student_id]) {
          intervalsMap[interval.student_id] = [];
        }
        intervalsMap[interval.student_id].push(interval);
      });

      setStudentIntervals(intervalsMap);
      setStudents(studentData || []);
      updateStats(studentData || [], intervalsMap);
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

  const updateStats = (studentData, intervalsMap) => {
    const totalStudents = studentData.length;
    const branches = [...new Set(studentData.map(student => student.branch).filter(Boolean))];
    const route1Count = studentData.filter(student => student.routes === 'route1').length;
    const route2Count = studentData.filter(student => student.routes === 'route2').length;
    const assignedToRoute = route1Count + route2Count;
    
    // Count total intervals
    let totalIntervals = 0;
    Object.values(intervalsMap).forEach(intervals => {
      totalIntervals += intervals.length;
    });

    setStats({
      totalStudents,
      totalBranches: branches.length,
      route1Count,
      route2Count,
      assignedToRoute,
      totalIntervals
    });
  };

  const filterStudents = () => {
    let filtered = students;

    if (searchTerm) {
      filtered = filtered.filter(student =>
        student.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.usn?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.phone?.includes(searchTerm) ||
        student.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (branchFilter !== 'all') {
      filtered = filtered.filter(student => student.branch === branchFilter);
    }

    if (routeFilter !== 'all') {
      if (routeFilter === 'unassigned') {
        filtered = filtered.filter(student => !student.routes);
      } else {
        filtered = filtered.filter(student => student.routes === routeFilter);
      }
    }

    setFilteredStudents(filtered);
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    try {
      const { data: existingStudent } = await supabase
        .from('students_new')
        .select('usn')
        .eq('usn', newStudent.usn.toUpperCase())
        .maybeSingle();

      if (existingStudent) {
        showToast('USN already exists. Please use a different USN.', 'error');
        return;
      }

      const studentData = {
        institution_id: institutionId,
        full_name: newStudent.full_name,
        usn: newStudent.usn.toUpperCase(),
        branch: newStudent.branch || null,
        phone: newStudent.phone || null,
        password: newStudent.password || null,
        email: newStudent.email || null,
        role: 'student'
      };

      const { data: insertedStudent, error } = await supabase
        .from('students_new')
        .insert([studentData])
        .select();

      if (error) throw error;

      // Create default interval for the student
      if (insertedStudent && insertedStudent.length > 0) {
        const studentId = insertedStudent[0].id;
        const intervalPayload = {
          student_id: studentId,
          interval_number: 1,
          start_date: new Date().toISOString().split('T')[0],
          end_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          total_fees: 0,
          paid_amount: 0,
          due_amount: 0,
          status: 'pending'
        };

        const { error: intervalError } = await supabase
          .from('student_intervals')
          .insert([intervalPayload]);

        if (intervalError) {
          console.error('Error creating interval:', intervalError);
        }
      }

      showToast('Student added successfully!', 'success');

      setNewStudent({
        full_name: '',
        usn: '',
        branch: '',
        phone: '',
        password: '',
        routes: '',
        email: '',
        semester: ''
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
      if (newStudent.usn.toUpperCase() !== editingStudent.usn) {
        const { data: existingStudent } = await supabase
          .from('students_new')
          .select('usn')
          .eq('usn', newStudent.usn.toUpperCase())
          .eq('institution_id', institutionId)
          .maybeSingle();

        if (existingStudent) {
          showToast('USN already exists. Please use a different USN.', 'error');
          return;
        }
      }

      const updateData = {
        full_name: newStudent.full_name,
        usn: newStudent.usn.toUpperCase(),
        branch: newStudent.branch || null,
        phone: newStudent.phone || null,
        email: newStudent.email || null
      };

      if (newStudent.password) {
        updateData.password = newStudent.password;
      }

      const { error } = await supabase
        .from('students_new')
        .update(updateData)
        .eq('id', editingStudent.id)
        .eq('institution_id', institutionId);

      if (error) throw error;

      showToast('Student updated successfully!', 'success');
      
      setEditingStudent(null);
      setNewStudent({
        full_name: '',
        usn: '',
        branch: '',
        phone: '',
        password: '',
        routes: '',
        email: '',
        semester: ''
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
      // Delete intervals first (cascade should handle but just in case)
      await supabase
        .from('student_intervals')
        .delete()
        .eq('student_id', studentId);

      const { error } = await supabase
        .from('students_new')
        .delete()
        .eq('id', studentId)
        .eq('institution_id', institutionId);

      if (error) throw error;

      showToast('Student deleted successfully!', 'success');
      fetchStudents();
    } catch (error) {
      console.error('Error deleting student:', error);
      showToast('Error deleting student: ' + error.message, 'error');
    }
  };

  const deleteSelectedStudents = async () => {
    if (selectedStudents.length === 0) return;
    
    if (!window.confirm(`⚠️ Are you sure you want to delete ${selectedStudents.length} student(s)?\n\nThis action cannot be undone.`)) return;
    
    try {
      // Delete intervals for selected students
      await supabase
        .from('student_intervals')
        .delete()
        .in('student_id', selectedStudents);

      const { error } = await supabase
        .from('students_new')
        .delete()
        .in('id', selectedStudents)
        .eq('institution_id', institutionId);

      if (error) throw error;

      showToast(`${selectedStudents.length} student(s) deleted successfully!`, 'success');
      setSelectedStudents([]);
      fetchStudents();
    } catch (error) {
      console.error('Error deleting students:', error);
      showToast('Error deleting students: ' + error.message, 'error');
    }
  };

  const openEditForm = (student) => {
    setEditingStudent(student);
    setNewStudent({
      full_name: student.full_name || '',
      usn: student.usn || '',
      branch: student.branch || '',
      phone: student.phone || '',
      password: '',
      routes: student.routes || '',
      email: student.email || '',
      semester: student.semester || ''
    });
  };

  const openIntervalModal = (student) => {
    setSelectedStudentForInterval(student);
    setIntervalData({
      interval_number: (studentIntervals[student.id]?.length || 0) + 1,
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      total_fees: 0,
      due_amount: 0
    });
    setShowIntervalModal(true);
  };

  const handleAddInterval = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        student_id: selectedStudentForInterval.id,
        interval_number: intervalData.interval_number,
        start_date: intervalData.start_date,
        end_date: intervalData.end_date,
        total_fees: intervalData.total_fees,
        paid_amount: 0,
        due_amount: intervalData.due_amount || intervalData.total_fees,
        status: 'pending'
      };

      const { error } = await supabase
        .from('student_intervals')
        .insert([payload]);

      if (error) throw error;

      showToast(`Interval ${intervalData.interval_number} added successfully!`, 'success');
      setShowIntervalModal(false);
      fetchStudents();
    } catch (error) {
      console.error('Error adding interval:', error);
      showToast('Error adding interval: ' + error.message, 'error');
    }
  };

  const getBranches = () => {
    const branches = [...new Set(students.map(student => student.branch).filter(Boolean))];
    return branches.sort();
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

  const toggleSelectAll = () => {
    if (selectedStudents.length === filteredStudents.length && filteredStudents.length > 0) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(filteredStudents.map(s => s.id));
    }
  };

  const toggleSelectStudent = (studentId) => {
    if (selectedStudents.includes(studentId)) {
      setSelectedStudents(selectedStudents.filter(id => id !== studentId));
    } else {
      setSelectedStudents([...selectedStudents, studentId]);
    }
  };

  const exportToCSV = () => {
    const headers = ['USN', 'Name', 'Branch', 'Route', 'Phone', 'Email', 'Intervals'];
    const data = filteredStudents.map(s => [
      s.usn,
      s.full_name,
      s.branch || '',
      getRouteName(s.routes),
      s.phone || '',
      s.email || '',
      (studentIntervals[s.id]?.length || 0).toString()
    ]);
    
    const csvContent = [headers, ...data]
      .map(row => row.join(','))
      .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `students_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    showToast('Students exported successfully!', 'success');
  };

  if (loading || institutionLoading) {
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

  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
        <div className="space-y-6 lg:space-y-8">
          {/* Header - Same as before */}
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
                      <GraduationCap className="text-white" size={24} />
                    </div>
                    <div>
                      <h1 className="text-2xl lg:text-3xl font-bold text-white">
                        Student Dashboard
                      </h1>
                      <p className="text-slate-400 text-sm mt-1">
                        Manage student profiles, intervals, and route assignments
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-3 bg-slate-800 rounded-xl px-4 py-2 border border-slate-700">
                  <div className="text-right">
                    <p className="text-xs text-slate-400">{dateStr}</p>
                    <p className="text-xs text-blue-400 font-mono">{currentTime}</p>
                  </div>
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <User className="text-white" size={14} />
                  </div>
                  <span className="text-sm font-medium text-white">{adminName || 'Admin'}</span>
                </div>

                <button
                  onClick={handleLogout}
                  className="flex items-center text-sm bg-red-600 text-white px-4 py-2 rounded-xl hover:bg-red-700 transition-all"
                >
                  <LogOut size={16} className="mr-2" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            </div>
          </div>

          {/* Stats Cards with Intervals */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-blue-600 rounded-xl">
                  <Users className="text-white" size={18} />
                </div>
                <span className="text-xs font-medium text-blue-400 bg-blue-950/50 px-2 py-0.5 rounded-full border border-blue-800">Total</span>
              </div>
              <h3 className="text-2xl font-bold text-white">{stats.totalStudents}</h3>
              <p className="text-xs text-slate-400">Total Students</p>
            </div>

            <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-cyan-600 rounded-xl">
                  <BookOpen className="text-white" size={18} />
                </div>
                <span className="text-xs font-medium text-cyan-400 bg-cyan-950/50 px-2 py-0.5 rounded-full border border-cyan-800">Branches</span>
              </div>
              <h3 className="text-2xl font-bold text-white">{stats.totalBranches}</h3>
              <p className="text-xs text-slate-400">Different Programs</p>
            </div>

            <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-orange-600 rounded-xl">
                  <Bus className="text-white" size={18} />
                </div>
                <span className="text-xs font-medium text-orange-400 bg-orange-950/50 px-2 py-0.5 rounded-full border border-orange-800">Route 1</span>
              </div>
              <h3 className="text-2xl font-bold text-white">{stats.route1Count}</h3>
              <p className="text-xs text-slate-400">Amritsar Mandir Route</p>
            </div>

            <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-teal-600 rounded-xl">
                  <Bus className="text-white" size={18} />
                </div>
                <span className="text-xs font-medium text-teal-400 bg-teal-950/50 px-2 py-0.5 rounded-full border border-teal-800">Route 2</span>
              </div>
              <h3 className="text-2xl font-bold text-white">{stats.route2Count}</h3>
              <p className="text-xs text-slate-400">City Center Route</p>
            </div>

            <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-purple-600 rounded-xl">
                  <Layers className="text-white" size={18} />
                </div>
                <span className="text-xs font-medium text-purple-400 bg-purple-950/50 px-2 py-0.5 rounded-full border border-purple-800">Intervals</span>
              </div>
              <h3 className="text-2xl font-bold text-white">{stats.totalIntervals}</h3>
              <p className="text-xs text-slate-400">Total Fee Periods</p>
            </div>
          </div>

          {/* Search and Filters - Same as before but with Interval stats */}
          <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-5">
            <div className="space-y-4">
              {/* Search Bar */}
              <div className="flex items-center gap-3 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 focus-within:border-blue-500 transition-all">
                <Search size={18} className="text-slate-500" />
                <input
                  type="text"
                  placeholder="Search by name, USN, phone, or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 bg-transparent border-none outline-none text-slate-200 placeholder-slate-500 text-sm"
                />
                {searchTerm && (
                  <button onClick={() => setSearchTerm('')} className="text-slate-500 hover:text-slate-400">
                    <X size={16} />
                  </button>
                )}
              </div>

              {/* Filter Row */}
              <div className="flex flex-wrap gap-3 items-center">
                <Filter size={14} className="text-slate-500" />
                <span className="text-xs text-slate-500">Filters:</span>
                
                <select
                  value={branchFilter}
                  onChange={(e) => setBranchFilter(e.target.value)}
                  className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-300 focus:border-blue-500 outline-none"
                >
                  <option value="all">All Branches</option>
                  {getBranches().map(branch => (
                    <option key={branch} value={branch}>{branch}</option>
                  ))}
                </select>

                <select
                  value={routeFilter}
                  onChange={(e) => setRouteFilter(e.target.value)}
                  className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-300 focus:border-blue-500 outline-none"
                >
                  <option value="all">All Routes</option>
                  <option value="route1">Route 1 - Amritsar Mandir</option>
                  <option value="route2">Route 2 - City Center</option>
                  <option value="unassigned">Not Assigned</option>
                </select>

                {/* View Toggle */}
                <div className="flex gap-2 ml-auto">
                  <button
                    onClick={() => setViewMode('table')}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                      viewMode === 'table' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-slate-900 text-slate-400 hover:text-slate-300'
                    }`}
                  >
                    Table View
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                      viewMode === 'grid' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-slate-900 text-slate-400 hover:text-slate-300'
                    }`}
                  >
                    Grid View
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 pt-3 border-t border-slate-700">
                <button
                  onClick={() => setShowAddForm(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-sm"
                >
                  <UserPlus size={16} />
                  Add New Student
                </button>

                <button
                  onClick={exportToCSV}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 hover:text-blue-400 hover:border-blue-500 transition-all text-sm"
                >
                  <Download size={16} />
                  Export CSV
                </button>

                <button
                  onClick={fetchStudents}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 hover:text-blue-400 hover:border-blue-500 transition-all text-sm"
                >
                  <RefreshCw size={16} />
                  Refresh
                </button>

                {selectedStudents.length > 0 && (
                  <button
                    onClick={deleteSelectedStudents}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all text-sm"
                  >
                    <Trash2 size={16} />
                    Delete ({selectedStudents.length})
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Results Count */}
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 px-5 py-3 flex justify-between items-center">
            <p className="text-sm text-slate-400">
              Showing <span className="font-semibold text-white">{filteredStudents.length}</span> of{' '}
              <span className="font-semibold text-white">{students.length}</span> students
            </p>
            {viewMode === 'table' && filteredStudents.length > 0 && (
              <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedStudents.length === filteredStudents.length && filteredStudents.length > 0}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                />
                Select All
              </label>
            )}
          </div>

          {/* Table View */}
          {viewMode === 'table' && (
            <div className="bg-slate-800/50 rounded-2xl border border-slate-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-900 border-b border-slate-700">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider w-12">
                        <input
                          type="checkbox"
                          checked={selectedStudents.length === filteredStudents.length && filteredStudents.length > 0}
                          onChange={toggleSelectAll}
                          className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                        />
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">USN</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Name</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Branch</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Route</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Intervals</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Contact</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {filteredStudents.map((student) => {
                      const intervals = studentIntervals[student.id] || [];
                      const totalDue = intervals.reduce((sum, i) => sum + (i.due_amount || 0), 0);
                      const totalPaid = intervals.reduce((sum, i) => sum + (i.paid_amount || 0), 0);
                      
                      return (
                        <tr key={student.id} className="hover:bg-slate-700/30 transition-colors">
                          <td className="px-5 py-3">
                            <input
                              type="checkbox"
                              checked={selectedStudents.includes(student.id)}
                              onChange={() => toggleSelectStudent(student.id)}
                              className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                            />
                          </td>
                          <td className="px-5 py-3">
                            <span className="text-sm font-mono text-slate-300">{student.usn}</span>
                          </td>
                          <td className="px-5 py-3">
                            <div>
                              <p className="text-sm font-medium text-white">{student.full_name}</p>
                              {student.email && <p className="text-xs text-slate-500">{student.email}</p>}
                            </div>
                          </td>
                          <td className="px-5 py-3">
                            {student.branch ? (
                              <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-blue-950/50 text-blue-400 border border-blue-800">
                                {student.branch}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-500">—</span>
                            )}
                          </td>
                          <td className="px-5 py-3">
                            {student.routes ? (
                              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                                student.routes === 'route1' 
                                  ? 'bg-orange-950/50 text-orange-400 border border-orange-800' 
                                  : 'bg-teal-950/50 text-teal-400 border border-teal-800'
                              }`}>
                                <Bus size={10} />
                                {student.routes === 'route1' ? 'Route 1' : 'Route 2'}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-500">Not Assigned</span>
                            )}
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex flex-col gap-1">
                              <span className="text-xs text-slate-300">
                                {intervals.length} interval{intervals.length !== 1 ? 's' : ''}
                              </span>
                              {totalDue > 0 && (
                                <span className="text-xs text-orange-400">Due: ₹{totalDue}</span>
                              )}
                              <button
                                onClick={() => openIntervalModal(student)}
                                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                              >
                                <Plus size={10} /> Add Interval
                              </button>
                            </div>
                          </td>
                          <td className="px-5 py-3">
                            {student.phone ? (
                              <span className="text-sm text-slate-300">{student.phone}</span>
                            ) : (
                              <span className="text-xs text-slate-500">—</span>
                            )}
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex gap-2">
                              <button
                                onClick={() => openEditForm(student)}
                                className="p-1.5 rounded-lg text-blue-400 hover:bg-blue-600/20 transition-colors"
                                title="Edit"
                              >
                                <Edit size={14} />
                              </button>
                              <button
                                onClick={() => openIntervalModal(student)}
                                className="p-1.5 rounded-lg text-purple-400 hover:bg-purple-600/20 transition-colors"
                                title="Add Interval"
                              >
                                <Layers size={14} />
                              </button>
                              <button
                                onClick={() => deleteStudent(student.id)}
                                className="p-1.5 rounded-lg text-red-400 hover:bg-red-600/20 transition-colors"
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

              {filteredStudents.length === 0 && (
                <div className="text-center py-12">
                  <Users size={48} className="text-slate-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">No Students Found</h3>
                  <p className="text-slate-400">Try adjusting your search or filter criteria</p>
                </div>
              )}
            </div>
          )}

          {/* Grid View */}
          {viewMode === 'grid' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredStudents.map((student) => {
                const intervals = studentIntervals[student.id] || [];
                const totalDue = intervals.reduce((sum, i) => sum + (i.due_amount || 0), 0);
                
                return (
                  <div key={student.id} className="bg-slate-800/50 rounded-2xl border border-slate-700 hover:border-blue-500/30 transition-all overflow-hidden">
                    <div className={`h-1 ${student.routes === 'route1' ? 'bg-orange-500' : student.routes === 'route2' ? 'bg-teal-500' : 'bg-slate-600'}`}></div>
                    <div className="p-5">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                            <User className="text-white" size={20} />
                          </div>
                          <div>
                            <h3 className="font-semibold text-white">{student.full_name}</h3>
                            <p className="text-xs text-slate-500 font-mono">{student.usn}</p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button 
                            onClick={() => openEditForm(student)}
                            className="p-1.5 text-blue-400 hover:bg-blue-600/20 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit size={14} />
                          </button>
                          <button 
                            onClick={() => deleteStudent(student.id)}
                            className="p-1.5 text-red-400 hover:bg-red-600/20 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-3 mb-4">
                        <div className="flex flex-wrap gap-2">
                          {student.branch && (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-950/50 text-blue-400 border border-blue-800">
                              {student.branch}
                            </span>
                          )}
                          {student.routes && (
                            <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
                              student.routes === 'route1' 
                                ? 'bg-orange-950/50 text-orange-400 border border-orange-800' 
                                : 'bg-teal-950/50 text-teal-400 border border-teal-800'
                            }`}>
                              <Bus size={10} />
                              {student.routes === 'route1' ? 'Route 1' : 'Route 2'}
                            </span>
                          )}
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-950/50 text-purple-400 border border-purple-800 flex items-center gap-1">
                            <Layers size={10} />
                            {intervals.length} Interval{intervals.length !== 1 ? 's' : ''}
                          </span>
                        </div>

                        {student.phone && (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone size={12} className="text-slate-500" />
                            <span className="text-slate-300">{student.phone}</span>
                          </div>
                        )}

                        {student.email && (
                          <div className="flex items-center gap-2 text-sm">
                            <Mail size={12} className="text-slate-500" />
                            <span className="text-slate-300 truncate">{student.email}</span>
                          </div>
                        )}

                        {totalDue > 0 && (
                          <div className="flex items-center gap-2 text-sm bg-orange-950/30 p-2 rounded-lg border border-orange-800">
                            <AlertCircle size={14} className="text-orange-400" />
                            <span className="text-orange-400">Due: ₹{totalDue}</span>
                          </div>
                        )}

                        <button
                          onClick={() => openIntervalModal(student)}
                          className="w-full py-2 bg-purple-600/20 text-purple-400 rounded-lg text-sm hover:bg-purple-600/30 transition-all border border-purple-800 flex items-center justify-center gap-2"
                        >
                          <Plus size={14} /> Add Fee Interval
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredStudents.length === 0 && (
                <div className="col-span-full text-center py-12 bg-slate-800/50 rounded-2xl border border-slate-700">
                  <Users size={48} className="text-slate-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">No Students Found</h3>
                  <p className="text-slate-400">Try adjusting your search or filter criteria</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Student Modal - Updated for new table */}
      {(showAddForm || editingStudent) && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-slate-800 border-b border-slate-700 px-6 py-4 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-xl">
                  {editingStudent ? <Edit className="text-white" size={20} /> : <UserPlus className="text-white" size={20} />}
                </div>
                <h3 className="text-xl font-bold text-white">
                  {editingStudent ? 'Edit Student' : 'Add New Student'}
                </h3>
              </div>
              <button 
                onClick={() => {
                  setShowAddForm(false);
                  setEditingStudent(null);
                }}
                className="p-2 text-slate-400 hover:text-slate-300 hover:bg-slate-700 rounded-lg transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={editingStudent ? handleEditStudent : handleAddStudent} className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-2">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={newStudent.full_name}
                    onChange={(e) => setNewStudent(prev => ({ ...prev, full_name: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 text-slate-200 placeholder-slate-500"
                    placeholder="Enter student's full name"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-2">USN *</label>
                  <input
                    type="text"
                    required
                    value={newStudent.usn}
                    onChange={(e) => setNewStudent(prev => ({ ...prev, usn: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 text-slate-200 placeholder-slate-500"
                    placeholder="e.g., 1SI21CS001"
                  />
                  <p className="text-xs text-slate-500 mt-1">Must be unique</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Branch</label>
                  <input
                    type="text"
                    value={newStudent.branch}
                    onChange={(e) => setNewStudent(prev => ({ ...prev, branch: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 text-slate-200 placeholder-slate-500"
                    placeholder="e.g., Computer Science"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Phone Number</label>
                  <input
                    type="tel"
                    value={newStudent.phone}
                    onChange={(e) => setNewStudent(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 text-slate-200 placeholder-slate-500"
                    placeholder="Enter phone number"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                  <input
                    type="email"
                    value={newStudent.email}
                    onChange={(e) => setNewStudent(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 text-slate-200 placeholder-slate-500"
                    placeholder="student@example.com"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Password {!editingStudent && '*'}
                    {editingStudent && <span className="text-xs text-slate-500 ml-2">(Leave blank to keep current)</span>}
                  </label>
                  <input
                    type="password"
                    required={!editingStudent}
                    value={newStudent.password}
                    onChange={(e) => setNewStudent(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 text-slate-200 placeholder-slate-500"
                    placeholder={editingStudent ? "Enter new password (optional)" : "Enter student password"}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingStudent(null);
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
                  {editingStudent ? 'Update Student' : 'Add Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Interval Modal */}
      {showIntervalModal && selectedStudentForInterval && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-md">
            <div className="px-6 py-4 border-b border-slate-700 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-600 rounded-xl">
                  <Layers className="text-white" size={20} />
                </div>
                <h3 className="text-xl font-bold text-white">
                  Add Fee Interval
                </h3>
              </div>
              <button 
                onClick={() => setShowIntervalModal(false)}
                className="p-2 text-slate-400 hover:text-slate-300 hover:bg-slate-700 rounded-lg transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddInterval} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Student</label>
                <div className="px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-slate-200">
                  {selectedStudentForInterval.full_name} ({selectedStudentForInterval.usn})
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Interval Number</label>
                <input
                  type="number"
                  required
                  value={intervalData.interval_number}
                  onChange={(e) => setIntervalData(prev => ({ ...prev, interval_number: parseInt(e.target.value) }))}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:border-purple-500 text-slate-200"
                  min="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Start Date</label>
                <input
                  type="date"
                  required
                  value={intervalData.start_date}
                  onChange={(e) => setIntervalData(prev => ({ ...prev, start_date: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:border-purple-500 text-slate-200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">End Date</label>
                <input
                  type="date"
                  required
                  value={intervalData.end_date}
                  onChange={(e) => setIntervalData(prev => ({ ...prev, end_date: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:border-purple-500 text-slate-200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Total Fees (₹)</label>
                <input
                  type="number"
                  required
                  value={intervalData.total_fees}
                  onChange={(e) => setIntervalData(prev => ({ ...prev, total_fees: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:border-purple-500 text-slate-200"
                  min="0"
                  step="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Due Amount (₹)</label>
                <input
                  type="number"
                  required
                  value={intervalData.due_amount}
                  onChange={(e) => setIntervalData(prev => ({ ...prev, due_amount: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:border-purple-500 text-slate-200"
                  min="0"
                  step="1"
                />
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowIntervalModal(false)}
                  className="px-6 py-3 text-slate-300 bg-slate-700 rounded-xl hover:bg-slate-600 transition-all font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all font-medium"
                >
                  <Save size={16} className="inline mr-2" />
                  Add Interval
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed top-5 right-5 z-50 animate-slide-in">
          <div className={`flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl border-l-4 backdrop-blur-sm ${
            toast.type === 'success' 
              ? 'bg-emerald-900/95 border-emerald-500 text-emerald-200' 
              : 'bg-red-900/95 border-red-500 text-red-200'
          }`}>
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

      {/* Floating Add Button for Mobile */}
      <div className="fixed bottom-6 right-6 z-40 sm:hidden">
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-all"
          title="Add Student"
        >
          <Plus size={24} />
        </button>
      </div>

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