'use client';

import { useState, useEffect } from 'react';
import { 
  Users, Plus, Edit, Trash2, Search, MapPin, UserPlus, X, Save, 
  ArrowLeft, Menu, LogOut, User, Key, Bus, CheckCircle, AlertCircle, 
  Phone, GraduationCap, Filter, Download, RefreshCw, ChevronDown,
  Eye, EyeOff, BookOpen, Route, Hash, Mail, Calendar, CreditCard,
  TrendingUp, Shield, Zap, Settings, Bell, Star, Award, Activity
} from 'lucide-react';
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
    route2Count: 0,
    assignedToRoute: 0
  });
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [showPassword, setShowPassword] = useState({});
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'grid'
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [currentTime, setCurrentTime] = useState('');

  const router = useRouter();

  const [newStudent, setNewStudent] = useState({
    full_name: '',
    usn: '',
    branch: '',
    phone: '',
    password: '',
    routes: '',
    email: '',
    semester: '',
    enrollment_year: ''
  });

  // Predefined routes with vibrant dark mode colors
  const routes = [
    { id: 'route1', name: 'Route 1 - Amritsar Mandir', color: '#f97316', glow: 'rgba(249,115,22,0.3)', stops: 12 },
    { id: 'route2', name: 'Route 2 - City Center', color: '#06b6d4', glow: 'rgba(6,182,212,0.3)', stops: 15 }
  ];

  useEffect(() => {
    fetchStudents();
    const storedAdminName = localStorage.getItem('adminName');
    if (storedAdminName) {
      setAdminName(storedAdminName);
    }

    // Update time
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
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
    const assignedToRoute = route1Count + route2Count;

    setStats({
      totalStudents,
      totalBranches: branches.length,
      route1Count,
      route2Count,
      assignedToRoute
    });
  };

  const filterStudents = () => {
    let filtered = students;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(student =>
        student.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.usn?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.phone?.includes(searchTerm) ||
        student.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply branch filter
    if (branchFilter !== 'all') {
      filtered = filtered.filter(student => student.branch === branchFilter);
    }

    // Apply route filter
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

      const studentData = {
        full_name: newStudent.full_name,
        usn: newStudent.usn.toUpperCase(),
        branch: newStudent.branch || null,
        phone: newStudent.phone || null,
        password: newStudent.password || null,
        routes: newStudent.routes || null,
        email: newStudent.email || null,
        semester: newStudent.semester || null,
        enrollment_year: newStudent.enrollment_year || null
      };

      const { data, error } = await supabase
        .from('students')
        .insert([studentData])
        .select();

      if (error) throw error;

      showToast('Student added successfully!', 'success');
      
      setNewStudent({
        full_name: '',
        usn: '',
        branch: '',
        phone: '',
        password: '',
        routes: '',
        email: '',
        semester: '',
        enrollment_year: ''
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

      const updateData = {
        full_name: newStudent.full_name,
        usn: newStudent.usn.toUpperCase(),
        branch: newStudent.branch || null,
        phone: newStudent.phone || null,
        routes: newStudent.routes || null,
        email: newStudent.email || null,
        semester: newStudent.semester || null,
        enrollment_year: newStudent.enrollment_year || null
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
        routes: '',
        email: '',
        semester: '',
        enrollment_year: ''
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

  const deleteSelectedStudents = async () => {
    if (selectedStudents.length === 0) return;
    
    if (!window.confirm(`⚠️ Are you sure you want to delete ${selectedStudents.length} student(s)?\n\nThis action cannot be undone.`)) return;
    
    try {
      const { error } = await supabase
        .from('students')
        .delete()
        .in('id', selectedStudents);

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
      password: '', // Don't pre-fill password for security
      routes: student.routes || '',
      email: student.email || '',
      semester: student.semester || '',
      enrollment_year: student.enrollment_year || ''
    });
  };

  const getBranches = () => {
    const branches = [...new Set(students.map(student => student.branch).filter(Boolean))];
    return branches.sort();
  };

  const getRouteName = (routeId) => {
    const route = routes.find(r => r.id === routeId);
    return route ? route.name : 'Not Assigned';
  };

  const getRouteColor = (routeId) => {
    const route = routes.find(r => r.id === routeId);
    return route ? route.color : '#6b7280';
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
    const headers = ['USN', 'Name', 'Branch', 'Route', 'Phone', 'Email', 'Semester', 'Enrollment Year'];
    const data = filteredStudents.map(s => [
      s.usn,
      s.full_name,
      s.branch || '',
      getRouteName(s.routes),
      s.phone || '',
      s.email || '',
      s.semester || '',
      s.enrollment_year || ''
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

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: '#0a0a0f',
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        flexDirection: 'column', 
        gap: '24px' 
      }}>
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
        `}</style>
        <div style={{ position: 'relative' }}>
          <div style={{ width: 80, height: 80, border: '4px solid #1e1e2e', borderTop: '4px solid #6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 40, height: 40, background: '#6366f1', borderRadius: '50%', animation: 'pulse 1.5s ease infinite' }}></div>
        </div>
        <p style={{ color: '#6366f1', fontFamily: 'system-ui', fontWeight: 600, letterSpacing: '0.1em', fontSize: 14, textTransform: 'uppercase' }}>Loading Student Dashboard</p>
      </div>
    );
  }

  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
        
        * { 
          box-sizing: border-box; 
          margin: 0; 
          padding: 0; 
        }
        
        :root {
          --bg-primary: #0a0a0f;
          --bg-secondary: #11111f;
          --bg-card: #16162a;
          --bg-card-hover: #1c1c34;
          --bg-gradient: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%);
          --border: rgba(255,255,255,0.08);
          --border-hover: rgba(255,255,255,0.15);
          --text-primary: #ffffff;
          --text-secondary: #a0a0c0;
          --text-muted: #6b6b8b;
          --accent-primary: #6366f1;
          --accent-secondary: #8b5cf6;
          --accent-tertiary: #ec4899;
          --shadow-sm: 0 4px 6px -1px rgba(0,0,0,0.3), 0 2px 4px -1px rgba(0,0,0,0.2);
          --shadow-md: 0 10px 15px -3px rgba(0,0,0,0.4), 0 4px 6px -2px rgba(0,0,0,0.3);
          --shadow-lg: 0 20px 25px -5px rgba(0,0,0,0.5), 0 10px 10px -5px rgba(0,0,0,0.4);
        }
        
        body { 
          font-family: 'Inter', sans-serif; 
          background: var(--bg-primary);
          color: var(--text-primary);
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes slideIn {
          from { transform: translateX(20px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes scaleIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        
        @keyframes float {
          0%,100% { transform: translateY(0px); }
          50% { transform: translateY(-5px); }
        }
        
        @keyframes glow {
          0%,100% { filter: blur(60px) opacity(0.5); }
          50% { filter: blur(80px) opacity(0.8); }
        }
        
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        
        .animate-fade-in { animation: fadeIn 0.3s ease forwards; }
        .animate-slide-in { animation: slideIn 0.3s ease forwards; }
        .animate-scale-in { animation: scaleIn 0.2s ease forwards; }
        .animate-float { animation: float 3s ease-in-out infinite; }
        
        .gradient-bg {
          background: linear-gradient(135deg, #6366f1, #8b5cf6, #ec4899);
          background-size: 200% auto;
          animation: shimmer 4s linear infinite;
        }
        
        .glass-effect {
          background: rgba(22, 22, 42, 0.8);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        
        .gradient-text {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        
        .stat-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 24px;
          padding: 24px;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }
        
        .stat-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, #6366f1, #8b5cf6, #ec4899);
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        
        .stat-card:hover {
          transform: translateY(-4px);
          background: var(--bg-card-hover);
          border-color: var(--border-hover);
          box-shadow: var(--shadow-lg);
        }
        
        .stat-card:hover::before {
          opacity: 1;
        }
        
        .search-bar {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 40px;
          padding: 8px 20px;
          transition: all 0.3s ease;
        }
        
        .search-bar:focus-within {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.2);
        }
        
        .filter-chip {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 30px;
          padding: 8px 16px;
          font-size: 13px;
          font-weight: 500;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .filter-chip:hover {
          border-color: #6366f1;
          color: #6366f1;
        }
        
        .filter-chip.active {
          background: #6366f1;
          color: white;
          border-color: #6366f1;
        }
        
        .student-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 24px;
          padding: 24px;
          transition: all 0.3s ease;
        }
        
        .student-card:hover {
          transform: translateY(-5px);
          background: var(--bg-card-hover);
          border-color: var(--border-hover);
          box-shadow: var(--shadow-lg);
        }
        
        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.8);
          backdrop-filter: blur(8px);
          z-index: 50;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .modal-content {
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 32px;
          box-shadow: var(--shadow-lg);
          max-width: 600px;
          width: 90%;
          max-height: 90vh;
          overflow-y: auto;
          animation: scaleIn 0.2s ease;
        }
        
        .toast-success {
          background: #10b981;
          color: white;
        }
        
        .toast-error {
          background: #ef4444;
          color: white;
        }
        
        .table-header {
          background: rgba(22, 22, 42, 0.95);
          border-bottom: 1px solid var(--border);
        }
        
        .table-row {
          transition: all 0.2s ease;
        }
        
        .table-row:hover {
          background: rgba(28, 28, 52, 0.8);
        }
        
        .table-row.selected {
          background: rgba(99,102,241,0.15);
        }
        
        .action-button {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 40px;
          padding: 8px 16px;
          font-size: 13px;
          font-weight: 500;
          color: var(--text-secondary);
          display: inline-flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .action-button:hover {
          background: var(--bg-card-hover);
          border-color: #6366f1;
          color: #6366f1;
        }
        
        .action-button.primary {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white;
          border: none;
        }
        
        .action-button.primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px -5px rgba(99,102,241,0.5);
        }
        
        .action-button.danger {
          background: rgba(239,68,68,0.1);
          color: #ef4444;
          border: 1px solid rgba(239,68,68,0.2);
        }
        
        .action-button.danger:hover {
          background: rgba(239,68,68,0.2);
          border-color: rgba(239,68,68,0.4);
        }
        
        @media (max-width: 768px) {
          .stat-card { padding: 16px; }
          .student-card { padding: 16px; }
          .modal-content { width: 95%; }
        }
      `}</style>

      <div style={{ 
        minHeight: '100vh', 
        background: 'radial-gradient(circle at 50% 50%, #1a1a2e, #0a0a0f)',
        padding: '20px'
      }}>
        {/* Background Orbs */}
        <div style={{
          position: 'fixed',
          width: 600,
          height: 600,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
          top: -200,
          left: -200,
          filter: 'blur(80px)',
          pointerEvents: 'none',
          zIndex: 0,
          animation: 'glow 8s ease-in-out infinite'
        }}></div>
        <div style={{
          position: 'fixed',
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(236,72,153,0.1) 0%, transparent 70%)',
          bottom: -150,
          right: -150,
          filter: 'blur(80px)',
          pointerEvents: 'none',
          zIndex: 0,
          animation: 'glow 10s ease-in-out infinite reverse'
        }}></div>

        <div style={{ position: 'relative', zIndex: 10, maxWidth: 1400, margin: '0 auto' }}>
          {/* Header with Glass Effect */}
          <div className="glass-effect" style={{ 
            borderRadius: 24,
            padding: 20,
            marginBottom: 24,
            animation: 'fadeIn 0.3s ease'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <button
                  onClick={handleBack}
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 16,
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    color: 'var(--text-secondary)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--bg-card-hover)';
                    e.currentTarget.style.borderColor = '#6366f1';
                    e.currentTarget.style.color = '#6366f1';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--bg-card)';
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                  }}
                >
                  <ArrowLeft size={20} />
                </button>
                <div>
                  <h1 style={{ fontSize: 28, fontWeight: 700, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
                    Student Dashboard
                  </h1>
                  <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 4 }}>
                    {dateStr} • {currentTime}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {/* Notification Bell */}
                <div style={{ position: 'relative' }}>
                  <button
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 16,
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: 'var(--text-secondary)'
                    }}
                  >
                    <Bell size={20} />
                  </button>
                  <span style={{
                    position: 'absolute',
                    top: -4,
                    right: -4,
                    width: 20,
                    height: 20,
                    background: '#ef4444',
                    borderRadius: '50%',
                    border: '2px solid var(--bg-primary)',
                    fontSize: 11,
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 600
                  }}>3</span>
                </div>

                {/* Admin Profile */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 12, 
                  background: 'var(--bg-card)', 
                  padding: '6px 20px 6px 12px', 
                  borderRadius: 40,
                  border: '1px solid var(--border)'
                }}>
                  <div style={{ 
                    width: 40, 
                    height: 40, 
                    borderRadius: 20, 
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    color: 'white', 
                    fontWeight: 600,
                    fontSize: 16
                  }}>
                    {(adminName || 'A')[0].toUpperCase()}
                  </div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{adminName || 'Admin'}</p>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Administrator</p>
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  className="action-button danger"
                  style={{ padding: '10px 20px' }}
                >
                  <LogOut size={16} />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
            gap: 20, 
            marginBottom: 24 
          }}>
            <div className="stat-card animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>Total Students</p>
                  <p style={{ fontSize: 40, fontWeight: 700, color: '#6366f1' }}>{stats.totalStudents}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                    <TrendingUp size={12} style={{ display: 'inline', marginRight: 4 }} />
                    +12% from last month
                  </p>
                </div>
                <div style={{ 
                  width: 56, 
                  height: 56, 
                  borderRadius: 18, 
                  background: 'rgba(99,102,241,0.1)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  animation: 'float 3s ease-in-out infinite'
                }}>
                  <Users size={28} color="#6366f1" />
                </div>
              </div>
            </div>

            <div className="stat-card animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>Branches</p>
                  <p style={{ fontSize: 40, fontWeight: 700, color: '#8b5cf6' }}>{stats.totalBranches}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>Different programs</p>
                </div>
                <div style={{ 
                  width: 56, 
                  height: 56, 
                  borderRadius: 18, 
                  background: 'rgba(139,92,246,0.1)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  animation: 'float 3s ease-in-out infinite'
                }}>
                  <BookOpen size={28} color="#8b5cf6" />
                </div>
              </div>
            </div>

            <div className="stat-card animate-fade-in" style={{ animationDelay: '0.3s' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>Route 1 Students</p>
                  <p style={{ fontSize: 40, fontWeight: 700, color: '#f97316' }}>{stats.route1Count}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>Amritsar Mandir route</p>
                </div>
                <div style={{ 
                  width: 56, 
                  height: 56, 
                  borderRadius: 18, 
                  background: 'rgba(249,115,22,0.1)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  animation: 'float 3s ease-in-out infinite'
                }}>
                  <Bus size={28} color="#f97316" />
                </div>
              </div>
            </div>

            <div className="stat-card animate-fade-in" style={{ animationDelay: '0.4s' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>Route 2 Students</p>
                  <p style={{ fontSize: 40, fontWeight: 700, color: '#06b6d4' }}>{stats.route2Count}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>City Center route</p>
                </div>
                <div style={{ 
                  width: 56, 
                  height: 56, 
                  borderRadius: 18, 
                  background: 'rgba(6,182,212,0.1)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  animation: 'float 3s ease-in-out infinite'
                }}>
                  <Bus size={28} color="#06b6d4" />
                </div>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div style={{ 
            background: 'var(--bg-card)',
            borderRadius: 24,
            padding: 24,
            marginBottom: 24,
            border: '1px solid var(--border)'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Search Bar */}
              <div className="search-bar" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Search size={20} color="var(--text-muted)" />
                <input
                  type="text"
                  placeholder="Search by name, USN, phone, or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    flex: 1,
                    border: 'none',
                    outline: 'none',
                    fontSize: 14,
                    background: 'transparent',
                    color: 'var(--text-primary)'
                  }}
                />
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')} 
                    style={{ 
                      border: 'none', 
                      background: 'none', 
                      cursor: 'pointer',
                      color: 'var(--text-muted)'
                    }}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              {/* Filter Row */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Filter size={14} />
                  Filters:
                </span>
                
                <select
                  value={branchFilter}
                  onChange={(e) => setBranchFilter(e.target.value)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 30,
                    border: '1px solid var(--border)',
                    background: 'var(--bg-primary)',
                    fontSize: 13,
                    color: 'var(--text-primary)',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="all">All Branches</option>
                  {getBranches().map(branch => (
                    <option key={branch} value={branch}>{branch}</option>
                  ))}
                </select>

                <select
                  value={routeFilter}
                  onChange={(e) => setRouteFilter(e.target.value)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 30,
                    border: '1px solid var(--border)',
                    background: 'var(--bg-primary)',
                    fontSize: 13,
                    color: 'var(--text-primary)',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="all">All Routes</option>
                  <option value="route1">Route 1 - Amritsar Mandir</option>
                  <option value="route2">Route 2 - City Center</option>
                  <option value="unassigned">Not Assigned</option>
                </select>

                {/* View Toggle */}
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => setViewMode('table')}
                    className={`action-button ${viewMode === 'table' ? 'primary' : ''}`}
                  >
                    Table View
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`action-button ${viewMode === 'grid' ? 'primary' : ''}`}
                  >
                    Grid View
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="action-button primary"
                >
                  <UserPlus size={16} />
                  Add New Student
                </button>

                <button
                  onClick={exportToCSV}
                  className="action-button"
                >
                  <Download size={16} />
                  Export CSV
                </button>

                <button
                  onClick={fetchStudents}
                  className="action-button"
                >
                  <RefreshCw size={16} />
                  Refresh
                </button>

                {selectedStudents.length > 0 && (
                  <button
                    onClick={deleteSelectedStudents}
                    className="action-button danger"
                  >
                    <Trash2 size={16} />
                    Delete Selected ({selectedStudents.length})
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Results Count */}
          <div style={{ 
            marginBottom: 16, 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            background: 'var(--bg-card)',
            padding: '12px 20px',
            borderRadius: 16,
            border: '1px solid var(--border)'
          }}>
            <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
              Showing <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{filteredStudents.length}</span> of{' '}
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{students.length}</span> students
            </p>
            {viewMode === 'table' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  checked={selectedStudents.length === filteredStudents.length && filteredStudents.length > 0}
                  onChange={toggleSelectAll}
                  style={{ width: 18, height: 18, cursor: 'pointer' }}
                />
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Select All</span>
              </div>
            )}
          </div>

          {/* Students Display - Table View */}
          {viewMode === 'table' && (
            <div style={{ 
              background: 'var(--bg-card)',
              borderRadius: 24,
              overflow: 'hidden',
              border: '1px solid var(--border)'
            }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1000 }}>
                  <thead className="table-header">
                    <tr>
                      <th style={{ padding: 16, textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                        <input
                          type="checkbox"
                          checked={selectedStudents.length === filteredStudents.length && filteredStudents.length > 0}
                          onChange={toggleSelectAll}
                          style={{ width: 18, height: 18, cursor: 'pointer' }}
                        />
                      </th>
                      <th style={{ padding: 16, textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>USN</th>
                      <th style={{ padding: 16, textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Name</th>
                      <th style={{ padding: 16, textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Branch</th>
                      <th style={{ padding: 16, textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Route</th>
                      <th style={{ padding: 16, textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Contact</th>
                      <th style={{ padding: 16, textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Password</th>
                      <th style={{ padding: 16, textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((student, index) => (
                      <tr 
                        key={student.id} 
                        className={`table-row ${selectedStudents.includes(student.id) ? 'selected' : ''}`}
                        style={{ animation: `fadeIn 0.3s ease ${index * 0.05}s both` }}
                      >
                        <td style={{ padding: 16, borderBottom: '1px solid var(--border)' }}>
                          <input
                            type="checkbox"
                            checked={selectedStudents.includes(student.id)}
                            onChange={() => toggleSelectStudent(student.id)}
                            style={{ width: 18, height: 18, cursor: 'pointer' }}
                          />
                        </td>
                        <td style={{ padding: 16, borderBottom: '1px solid var(--border)' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{student.usn}</span>
                        </td>
                        <td style={{ padding: 16, borderBottom: '1px solid var(--border)' }}>
                          <div>
                            <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{student.full_name}</div>
                            {student.email && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{student.email}</div>}
                          </div>
                        </td>
                        <td style={{ padding: 16, borderBottom: '1px solid var(--border)' }}>
                          {student.branch ? (
                            <span style={{ 
                              background: 'rgba(99,102,241,0.1)', 
                              color: '#6366f1', 
                              padding: '4px 10px', 
                              borderRadius: 20, 
                              fontSize: 11, 
                              fontWeight: 500 
                            }}>
                              {student.branch}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: 16, borderBottom: '1px solid var(--border)' }}>
                          {student.routes ? (
                            <div style={{
                              background: student.routes === 'route1' ? 'rgba(249,115,22,0.1)' : 'rgba(6,182,212,0.1)',
                              color: student.routes === 'route1' ? '#f97316' : '#06b6d4',
                              padding: '4px 12px',
                              borderRadius: 20,
                              fontSize: 11,
                              fontWeight: 500,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4
                            }}>
                              <Bus size={12} />
                              {student.routes === 'route1' ? 'Route 1' : 'Route 2'}
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Not Assigned</span>
                          )}
                        </td>
                        <td style={{ padding: 16, borderBottom: '1px solid var(--border)' }}>
                          {student.phone ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Phone size={12} color="var(--text-muted)" />
                              <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{student.phone}</span>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: 16, borderBottom: '1px solid var(--border)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontFamily: 'monospace', fontSize: 13, color: 'var(--text-primary)' }}>
                              {showPassword[student.id] ? student.password || 'Not set' : '••••••••'}
                            </span>
                            <button
                              onClick={() => togglePasswordVisibility(student.id)}
                              style={{ 
                                border: 'none', 
                                background: 'none', 
                                cursor: 'pointer', 
                                color: 'var(--text-muted)',
                                padding: 4
                              }}
                            >
                              {showPassword[student.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                          </div>
                        </td>
                        <td style={{ padding: 16, borderBottom: '1px solid var(--border)' }}>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              onClick={() => openEditForm(student)}
                              style={{
                                padding: 8,
                                borderRadius: 10,
                                border: 'none',
                                background: 'rgba(99,102,241,0.1)',
                                color: '#6366f1',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s ease'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(99,102,241,0.2)'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(99,102,241,0.1)'}
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              onClick={() => deleteStudent(student.id)}
                              style={{
                                padding: 8,
                                borderRadius: 10,
                                border: 'none',
                                background: 'rgba(239,68,68,0.1)',
                                color: '#ef4444',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s ease'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239,68,68,0.2)'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredStudents.length === 0 && (
                <div style={{ textAlign: 'center', padding: 60 }}>
                  <Users size={48} color="var(--text-muted)" style={{ marginBottom: 16 }} />
                  <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>No Students Found</h3>
                  <p style={{ color: 'var(--text-muted)' }}>Try adjusting your search or filter criteria</p>
                </div>
              )}
            </div>
          )}

          {/* Students Display - Grid View */}
          {viewMode === 'grid' && (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
              gap: 20 
            }}>
              {filteredStudents.map((student, index) => (
                <div 
                  key={student.id} 
                  className="student-card"
                  style={{ animation: `fadeIn 0.3s ease ${index * 0.05}s both` }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{
                        width: 56,
                        height: 56,
                        borderRadius: 18,
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: 24,
                        fontWeight: 600,
                        boxShadow: '0 4px 6px -1px rgba(99,102,241,0.3)'
                      }}>
                        {student.full_name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>{student.full_name}</h3>
                        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{student.usn}</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => openEditForm(student)}
                        style={{
                          padding: 8,
                          borderRadius: 10,
                          border: 'none',
                          background: 'rgba(99,102,241,0.1)',
                          color: '#6366f1',
                          cursor: 'pointer'
                        }}
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => deleteStudent(student.id)}
                        style={{
                          padding: 8,
                          borderRadius: 10,
                          border: 'none',
                          background: 'rgba(239,68,68,0.1)',
                          color: '#ef4444',
                          cursor: 'pointer'
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div style={{ marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {student.branch && (
                      <span style={{ 
                        background: 'rgba(99,102,241,0.1)', 
                        color: '#6366f1', 
                        padding: '4px 12px', 
                        borderRadius: 20, 
                        fontSize: 11, 
                        fontWeight: 500 
                      }}>
                        {student.branch}
                      </span>
                    )}
                    {student.routes && (
                      <span style={{
                        background: student.routes === 'route1' ? 'rgba(249,115,22,0.1)' : 'rgba(6,182,212,0.1)',
                        color: student.routes === 'route1' ? '#f97316' : '#06b6d4',
                        padding: '4px 12px',
                        borderRadius: 20,
                        fontSize: 11,
                        fontWeight: 500,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4
                      }}>
                        <Bus size={10} />
                        {student.routes === 'route1' ? 'Route 1' : 'Route 2'}
                      </span>
                    )}
                    {student.semester && (
                      <span style={{ 
                        background: 'rgba(255,255,255,0.05)', 
                        color: 'var(--text-muted)', 
                        padding: '4px 12px', 
                        borderRadius: 20, 
                        fontSize: 11, 
                        fontWeight: 500 
                      }}>
                        Sem {student.semester}
                      </span>
                    )}
                  </div>

                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      {student.phone && (
                        <div>
                          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Phone</p>
                          <p style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-primary)' }}>
                            <Phone size={12} color="var(--text-muted)" />
                            {student.phone}
                          </p>
                        </div>
                      )}
                      {student.email && (
                        <div>
                          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Email</p>
                          <p style={{ fontSize: 13, color: 'var(--text-primary)' }}>{student.email}</p>
                        </div>
                      )}
                      <div>
                        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Password</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Key size={12} color="var(--text-muted)" />
                          <span style={{ fontSize: 13, fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                            {showPassword[student.id] ? student.password || 'Not set' : '••••••••'}
                          </span>
                          <button
                            onClick={() => togglePasswordVisibility(student.id)}
                            style={{ border: 'none', background: 'none', cursor: 'pointer', marginLeft: 4 }}
                          >
                            {showPassword[student.id] ? <EyeOff size={12} color="var(--text-muted)" /> : <Eye size={12} color="var(--text-muted)" />}
                          </button>
                        </div>
                      </div>
                      {student.enrollment_year && (
                        <div>
                          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Enrolled</p>
                          <p style={{ fontSize: 13, color: 'var(--text-primary)' }}>{student.enrollment_year}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {filteredStudents.length === 0 && (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 60, background: 'var(--bg-card)', borderRadius: 24, border: '1px solid var(--border)' }}>
                  <Users size={48} color="var(--text-muted)" style={{ marginBottom: 16 }} />
                  <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>No Students Found</h3>
                  <p style={{ color: 'var(--text-muted)' }}>Try adjusting your search or filter criteria</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Toast Notification */}
      {toast.show && (
        <div style={{
          position: 'fixed',
          top: 20,
          right: 20,
          zIndex: 1000,
          animation: 'slideIn 0.3s ease'
        }}>
          <div style={{
            background: toast.type === 'success' ? '#10b981' : '#ef4444',
            color: 'white',
            padding: '14px 24px',
            borderRadius: 16,
            boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            minWidth: 320,
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            {toast.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
            <span style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{toast.message}</span>
            <button
              onClick={() => setToast({ show: false, message: '', type: 'success' })}
              style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Add/Edit Student Modal */}
      {(showAddForm || editingStudent) && (
        <div className="modal-backdrop">
          <div className="modal-content">
            {/* Modal Header */}
            <div style={{
              padding: 24,
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h3 style={{ fontSize: 24, fontWeight: 700, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  {editingStudent ? 'Edit Student' : 'Add New Student'}
                </h3>
                <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 4 }}>
                  {editingStudent ? 'Update student information' : 'Enter details to add a new student'}
                </p>
              </div>
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
                    routes: '',
                    email: '',
                    semester: '',
                    enrollment_year: ''
                  });
                }}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  border: '1px solid var(--border)',
                  background: 'var(--bg-card)',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--bg-card-hover)';
                  e.currentTarget.style.color = '#ef4444';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--bg-card)';
                  e.currentTarget.style.color = 'var(--text-muted)';
                }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={editingStudent ? handleEditStudent : handleAddStudent} style={{ padding: 24 }}>
              {/* Required Fields Notice */}
              <div style={{
                background: 'rgba(99,102,241,0.1)',
                borderRadius: 16,
                padding: 16,
                marginBottom: 24,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                border: '1px solid rgba(99,102,241,0.2)'
              }}>
                <AlertCircle size={20} color="#6366f1" />
                <p style={{ fontSize: 14, color: '#6366f1', fontWeight: 500 }}>
                  Fields marked with <span style={{ color: '#ef4444' }}>*</span> are required
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                {/* Full Name */}
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 6 }}>
                    Full Name <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newStudent.full_name}
                    onChange={(e) => setNewStudent(prev => ({ ...prev, full_name: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid var(--border)',
                      borderRadius: 16,
                      fontSize: 14,
                      outline: 'none',
                      transition: 'all 0.2s ease',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                    placeholder="Enter student's full name"
                  />
                </div>

                {/* USN */}
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 6 }}>
                    USN <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newStudent.usn}
                    onChange={(e) => setNewStudent(prev => ({ ...prev, usn: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid var(--border)',
                      borderRadius: 16,
                      fontSize: 14,
                      outline: 'none',
                      transition: 'all 0.2s ease',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                    placeholder="e.g., 1SI21CS001"
                  />
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Must be unique</p>
                </div>

                {/* Branch */}
                <div>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 6 }}>Branch</label>
                  <input
                    type="text"
                    value={newStudent.branch}
                    onChange={(e) => setNewStudent(prev => ({ ...prev, branch: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid var(--border)',
                      borderRadius: 16,
                      fontSize: 14,
                      outline: 'none',
                      transition: 'all 0.2s ease',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                    placeholder="e.g., Computer Science"
                  />
                </div>

                {/* Semester */}
                <div>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 6 }}>Semester</label>
                  <select
                    value={newStudent.semester}
                    onChange={(e) => setNewStudent(prev => ({ ...prev, semester: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid var(--border)',
                      borderRadius: 16,
                      fontSize: 14,
                      outline: 'none',
                      transition: 'all 0.2s ease',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)'
                    }}
                  >
                    <option value="">Select Semester</option>
                    <option value="1">1st Semester</option>
                    <option value="2">2nd Semester</option>
                    <option value="3">3rd Semester</option>
                    <option value="4">4th Semester</option>
                    <option value="5">5th Semester</option>
                    <option value="6">6th Semester</option>
                    <option value="7">7th Semester</option>
                    <option value="8">8th Semester</option>
                  </select>
                </div>

                {/* Email */}
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 6 }}>Email</label>
                  <input
                    type="email"
                    value={newStudent.email}
                    onChange={(e) => setNewStudent(prev => ({ ...prev, email: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid var(--border)',
                      borderRadius: 16,
                      fontSize: 14,
                      outline: 'none',
                      transition: 'all 0.2s ease',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                    placeholder="student@example.com"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 6 }}>Phone Number</label>
                  <input
                    type="tel"
                    value={newStudent.phone}
                    onChange={(e) => setNewStudent(prev => ({ ...prev, phone: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid var(--border)',
                      borderRadius: 16,
                      fontSize: 14,
                      outline: 'none',
                      transition: 'all 0.2s ease',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                    placeholder="Enter phone number"
                  />
                </div>

                {/* Enrollment Year */}
                <div>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 6 }}>Enrollment Year</label>
                  <input
                    type="text"
                    value={newStudent.enrollment_year}
                    onChange={(e) => setNewStudent(prev => ({ ...prev, enrollment_year: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid var(--border)',
                      borderRadius: 16,
                      fontSize: 14,
                      outline: 'none',
                      transition: 'all 0.2s ease',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                    placeholder="e.g., 2024"
                  />
                </div>

                {/* Route */}
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 6 }}>Bus Route</label>
                  <select
                    value={newStudent.routes}
                    onChange={(e) => setNewStudent(prev => ({ ...prev, routes: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid var(--border)',
                      borderRadius: 16,
                      fontSize: 14,
                      outline: 'none',
                      transition: 'all 0.2s ease',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)'
                    }}
                  >
                    <option value="">Not Assigned</option>
                    <option value="route1">Route 1 - Amritsar Mandir</option>
                    <option value="route2">Route 2 - City Center</option>
                  </select>
                </div>

                {/* Password */}
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 6 }}>
                    Password {!editingStudent && <span style={{ color: '#ef4444' }}>*</span>}
                    {editingStudent && <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>(Leave blank to keep current)</span>}
                  </label>
                  <input
                    type="password"
                    required={!editingStudent}
                    value={newStudent.password}
                    onChange={(e) => setNewStudent(prev => ({ ...prev, password: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid var(--border)',
                      borderRadius: 16,
                      fontSize: 14,
                      outline: 'none',
                      transition: 'all 0.2s ease',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                    placeholder={editingStudent ? "Enter new password (optional)" : "Enter student password"}
                  />
                </div>
              </div>

              {/* Form Actions */}
              <div style={{
                marginTop: 24,
                paddingTop: 20,
                borderTop: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 12
              }}>
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
                      routes: '',
                      email: '',
                      semester: '',
                      enrollment_year: ''
                    });
                  }}
                  className="action-button"
                  style={{ padding: '12px 24px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="action-button primary"
                  style={{ padding: '12px 24px' }}
                >
                  <Save size={16} style={{ marginRight: 6 }} />
                  {editingStudent ? 'Update Student' : 'Add Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Add Button for Mobile */}
      <div style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        display: 'none',
        zIndex: 40
      }}>
        <button
          onClick={() => setShowAddForm(true)}
          style={{
            width: 60,
            height: 60,
            borderRadius: 30,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: 'white',
            border: 'none',
            boxShadow: '0 10px 25px rgba(99,102,241,0.4)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <Plus size={24} />
        </button>
      </div>

      <style jsx>{`
        @media (max-width: 768px) {
          .floating-btn {
            display: flex !important;
          }
        }
      `}</style>
    </>
  );
}