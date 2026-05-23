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
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import withAuth from '../../components/withAuth';

function FeesManagement() {
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [feeFilter, setFeeFilter] = useState('all');
  const [showFeeForm, setShowFeeForm] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [institutionId, setInstitutionId] = useState(null);
  const [toast, setToast] = useState({ show: false, type: '', message: '' });
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

  const showToast = (type, message) => {
    setToast({ show: true, type, message });
    setTimeout(() => {
      setToast({ show: false, type: '', message: '' });
    }, 3000);
  };

  useEffect(() => {
    const instId = localStorage.getItem('institutionId') || localStorage.getItem('institution_id');
    
    console.log("🏫 Fees Page Institution ID:", instId);
    
    if (instId) {
      setInstitutionId(instId);
      fetchStudents(instId);
    } else {
      console.error("❌ No institution_id found");
      setLoading(false);
      showToast('error', 'Institution not found. Please login again.');
    }
  }, []);

  useEffect(() => {
    filterStudents();
  }, [students, searchTerm, feeFilter, selectedPeriod]);

  const fetchStudents = async (instId) => {
    try {
      console.log("📦 Fetching students for institution:", instId);
      
      if (!instId) {
        console.error("No institution ID provided");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('institution_id', instId)
        .order('usn');

      if (error) {
        console.error("Supabase error:", error);
        throw error;
      }

      console.log("✅ Students Loaded:", data?.length || 0, "students");
      setStudents(data || []);
    } catch (error) {
      console.error('❌ Error fetching students:', error);
      showToast('error', 'Error fetching students: ' + error.message);
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
      if (!institutionId) {
        showToast('error', 'Institution ID not found. Please refresh the page.');
        return;
      }

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

      console.log("Updating student:", selectedStudent.id);
      console.log("Update data:", updateData);

      const { data, error } = await supabase
        .from('students')
        .update(updateData)
        .eq('id', selectedStudent.id)
        .eq('institution_id', institutionId);

      if (error) {
        console.error("Supabase update error:", error);
        throw error;
      }

      console.log("Update successful:", data);

      showToast('success', `✅ Fee details updated successfully for ${selectedStudent.full_name}!`);
      
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
      
      await fetchStudents(institutionId);
      
    } catch (error) {
      console.error('Error updating fee details:', error);
      showToast('error', '❌ Error updating fee details: ' + error.message);
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
      return 'bg-slate-800/50 text-slate-400 border-slate-700';
    }
    
    if (due === 0 && paid > 0) {
      return 'bg-emerald-950/50 text-emerald-400 border-emerald-800';
    } else if (paid > 0 && due > 0) {
      return 'bg-amber-950/50 text-amber-400 border-amber-800';
    } else if (due > 0 && paid === 0) {
      return 'bg-red-950/50 text-red-400 border-red-800';
    } else {
      return 'bg-slate-800/50 text-slate-400 border-slate-700';
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
    
    showToast('success', '📊 Fee report exported successfully!');
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
      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed top-20 right-4 z-50 animate-slide-in">
          <div className={`flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl backdrop-blur-md border ${
            toast.type === 'success' 
              ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-400' 
              : 'bg-red-950/90 border-red-500/30 text-red-400'
          }`}>
            {toast.type === 'success' ? (
              <CheckCircle size={20} className="text-emerald-400" />
            ) : (
              <AlertCircle size={20} className="text-red-400" />
            )}
            <span className="text-sm font-medium">{toast.message}</span>
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
        <div className="space-y-6 lg:space-y-8">
          {/* Header */}
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
                  <div className="p-3 bg-blue-600 rounded-2xl">
                    <Wallet className="text-white" size={24} />
                  </div>
                  <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-white">
                      Fee Management
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">
                      Comprehensive fee tracking & management
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <button
                onClick={exportToCSV}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-300 hover:bg-blue-600/20 hover:border-blue-500 hover:text-blue-400 transition-all"
              >
                <Download size={18} />
                <span className="text-sm font-medium">Export Report</span>
              </button>
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
              <h3 className="text-2xl font-bold text-white">{totalStudents}</h3>
              <p className="text-xs text-slate-400">Enrolled Students</p>
            </div>

            <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-emerald-600 rounded-xl">
                  <TrendingUp className="text-white" size={18} />
                </div>
                <span className="text-xs font-medium text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-800">{collectionRate}%</span>
              </div>
              <h3 className="text-2xl font-bold text-white">₹{totalPaid.toLocaleString('en-IN')}</h3>
              <p className="text-xs text-slate-400">Total Collected</p>
            </div>

            <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-amber-600 rounded-xl">
                  <Clock className="text-white" size={18} />
                </div>
                <span className="text-xs font-medium text-amber-400 bg-amber-950/50 px-2 py-0.5 rounded-full border border-amber-800">Pending</span>
              </div>
              <h3 className="text-2xl font-bold text-white">₹{totalDue.toLocaleString('en-IN')}</h3>
              <p className="text-xs text-slate-400">Outstanding Amount</p>
            </div>

            <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-cyan-600 rounded-xl">
                  <Award className="text-white" size={18} />
                </div>
                <span className="text-xs font-medium text-cyan-400 bg-cyan-950/50 px-2 py-0.5 rounded-full border border-cyan-800">Performance</span>
              </div>
              <h3 className="text-2xl font-bold text-white">{paidStudents}</h3>
              <p className="text-xs text-slate-400">Fully Paid Students</p>
            </div>
          </div>

          {/* Financial Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-blue-950 to-blue-900 rounded-2xl p-5 border border-blue-800">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-blue-800/50 rounded-lg">
                  <Receipt className="text-blue-300" size={18} />
                </div>
                <span className="text-blue-300/70 text-xs">Total Fees</span>
              </div>
              <p className="text-2xl font-bold text-white">₹{totalFees.toLocaleString('en-IN')}</p>
              <p className="text-xs text-blue-300/60 mt-1">Annual collection target</p>
            </div>

            <div className="bg-gradient-to-br from-emerald-950 to-emerald-900 rounded-2xl p-5 border border-emerald-800">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-emerald-800/50 rounded-lg">
                  <CheckCircle className="text-emerald-300" size={18} />
                </div>
                <span className="text-emerald-300/70 text-xs">Collected</span>
              </div>
              <p className="text-2xl font-bold text-white">₹{totalPaid.toLocaleString('en-IN')}</p>
              <p className="text-xs text-emerald-300/60 mt-1">{collectionRate}% of total fees</p>
            </div>

            <div className="bg-gradient-to-br from-amber-950 to-amber-900 rounded-2xl p-5 border border-amber-800">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-amber-800/50 rounded-lg">
                  <AlertCircle className="text-amber-300" size={18} />
                </div>
                <span className="text-amber-300/70 text-xs">Outstanding</span>
              </div>
              <p className="text-2xl font-bold text-white">₹{totalDue.toLocaleString('en-IN')}</p>
              <p className="text-xs text-amber-300/60 mt-1">Due from {dueStudents} students</p>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-5">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500" size={18} />
                <input
                  type="text"
                  placeholder="Search by name, USN, email, or branch..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 text-slate-200 placeholder-slate-500"
                />
              </div>
              
              <div className="flex flex-wrap gap-3">
                <select
                  value={feeFilter}
                  onChange={(e) => setFeeFilter(e.target.value)}
                  className="px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 text-slate-200 cursor-pointer"
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
                  className="px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 text-slate-200 cursor-pointer"
                >
                  <option value="all">All Periods</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="overdue">Overdue</option>
                </select>

                <button
                  onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                  className="px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-slate-400 hover:text-blue-400 hover:border-blue-500 transition-all"
                >
                  <Layers size={18} />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-700">
              <span className="text-xs font-medium text-slate-500 py-1">Quick filters:</span>
              <button
                onClick={() => setFeeFilter('paid')}
                className="px-3 py-1 bg-emerald-950/50 text-emerald-400 rounded-lg text-xs font-medium hover:bg-emerald-900/50 transition-colors border border-emerald-800"
              >
                Fully Paid ({paidStudents})
              </button>
              <button
                onClick={() => setFeeFilter('partial')}
                className="px-3 py-1 bg-amber-950/50 text-amber-400 rounded-lg text-xs font-medium hover:bg-amber-900/50 transition-colors border border-amber-800"
              >
                Partial ({partialPaidStudents})
              </button>
              <button
                onClick={() => setFeeFilter('due')}
                className="px-3 py-1 bg-red-950/50 text-red-400 rounded-lg text-xs font-medium hover:bg-red-900/50 transition-colors border border-red-800"
              >
                Due ({dueStudents})
              </button>
            </div>
          </div>

          {/* Grid View */}
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredStudents.map((student) => (
                <div
                  key={student.id}
                  className="bg-slate-800/50 rounded-2xl border border-slate-700 hover:border-blue-500/30 transition-all overflow-hidden"
                >
                  <div className={`h-1 ${
                    getFeesStatusText(student).includes('Paid') ? 'bg-emerald-500' :
                    getFeesStatusText(student).includes('Partial') ? 'bg-amber-500' :
                    getFeesStatusText(student).includes('Due') ? 'bg-red-500' :
                    'bg-slate-600'
                  }`}></div>
                  <div className="p-5">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                          <GraduationCap className="text-white" size={20} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-white">{student.full_name}</h3>
                          <p className="text-xs text-slate-500">{student.usn}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${getFeesStatusColor(student)}`}>
                        {getFeesStatusText(student)}
                      </span>
                    </div>

                    <div className="space-y-3 mb-4">
                      <div className="flex items-center gap-2 text-sm">
                        <BookOpen size={14} className="text-slate-500" />
                        <span className="text-slate-400">{student.branch} • {student.class}-{student.division}</span>
                      </div>
                      
                      {parseFloat(student.total_fees) > 0 && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-500">Payment Progress</span>
                            <span className="font-medium text-slate-300">
                              {((parseFloat(student.paid_amount) / parseFloat(student.total_fees)) * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all ${
                                parseFloat(student.due_amount) === 0 ? 'bg-emerald-500' :
                                parseFloat(student.paid_amount) > 0 ? 'bg-amber-500' :
                                'bg-red-500'
                              }`}
                              style={{ width: `${(parseFloat(student.paid_amount) / parseFloat(student.total_fees)) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-3 gap-2 pt-2">
                        <div className="text-center p-2 bg-slate-900 rounded-lg border border-slate-700">
                          <p className="text-xs text-slate-500">Total</p>
                          <p className="font-bold text-white">₹{student.total_fees || '0'}</p>
                        </div>
                        <div className="text-center p-2 bg-emerald-950/30 rounded-lg border border-emerald-800">
                          <p className="text-xs text-emerald-400">Paid</p>
                          <p className="font-bold text-emerald-300">₹{student.paid_amount || '0'}</p>
                        </div>
                        <div className="text-center p-2 bg-red-950/30 rounded-lg border border-red-800">
                          <p className="text-xs text-red-400">Due</p>
                          <p className="font-bold text-red-300">₹{student.due_amount || '0'}</p>
                        </div>
                      </div>

                      {student.next_payment_date && (
                        <div className={`flex items-center gap-2 text-xs p-2 rounded-lg ${
                          isUpcomingPayment(student.next_payment_date) 
                            ? 'bg-amber-950/30 text-amber-400 border border-amber-800' 
                            : 'bg-slate-900/50 text-slate-400 border border-slate-700'
                        }`}>
                          <Calendar size={12} />
                          <span>Next payment: {formatDate(student.next_payment_date)}</span>
                          {isUpcomingPayment(student.next_payment_date) && (
                            <span className="ml-auto text-xs bg-amber-950 text-amber-400 px-2 py-0.5 rounded-full border border-amber-700">Upcoming</span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end gap-2 pt-3 border-t border-slate-700">
                      <button
                        onClick={() => openFeeForm(student)}
                        className="p-2 text-blue-400 hover:bg-blue-600/20 rounded-lg transition-colors"
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
            <div className="bg-slate-800/50 rounded-2xl border border-slate-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-900 border-b border-slate-700">
                      <th className="px-5 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={selectedStudents.length === filteredStudents.length}
                          onChange={selectAllStudents}
                          className="rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                        />
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Student</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Branch</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Total</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Paid</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Due</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Next Payment</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {filteredStudents.map((student) => (
                      <tr key={student.id} className="hover:bg-slate-700/30 transition-colors">
                        <td className="px-5 py-3">
                          <input
                            type="checkbox"
                            checked={selectedStudents.includes(student.id)}
                            onChange={() => toggleStudentSelection(student.id)}
                            className="rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                          />
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                              <GraduationCap className="text-white" size={14} />
                            </div>
                            <div>
                              <p className="font-medium text-white">{student.full_name}</p>
                              <p className="text-xs text-slate-500">{student.usn}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-sm text-slate-400">{student.branch}</td>
                        <td className="px-5 py-3 text-sm font-medium text-white">₹{student.total_fees || '0'}</td>
                        <td className="px-5 py-3 text-sm font-medium text-emerald-400">₹{student.paid_amount || '0'}</td>
                        <td className="px-5 py-3 text-sm font-medium text-red-400">₹{student.due_amount || '0'}</td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getFeesStatusColor(student)}`}>
                            {getFeesStatusText(student)}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-sm text-slate-400">
                          {formatDate(student.next_payment_date)}
                        </td>
                        <td className="px-5 py-3">
                          <button
                            onClick={() => openFeeForm(student)}
                            className="p-1.5 text-blue-400 hover:bg-blue-600/20 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Empty State */}
          {filteredStudents.length === 0 && (
            <div className="text-center py-12 bg-slate-800/50 rounded-2xl border border-slate-700">
              <div className="w-20 h-20 bg-slate-700/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Receipt className="text-slate-500" size={32} />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">No Students Found</h3>
              <p className="text-slate-400 mb-4">Try adjusting your search or filter criteria</p>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFeeFilter('all');
                  setSelectedPeriod('all');
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Fee Modal */}
      {showFeeForm && selectedStudent && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-600 rounded-xl">
                    <Wallet className="text-white" size={20} />
                  </div>
                  <h3 className="text-xl font-bold text-white">
                    Update Fee Details
                  </h3>
                </div>
                <button 
                  onClick={() => setShowFeeForm(false)} 
                  className="p-2 text-slate-400 hover:text-slate-300 hover:bg-slate-700 rounded-lg transition-all"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="mb-6 p-4 bg-blue-950/30 rounded-xl border border-blue-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center">
                    <GraduationCap className="text-blue-400" size={18} />
                  </div>
                  <div>
                    <p className="font-semibold text-white">{selectedStudent.full_name}</p>
                    <p className="text-sm text-slate-400">{selectedStudent.usn} • {selectedStudent.branch}</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleFeeSubmit} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Total Fees (₹)</label>
                    <input
                      type="number"
                      value={feeData.total_fees}
                      onChange={(e) => setFeeData({...feeData, total_fees: e.target.value})}
                      onBlur={calculateDue}
                      className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 text-slate-200"
                      placeholder="Enter amount"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Paid Amount (₹)</label>
                    <input
                      type="number"
                      value={feeData.paid_amount}
                      onChange={(e) => setFeeData({...feeData, paid_amount: e.target.value})}
                      onBlur={calculateDue}
                      className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 text-slate-200"
                      placeholder="Enter amount"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Due Amount (₹)</label>
                  <input
                    type="number"
                    value={feeData.due_amount}
                    readOnly
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-slate-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Last Payment Date</label>
                    <input
                      type="date"
                      value={feeData.last_payment_date}
                      onChange={(e) => setFeeData({...feeData, last_payment_date: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Next Payment Date</label>
                    <input
                      type="date"
                      value={feeData.next_payment_date}
                      onChange={(e) => setFeeData({...feeData, next_payment_date: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 text-slate-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Payment Mode</label>
                  <select
                    value={feeData.payment_mode}
                    onChange={(e) => setFeeData({...feeData, payment_mode: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 text-slate-200"
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
                    className="px-6 py-3 text-slate-300 bg-slate-700 rounded-xl hover:bg-slate-600 transition-all font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-medium"
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