'use client';

import { useState, useEffect } from 'react';
import { 
  CreditCard, Search, Filter, Download, CheckCircle, XCircle, 
  IndianRupee, Edit, Mail, Phone, X, Calendar, ArrowLeft, Menu,
  TrendingUp, PieChart, Clock, AlertCircle, ChevronDown, 
  BarChart3, Users, Wallet, Receipt, Bell, DollarSign,
  MoreVertical, Eye, Printer, Send, FileText, Shield,
  Award, Target, BookOpen, GraduationCap, Layers,
  Moon, Sun, Settings, LogOut, UserCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/navigation';
import withAuth from '../../components/withAuth';

function FeesManagement() {
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [feeFilter, setFeeFilter] = useState('all');
  const [showFeeForm, setShowFeeForm] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [feeData, setFeeData] = useState({
    total_fees: '',
    paid_amount: '',
    due_amount: '',
    last_payment_date: '',
    next_payment_date: '',
    payment_mode: ''
  });
  const [loading, setLoading] = useState(true);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [darkMode, setDarkMode] = useState(true);

  const router = useRouter();

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    filterStudents();
  }, [students, searchTerm, feeFilter, selectedPeriod]);

  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .order('usn');

      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterStudents = () => {
    let filtered = students;

    if (searchTerm && searchTerm.trim() !== '') {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(student => {
        const fullName = student.full_name ? student.full_name.toLowerCase() : '';
        const usn = student.usn ? student.usn.toLowerCase() : '';
        const branch = student.branch ? student.branch.toLowerCase() : '';
        const email = student.email ? student.email.toLowerCase() : '';
        
        return fullName.includes(searchLower) ||
               usn.includes(searchLower) ||
               branch.includes(searchLower) ||
               email.includes(searchLower);
      });
    }

    if (feeFilter === 'paid') {
      filtered = filtered.filter(student => {
        const total = parseFloat(student.total_fees) || 0;
        const paid = parseFloat(student.paid_amount) || 0;
        const due = parseFloat(student.due_amount) || 0;
        return total > 0 && due === 0 && paid > 0;
      });
    } 
    else if (feeFilter === 'partial') {
      filtered = filtered.filter(student => {
        const total = parseFloat(student.total_fees) || 0;
        const paid = parseFloat(student.paid_amount) || 0;
        const due = parseFloat(student.due_amount) || 0;
        return total > 0 && paid > 0 && due > 0;
      });
    } 
    else if (feeFilter === 'due') {
      filtered = filtered.filter(student => {
        const total = parseFloat(student.total_fees) || 0;
        const paid = parseFloat(student.paid_amount) || 0;
        const due = parseFloat(student.due_amount) || 0;
        return total > 0 && paid === 0 && due > 0;
      });
    }
    else if (feeFilter === 'not-set') {
      filtered = filtered.filter(student => {
        const total = parseFloat(student.total_fees) || 0;
        return total === 0;
      });
    }

    if (selectedPeriod === 'upcoming') {
      filtered = filtered.filter(student => 
        student.next_payment_date && isUpcomingPayment(student.next_payment_date)
      );
    } else if (selectedPeriod === 'overdue') {
      filtered = filtered.filter(student => {
        if (!student.next_payment_date) return false;
        return new Date(student.next_payment_date) < new Date();
      });
    }

    setFilteredStudents(filtered);
  };

  const handleFeeSubmit = async (e) => {
    e.preventDefault();
    try {
      const total = parseFloat(feeData.total_fees) || 0;
      const paid = parseFloat(feeData.paid_amount) || 0;
      const due = total - paid;

      const updateData = {
        total_fees: total,
        paid_amount: paid,
        due_amount: due > 0 ? due : 0,
        fees_due: due > 0,
        last_payment_date: feeData.last_payment_date || null,
        next_payment_date: feeData.next_payment_date || null,
        payment_mode: feeData.payment_mode || null,
        last_updated: new Date().toISOString()
      };

      const { error } = await supabase
        .from('students')
        .update(updateData)
        .eq('id', selectedStudent.id);

      if (error) throw error;

      setShowFeeForm(false);
      setSelectedStudent(null);
      setFeeData({
        total_fees: '',
        paid_amount: '',
        due_amount: '',
        last_payment_date: '',
        next_payment_date: '',
        payment_mode: ''
      });
      fetchStudents();
    } catch (error) {
      console.error('Error updating fee details:', error);
      alert('Error updating fee details: ' + error.message);
    }
  };

  const openFeeForm = (student) => {
    setSelectedStudent(student);
    setFeeData({
      total_fees: student.total_fees || '',
      paid_amount: student.paid_amount || '',
      due_amount: student.due_amount || '',
      last_payment_date: student.last_payment_date || '',
      next_payment_date: student.next_payment_date || '',
      payment_mode: student.payment_mode || ''
    });
    setShowFeeForm(true);
  };

  const calculateDue = () => {
    const total = parseFloat(feeData.total_fees) || 0;
    const paid = parseFloat(feeData.paid_amount) || 0;
    const due = total - paid;
    setFeeData(prev => ({
      ...prev,
      due_amount: due > 0 ? due.toString() : '0'
    }));
  };

  const getFeesStatusColor = (student) => {
    const total = parseFloat(student.total_fees) || 0;
    const paid = parseFloat(student.paid_amount) || 0;
    const due = parseFloat(student.due_amount) || 0;

    if (total === 0) {
      return 'bg-gray-800/50 text-gray-400 border-gray-700';
    }
    
    if (due === 0 && paid > 0) {
      return 'bg-emerald-900/30 text-emerald-400 border-emerald-800/50';
    } else if (paid > 0 && due > 0) {
      return 'bg-amber-900/30 text-amber-400 border-amber-800/50';
    } else if (due > 0 && paid === 0) {
      return 'bg-rose-900/30 text-rose-400 border-rose-800/50';
    } else {
      return 'bg-gray-800/50 text-gray-400 border-gray-700';
    }
  };

  const getFeesStatusText = (student) => {
    const total = parseFloat(student.total_fees) || 0;
    const paid = parseFloat(student.paid_amount) || 0;
    const due = parseFloat(student.due_amount) || 0;

    if (total === 0) return 'Not Configured';
    if (due === 0 && paid > 0) return 'Fully Paid';
    if (paid > 0 && due > 0) return 'Partial Payment';
    if (due > 0 && paid === 0) return 'Payment Due';
    return 'Pending';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const isUpcomingPayment = (dateString) => {
    if (!dateString) return false;
    const paymentDate = new Date(dateString);
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    return paymentDate >= today && paymentDate <= nextWeek;
  };

  const exportToCSV = () => {
    const headers = [
      'USN', 'Name', 'Branch', 'Class', 'Division', 'Email', 'Phone',
      'Total Fees (₹)', 'Paid Amount (₹)', 'Due Amount (₹)', 'Fee Status',
      'Last Payment Date', 'Next Payment Date', 'Payment Mode', 'Last Updated'
    ];
    
    const csvData = filteredStudents.map(student => [
      student.usn || '',
      student.full_name || '',
      student.branch || 'N/A',
      student.class || '',
      student.division || '',
      student.email || '',
      student.phone || '',
      student.total_fees || '0',
      student.paid_amount || '0',
      student.due_amount || '0',
      getFeesStatusText(student),
      student.last_payment_date || 'N/A',
      student.next_payment_date || 'N/A',
      student.payment_mode || 'N/A',
      student.last_updated ? new Date(student.last_updated).toLocaleDateString() : 'N/A'
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `fee_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBack = () => {
    router.back();
  };

  const toggleStudentSelection = (studentId) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const selectAllStudents = () => {
    if (selectedStudents.length === filteredStudents.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(filteredStudents.map(s => s.id));
    }
  };

  const totalStudents = students.length;
  
  const paidStudents = students.filter(student => {
    const total = parseFloat(student.total_fees) || 0;
    const paid = parseFloat(student.paid_amount) || 0;
    const due = parseFloat(student.due_amount) || 0;
    return total > 0 && due === 0 && paid > 0;
  }).length;

  const partialPaidStudents = students.filter(student => {
    const total = parseFloat(student.total_fees) || 0;
    const paid = parseFloat(student.paid_amount) || 0;
    const due = parseFloat(student.due_amount) || 0;
    return total > 0 && paid > 0 && due > 0;
  }).length;

  const dueStudents = students.filter(student => {
    const total = parseFloat(student.total_fees) || 0;
    const paid = parseFloat(student.paid_amount) || 0;
    const due = parseFloat(student.due_amount) || 0;
    return total > 0 && paid === 0 && due > 0;
  }).length;
  
  const totalFees = students.reduce((sum, student) => sum + (parseFloat(student.total_fees) || 0), 0);
  const totalPaid = students.reduce((sum, student) => sum + (parseFloat(student.paid_amount) || 0), 0);
  const totalDue = students.reduce((sum, student) => sum + (parseFloat(student.due_amount) || 0), 0);

  const collectionRate = totalFees > 0 ? ((totalPaid / totalFees) * 100).toFixed(1) : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-700 border-t-indigo-500"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-8 w-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Dark decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-indigo-600/10 to-purple-600/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-emerald-600/10 to-teal-600/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-amber-600/5 to-orange-600/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
        <div className="space-y-6 lg:space-y-8">
          {/* Enhanced Dark Header */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBack}
                className="group flex items-center text-gray-400 hover:text-indigo-400 transition-all p-2 rounded-xl hover:bg-gray-800/50 backdrop-blur-sm border border-gray-800 hover:border-indigo-500/30"
              >
                <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
              </button>
              <div>
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl shadow-lg shadow-indigo-600/20">
                    <Wallet className="text-white" size={24} />
                  </div>
                  <div>
                    <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                      Fee Management
                    </h1>
                    <p className="text-gray-400 text-sm mt-1 flex items-center gap-2">
                      <span>Comprehensive fee tracking & management</span>
                      <span className="w-1 h-1 bg-gray-600 rounded-full"></span>
                      <span className="text-indigo-400 font-medium">{filteredStudents.length} students</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-3 w-full lg:w-auto">
              <button
                onClick={exportToCSV}
                className="flex items-center gap-2 px-4 py-2.5 bg-gray-800/80 backdrop-blur-sm border border-gray-700 rounded-xl text-gray-300 hover:bg-indigo-600/20 hover:border-indigo-500 hover:text-indigo-400 transition-all shadow-lg hover:shadow-indigo-600/10 group"
              >
                <Download size={18} className="group-hover:-translate-y-0.5 transition-transform" />
                <span className="text-sm font-medium">Export Report</span>
              </button>
            </div>
          </div>

          {/* Dark Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="group relative bg-gray-800/50 backdrop-blur-xl rounded-2xl shadow-xl hover:shadow-2xl transition-all border border-gray-700/50 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/10 to-purple-600/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-xl shadow-lg shadow-indigo-600/20">
                    <Users className="text-white" size={20} />
                  </div>
                  <span className="text-xs font-medium text-indigo-400 bg-indigo-950/50 px-2 py-1 rounded-full border border-indigo-800/50">Total</span>
                </div>
                <h3 className="text-3xl font-bold text-white mb-1">{totalStudents}</h3>
                <p className="text-sm text-gray-400">Enrolled Students</p>
                <div className="mt-3 flex items-center gap-2 text-xs">
                  <span className="text-emerald-400 font-medium">↑ 12%</span>
                  <span className="text-gray-500">vs last month</span>
                </div>
              </div>
            </div>

            <div className="group relative bg-gray-800/50 backdrop-blur-xl rounded-2xl shadow-xl hover:shadow-2xl transition-all border border-gray-700/50 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/10 to-teal-600/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-xl shadow-lg shadow-emerald-600/20">
                    <TrendingUp className="text-white" size={20} />
                  </div>
                  <span className="text-xs font-medium text-emerald-400 bg-emerald-950/50 px-2 py-1 rounded-full border border-emerald-800/50">{collectionRate}%</span>
                </div>
                <h3 className="text-3xl font-bold text-white mb-1">₹{totalPaid.toLocaleString('en-IN')}</h3>
                <p className="text-sm text-gray-400">Total Collected</p>
                <div className="mt-3 flex items-center gap-2 text-xs">
                  <span className="text-emerald-400 font-medium">↑ 8.2%</span>
                  <span className="text-gray-500">collection rate</span>
                </div>
              </div>
            </div>

            <div className="group relative bg-gray-800/50 backdrop-blur-xl rounded-2xl shadow-xl hover:shadow-2xl transition-all border border-gray-700/50 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-600/10 to-orange-600/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-amber-600 to-orange-600 rounded-xl shadow-lg shadow-amber-600/20">
                    <Clock className="text-white" size={20} />
                  </div>
                  <span className="text-xs font-medium text-amber-400 bg-amber-950/50 px-2 py-1 rounded-full border border-amber-800/50">Pending</span>
                </div>
                <h3 className="text-3xl font-bold text-white mb-1">₹{totalDue.toLocaleString('en-IN')}</h3>
                <p className="text-sm text-gray-400">Outstanding Amount</p>
                <div className="mt-3 flex items-center gap-2 text-xs">
                  <span className="text-amber-400 font-medium">{dueStudents} students</span>
                  <span className="text-gray-500">need attention</span>
                </div>
              </div>
            </div>

            <div className="group relative bg-gray-800/50 backdrop-blur-xl rounded-2xl shadow-xl hover:shadow-2xl transition-all border border-gray-700/50 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 to-pink-600/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl shadow-lg shadow-purple-600/20">
                    <Award className="text-white" size={20} />
                  </div>
                  <span className="text-xs font-medium text-purple-400 bg-purple-950/50 px-2 py-1 rounded-full border border-purple-800/50">Performance</span>
                </div>
                <h3 className="text-3xl font-bold text-white mb-1">{paidStudents}</h3>
                <p className="text-sm text-gray-400">Fully Paid Students</p>
                <div className="mt-3 flex items-center gap-2 text-xs">
                  <span className="text-purple-400 font-medium">{((paidStudents/totalStudents)*100).toFixed(1)}%</span>
                  <span className="text-gray-500">completion rate</span>
                </div>
              </div>
            </div>
          </div>

          {/* Dark Financial Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-indigo-950 to-indigo-900 rounded-2xl p-6 shadow-xl shadow-indigo-900/30 border border-indigo-800/50">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-indigo-800/50 rounded-lg backdrop-blur-sm border border-indigo-700/50">
                  <Receipt className="text-indigo-300" size={20} />
                </div>
                <span className="text-indigo-300/80 text-sm">Total Fees</span>
              </div>
              <p className="text-3xl font-bold text-white mb-2">₹{totalFees.toLocaleString('en-IN')}</p>
              <div className="flex items-center gap-2 text-indigo-300/60 text-sm">
                <BarChart3 size={14} />
                <span>Annual collection target</span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-emerald-950 to-emerald-900 rounded-2xl p-6 shadow-xl shadow-emerald-900/30 border border-emerald-800/50">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-emerald-800/50 rounded-lg backdrop-blur-sm border border-emerald-700/50">
                  <CheckCircle className="text-emerald-300" size={20} />
                </div>
                <span className="text-emerald-300/80 text-sm">Collected</span>
              </div>
              <p className="text-3xl font-bold text-white mb-2">₹{totalPaid.toLocaleString('en-IN')}</p>
              <div className="flex items-center gap-2 text-emerald-300/60 text-sm">
                <TrendingUp size={14} />
                <span>{collectionRate}% of total fees</span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-amber-950 to-amber-900 rounded-2xl p-6 shadow-xl shadow-amber-900/30 border border-amber-800/50">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-amber-800/50 rounded-lg backdrop-blur-sm border border-amber-700/50">
                  <AlertCircle className="text-amber-300" size={20} />
                </div>
                <span className="text-amber-300/80 text-sm">Outstanding</span>
              </div>
              <p className="text-3xl font-bold text-white mb-2">₹{totalDue.toLocaleString('en-IN')}</p>
              <div className="flex items-center gap-2 text-amber-300/60 text-sm">
                <Clock size={14} />
                <span>Due from {dueStudents} students</span>
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
                  placeholder="Search by name, USN, email, or branch..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-200 placeholder-gray-500 transition-all"
                />
              </div>
              
              <div className="flex flex-wrap gap-3">
                <select
                  value={feeFilter}
                  onChange={(e) => setFeeFilter(e.target.value)}
                  className="px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-gray-200 cursor-pointer min-w-[140px]"
                >
                  <option value="all">All Status</option>
                  <option value="paid">Fully Paid</option>
                  <option value="partial">Partial Payment</option>
                  <option value="due">Payment Due</option>
                  <option value="not-set">Not Configured</option>
                </select>

                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-gray-200 cursor-pointer min-w-[140px]"
                >
                  <option value="all">All Periods</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="overdue">Overdue</option>
                </select>

                <button
                  onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                  className="px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-gray-400 hover:bg-indigo-600/20 hover:border-indigo-500 hover:text-indigo-400 transition-all"
                >
                  <Layers size={18} />
                </button>
              </div>
            </div>

            {/* Dark Quick Filters */}
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-700/50">
              <span className="text-xs font-medium text-gray-500 py-1">Quick filters:</span>
              <button
                onClick={() => setFeeFilter('paid')}
                className="px-3 py-1 bg-emerald-950/50 text-emerald-400 rounded-lg text-xs font-medium hover:bg-emerald-900/50 transition-colors border border-emerald-800/50"
              >
                Fully Paid ({paidStudents})
              </button>
              <button
                onClick={() => setFeeFilter('partial')}
                className="px-3 py-1 bg-amber-950/50 text-amber-400 rounded-lg text-xs font-medium hover:bg-amber-900/50 transition-colors border border-amber-800/50"
              >
                Partial ({partialPaidStudents})
              </button>
              <button
                onClick={() => setFeeFilter('due')}
                className="px-3 py-1 bg-rose-950/50 text-rose-400 rounded-lg text-xs font-medium hover:bg-rose-900/50 transition-colors border border-rose-800/50"
              >
                Due ({dueStudents})
              </button>
            </div>
          </div>

          {/* Dark Grid View */}
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredStudents.map((student) => (
                <div
                  key={student.id}
                  className="group relative bg-gray-800/50 backdrop-blur-xl rounded-2xl shadow-xl hover:shadow-2xl transition-all border border-gray-700/50 overflow-hidden"
                >
                  {/* Status Indicator */}
                  <div className={`absolute top-0 left-0 w-1 h-full ${
                    getFeesStatusText(student).includes('Paid') ? 'bg-gradient-to-b from-emerald-500 to-emerald-600' :
                    getFeesStatusText(student).includes('Partial') ? 'bg-gradient-to-b from-amber-500 to-amber-600' :
                    getFeesStatusText(student).includes('Due') ? 'bg-gradient-to-b from-rose-500 to-rose-600' :
                    'bg-gradient-to-b from-gray-600 to-gray-700'
                  }`}></div>

                  <div className="p-6 pl-7">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
                          <GraduationCap className="text-white" size={20} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-200">{student.full_name}</h3>
                          <p className="text-xs text-gray-500">{student.usn}</p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${getFeesStatusColor(student)}`}>
                        {getFeesStatusText(student)}
                      </span>
                    </div>

                    {/* Details */}
                    <div className="space-y-3 mb-4">
                      <div className="flex items-center gap-2 text-sm">
                        <BookOpen size={14} className="text-gray-600" />
                        <span className="text-gray-400">{student.branch} • {student.class}-{student.division}</span>
                      </div>
                      
                      {/* Fee Progress Bar */}
                      {parseFloat(student.total_fees) > 0 && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-500">Payment Progress</span>
                            <span className="font-medium text-gray-300">
                              {((parseFloat(student.paid_amount) / parseFloat(student.total_fees)) * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${
                                parseFloat(student.due_amount) === 0 ? 'bg-gradient-to-r from-emerald-500 to-emerald-600' :
                                parseFloat(student.paid_amount) > 0 ? 'bg-gradient-to-r from-amber-500 to-amber-600' :
                                'bg-gradient-to-r from-rose-500 to-rose-600'
                              }`}
                              style={{ width: `${(parseFloat(student.paid_amount) / parseFloat(student.total_fees)) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      )}

                      {/* Fee Amounts */}
                      <div className="grid grid-cols-3 gap-2 pt-2">
                        <div className="text-center p-2 bg-gray-900/50 rounded-lg border border-gray-700/50">
                          <p className="text-xs text-gray-500">Total</p>
                          <p className="font-bold text-gray-300">₹{student.total_fees || '0'}</p>
                        </div>
                        <div className="text-center p-2 bg-emerald-950/30 rounded-lg border border-emerald-800/50">
                          <p className="text-xs text-emerald-400">Paid</p>
                          <p className="font-bold text-emerald-300">₹{student.paid_amount || '0'}</p>
                        </div>
                        <div className="text-center p-2 bg-rose-950/30 rounded-lg border border-rose-800/50">
                          <p className="text-xs text-rose-400">Due</p>
                          <p className="font-bold text-rose-300">₹{student.due_amount || '0'}</p>
                        </div>
                      </div>

                      {/* Next Payment */}
                      {student.next_payment_date && (
                        <div className={`flex items-center gap-2 text-xs p-2 rounded-lg ${
                          isUpcomingPayment(student.next_payment_date) 
                            ? 'bg-amber-950/30 text-amber-400 border border-amber-800/50' 
                            : 'bg-gray-900/50 text-gray-400 border border-gray-700/50'
                        }`}>
                          <Calendar size={12} />
                          <span>Next payment: {formatDate(student.next_payment_date)}</span>
                          {isUpcomingPayment(student.next_payment_date) && (
                            <span className="ml-auto text-xs bg-amber-950 text-amber-400 px-2 py-0.5 rounded-full border border-amber-700">Upcoming</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions - Only Edit button remains */}
                    <div className="flex justify-end gap-2 pt-3 border-t border-gray-700/50">
                      <button
                        onClick={() => openFeeForm(student)}
                        className="p-2 text-indigo-400 hover:bg-indigo-600/20 rounded-lg transition-colors"
                        title="Edit Fee Details"
                      >
                        <Edit size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
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
                          checked={selectedStudents.length === filteredStudents.length}
                          onChange={selectAllStudents}
                          className="rounded bg-gray-800 border-gray-600 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-gray-800"
                        />
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Student</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Branch</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Total</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Paid</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Due</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Next Payment</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700/50">
                    {filteredStudents.map((student) => (
                      <tr key={student.id} className="hover:bg-gray-700/30 transition-colors">
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            checked={selectedStudents.includes(student.id)}
                            onChange={() => toggleStudentSelection(student.id)}
                            className="rounded bg-gray-800 border-gray-600 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-gray-800"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
                              <GraduationCap className="text-white" size={14} />
                            </div>
                            <div>
                              <p className="font-medium text-gray-200">{student.full_name}</p>
                              <p className="text-xs text-gray-500">{student.usn}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-400">{student.branch}</td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-300">₹{student.total_fees || '0'}</td>
                        <td className="px-6 py-4 text-sm font-medium text-emerald-400">₹{student.paid_amount || '0'}</td>
                        <td className="px-6 py-4 text-sm font-medium text-rose-400">₹{student.due_amount || '0'}</td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${getFeesStatusColor(student)}`}>
                            {getFeesStatusText(student)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-400">
                          {formatDate(student.next_payment_date)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => openFeeForm(student)}
                              className="p-1.5 text-indigo-400 hover:bg-indigo-600/20 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Dark Empty State */}
          {filteredStudents.length === 0 && (
            <div className="text-center py-12 bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700/50">
              <div className="w-20 h-20 bg-gradient-to-br from-indigo-600/20 to-purple-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-indigo-500/30">
                <Receipt className="text-indigo-400" size={32} />
              </div>
              <h3 className="text-lg font-semibold text-gray-200 mb-2">No Students Found</h3>
              <p className="text-gray-400 mb-4">Try adjusting your search or filter criteria</p>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFeeFilter('all');
                  setSelectedPeriod('all');
                }}
                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-colors shadow-lg shadow-indigo-600/20"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Dark Fee Modal */}
      {showFeeForm && selectedStudent && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl">
                    <Wallet className="text-white" size={20} />
                  </div>
                  <h3 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                    Update Fee Details
                  </h3>
                </div>
                <button 
                  onClick={() => setShowFeeForm(false)} 
                  className="p-2 text-gray-400 hover:text-gray-300 hover:bg-gray-700 rounded-lg transition-all"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="mb-6 p-4 bg-gradient-to-br from-indigo-950 to-purple-950 rounded-xl border border-indigo-800/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center shadow-sm border border-gray-600">
                    <GraduationCap className="text-indigo-400" size={18} />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-200">{selectedStudent.full_name}</p>
                    <p className="text-sm text-gray-400">{selectedStudent.usn} • {selectedStudent.branch}</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleFeeSubmit} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Total Fees (₹)</label>
                    <input
                      type="number"
                      value={feeData.total_fees}
                      onChange={(e) => setFeeData({...feeData, total_fees: e.target.value})}
                      onBlur={calculateDue}
                      className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-200 placeholder-gray-500 transition-all"
                      placeholder="Enter amount"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Paid Amount (₹)</label>
                    <input
                      type="number"
                      value={feeData.paid_amount}
                      onChange={(e) => setFeeData({...feeData, paid_amount: e.target.value})}
                      onBlur={calculateDue}
                      className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-200 placeholder-gray-500 transition-all"
                      placeholder="Enter amount"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Due Amount (₹)</label>
                  <input
                    type="number"
                    value={feeData.due_amount}
                    readOnly
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-xl text-gray-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Last Payment Date</label>
                    <input
                      type="date"
                      value={feeData.last_payment_date}
                      onChange={(e) => setFeeData({...feeData, last_payment_date: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-200 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Next Payment Date</label>
                    <input
                      type="date"
                      value={feeData.next_payment_date}
                      onChange={(e) => setFeeData({...feeData, next_payment_date: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-200 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Payment Mode</label>
                  <select
                    value={feeData.payment_mode}
                    onChange={(e) => setFeeData({...feeData, payment_mode: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-200 transition-all"
                  >
                    <option value="">Select Payment Mode</option>
                    <option value="Cash">Cash</option>
                    <option value="Online Transfer">Online Transfer</option>
                    <option value="Cheque">Cheque</option>
                    <option value="DD">Demand Draft</option>
                    <option value="Card">Credit/Debit Card</option>
                    <option value="UPI">UPI</option>
                  </select>
                </div>

                <div className="flex justify-end gap-3 pt-6">
                  <button
                    type="button"
                    onClick={() => setShowFeeForm(false)}
                    className="px-6 py-3 text-gray-300 bg-gray-700 rounded-xl hover:bg-gray-600 transition-all font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all font-medium shadow-lg shadow-indigo-600/20"
                  >
                    Update Fees
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default withAuth(FeesManagement);