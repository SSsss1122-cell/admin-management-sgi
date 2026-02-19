'use client';

import { useState, useEffect } from 'react';
import { CreditCard, Search, Filter, Download, CheckCircle, XCircle, IndianRupee, Plus, Edit, Trash2, Mail, Phone, X, Calendar, ArrowLeft, Menu } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/navigation';
import withAuth from '../../components/withAuth'

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

  const router = useRouter();

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    filterStudents();
  }, [students, searchTerm, feeFilter]);

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

  // 🔥 FIXED: Added null checks for all fields in search filter
  const filterStudents = () => {
    let filtered = students;

    // Apply search filter - FIXED with null checks
    if (searchTerm && searchTerm.trim() !== '') {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(student => {
        // Add null checks for each field before calling toLowerCase
        const fullName = student.full_name ? student.full_name.toLowerCase() : '';
        const usn = student.usn ? student.usn.toLowerCase() : '';
        const branch = student.branch ? student.branch.toLowerCase() : '';
        
        return fullName.includes(searchLower) ||
               usn.includes(searchLower) ||
               branch.includes(searchLower);
      });
    }

    // Apply fee status filter
    if (feeFilter === 'paid') {
      filtered = filtered.filter(student => {
        const total = parseFloat(student.total_fees) || 0;
        const paid = parseFloat(student.paid_amount) || 0;
        const due = parseFloat(student.due_amount) || 0;
        return total > 0 && due === 0 && paid > 0;
      });
    } 
    else if (feeFilter === 'half') {
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
        payment_mode: feeData.payment_mode || null
      };

      const { error } = await supabase
        .from('students')
        .update(updateData)
        .eq('id', selectedStudent.id);

      if (error) throw error;

      alert('Fee details updated successfully!');
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

    if (total === 0) return 'bg-gray-100 text-gray-800 border border-gray-200';
    
    if (due === 0 && paid > 0) {
      return 'bg-green-100 text-green-800 border border-green-200';
    } else if (paid > 0 && due > 0) {
      return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
    } else if (due > 0 && paid === 0) {
      return 'bg-red-100 text-red-800 border border-red-200';
    } else {
      return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  const getFeesStatusText = (student) => {
    const total = parseFloat(student.total_fees) || 0;
    const paid = parseFloat(student.paid_amount) || 0;
    const due = parseFloat(student.due_amount) || 0;

    if (total === 0) return 'Not Set';
    if (due === 0 && paid > 0) return 'Paid';
    if (paid > 0 && due > 0) return 'Half Paid';
    if (due > 0 && paid === 0) return 'Due';
    return 'Not Set';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN');
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
    const headers = ['USN', 'Name', 'Branch', 'Class', 'Total Fees', 'Paid Amount', 'Due Amount', 'Fee Status', 'Last Payment Date', 'Next Payment Date', 'Payment Mode'];
    const csvData = students.map(student => [
      student.usn || '',
      student.full_name || '',
      student.branch || 'N/A',
      `${student.class || ''} ${student.division || ''}`.trim(),
      student.total_fees || '0',
      student.paid_amount || '0',
      student.due_amount || '0',
      getFeesStatusText(student),
      student.last_payment_date || 'N/A',
      student.next_payment_date || 'N/A',
      student.payment_mode || 'N/A'
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fees-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleBack = () => {
    router.back();
  };

  // Calculate stats based on actual amounts
  const totalStudents = students.length;
  
  const paidStudents = students.filter(student => {
    const total = parseFloat(student.total_fees) || 0;
    const paid = parseFloat(student.paid_amount) || 0;
    const due = parseFloat(student.due_amount) || 0;
    return total > 0 && due === 0 && paid > 0;
  }).length;

  const halfPaidStudents = students.filter(student => {
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 lg:py-8">
        <div className="space-y-4 lg:space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={handleBack}
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors p-2 rounded-lg hover:bg-gray-100"
                title="Go back"
              >
                <ArrowLeft size={20} />
                <span className="hidden sm:block ml-2 text-sm font-medium">Back</span>
              </button>
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Fees Management</h1>
                <p className="text-gray-600 text-xs sm:text-sm mt-1">Manage student fees and payments</p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <button 
                onClick={exportToCSV}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center w-full sm:w-auto text-sm"
              >
                <Download size={16} className="mr-2" />
                Export CSV
              </button>
            </div>
          </div>

          {/* Fees Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-3 lg:gap-4">
            <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-3 sm:p-4 lg:p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Total Students</p>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">{totalStudents}</p>
                </div>
                <CreditCard className="text-blue-400" size={18} />
              </div>
            </div>
            <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-3 sm:p-4 lg:p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Fully Paid</p>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600">{paidStudents}</p>
                </div>
                <CheckCircle className="text-green-400" size={18} />
              </div>
            </div>
            <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-3 sm:p-4 lg:p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Half Paid</p>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-yellow-600">{halfPaidStudents}</p>
                </div>
                <CreditCard className="text-yellow-400" size={18} />
              </div>
            </div>
            <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-3 sm:p-4 lg:p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Fully Due</p>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-red-600">{dueStudents}</p>
                </div>
                <XCircle className="text-red-400" size={18} />
              </div>
            </div>
            <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-3 sm:p-4 lg:p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Total Due</p>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-orange-600">
                    ₹{totalDue.toLocaleString('en-IN')}
                  </p>
                </div>
                <IndianRupee className="text-orange-400" size={18} />
              </div>
            </div>
          </div>

          {/* Financial Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 lg:gap-4">
            <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-3 sm:p-4 lg:p-6 border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Total Fees</p>
                  <p className="text-base sm:text-lg lg:text-xl font-bold text-green-700">
                    ₹{totalFees.toLocaleString('en-IN')}
                  </p>
                </div>
                <CreditCard className="text-green-500" size={16} />
              </div>
            </div>
            <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-3 sm:p-4 lg:p-6 border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Collected</p>
                  <p className="text-base sm:text-lg lg:text-xl font-bold text-blue-700">
                    ₹{totalPaid.toLocaleString('en-IN')}
                  </p>
                </div>
                <CheckCircle className="text-blue-500" size={16} />
              </div>
            </div>
            <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-3 sm:p-4 lg:p-6 border border-red-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Pending</p>
                  <p className="text-base sm:text-lg lg:text-xl font-bold text-red-700">
                    ₹{totalDue.toLocaleString('en-IN')}
                  </p>
                </div>
                <XCircle className="text-red-500" size={16} />
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-4 border border-gray-200">
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
                      placeholder="Search by name, USN, or branch..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white text-sm"
                    />
                  </div>
                </div>
                <select
                  value={feeFilter}
                  onChange={(e) => setFeeFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white text-sm"
                >
                  <option value="all">All Students</option>
                  <option value="paid">Fully Paid</option>
                  <option value="half">Half Paid</option>
                  <option value="due">Fully Due</option>
                </select>
              </div>
            </div>
          </div>

          {/* Students Table */}
          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                Student Fee Status <span className="text-blue-600">({filteredStudents.length})</span>
              </h3>
            </div>
            <div className="overflow-x-auto">
              {/* Mobile Card View */}
              <div className="lg:hidden">
                {filteredStudents.length === 0 ? (
                  <div className="text-center py-8">
                    <CreditCard className="mx-auto text-gray-400 mb-3" size={40} />
                    <h3 className="text-base font-semibold text-gray-900 mb-1">No Students Found</h3>
                    <p className="text-gray-600 text-sm">Try adjusting your search criteria</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {filteredStudents.map((student) => (
                      <div key={student.id} className="p-4 hover:bg-gray-50">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 text-base">{student.full_name}</h4>
                            <p className="text-gray-600 text-sm">{student.usn}</p>
                            <p className="text-gray-500 text-xs mt-1">{student.branch}</p>
                          </div>
                          <div className="flex flex-col items-end space-y-2">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getFeesStatusColor(student)}`}>
                              {getFeesStatusText(student)}
                            </span>
                            <div className="flex space-x-1">
                              <button 
                                onClick={() => openFeeForm(student)}
                                className="text-blue-600 hover:text-blue-900 p-1"
                                title="Edit Fee Details"
                              >
                                <Edit size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                          <div className="text-center">
                            <p className="text-gray-600">Total</p>
                            <p className="font-semibold text-gray-900">₹{student.total_fees || '0'}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-gray-600">Paid</p>
                            <p className="font-semibold text-green-600">₹{student.paid_amount || '0'}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-gray-600">Due</p>
                            <p className="font-semibold text-red-600">₹{student.due_amount || '0'}</p>
                          </div>
                        </div>

                        <div className="text-xs text-gray-600 space-y-1">
                          {student.email && (
                            <div className="flex items-center">
                              <Mail size={10} className="mr-1" />
                              <span className="truncate">{student.email}</span>
                            </div>
                          )}
                          {student.phone && (
                            <div className="flex items-center">
                              <Phone size={10} className="mr-1" />
                              {student.phone}
                            </div>
                          )}
                          {student.next_payment_date && (
                            <div className={`flex items-center ${isUpcomingPayment(student.next_payment_date) ? 'text-orange-600 font-semibold' : ''}`}>
                              <Calendar size={10} className="mr-1" />
                              Next: {formatDate(student.next_payment_date)}
                              {isUpcomingPayment(student.next_payment_date) && (
                                <span className="ml-1 text-xs bg-orange-100 text-orange-800 px-1 rounded">Soon</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Desktop Table View */}
              <table className="hidden lg:table w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">USN</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Branch</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paid</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Next Payment</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{student.usn}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{student.full_name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.branch}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">₹{student.total_fees || '0'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">₹{student.paid_amount || '0'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">₹{student.due_amount || '0'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getFeesStatusColor(student)}`}>
                          {getFeesStatusText(student)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {formatDate(student.next_payment_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button 
                          onClick={() => openFeeForm(student)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Edit Fee Details"
                        >
                          <Edit size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Fee Details Modal */}
      {showFeeForm && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-gray-900">Update Fee Details</h3>
                <button onClick={() => setShowFeeForm(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>
              
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <p className="font-medium text-gray-900">{selectedStudent.full_name}</p>
                <p className="text-sm text-gray-600">{selectedStudent.usn} - {selectedStudent.branch}</p>
              </div>

              <form onSubmit={handleFeeSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Total Fees (₹)</label>
                    <input
                      type="number"
                      value={feeData.total_fees}
                      onChange={(e) => setFeeData({...feeData, total_fees: e.target.value})}
                      onBlur={calculateDue}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Paid Amount (₹)</label>
                    <input
                      type="number"
                      value={feeData.paid_amount}
                      onChange={(e) => setFeeData({...feeData, paid_amount: e.target.value})}
                      onBlur={calculateDue}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Amount (₹)</label>
                  <input
                    type="number"
                    value={feeData.due_amount}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Payment Date</label>
                    <input
                      type="date"
                      value={feeData.last_payment_date}
                      onChange={(e) => setFeeData({...feeData, last_payment_date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Next Payment Date</label>
                    <input
                      type="date"
                      value={feeData.next_payment_date}
                      onChange={(e) => setFeeData({...feeData, next_payment_date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Mode</label>
                  <select
                    value={feeData.payment_mode}
                    onChange={(e) => setFeeData({...feeData, payment_mode: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Mode</option>
                    <option value="Cash">Cash</option>
                    <option value="Online Transfer">Online Transfer</option>
                    <option value="Cheque">Cheque</option>
                    <option value="DD">Demand Draft</option>
                    <option value="Card">Card</option>
                  </select>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowFeeForm(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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