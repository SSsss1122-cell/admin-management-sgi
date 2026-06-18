'use client';

import { useState, useEffect } from 'react';
import { 
  Search, Download, CheckCircle, XCircle, 
  IndianRupee, Edit, X, Calendar, ArrowLeft,
  TrendingUp, Clock, AlertCircle, ChevronDown, 
  Users, Wallet, Receipt, Award, BookOpen, 
  GraduationCap, Layers, Trash2, Plus, Eye, Save,
  CalendarPlus, History, RefreshCw, CalendarDays,
  DollarSign, PieChart, CreditCard, Truck
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import withAuth from '../../components/withAuth';

function FeesManagement() {
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [feeFilter, setFeeFilter] = useState('all');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [institutionId, setInstitutionId] = useState(null);
  const [toast, setToast] = useState({ show: false, type: '', message: '' });
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const [selectedStudents, setSelectedStudents] = useState([]);
  
  // Financial summary states
  const [financialSummary, setFinancialSummary] = useState({
    total_fees: 0,
    total_collected: 0,
    total_due: 0,
    collection_rate: 0,
    monthly_collection: 0,
    pending_count: 0
  });
  
  // Date modal states
  const [showDateModal, setShowDateModal] = useState(false);
  const [dateModalData, setDateModalData] = useState({
    student: null,
    start_date: '',
    end_date: ''
  });
  
  // Due date modal for independent due date
  const [showDueDateModal, setShowDueDateModal] = useState(false);
  const [dueDateData, setDueDateData] = useState({
    student: null,
    interval_id: null,
    due_date: '',
    due_amount: 0
  });
  
  // Fee payment modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentData, setPaymentData] = useState({
    student: null,
    interval_id: null,
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_mode: 'cash',
    utr: '',
    remarks: ''
  });
  
  // Bulk assign modal
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
  const [bulkAssignData, setBulkAssignData] = useState({
    start_date: '',
    end_date: '',
    apply_to: 'all',
    selected_branch: '',
    selected_class: ''
  });
  
  // Delete states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Interval states
  const [showIntervalModal, setShowIntervalModal] = useState(false);
  const [selectedStudentForInterval, setSelectedStudentForInterval] = useState(null);
  const [intervalData, setIntervalData] = useState({
    interval_number: 1,
    start_date: '',
    end_date: '',
    total_fees: 0,
    paid_amount: 0,
    due_amount: 0,
    status: 'pending'
  });
  const [studentIntervals, setStudentIntervals] = useState({});
  
  // Interval dropdown state
  const [showIntervalDropdown, setShowIntervalDropdown] = useState(false);
  const [selectedIntervalId, setSelectedIntervalId] = useState(null);

  const router = useRouter();

  const showToast = (type, message) => {
    setToast({ show: true, type, message });
    setTimeout(() => {
      setToast({ show: false, type: '', message: '' });
    }, 3000);
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
      // Fetch students from new table
      const { data: studentData, error: studentError } = await supabase
        .from('students_new')
        .select('id, full_name, usn, branch, phone, email, created_at, updated_at, current_interval_id')
        .eq('institution_id', instId)
        .order('full_name');

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
      calculateFinancialSummary(studentData || [], intervalsMap);
    } catch (error) {
      console.error('Error fetching students:', error);
      showToast('error', 'Error fetching students: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateFinancialSummary = (studentsList, intervalsMap) => {
    let totalFees = 0;
    let totalCollected = 0;
    let totalDue = 0;
    let pendingCount = 0;

    studentsList.forEach(student => {
      const intervals = intervalsMap[student.id] || [];
      const fees = intervals.reduce((sum, i) => sum + (i.total_fees || 0), 0);
      const paid = intervals.reduce((sum, i) => sum + (i.paid_amount || 0), 0);
      const due = intervals.reduce((sum, i) => sum + (i.due_amount || 0), 0);
      
      totalFees += fees;
      totalCollected += paid;
      totalDue += due;
      
      if (due > 0) pendingCount++;
    });

    const collectionRate = totalFees > 0 ? (totalCollected / totalFees) * 100 : 0;

    setFinancialSummary({
      total_fees: totalFees,
      total_collected: totalCollected,
      total_due: totalDue,
      collection_rate: collectionRate,
      monthly_collection: 0,
      pending_count: pendingCount
    });
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
    }
    else if (feeFilter === 'paid') {
      filtered = filtered.filter(student => {
        const intervals = studentIntervals[student.id] || [];
        return intervals.length > 0 && intervals.every(i => Number(i.due_amount) === 0);
      });
    }
    else if (feeFilter === 'overdue') {
      filtered = filtered.filter(student => {
        const intervals = studentIntervals[student.id] || [];
        const today = new Date().toISOString().split('T')[0];
        return intervals.some(i => i.end_date && i.end_date < today && Number(i.due_amount) > 0);
      });
    }
    else if (feeFilter === 'active') {
      filtered = filtered.filter(student => {
        const intervals = studentIntervals[student.id] || [];
        const today = new Date().toISOString().split('T')[0];
        return intervals.some(i => i.start_date <= today && i.end_date >= today);
      });
    }
    else if (feeFilter === 'expired') {
      filtered = filtered.filter(student => {
        const intervals = studentIntervals[student.id] || [];
        const today = new Date().toISOString().split('T')[0];
        return intervals.some(i => i.end_date < today && Number(i.due_amount) > 0);
      });
    }
    else if (feeFilter === 'no-subscription') {
      filtered = filtered.filter(student => {
        const intervals = studentIntervals[student.id] || [];
        return intervals.length === 0;
      });
    }

    setFilteredStudents(filtered);
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const student = paymentData.student;
      const intervals = studentIntervals[student.id] || [];
      
      // Find the specific interval or first unpaid
      let targetInterval;
      if (paymentData.interval_id) {
        targetInterval = intervals.find(i => i.id === paymentData.interval_id);
      } else {
        targetInterval = intervals.find(i => Number(i.due_amount) > 0);
      }
      
      if (!targetInterval) {
        showToast('error', 'No pending dues found for this student!');
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
      
      showToast('success', `✅ Payment of ₹${Number(paymentData.amount).toLocaleString()} recorded for ${student.full_name}!`);
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
      
      showToast('success', `✅ Due date updated for ${dueDateData.student.full_name}!`);
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

  const handleAssignDate = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const student = dateModalData.student;
      
      const newInterval = {
        student_id: student.id,
        interval_number: (studentIntervals[student.id]?.length || 0) + 1,
        start_date: dateModalData.start_date,
        end_date: dateModalData.end_date,
        total_fees: 0,
        paid_amount: 0,
        due_amount: 0,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('student_intervals')
        .insert([newInterval]);
      
      if (error) {
        console.error('Insert error details:', error);
        throw error;
      }
      
      showToast('success', `✅ New interval assigned to ${dateModalData.student.full_name}!`);
      await fetchStudents(institutionId);
      setShowDateModal(false);
      setDateModalData({ student: null, start_date: '', end_date: '' });
      
    } catch (error) {
      console.error('Error assigning date:', error);
      showToast('error', '❌ Error assigning date: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleBulkAssign = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      let query = supabase
        .from('students_new')
        .select('id')
        .eq('institution_id', institutionId);
      
      if (bulkAssignData.apply_to === 'selected_branch' && bulkAssignData.selected_branch) {
        query = query.eq('branch', bulkAssignData.selected_branch);
      }
      
      const { data: studentsList, error: fetchError } = await query;
      
      if (fetchError) throw fetchError;
      
      for (const student of studentsList) {
        const newInterval = {
          student_id: student.id,
          interval_number: (studentIntervals[student.id]?.length || 0) + 1,
          start_date: bulkAssignData.start_date,
          end_date: bulkAssignData.end_date,
          total_fees: 0,
          paid_amount: 0,
          due_amount: 0,
          status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        await supabase
          .from('student_intervals')
          .insert([newInterval]);
      }
      
      showToast('success', `✅ Bulk date assignment completed!`);
      await fetchStudents(institutionId);
      setShowBulkAssignModal(false);
      setBulkAssignData({
        start_date: '',
        end_date: '',
        apply_to: 'all',
        selected_branch: '',
        selected_class: ''
      });
      
    } catch (error) {
      console.error('Error bulk assigning:', error);
      showToast('error', '❌ Error bulk assigning: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleClearDates = async (student) => {
    if (!confirm(`Clear all intervals for ${student.full_name}?`)) return;
    
    try {
      const { error } = await supabase
        .from('student_intervals')
        .delete()
        .eq('student_id', student.id);
      
      if (error) throw error;
      
      showToast('success', `✅ All intervals cleared for ${student.full_name}`);
      await fetchStudents(institutionId);
      
    } catch (error) {
      console.error('Error clearing intervals:', error);
      showToast('error', '❌ Error clearing intervals: ' + error.message);
    }
  };

  const handleDeleteInterval = async (intervalId) => {
    if (!confirm('⚠️ Are you sure you want to delete this interval?\n\nThis action cannot be undone.')) return;
    
    try {
      const { error } = await supabase
        .from('student_intervals')
        .delete()
        .eq('id', intervalId);
      
      if (error) throw error;
      
      showToast('success', '✅ Interval deleted successfully!');
      await fetchStudents(institutionId);
    } catch (error) {
      console.error('Error deleting interval:', error);
      showToast('error', '❌ Error deleting interval: ' + error.message);
    }
  };

  const openDateModal = (student) => {
    setDateModalData({
      student: student,
      start_date: '',
      end_date: ''
    });
    setShowDateModal(true);
  };

  const openDueDateModal = (student) => {
    const intervals = studentIntervals[student.id] || [];
    const targetInterval = intervals.find(i => Number(i.due_amount) > 0);
    
    setDueDateData({
      student: student,
      interval_id: targetInterval?.id || null,
      due_date: targetInterval?.end_date || '',
      due_amount: targetInterval?.due_amount || 0
    });
    setShowDueDateModal(true);
  };

  const openPaymentModal = (student) => {
    const intervals = studentIntervals[student.id] || [];
    const targetInterval = intervals.find(i => Number(i.due_amount) > 0);
    
    setPaymentData({
      student: student,
      interval_id: targetInterval?.id || null,
      amount: '',
      payment_date: new Date().toISOString().split('T')[0],
      payment_mode: 'cash',
      utr: '',
      remarks: ''
    });
    setShowPaymentModal(true);
  };

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

      console.log('Inserting interval:', payload);

      const { data, error } = await supabase
        .from('student_intervals')
        .insert([payload])
        .select();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Insert successful:', data);

      showToast('success', `✅ Interval ${intervalData.interval_number} added successfully!`);
      setShowIntervalModal(false);
      await fetchStudents(institutionId);
    } catch (error) {
      console.error('Error adding interval:', error);
      showToast('error', '❌ Error adding interval: ' + (error.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStudent = async (student) => {
    setStudentToDelete(student);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!studentToDelete) return;
    
    setDeleting(true);
    try {
      await supabase
        .from('student_intervals')
        .delete()
        .eq('student_id', studentToDelete.id);

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

  const handleBulkDelete = async () => {
    if (selectedStudents.length === 0) {
      showToast('error', 'Please select students to delete');
      return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedStudents.length} student(s)?`)) return;

    setDeleting(true);
    try {
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

      showToast('success', `✅ ${selectedStudents.length} student(s) deleted successfully!`);
      await fetchStudents(institutionId);
      setSelectedStudents([]);
      
    } catch (error) {
      console.error('Error bulk deleting students:', error);
      showToast('error', '❌ Error deleting students: ' + error.message);
    } finally {
      setDeleting(false);
    }
  };

  const getSubscriptionStatus = (student) => {
    const intervals = studentIntervals[student.id] || [];
    const activeInterval = intervals.find(i => i.start_date <= new Date().toISOString().split('T')[0] && i.end_date >= new Date().toISOString().split('T')[0]);
    
    if (!activeInterval) {
      return { text: 'No Active Interval', color: 'bg-slate-800/50 text-slate-400 border-slate-700', icon: '❌' };
    }
    
    if (activeInterval.end_date) {
      const endDate = new Date(activeInterval.end_date);
      const todayDate = new Date();
      const daysLeft = Math.ceil((endDate - todayDate) / (1000 * 60 * 60 * 24));
      return { text: `Active (${daysLeft} days left)`, color: 'bg-emerald-950/50 text-emerald-400 border-emerald-800', icon: '✅' };
    }
    
    return { text: 'Active', color: 'bg-emerald-950/50 text-emerald-400 border-emerald-800', icon: '✅' };
  };

  const getDueStatus = (student) => {
    const intervals = studentIntervals[student.id] || [];
    const totalDue = intervals.reduce((sum, i) => sum + (Number(i.due_amount) || 0), 0);
    const hasOverdue = intervals.some(i => i.end_date && i.end_date < new Date().toISOString().split('T')[0] && Number(i.due_amount) > 0);
    
    if (totalDue === 0) {
      return { text: 'Paid', color: 'bg-emerald-950/50 text-emerald-400 border-emerald-800', icon: '✅' };
    }
    
    if (hasOverdue) {
      return { text: 'Overdue', color: 'bg-red-950/50 text-red-400 border-red-800', icon: '⚠️' };
    }
    
    return { text: `Pending (₹${totalDue})`, color: 'bg-orange-950/50 text-orange-400 border-orange-800', icon: '💰' };
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not Set';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const exportToCSV = () => {
    const headers = ['USN', 'Name', 'Branch', 'Total Fees', 'Paid Amount', 'Due Amount', 'Due Status', 'Intervals Count'];
    
    const csvData = filteredStudents.map(student => {
      const intervals = studentIntervals[student.id] || [];
      const totalFees = intervals.reduce((sum, i) => sum + (i.total_fees || 0), 0);
      const paidAmount = intervals.reduce((sum, i) => sum + (i.paid_amount || 0), 0);
      const dueAmount = intervals.reduce((sum, i) => sum + (i.due_amount || 0), 0);
      const dueStatus = getDueStatus(student);
      
      return [
        student.usn || '',
        student.full_name || '',
        student.branch || 'N/A',
        totalFees || 0,
        paidAmount || 0,
        dueAmount || 0,
        dueStatus.text,
        intervals.length
      ];
    });

    const csvContent = [headers.join(','), ...csvData.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `fees_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
    URL.revokeObjectURL(url);
    
    showToast('success', '📊 Report exported successfully!');
  };

  const handleBack = () => {
    router.back();
  };

  const toggleStudentSelection = (studentId) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]
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
  const totalDueAmount = Object.values(studentIntervals).reduce((sum, intervals) => {
    return sum + intervals.reduce((s, i) => s + (Number(i.due_amount) || 0), 0);
  }, 0);
  
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
      {toast.show && (
        <div className="fixed top-20 right-4 z-50 animate-slide-in">
          <div className={`flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl backdrop-blur-md border ${
            toast.type === 'success' 
              ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-400' 
              : 'bg-red-950/90 border-red-500/30 text-red-400'
          }`}>
            {toast.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
            <span className="text-sm font-medium">{toast.message}</span>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
        {/* Header - Same as before */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
          <div className="flex items-center gap-4">
            <button onClick={handleBack} className="p-2 text-slate-400 hover:text-blue-400 rounded-xl hover:bg-slate-800 border border-slate-700">
              <ArrowLeft size={20} />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-600 rounded-2xl">
                  <CreditCard className="text-white" size={24} />
                </div>
                <div>
                  <h1 className="text-2xl lg:text-3xl font-bold text-white">Fees Management</h1>
                  <p className="text-slate-400 text-sm mt-1">Manage student fees, intervals & due dates</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setShowBulkAssignModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-purple-600/20 border border-purple-500 rounded-xl text-purple-400 hover:bg-purple-600/30 transition-all"
            >
              <CalendarPlus size={18} />
              <span>Bulk Assign Intervals</span>
            </button>
            {selectedStudents.length > 0 && (
              <button onClick={handleBulkDelete} className="flex items-center gap-2 px-4 py-2.5 bg-red-950/50 border border-red-700 rounded-xl text-red-400 hover:bg-red-900/50">
                <Trash2 size={18} />
                <span>Delete ({selectedStudents.length})</span>
              </button>
            )}
            <button onClick={exportToCSV} className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-300 hover:bg-blue-600/20 hover:border-blue-500 hover:text-blue-400">
              <Download size={18} />
              <span>Export Report</span>
            </button>
          </div>
        </div>

        {/* Financial Summary Cards - Same as before */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-slate-800 to-slate-800/50 rounded-2xl border border-slate-700 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-blue-600/20 rounded-xl">
                <Wallet className="text-blue-400" size={20} />
              </div>
              <span className="text-xs font-medium text-blue-400 bg-blue-950/50 px-2 py-0.5 rounded-full">Total</span>
            </div>
            <h3 className="text-2xl font-bold text-white">{formatCurrency(financialSummary.total_fees)}</h3>
            <p className="text-xs text-slate-400 mt-1">Total Fees Amount</p>
          </div>

          <div className="bg-gradient-to-br from-emerald-900/30 to-slate-800/50 rounded-2xl border border-emerald-700/30 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-emerald-600/20 rounded-xl">
                <CheckCircle className="text-emerald-400" size={20} />
              </div>
              <span className="text-xs font-medium text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded-full">Collected</span>
            </div>
            <h3 className="text-2xl font-bold text-emerald-400">{formatCurrency(financialSummary.total_collected)}</h3>
            <p className="text-xs text-slate-400 mt-1">Total Fees Collected</p>
          </div>

          <div className="bg-gradient-to-br from-orange-900/30 to-slate-800/50 rounded-2xl border border-orange-700/30 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-orange-600/20 rounded-xl">
                <AlertCircle className="text-orange-400" size={20} />
              </div>
              <span className="text-xs font-medium text-orange-400 bg-orange-950/50 px-2 py-0.5 rounded-full">Due</span>
            </div>
            <h3 className="text-2xl font-bold text-orange-400">{formatCurrency(financialSummary.total_due)}</h3>
            <p className="text-xs text-slate-400 mt-1">Total Due Amount</p>
          </div>

          <div className="bg-gradient-to-br from-purple-900/30 to-slate-800/50 rounded-2xl border border-purple-700/30 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-purple-600/20 rounded-xl">
                <TrendingUp className="text-purple-400" size={20} />
              </div>
              <span className="text-xs font-medium text-purple-400 bg-purple-950/50 px-2 py-0.5 rounded-full">Collection Rate</span>
            </div>
            <h3 className="text-2xl font-bold text-purple-400">{financialSummary.collection_rate.toFixed(1)}%</h3>
            <p className="text-xs text-slate-400 mt-1">Overall Collection Rate</p>
          </div>
        </div>

        {/* Additional Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
          <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-xl"><Users className="text-white" size={16} /></div>
              <div>
                <h3 className="text-xl font-bold text-white">{totalStudents}</h3>
                <p className="text-xs text-slate-400">Total Students</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-600 rounded-xl"><CheckCircle className="text-white" size={16} /></div>
              <div>
                <h3 className="text-xl font-bold text-emerald-400">{activeStudents}</h3>
                <p className="text-xs text-slate-400">Active Intervals</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-600 rounded-xl"><AlertCircle className="text-white" size={16} /></div>
              <div>
                <h3 className="text-xl font-bold text-orange-400">{financialSummary.pending_count}</h3>
                <p className="text-xs text-slate-400">Pending Fees</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-600 rounded-xl"><XCircle className="text-white" size={16} /></div>
              <div>
                <h3 className="text-xl font-bold text-red-400">{overdueCount}</h3>
                <p className="text-xs text-slate-400">Overdue</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-600 rounded-xl"><Layers className="text-white" size={16} /></div>
              <div>
                <h3 className="text-xl font-bold text-purple-400">{Object.keys(studentIntervals).length}</h3>
                <p className="text-xs text-slate-400">With Intervals</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-600 rounded-xl"><Calendar className="text-white" size={16} /></div>
              <div>
                <h3 className="text-xl font-bold text-slate-300">{noSubscriptionStudents}</h3>
                <p className="text-xs text-slate-400">No Interval</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-5 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500" size={18} />
              <input
                type="text"
                placeholder="Search by name, USN, or branch..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 text-slate-200"
              />
            </div>
            
            <div className="flex flex-wrap gap-3">
              <select
                value={feeFilter}
                onChange={(e) => setFeeFilter(e.target.value)}
                className="px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-slate-200 cursor-pointer"
              >
                <option value="all">All Students</option>
                <option value="due">Due Fees</option>
                <option value="overdue">Overdue</option>
                <option value="paid">Fees Paid</option>
                <option value="active">Active Interval</option>
                <option value="expired">Expired</option>
                <option value="no-subscription">No Interval</option>
              </select>

              <button
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                className="px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-slate-400 hover:text-blue-400"
              >
                <Layers size={18} />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-700">
            <span className="text-xs font-medium text-slate-500 py-1">Quick filters:</span>
            <button onClick={() => setFeeFilter('due')} className="px-3 py-1 bg-orange-950/50 text-orange-400 rounded-lg text-xs border border-orange-800">
              Due Fees ({financialSummary.pending_count})
            </button>
            <button onClick={() => setFeeFilter('overdue')} className="px-3 py-1 bg-red-950/50 text-red-400 rounded-lg text-xs border border-red-800">
              Overdue ({overdueCount})
            </button>
            <button onClick={() => setFeeFilter('paid')} className="px-3 py-1 bg-emerald-950/50 text-emerald-400 rounded-lg text-xs border border-emerald-800">
              Paid ({students.filter(s => {
                const intervals = studentIntervals[s.id] || [];
                return intervals.length > 0 && intervals.every(i => Number(i.due_amount) === 0);
              }).length})
            </button>
            <button onClick={() => setFeeFilter('active')} className="px-3 py-1 bg-emerald-950/50 text-emerald-400 rounded-lg text-xs border border-emerald-800">
              Active ({activeStudents})
            </button>
            <button onClick={() => setFeeFilter('no-subscription')} className="px-3 py-1 bg-purple-950/50 text-purple-400 rounded-lg text-xs border border-purple-800">
              No Interval ({noSubscriptionStudents})
            </button>
          </div>
        </div>

        {/* Grid View */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredStudents.map((student) => {
              const intervals = studentIntervals[student.id] || [];
              const totalFees = intervals.reduce((sum, i) => sum + (i.total_fees || 0), 0);
              const paidAmount = intervals.reduce((sum, i) => sum + (i.paid_amount || 0), 0);
              const dueAmount = intervals.reduce((sum, i) => sum + (i.due_amount || 0), 0);
              const busStatus = getSubscriptionStatus(student);
              const dueStatus = getDueStatus(student);
              const paidPercentage = totalFees > 0 ? (paidAmount / totalFees) * 100 : 0;
              
              return (
                <div key={student.id} className="bg-slate-800/50 rounded-2xl border border-slate-700 hover:border-blue-500/30 transition-all overflow-hidden">
                  <div className={`h-1 ${
                    dueAmount === 0 ? 'bg-emerald-500' :
                    dueStatus.text === 'Overdue' ? 'bg-red-500' :
                    'bg-orange-500'
                  }`}></div>
                  <div className="p-5">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                          <GraduationCap className="text-white" size={20} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-white">{student.full_name}</h3>
                          <p className="text-xs text-slate-500">{student.usn || 'No USN'}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${dueStatus.color}`}>
                          {dueStatus.icon} {dueStatus.text}
                        </span>
                        <span className={`px-2 py-0.5 text-xs rounded-full border ${busStatus.color}`}>
                          {busStatus.icon} {busStatus.text.split('(')[0].trim()}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3 mb-4">
                      <div className="flex items-center gap-2 text-sm">
                        <BookOpen size={14} className="text-slate-500" />
                        <span className="text-slate-400">{student.branch || 'N/A'}</span>
                      </div>
                      
                      {/* Intervals Info with Dropdown */}
                      <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700">
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="text-slate-500">Intervals</span>
                          <div className="flex gap-1">
                            <button
                              onClick={() => openIntervalModal(student)}
                              className="text-purple-400 hover:text-purple-300 text-xs flex items-center gap-1"
                            >
                              <Plus size={12} /> Add
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-slate-300">
                          <Layers size={14} />
                          <span className="text-sm">
                            {intervals.length} interval{intervals.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        {intervals.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-slate-700 max-h-32 overflow-y-auto space-y-1">
                            {intervals.map((interval) => (
                              <div key={interval.id} className="flex items-center justify-between text-xs bg-slate-800/50 rounded px-2 py-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-slate-400">#{interval.interval_number}</span>
                                  <span className="text-slate-300">
                                    {formatDate(interval.start_date)} - {formatDate(interval.end_date)}
                                  </span>
                                  <span className={`px-1.5 py-0.5 rounded text-xs ${
                                    interval.status === 'paid' ? 'bg-emerald-900/50 text-emerald-400' :
                                    interval.status === 'partial' ? 'bg-amber-900/50 text-amber-400' :
                                    'bg-orange-900/50 text-orange-400'
                                  }`}>
                                    {interval.status || 'pending'}
                                  </span>
                                  <span className="text-orange-400">₹{interval.due_amount || 0}</span>
                                </div>
                                <button
                                  onClick={() => {
                                    if (confirm(`Delete interval #${interval.interval_number}?`)) {
                                      handleDeleteInterval(interval.id);
                                    }
                                  }}
                                  className="p-1 text-red-400 hover:bg-red-600/20 rounded transition-colors"
                                  title="Delete Interval"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      {/* Fees Status */}
                      <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-slate-500">Fees Status</span>
                          <div className="flex gap-1">
                            <button
                              onClick={() => openPaymentModal(student)}
                              className="text-emerald-400 hover:text-emerald-300 text-xs flex items-center gap-1"
                            >
                              <DollarSign size={12} /> Pay
                            </button>
                            <button
                              onClick={() => openDueDateModal(student)}
                              className="text-purple-400 hover:text-purple-300 text-xs flex items-center gap-1"
                            >
                              <Calendar size={12} /> Set Due
                            </button>
                          </div>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-1.5 mb-2">
                          <div 
                            className={`h-1.5 rounded-full transition-all ${
                              dueAmount === 0 ? 'bg-emerald-500' : 'bg-orange-500'
                            }`}
                            style={{ width: `${paidPercentage}%` }}
                          ></div>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-emerald-400">Paid: {formatCurrency(paidAmount)}</span>
                          <span className="text-orange-400">Due: {formatCurrency(dueAmount)}</span>
                          <span className="text-slate-400">Total: {formatCurrency(totalFees)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-3 border-t border-slate-700">
                      <button
                        onClick={() => openPaymentModal(student)}
                        className="px-3 py-1.5 bg-emerald-600/20 text-emerald-400 rounded-lg text-xs hover:bg-emerald-600/30 transition-colors flex items-center gap-1"
                      >
                        <DollarSign size={12} /> Pay
                      </button>
                      <button
                        onClick={() => openIntervalModal(student)}
                        className="px-3 py-1.5 bg-purple-600/20 text-purple-400 rounded-lg text-xs hover:bg-purple-600/30 transition-colors flex items-center gap-1"
                      >
                        <Layers size={12} /> Add Interval
                      </button>
                      <button
                        onClick={() => handleDeleteStudent(student)}
                        className="p-1.5 text-red-400 hover:bg-red-600/20 rounded-lg transition-colors"
                        title="Delete Student"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-slate-800/50 rounded-2xl border border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-900 border-b border-slate-700">
                    <th className="px-5 py-3 text-left">
                      <input type="checkbox" checked={selectedStudents.length === filteredStudents.length && filteredStudents.length > 0} onChange={selectAllStudents} className="rounded" />
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400">Student</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400">Branch</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400">Intervals</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400">Total Fees</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400">Paid</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400">Due</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400">Status</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {filteredStudents.map((student) => {
                    const intervals = studentIntervals[student.id] || [];
                    const totalFees = intervals.reduce((sum, i) => sum + (i.total_fees || 0), 0);
                    const paidAmount = intervals.reduce((sum, i) => sum + (i.paid_amount || 0), 0);
                    const dueAmount = intervals.reduce((sum, i) => sum + (i.due_amount || 0), 0);
                    const dueStatus = getDueStatus(student);
                    
                    return (
                      <tr key={student.id} className="hover:bg-slate-700/30">
                        <td className="px-5 py-3">
                          <input type="checkbox" checked={selectedStudents.includes(student.id)} onChange={() => toggleStudentSelection(student.id)} className="rounded" />
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                              <GraduationCap className="text-white" size={14} />
                            </div>
                            <div>
                              <p className="font-medium text-white">{student.full_name}</p>
                              <p className="text-xs text-slate-500">{student.usn || 'No USN'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-sm text-slate-400">{student.branch || 'N/A'}</td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <Layers size={14} className="text-purple-400" />
                            <span className="text-sm text-slate-300">{intervals.length}</span>
                            {intervals.length > 0 && (
                              <button
                                onClick={() => setSelectedStudent(student)}
                                className="text-xs text-blue-400 hover:text-blue-300"
                              >
                                View
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3 text-sm text-white">{formatCurrency(totalFees)}</td>
                        <td className="px-5 py-3 text-sm text-emerald-400">{formatCurrency(paidAmount)}</td>
                        <td className={`px-5 py-3 text-sm font-semibold ${dueAmount > 0 ? 'text-orange-400' : 'text-emerald-400'}`}>
                          {formatCurrency(dueAmount)}
                        </td>
                        <td className="px-5 py-3">
                          <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${dueStatus.color}`}>
                            {dueStatus.icon} {dueStatus.text}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex gap-1">
                            <button onClick={() => openPaymentModal(student)} className="p-1.5 text-emerald-400 hover:bg-emerald-600/20 rounded" title="Record Payment">
                              <DollarSign size={14} />
                            </button>
                            <button onClick={() => openIntervalModal(student)} className="p-1.5 text-purple-400 hover:bg-purple-600/20 rounded" title="Add Interval">
                              <Layers size={14} />
                            </button>
                            <button onClick={() => handleDeleteStudent(student)} className="p-1.5 text-red-400 hover:bg-red-600/20 rounded" title="Delete">
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
          </div>
        )}

        {/* Empty State */}
        {filteredStudents.length === 0 && (
          <div className="text-center py-12 bg-slate-800/50 rounded-2xl border border-slate-700">
            <div className="w-20 h-20 bg-slate-700/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <CreditCard className="text-slate-500" size={32} />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No Students Found</h3>
            <p className="text-slate-400 mb-4">Try adjusting your search or filter criteria</p>
            <button onClick={() => { setSearchTerm(''); setFeeFilter('all'); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Assign Interval Modal */}
      {showDateModal && dateModalData.student && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-600 rounded-xl">
                    <Calendar className="text-white" size={20} />
                  </div>
                  <h3 className="text-xl font-bold text-white">Assign New Interval</h3>
                </div>
                <button onClick={() => setShowDateModal(false)} className="p-2 text-slate-400 hover:bg-slate-700 rounded-lg">
                  <X size={20} />
                </button>
              </div>
              
              <div className="mb-6 p-4 bg-slate-700/30 rounded-xl">
                <p className="font-semibold text-white">{dateModalData.student.full_name}</p>
                <p className="text-sm text-slate-400">{dateModalData.student.usn} • {dateModalData.student.branch}</p>
              </div>

              <form onSubmit={handleAssignDate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={dateModalData.start_date}
                    onChange={(e) => setDateModalData({...dateModalData, start_date: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:border-blue-500 text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">End Date *</label>
                  <input
                    type="date"
                    required
                    value={dateModalData.end_date}
                    onChange={(e) => setDateModalData({...dateModalData, end_date: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:border-blue-500 text-slate-200"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setShowDateModal(false)} className="px-4 py-2 text-slate-300 bg-slate-700 rounded-lg hover:bg-slate-600">Cancel</button>
                  <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
                    {saving ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>Saving...</> : <><Save size={16} />Assign Interval</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Set Due Date Modal with Interval Dropdown */}
      {showDueDateModal && dueDateData.student && (
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
              
              <div className="mb-6 p-4 bg-slate-700/30 rounded-xl">
                <p className="font-semibold text-white">{dueDateData.student.full_name}</p>
                <p className="text-sm text-slate-400">{dueDateData.student.usn} • {dueDateData.student.branch}</p>
              </div>

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
                      type="number"
                      required
                      placeholder="Enter due amount"
                      value={dueDateData.due_amount}
                      onChange={(e) => setDueDateData({...dueDateData, due_amount: parseFloat(e.target.value) || 0})}
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

      {/* Payment Modal with Interval Dropdown */}
      {showPaymentModal && paymentData.student && (
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
              
              <div className="mb-6 p-4 bg-slate-700/30 rounded-xl">
                <p className="font-semibold text-white">{paymentData.student.full_name}</p>
                <p className="text-sm text-slate-400">{paymentData.student.usn} • {paymentData.student.branch}</p>
                <div className="mt-2 pt-2 border-t border-slate-600">
                  <p className="text-sm text-slate-300">Total Fees: <span className="text-white font-semibold">{formatCurrency((studentIntervals[paymentData.student.id] || []).reduce((sum, i) => sum + (i.total_fees || 0), 0))}</span></p>
                  <p className="text-sm text-slate-300">Already Paid: <span className="text-emerald-400 font-semibold">{formatCurrency((studentIntervals[paymentData.student.id] || []).reduce((sum, i) => sum + (i.paid_amount || 0), 0))}</span></p>
                </div>
              </div>

              <form onSubmit={handleRecordPayment} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Select Interval</label>
                  <select
                    value={paymentData.interval_id || ''}
                    onChange={(e) => {
                      setPaymentData({...paymentData, interval_id: e.target.value || null});
                    }}
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:border-emerald-500 text-slate-200"
                  >
                    <option value="">Select an interval</option>
                    {(studentIntervals[paymentData.student.id] || []).filter(i => Number(i.due_amount) > 0).map(interval => (
                      <option key={interval.id} value={interval.id}>
                        Interval #{interval.interval_number} - Due: ₹{interval.due_amount || 0}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Amount *</label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500">
                      <IndianRupee size={16} />
                    </div>
                    <input
                      type="number"
                      required
                      placeholder="Enter amount"
                      value={paymentData.amount}
                      onChange={(e) => setPaymentData({...paymentData, amount: e.target.value})}
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
                    onChange={(e) => setPaymentData({...paymentData, payment_date: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:border-emerald-500 text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Payment Mode</label>
                  <select
                    value={paymentData.payment_mode}
                    onChange={(e) => setPaymentData({...paymentData, payment_mode: e.target.value})}
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
                    onChange={(e) => setPaymentData({...paymentData, utr: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:border-emerald-500 text-slate-200"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setShowPaymentModal(false)} className="px-4 py-2 text-slate-300 bg-slate-700 rounded-lg hover:bg-slate-600">Cancel</button>
                  <button type="submit" disabled={saving} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2">
                    {saving ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>Processing...</> : <><CheckCircle size={16} />Record Payment</>}
                  </button>
                </div>
              </form>
            </div>
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
                <h3 className="text-xl font-bold text-white">Add Fee Interval</h3>
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
                  disabled={saving}
                  className="px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all font-medium flex items-center gap-2"
                >
                  {saving ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>Saving...</> : <><Save size={16} />Add Interval</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Assign Modal */}
      {showBulkAssignModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-600 rounded-xl">
                    <CalendarPlus className="text-white" size={20} />
                  </div>
                  <h3 className="text-xl font-bold text-white">Bulk Assign Intervals</h3>
                </div>
                <button onClick={() => setShowBulkAssignModal(false)} className="p-2 text-slate-400 hover:bg-slate-700 rounded-lg">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleBulkAssign} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Assign To *</label>
                  <select
                    required
                    value={bulkAssignData.apply_to}
                    onChange={(e) => setBulkAssignData({...bulkAssignData, apply_to: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-slate-200"
                  >
                    <option value="all">All Students</option>
                    <option value="selected_branch">Specific Branch</option>
                  </select>
                </div>

                {bulkAssignData.apply_to === 'selected_branch' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Select Branch</label>
                    <select
                      required
                      value={bulkAssignData.selected_branch}
                      onChange={(e) => setBulkAssignData({...bulkAssignData, selected_branch: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-slate-200"
                    >
                      <option value="">Select Branch</option>
                      {[...new Set(students.map(s => s.branch))].filter(Boolean).map(branch => (
                        <option key={branch} value={branch}>{branch}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={bulkAssignData.start_date}
                    onChange={(e) => setBulkAssignData({...bulkAssignData, start_date: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:border-purple-500 text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">End Date *</label>
                  <input
                    type="date"
                    required
                    value={bulkAssignData.end_date}
                    onChange={(e) => setBulkAssignData({...bulkAssignData, end_date: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:border-purple-500 text-slate-200"
                  />
                </div>

                <div className="bg-amber-950/30 p-3 rounded-lg border border-amber-800">
                  <p className="text-amber-400 text-xs flex items-center gap-2">
                    <AlertCircle size={14} />
                    This will assign a new interval to all students matching your selection
                  </p>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setShowBulkAssignModal(false)} className="px-4 py-2 text-slate-300 bg-slate-700 rounded-lg hover:bg-slate-600">Cancel</button>
                  <button type="submit" disabled={saving} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2">
                    {saving ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>Processing...</> : <><CalendarPlus size={16} />Bulk Assign</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && studentToDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-600 rounded-xl"><Trash2 className="text-white" size={24} /></div>
                <h3 className="text-xl font-bold text-white">Delete Student</h3>
              </div>
              <p className="text-slate-300 mb-2">Are you sure you want to delete <span className="font-semibold text-white">{studentToDelete.full_name}</span>?</p>
              <p className="text-slate-400 text-sm mb-6">This will also delete all associated intervals.</p>
              <div className="flex justify-end gap-3">
                <button onClick={() => { setShowDeleteConfirm(false); setStudentToDelete(null); }} className="px-4 py-2 text-slate-300 bg-slate-700 rounded-lg">Cancel</button>
                <button onClick={confirmDelete} disabled={deleting} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2">
                  {deleting ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>Deleting...</> : <><Trash2 size={16} />Delete Student</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slide-in {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in { animation: slide-in 0.3s ease-out; }
      `}</style>
    </div>
  );
}

export default withAuth(FeesManagement);