// app/fees/page.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import withAuth from '../../components/withAuth';
import { supabase } from '../../lib/supabase';
import { feesService } from './service';
import { 
  FeesHeader, FeesFilters, FeesResultsCount, FeesToast, FeesGridView,
  EditIntervalModal 
} from './components';
import { 
  CheckCircle, XCircle, IndianRupee, AlertTriangle, 
  DollarSign, Layers, CalendarDays, Calendar, Save, 
  Trash2, Edit, Plus, X, AlertCircle, 
  ArrowLeft, CreditCard, Wallet, TrendingUp, 
  CalendarPlus, Download, Search 
} from 'lucide-react';

function FeesManagement() {
  const router = useRouter();
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [feeFilter, setFeeFilter] = useState('all');
  const [institutionId, setInstitutionId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [selectedIntervalId, setSelectedIntervalId] = useState(null);
  const [studentIntervals, setStudentIntervals] = useState({});
  const [selectedIntervals, setSelectedIntervals] = useState([]);
  const [financialSummary, setFinancialSummary] = useState({
    total_fees: 0, total_collected: 0, total_due: 0, 
    collection_rate: 0, monthly_collection: 0, pending_count: 0
  });
  const [toast, setToast] = useState({ show: false, type: '', message: '' });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  // Edit Interval Modal States
  const [showEditIntervalModal, setShowEditIntervalModal] = useState(false);
  const [editingInterval, setEditingInterval] = useState(null);
  const [editingStudent, setEditingStudent] = useState(null);
  
  // Delete states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState(null);
  const [deleteType, setDeleteType] = useState('student');
  const [intervalToDelete, setIntervalToDelete] = useState(null);
  const [bulkDeleteIntervals, setBulkDeleteIntervals] = useState([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  
  // Modal states
  const [showDateModal, setShowDateModal] = useState(false);
  const [dateModalData, setDateModalData] = useState({ student: null, start_date: '', end_date: '' });
  const [showDueDateModal, setShowDueDateModal] = useState(false);
  const [dueDateData, setDueDateData] = useState({ student: null, interval_id: null, due_date: '', due_amount: 0 });
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentData, setPaymentData] = useState({ 
    student: null, interval_id: null, amount: '', 
    payment_date: new Date().toISOString().split('T')[0], 
    payment_mode: 'cash', utr: '', remarks: '' 
  });
  const [showIntervalModal, setShowIntervalModal] = useState(false);
  const [selectedStudentForInterval, setSelectedStudentForInterval] = useState(null);
  const [intervalData, setIntervalData] = useState({ 
    interval_number: 1, start_date: '', end_date: '', 
    total_fees: 0, paid_amount: 0, due_amount: 0, status: 'pending' 
  });
  const [showIntervalDetails, setShowIntervalDetails] = useState(false);
  const [selectedInterval, setSelectedInterval] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  
  // Bulk assign modal
  const [bulkAssignData, setBulkAssignData] = useState({
    start_date: '', end_date: '', apply_to: 'all', selected_branch: '', selected_class: ''
  });
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);

  const showToast = (type, message) => {
    setToast({ show: true, type, message });
    setTimeout(() => setToast({ show: false, type: '', message: '' }), 3000);
  };

  useEffect(() => {
    const instId = localStorage.getItem('institutionId') || localStorage.getItem('institution_id');
    if (instId) {
      setInstitutionId(instId);
      fetchStudents(instId);
    } else {
      setLoading(false);
      showToast('error', 'Institution not found. Please login again.');
    }
  }, []);

  useEffect(() => {
    filterStudents();
  }, [students, searchTerm, feeFilter]);

  const fetchStudents = async (instId) => {
    try {
      const { students: studentData, intervalsMap } = await feesService.fetchStudentsWithIntervals(instId);
      setStudentIntervals(intervalsMap);
      setStudents(studentData || []);
      const summary = feesService.calculateFinancialSummary(studentData || [], intervalsMap);
      setFinancialSummary(summary);
    } catch (error) {
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
        return fullName.includes(searchLower) || usn.includes(searchLower) || branch.includes(searchLower);
      });
    }

    if (feeFilter === 'due') {
      filtered = filtered.filter(student => {
        const intervals = studentIntervals[student.id] || [];
        return intervals.some(i => Number(i.due_amount) > 0);
      });
    } else if (feeFilter === 'paid') {
      filtered = filtered.filter(student => {
        const intervals = studentIntervals[student.id] || [];
        return intervals.length > 0 && intervals.every(i => Number(i.due_amount) === 0);
      });
    } else if (feeFilter === 'overdue') {
      filtered = filtered.filter(student => {
        const intervals = studentIntervals[student.id] || [];
        const today = new Date().toISOString().split('T')[0];
        return intervals.some(i => i.end_date && i.end_date < today && Number(i.due_amount) > 0);
      });
    } else if (feeFilter === 'active') {
      filtered = filtered.filter(student => {
        const intervals = studentIntervals[student.id] || [];
        const today = new Date().toISOString().split('T')[0];
        return intervals.some(i => i.start_date <= today && i.end_date >= today);
      });
    } else if (feeFilter === 'expired') {
      filtered = filtered.filter(student => {
        const intervals = studentIntervals[student.id] || [];
        const today = new Date().toISOString().split('T')[0];
        return intervals.some(i => i.end_date < today && Number(i.due_amount) > 0);
      });
    } else if (feeFilter === 'no-subscription') {
      filtered = filtered.filter(student => {
        const intervals = studentIntervals[student.id] || [];
        return intervals.length === 0;
      });
    }
    setFilteredStudents(filtered);
  };

  // ============================================================
  // 📦 EDIT INTERVAL HANDLER
  // ============================================================
  const openEditIntervalModal = (interval, student) => {
    setEditingInterval(interval);
    setEditingStudent(student);
    setShowEditIntervalModal(true);
  };

  const handleSaveInterval = async (data) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('student_intervals')
        .update({
          total_fees: data.total_fees,
          due_amount: data.due_amount,
          start_date: data.start_date,
          end_date: data.end_date,
          updated_at: new Date().toISOString()
        })
        .eq('id', data.id);

      if (error) throw error;

      showToast('success', '✅ Interval updated successfully!');
      setShowEditIntervalModal(false);
      setEditingInterval(null);
      setEditingStudent(null);
      await fetchStudents(institutionId);
    } catch (error) {
      console.error('Error updating interval:', error);
      showToast('error', '❌ Error updating interval: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // 📦 PAYMENT HANDLER
  // ============================================================
  const openPaymentModal = (student) => {
    const intervals = studentIntervals[student.id] || [];
    const target = intervals.find(i => Number(i.due_amount) > 0);
    
    setPaymentData({
      student: student,
      interval_id: target?.id || null,
      amount: '',
      payment_date: new Date().toISOString().split('T')[0],
      payment_mode: 'cash',
      utr: '',
      remarks: ''
    });
    setShowPaymentModal(true);
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const student = paymentData.student;
      const intervals = studentIntervals[student.id] || [];
      let targetInterval;
      if (paymentData.interval_id) {
        targetInterval = intervals.find(i => i.id === paymentData.interval_id);
      } else {
        targetInterval = intervals.find(i => Number(i.due_amount) > 0);
      }
      if (!targetInterval) {
        showToast('error', 'No pending dues found!');
        setSaving(false);
        return;
      }
      const currentPaid = Number(targetInterval.paid_amount) || 0;
      const newPaid = currentPaid + Number(paymentData.amount);
      const totalFees = Number(targetInterval.total_fees) || 0;
      const newDue = totalFees - newPaid;
      const { error } = await supabase
        .from('student_intervals')
        .update({
          paid_amount: newPaid,
          due_amount: newDue,
          last_payment_date: paymentData.payment_date,
          payment_mode: paymentData.payment_mode,
          utr: paymentData.utr || null,
          status: newDue <= 0 ? 'paid' : 'partial',
          updated_at: new Date().toISOString()
        })
        .eq('id', targetInterval.id);
      if (error) throw error;
      showToast('success', `✅ Payment recorded for ${student.full_name}!`);
      await fetchStudents(institutionId);
      setShowPaymentModal(false);
      setPaymentData({
        student: null,
        interval_id: null,
        amount: '',
        payment_date: new Date().toISOString().split('T')[0],
        payment_mode: 'cash',
        utr: '',
        remarks: ''
      });
    } catch (error) {
      console.error('Error recording payment:', error);
      showToast('error', '❌ Error recording payment: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // 📦 DUE DATE HANDLER
  // ============================================================
  const openDueDateModal = (student, intervalId = null) => {
    const intervals = studentIntervals[student.id] || [];
    let targetInterval;
    if (intervalId) {
      targetInterval = intervals.find(i => i.id === intervalId);
    } else {
      targetInterval = intervals.find(i => Number(i.due_amount) > 0);
    }
    setDueDateData({
      student: student,
      interval_id: targetInterval?.id || null,
      due_date: targetInterval?.end_date || '',
      due_amount: targetInterval?.due_amount || 0
    });
    setShowDueDateModal(true);
  };

  const handleUpdateDueDate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const student = dueDateData.student;
      const intervals = studentIntervals[student.id] || [];
      let targetInterval;
      if (dueDateData.interval_id) {
        targetInterval = intervals.find(i => i.id === dueDateData.interval_id);
      } else {
        targetInterval = intervals.find(i => Number(i.due_amount) > 0);
      }
      if (!targetInterval) {
        showToast('error', 'No interval found!');
        setSaving(false);
        return;
      }
      const { error } = await supabase
        .from('student_intervals')
        .update({
          end_date: dueDateData.due_date,
          due_amount: dueDateData.due_amount,
          updated_at: new Date().toISOString()
        })
        .eq('id', targetInterval.id);
      if (error) throw error;
      showToast('success', `✅ Due date updated for ${student.full_name}!`);
      await fetchStudents(institutionId);
      setShowDueDateModal(false);
      setDueDateData({ student: null, interval_id: null, due_date: '', due_amount: 0 });
    } catch (error) {
      console.error('Error updating due date:', error);
      showToast('error', '❌ Error updating due date: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // 📦 ADD INTERVAL HANDLER
  // ============================================================
  const openIntervalModal = (student) => {
    setSelectedStudentForInterval(student);
    const intervals = studentIntervals[student.id] || [];
    setIntervalData({
      interval_number: intervals.length + 1,
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      total_fees: 0,
      paid_amount: 0,
      due_amount: 0,
      status: 'pending'
    });
    setShowIntervalModal(true);
  };

  const handleAddInterval = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        student_id: selectedStudentForInterval.id,
        interval_number: intervalData.interval_number,
        start_date: intervalData.start_date,
        end_date: intervalData.end_date,
        total_fees: intervalData.total_fees,
        paid_amount: 0,
        due_amount: intervalData.due_amount || intervalData.total_fees,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      const { error } = await supabase
        .from('student_intervals')
        .insert([payload]);
      if (error) throw error;
      showToast('success', `✅ Interval ${intervalData.interval_number} added successfully!`);
      setShowIntervalModal(false);
      await fetchStudents(institutionId);
    } catch (error) {
      console.error('Error adding interval:', error);
      showToast('error', '❌ Error adding interval: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // 📦 DELETE HANDLERS
  // ============================================================
  const handleDeleteStudent = (student) => {
    setStudentToDelete(student);
    setDeleteType('student');
    setShowDeleteConfirm(true);
  };

  const confirmDeleteStudent = async () => {
    if (!studentToDelete) return;
    setDeleting(true);
    try {
      await supabase.from('student_intervals').delete().eq('student_id', studentToDelete.id);
      const { error } = await supabase
        .from('students_new')
        .delete()
        .eq('id', studentToDelete.id)
        .eq('institution_id', institutionId);
      if (error) throw error;
      showToast('success', `✅ Student ${studentToDelete.full_name} deleted successfully!`);
      await fetchStudents(institutionId);
      setSelectedStudents(prev => prev.filter(id => id !== studentToDelete.id));
    } catch (error) {
      console.error('Error deleting student:', error);
      showToast('error', '❌ Error deleting student: ' + error.message);
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
      setStudentToDelete(null);
    }
  };

  const handleDeleteInterval = (intervalId) => {
    const interval = findIntervalById(intervalId);
    if (interval) {
      setIntervalToDelete(interval);
      setDeleteType('interval');
      setShowDeleteConfirm(true);
    }
  };

  const findIntervalById = (intervalId) => {
    for (const studentId in studentIntervals) {
      const interval = studentIntervals[studentId].find(i => i.id === intervalId);
      if (interval) return interval;
    }
    return null;
  };

  const confirmDeleteInterval = async () => {
    if (!intervalToDelete) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('student_intervals')
        .delete()
        .eq('id', intervalToDelete.id);
      if (error) throw error;
      showToast('success', `✅ Interval #${intervalToDelete.interval_number} deleted successfully!`);
      await fetchStudents(institutionId);
      setShowDeleteConfirm(false);
      setIntervalToDelete(null);
      setShowIntervalDetails(false);
    } catch (error) {
      console.error('Error deleting interval:', error);
      showToast('error', '❌ Error deleting interval: ' + error.message);
    } finally {
      setDeleting(false);
    }
  };

  // ============================================================
  // 📦 BULK DELETE HANDLERS
  // ============================================================
  const handleBulkDeleteStudents = () => {
    if (selectedStudents.length === 0) {
      showToast('error', 'Please select students to delete');
      return;
    }
    setDeleteType('bulk_students');
    setShowDeleteConfirm(true);
  };

  const confirmBulkDeleteStudents = async () => {
    setDeleting(true);
    try {
      await supabase.from('student_intervals').delete().in('student_id', selectedStudents);
      const { error } = await supabase
        .from('students_new')
        .delete()
        .in('id', selectedStudents)
        .eq('institution_id', institutionId);
      if (error) throw error;
      showToast('success', `✅ ${selectedStudents.length} student(s) deleted successfully!`);
      await fetchStudents(institutionId);
      setSelectedStudents([]);
    } catch (error) {
      console.error('Error bulk deleting students:', error);
      showToast('error', '❌ Error deleting students: ' + error.message);
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleBulkDeleteIntervals = () => {
    if (selectedIntervals.length === 0) {
      showToast('error', 'Please select intervals to delete');
      return;
    }
    setBulkDeleteIntervals([...selectedIntervals]);
    setDeleteType('bulk');
    setShowBulkDeleteModal(true);
  };

  const confirmBulkDeleteIntervals = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('student_intervals')
        .delete()
        .in('id', bulkDeleteIntervals);
      if (error) throw error;
      showToast('success', `✅ ${bulkDeleteIntervals.length} interval(s) deleted successfully!`);
      setSelectedIntervals([]);
      setBulkDeleteIntervals([]);
      setShowBulkDeleteModal(false);
      await fetchStudents(institutionId);
    } catch (error) {
      console.error('Error bulk deleting intervals:', error);
      showToast('error', '❌ Error bulk deleting intervals: ' + error.message);
    } finally {
      setDeleting(false);
    }
  };

  // ============================================================
  // 📦 INTERVAL DETAILS
  // ============================================================
  const openIntervalDetails = (interval, student) => {
    setSelectedInterval(interval);
    setSelectedStudent(student);
    setShowIntervalDetails(true);
  };

  // ============================================================
  // 📦 TOGGLE SELECTIONS
  // ============================================================
  const toggleStudentSelection = (studentId) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]
    );
  };

  const selectAllStudents = () => {
    if (selectedStudents.length === filteredStudents.length && filteredStudents.length > 0) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(filteredStudents.map(s => s.id));
    }
  };

  const toggleIntervalSelection = (intervalId) => {
    setSelectedIntervals(prev => 
      prev.includes(intervalId) ? prev.filter(id => id !== intervalId) : [...prev, intervalId]
    );
  };

  // ============================================================
  // 📦 UTILITY FUNCTIONS
  // ============================================================
  const getBranches = () => {
    const branches = [...new Set(students.map(student => student.branch).filter(Boolean))];
    return branches.sort();
  };

  const getSubscriptionStatus = (student) => {
    const intervals = studentIntervals[student.id] || [];
    const activeInterval = intervals.find(i => i.start_date <= new Date().toISOString().split('T')[0] && i.end_date >= new Date().toISOString().split('T')[0]);
    if (!activeInterval) return { text: 'No Active Interval', color: 'bg-slate-800/50 text-slate-400 border-slate-700', icon: '❌' };
    if (activeInterval.end_date) {
      const endDate = new Date(activeInterval.end_date);
      const daysLeft = Math.ceil((endDate - new Date()) / (1000 * 60 * 60 * 24));
      return { text: `Active (${daysLeft} days left)`, color: 'bg-emerald-950/50 text-emerald-400 border-emerald-800', icon: '✅' };
    }
    return { text: 'Active', color: 'bg-emerald-950/50 text-emerald-400 border-emerald-800', icon: '✅' };
  };

  const getDueStatus = (student) => {
    const intervals = studentIntervals[student.id] || [];
    const totalDue = intervals.reduce((sum, i) => sum + (Number(i.due_amount) || 0), 0);
    const hasOverdue = intervals.some(i => i.end_date && i.end_date < new Date().toISOString().split('T')[0] && Number(i.due_amount) > 0);
    if (totalDue === 0) return { text: 'Paid', color: 'bg-emerald-950/50 text-emerald-400 border-emerald-800', icon: '✅' };
    if (hasOverdue) return { text: 'Overdue', color: 'bg-red-950/50 text-red-400 border-red-800', icon: '⚠️' };
    return { text: `Pending (₹${totalDue})`, color: 'bg-orange-950/50 text-orange-400 border-orange-800', icon: '💰' };
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not Set';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency', currency: 'INR',
      minimumFractionDigits: 0, maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const handleBack = () => router.back();
  
  const exportToCSV = () => {
    feesService.exportToCSV(filteredStudents, studentIntervals);
    showToast('success', '📊 Report exported successfully!');
  };

  const totalIntervals = Object.values(studentIntervals).reduce((sum, intervals) => sum + intervals.length, 0);
  const overdueCount = students.filter(student => {
    const intervals = studentIntervals[student.id] || [];
    const today = new Date().toISOString().split('T')[0];
    return intervals.some(i => i.end_date && i.end_date < today && Number(i.due_amount) > 0);
  }).length;
  const activeStudents = students.filter(student => {
    const intervals = studentIntervals[student.id] || [];
    const today = new Date().toISOString().split('T')[0];
    return intervals.some(i => i.start_date <= today && i.end_date >= today);
  }).length;
  const noSubscriptionStudents = students.filter(student => {
    const intervals = studentIntervals[student.id] || [];
    return intervals.length === 0;
  }).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-700 border-t-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Toast Notification */}
      <FeesToast toast={toast} setToast={setToast} />

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 lg:py-10">
        <FeesHeader 
          handleBack={handleBack}
          selectedStudents={selectedStudents}
          selectedIntervals={selectedIntervals}
          handleBulkDeleteStudents={handleBulkDeleteStudents}
          handleBulkDeleteIntervals={handleBulkDeleteIntervals}
          exportToCSV={exportToCSV}
          setShowBulkAssignModal={setShowBulkAssignModal}
          financialSummary={financialSummary}
          totalIntervals={totalIntervals}
        />

        <FeesFilters 
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          feeFilter={feeFilter}
          setFeeFilter={setFeeFilter}
          viewMode={viewMode}
          setViewMode={setViewMode}
          getBranches={getBranches}
          financialSummary={financialSummary}
          overdueCount={overdueCount}
          activeStudents={activeStudents}
          noSubscriptionStudents={noSubscriptionStudents}
        />

        <FeesResultsCount 
          filteredStudents={filteredStudents}
          students={students}
          selectedStudents={selectedStudents}
          selectedIntervals={selectedIntervals}
          selectAllStudents={selectAllStudents}
          viewMode={viewMode}
        />

        <FeesGridView 
          filteredStudents={filteredStudents}
          studentIntervals={studentIntervals}
          selectedIntervalId={selectedIntervalId}
          selectedIntervals={selectedIntervals}
          toggleIntervalSelection={toggleIntervalSelection}
          openIntervalDetails={openIntervalDetails}
          openPaymentModal={openPaymentModal}
          openDueDateModal={openDueDateModal}
          openIntervalModal={openIntervalModal}
          handleDeleteStudent={handleDeleteStudent}
          handleDeleteInterval={handleDeleteInterval}
          openEditIntervalModal={openEditIntervalModal}
          formatCurrency={formatCurrency}
          formatDate={formatDate}
          getSubscriptionStatus={getSubscriptionStatus}
          getDueStatus={getDueStatus}
        />
      </div>

      {/* Edit Interval Modal */}
      <EditIntervalModal 
        show={showEditIntervalModal}
        onClose={() => {
          setShowEditIntervalModal(false);
          setEditingInterval(null);
          setEditingStudent(null);
        }}
        interval={editingInterval}
        student={editingStudent}
        onSave={handleSaveInterval}
        formatCurrency={formatCurrency}
        saving={saving}
      />

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-600 rounded-xl">
                    <DollarSign className="text-white" size={20} />
                  </div>
                  <h3 className="text-xl font-bold text-white">Record Fee Payment</h3>
                </div>
                <button onClick={() => setShowPaymentModal(false)} className="p-2 text-slate-400 hover:bg-slate-700 rounded-lg">
                  <X size={20} />
                </button>
              </div>

              {paymentData.student && (
                <div className="mb-4 p-4 bg-slate-700/30 rounded-xl">
                  <p className="font-semibold text-white">{paymentData.student.full_name}</p>
                  <p className="text-sm text-slate-400">{paymentData.student.usn}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Total Intervals: {(studentIntervals[paymentData.student.id] || []).length}
                  </p>
                </div>
              )}

              <form onSubmit={handleRecordPayment} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Select Interval</label>
                  <select
                    value={paymentData.interval_id || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPaymentData(prev => ({ ...prev, interval_id: val || null }));
                    }}
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:border-emerald-500 text-slate-200"
                  >
                    <option value="">-- Select an interval --</option>
                    {paymentData.student && (studentIntervals[paymentData.student.id] || [])
                      .filter(i => Number(i.due_amount) > 0)
                      .map((interval) => (
                        <option key={interval.id} value={interval.id}>
                          Interval #{interval.interval_number} - Due: ₹{Number(interval.due_amount).toLocaleString()}
                        </option>
                      ))}
                    {paymentData.student && (studentIntervals[paymentData.student.id] || []).filter(i => Number(i.due_amount) > 0).length === 0 && (
                      <option value="" disabled>No pending dues found</option>
                    )}
                  </select>
                  {paymentData.student && (studentIntervals[paymentData.student.id] || []).filter(i => Number(i.due_amount) > 0).length === 0 && (
                    <p className="text-xs text-amber-400 mt-1">⚠️ This student has no pending dues</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Amount *</label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500">
                      <IndianRupee size={16} />
                    </div>
                    <input
                      type="text"
                      inputMode="decimal"
                      required
                      placeholder="Enter amount"
                      value={paymentData.amount}
                      onChange={(e) => {
                        let v = e.target.value;
                        if (v.length > 1 && v.startsWith('0') && !v.includes('.')) {
                          v = v.replace(/^0+/, '');
                        }
                        if (v === '' || /^\d*\.?\d*$/.test(v)) {
                          setPaymentData(prev => ({ ...prev, amount: v }));
                        }
                      }}
                      className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:border-emerald-500 text-slate-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Payment Date *</label>
                  <input
                    type="date"
                    required
                    value={paymentData.payment_date}
                    onChange={(e) => setPaymentData(prev => ({ ...prev, payment_date: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:border-emerald-500 text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Payment Mode</label>
                  <select
                    value={paymentData.payment_mode}
                    onChange={(e) => setPaymentData(prev => ({ ...prev, payment_mode: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:border-emerald-500 text-slate-200"
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="upi">UPI</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">UTR / Transaction ID</label>
                  <input
                    type="text"
                    placeholder="Enter UTR or Transaction ID"
                    value={paymentData.utr}
                    onChange={(e) => setPaymentData(prev => ({ ...prev, utr: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:border-emerald-500 text-slate-200"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowPaymentModal(false)}
                    className="px-4 py-2 text-slate-300 bg-slate-700 rounded-lg hover:bg-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2 disabled:opacity-50"
                  >
                    {saving ? (
                      <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Processing...</>
                    ) : (
                      <><CheckCircle size={16} /> Record Payment</>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Due Date Modal */}
      {showDueDateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-600 rounded-xl">
                    <CalendarDays className="text-white" size={20} />
                  </div>
                  <h3 className="text-xl font-bold text-white">Set Due Date</h3>
                </div>
                <button onClick={() => setShowDueDateModal(false)} className="p-2 text-slate-400 hover:bg-slate-700 rounded-lg">
                  <X size={20} />
                </button>
              </div>

              {dueDateData.student && (
                <div className="mb-4 p-4 bg-slate-700/30 rounded-xl">
                  <p className="font-semibold text-white">{dueDateData.student.full_name}</p>
                  <p className="text-sm text-slate-400">{dueDateData.student.usn}</p>
                </div>
              )}

              <form onSubmit={handleUpdateDueDate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Select Interval</label>
                  <select
                    value={dueDateData.interval_id || ''}
                    onChange={(e) => {
                      const intervals = studentIntervals[dueDateData.student.id] || [];
                      const selected = intervals.find(i => i.id === e.target.value);
                      if (selected) {
                        setDueDateData({
                          ...dueDateData,
                          interval_id: selected.id,
                          due_date: selected.end_date || '',
                          due_amount: selected.due_amount || 0
                        });
                      }
                    }}
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:border-purple-500 text-slate-200"
                  >
                    <option value="">Select an interval</option>
                    {(studentIntervals[dueDateData.student.id] || []).map(interval => (
                      <option key={interval.id} value={interval.id}>
                        Interval #{interval.interval_number} - {formatDate(interval.start_date)} to {formatDate(interval.end_date)} (Due: ₹{interval.due_amount || 0})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Due Amount *</label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500">
                      <IndianRupee size={16} />
                    </div>
                    <input
                      type="text"
                      inputMode="decimal"
                      required
                      placeholder="Enter due amount"
                      value={dueDateData.due_amount}
                      onChange={(e) => {
                        let v = e.target.value;
                        if (v.length > 1 && v.startsWith('0') && !v.includes('.')) {
                          v = v.replace(/^0+/, '');
                        }
                        if (v === '' || /^\d*\.?\d*$/.test(v)) {
                          setDueDateData(prev => ({ ...prev, due_amount: v }));
                        }
                      }}
                      className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:border-purple-500 text-slate-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Due Date *</label>
                  <input
                    type="date"
                    required
                    value={dueDateData.due_date}
                    onChange={(e) => setDueDateData({...dueDateData, due_date: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:border-purple-500 text-slate-200"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setShowDueDateModal(false)} className="px-4 py-2 text-slate-300 bg-slate-700 rounded-lg hover:bg-slate-600">Cancel</button>
                  <button type="submit" disabled={saving} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2">
                    {saving ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>Saving...</> : <><Save size={16} />Set Due Date</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Add Interval Modal */}
      {showIntervalModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-md">
            <div className="px-6 py-4 border-b border-slate-700 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-600 rounded-xl">
                  <Layers className="text-white" size={20} />
                </div>
                <h3 className="text-xl font-bold text-white">Add Fee Interval</h3>
              </div>
              <button onClick={() => setShowIntervalModal(false)} className="p-2 text-slate-400 hover:text-slate-300 hover:bg-slate-700 rounded-lg transition-all">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddInterval} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Student</label>
                <div className="px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-slate-200">
                  {selectedStudentForInterval?.full_name} ({selectedStudentForInterval?.usn})
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Interval Number</label>
                <input
                  type="number"
                  required
                  value={intervalData.interval_number}
                  onChange={(e) => setIntervalData({...intervalData, interval_number: parseInt(e.target.value)})}
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
                  onChange={(e) => setIntervalData({...intervalData, start_date: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:border-purple-500 text-slate-200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">End Date</label>
                <input
                  type="date"
                  required
                  value={intervalData.end_date}
                  onChange={(e) => setIntervalData({...intervalData, end_date: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:border-purple-500 text-slate-200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Total Fees (₹)</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500">
                    <IndianRupee size={16} />
                  </div>
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    value={intervalData.total_fees}
                    onChange={(e) => {
                      let v = e.target.value;
                      if (v.length > 1 && v.startsWith('0') && !v.includes('.')) {
                        v = v.replace(/^0+/, '');
                      }
                      if (v === '' || /^\d*\.?\d*$/.test(v)) {
                        setIntervalData(prev => ({ ...prev, total_fees: v }));
                      }
                    }}
                    className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:border-purple-500 text-slate-200"
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Due Amount (₹)</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500">
                    <IndianRupee size={16} />
                  </div>
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    value={intervalData.due_amount}
                    onChange={(e) => {
                      let v = e.target.value;
                      if (v.length > 1 && v.startsWith('0') && !v.includes('.')) {
                        v = v.replace(/^0+/, '');
                      }
                      if (v === '' || /^\d*\.?\d*$/.test(v)) {
                        setIntervalData(prev => ({ ...prev, due_amount: v }));
                      }
                    }}
                    className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:border-purple-500 text-slate-200"
                    placeholder="0"
                  />
                </div>
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
                  disabled={saving}
                  className="px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all font-medium flex items-center gap-2 disabled:opacity-50"
                >
                  {saving ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>Saving...</> : <><Save size={16} />Add Interval</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 max-w-md w-full shadow-2xl">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-red-600/20 rounded-xl border border-red-600/30">
                  <AlertTriangle className="text-red-500" size={28} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">
                    {deleteType === 'student' ? 'Delete Student' : 
                     deleteType === 'bulk_students' ? 'Delete Students' : 
                     'Delete Interval'}
                  </h3>
                  <p className="text-slate-400 text-sm">
                    {deleteType === 'student' ? 'This action cannot be undone.' :
                     deleteType === 'bulk_students' ? `This will delete ${selectedStudents.length} students.` :
                     'This action cannot be undone.'}
                  </p>
                </div>
              </div>
              
              <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700 mb-6">
                {deleteType === 'student' && studentToDelete && (
                  <div>
                    <p className="text-slate-400 text-sm">You are about to delete:</p>
                    <p className="text-white font-semibold text-lg mt-1">{studentToDelete.full_name}</p>
                    <p className="text-slate-500 text-sm">{studentToDelete.usn} • {studentToDelete.branch}</p>
                  </div>
                )}
                {deleteType === 'interval' && intervalToDelete && (
                  <div>
                    <p className="text-slate-400 text-sm">You are about to delete:</p>
                    <p className="text-white font-semibold text-lg mt-1">Interval #{intervalToDelete.interval_number}</p>
                    <p className="text-slate-500 text-sm">
                      {formatDate(intervalToDelete.start_date)} - {formatDate(intervalToDelete.end_date)}
                    </p>
                    <p className="text-orange-400 text-sm mt-1">Due Amount: {formatCurrency(intervalToDelete.due_amount)}</p>
                  </div>
                )}
                {deleteType === 'bulk_students' && (
                  <div>
                    <p className="text-slate-400 text-sm">You are about to delete:</p>
                    <p className="text-white font-semibold text-lg mt-1">{selectedStudents.length} Students</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setStudentToDelete(null);
                    setIntervalToDelete(null);
                    setDeleteType('student');
                  }}
                  className="px-5 py-2.5 text-slate-300 bg-slate-700 rounded-xl hover:bg-slate-600 transition-all font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (deleteType === 'student') confirmDeleteStudent();
                    else if (deleteType === 'interval') confirmDeleteInterval();
                    else if (deleteType === 'bulk_students') confirmBulkDeleteStudents();
                  }}
                  disabled={deleting}
                  className="px-5 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all font-medium flex items-center gap-2 disabled:opacity-50"
                >
                  {deleting ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Deleting...</>
                  ) : (
                    <><Trash2 size={16} /> Confirm Delete</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default withAuth(FeesManagement);