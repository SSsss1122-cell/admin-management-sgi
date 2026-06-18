// app/fees/components.js
'use client';

import { useState, useEffect } from 'react';
import { 
  ArrowLeft, CreditCard, Wallet, CheckCircle, AlertCircle, 
  TrendingUp, Layers, CalendarPlus, Trash2, Download, 
  Search, GraduationCap, BookOpen, Calendar, 
  X, Plus, DollarSign, AlertTriangle, Edit, IndianRupee, Save,
  CalendarDays
} from 'lucide-react';

// ============================================================
// HEADER + STATS
// ============================================================
export function FeesHeader({ handleBack, selectedStudents, selectedIntervals, handleBulkDeleteStudents, handleBulkDeleteIntervals, exportToCSV, setShowBulkAssignModal, financialSummary, totalIntervals }) {
  const fmt = (a) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(a || 0);
  
  const stats = [
    { icon: Wallet, label: 'Total Fees', value: fmt(financialSummary.total_fees), color: 'blue' },
    { icon: CheckCircle, label: 'Collected', value: fmt(financialSummary.total_collected), color: 'emerald' },
    { icon: AlertCircle, label: 'Due', value: fmt(financialSummary.total_due), color: 'orange' },
    { icon: TrendingUp, label: 'Rate', value: financialSummary.collection_rate.toFixed(1) + '%', color: 'purple' },
    { icon: Layers, label: 'Intervals', value: totalIntervals, color: 'indigo' }
  ];

  const colors = { blue: 'from-blue-600 to-cyan-600', emerald: 'from-emerald-600 to-teal-600', orange: 'from-orange-600 to-amber-600', purple: 'from-purple-600 to-pink-600', indigo: 'from-indigo-600 to-blue-600' };

  return (
    <>
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button onClick={handleBack} className="p-2 text-slate-400 hover:text-blue-400 rounded-xl hover:bg-slate-800 border border-slate-700"><ArrowLeft size={20} /></button>
          <div className="flex items-center gap-3"><div className="p-3 bg-blue-600 rounded-2xl"><CreditCard className="text-white" size={24} /></div>
            <div><h1 className="text-xl lg:text-3xl font-bold text-white">Fees Management</h1><p className="text-slate-400 text-xs lg:text-sm mt-1 hidden sm:block">Manage student fees, intervals & due dates</p></div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 w-full lg:w-auto">
          <button onClick={() => setShowBulkAssignModal(true)} className="flex items-center gap-2 px-3 py-2 lg:px-4 lg:py-2.5 bg-purple-600/20 border border-purple-500 rounded-xl text-purple-400 hover:bg-purple-600/30 transition-all text-sm lg:text-base"><CalendarPlus size={18} /><span className="hidden sm:inline">Bulk Assign</span><span className="sm:hidden">Bulk</span></button>
          {selectedStudents.length > 0 && <button onClick={handleBulkDeleteStudents} className="flex items-center gap-2 px-3 py-2 lg:px-4 lg:py-2.5 bg-red-950/50 border border-red-700 rounded-xl text-red-400 hover:bg-red-900/50 text-sm lg:text-base"><Trash2 size={18} /><span>{selectedStudents.length}</span></button>}
          {selectedIntervals.length > 0 && <button onClick={handleBulkDeleteIntervals} className="flex items-center gap-2 px-3 py-2 lg:px-4 lg:py-2.5 bg-orange-950/50 border border-orange-700 rounded-xl text-orange-400 hover:bg-orange-900/50 text-sm lg:text-base"><Trash2 size={18} /><span>Delete {selectedIntervals.length}</span></button>}
          <button onClick={exportToCSV} className="flex items-center gap-2 px-3 py-2 lg:px-4 lg:py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-300 hover:bg-blue-600/20 hover:border-blue-500 hover:text-blue-400 transition-all text-sm lg:text-base"><Download size={18} /><span className="hidden sm:inline">Export</span></button>
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-4 mb-4 sm:mb-6">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return <div key={i} className="bg-slate-800/50 rounded-xl sm:rounded-2xl border border-slate-700 p-3 sm:p-5">
            <div className="flex items-center justify-between mb-2 sm:mb-3"><div className={`p-1.5 sm:p-2 bg-${s.color}-600/20 rounded-xl`}><Icon className={`text-${s.color}-400`} size={16} /></div><span className={`text-[10px] sm:text-xs font-medium text-${s.color}-400 bg-${s.color}-950/50 px-1.5 py-0.5 rounded-full border border-${s.color}-800/50`}>{s.label}</span></div>
            <h3 className="text-lg sm:text-2xl font-bold text-white">{s.value}</h3>
          </div>;
        })}
      </div>
    </>
  );
}

// ============================================================
// FILTERS
// ============================================================
export function FeesFilters({ searchTerm, setSearchTerm, feeFilter, setFeeFilter, viewMode, setViewMode, getBranches, financialSummary, overdueCount, activeStudents, noSubscriptionStudents }) {
  return (
    <div className="bg-slate-800/50 rounded-xl sm:rounded-2xl border border-slate-700 p-3 sm:p-5 mb-4 sm:mb-6">
      <div className="space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <div className="flex-1 relative"><Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" size={16} />
            <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-3 py-2 sm:py-3 bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 text-slate-200 text-sm" />
          </div>
          <div className="flex flex-wrap gap-2">
            <select value={feeFilter} onChange={(e) => setFeeFilter(e.target.value)} className="flex-1 sm:flex-none px-3 py-2 sm:px-4 sm:py-3 bg-slate-900 border border-slate-700 rounded-xl text-slate-200 cursor-pointer text-sm">
              <option value="all">All</option><option value="due">Due</option><option value="overdue">Overdue</option><option value="paid">Paid</option><option value="active">Active</option><option value="expired">Expired</option><option value="no-subscription">No Interval</option>
            </select>
            <button onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')} className="px-3 py-2 sm:px-4 sm:py-3 bg-slate-900 border border-slate-700 rounded-xl text-slate-400 hover:text-blue-400"><Layers size={18} /></button>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 sm:gap-2 pt-2 sm:pt-3 border-t border-slate-700">
          <span className="text-[10px] sm:text-xs font-medium text-slate-500 py-1">Filters:</span>
          <button onClick={() => setFeeFilter('due')} className="px-2 sm:px-3 py-0.5 sm:py-1 bg-orange-950/50 text-orange-400 rounded-lg text-[10px] sm:text-xs border border-orange-800">Due ({financialSummary.pending_count})</button>
          <button onClick={() => setFeeFilter('overdue')} className="px-2 sm:px-3 py-0.5 sm:py-1 bg-red-950/50 text-red-400 rounded-lg text-[10px] sm:text-xs border border-red-800">Overdue ({overdueCount})</button>
          <button onClick={() => setFeeFilter('active')} className="px-2 sm:px-3 py-0.5 sm:py-1 bg-emerald-950/50 text-emerald-400 rounded-lg text-[10px] sm:text-xs border border-emerald-800">Active ({activeStudents})</button>
          <button onClick={() => setFeeFilter('no-subscription')} className="px-2 sm:px-3 py-0.5 sm:py-1 bg-purple-950/50 text-purple-400 rounded-lg text-[10px] sm:text-xs border border-purple-800">No Interval ({noSubscriptionStudents})</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// RESULTS COUNT
// ============================================================
export function FeesResultsCount({ filteredStudents, students, selectedStudents, selectedIntervals, selectAllStudents, viewMode }) {
  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700 px-3 sm:px-5 py-2 sm:py-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4 sm:mb-6">
      <p className="text-xs sm:text-sm text-slate-400">Showing <span className="font-semibold text-white">{filteredStudents.length}</span> of <span className="font-semibold text-white">{students.length}</span> students</p>
      <div className="flex items-center gap-4">
        {viewMode === 'table' && filteredStudents.length > 0 && <label className="flex items-center gap-2 text-xs sm:text-sm text-slate-400 cursor-pointer"><input type="checkbox" checked={selectedStudents.length === filteredStudents.length && filteredStudents.length > 0} onChange={selectAllStudents} className="w-3 h-3 sm:w-4 sm:h-4 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500" /> Select All</label>}
        {selectedIntervals.length > 0 && <span className="text-xs text-orange-400">{selectedIntervals.length} interval(s) selected</span>}
      </div>
    </div>
  );
}

// ============================================================
// TOAST
// ============================================================
export function FeesToast({ toast, setToast }) {
  if (!toast.show) return null;
  return <div className="fixed top-20 right-4 z-50 animate-slide-in"><div className={`flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl backdrop-blur-md border ${toast.type === 'success' ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-400' : 'bg-red-950/90 border-red-500/30 text-red-400'}`}>{toast.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}<span className="text-sm font-medium">{toast.message}</span><button onClick={() => setToast({ show: false, type: '', message: '' })} className="ml-2"><X size={16} /></button></div></div>;
}

// ============================================================
// GRID VIEW
// ============================================================
export function FeesGridView({ filteredStudents, studentIntervals, selectedIntervalId, selectedIntervals, toggleIntervalSelection, openIntervalDetails, openPaymentModal, openDueDateModal, openIntervalModal, handleDeleteStudent, handleDeleteInterval, openEditIntervalModal, formatCurrency, formatDate, getSubscriptionStatus, getDueStatus }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
      {filteredStudents.map((student) => {
        const intervals = studentIntervals[student.id] || [];
        const totalFees = intervals.reduce((s, i) => s + (i.total_fees || 0), 0);
        const paid = intervals.reduce((s, i) => s + (i.paid_amount || 0), 0);
        const due = intervals.reduce((s, i) => s + (i.due_amount || 0), 0);
        const busStatus = getSubscriptionStatus(student);
        const dueStatus = getDueStatus(student);
        const pct = totalFees > 0 ? (paid / totalFees) * 100 : 0;
        return (
          <div key={student.id} className="bg-slate-800/50 rounded-xl sm:rounded-2xl border border-slate-700 hover:border-blue-500/30 transition-all overflow-hidden">
            <div className={`h-1 ${due === 0 ? 'bg-emerald-500' : dueStatus.text === 'Overdue' ? 'bg-red-500' : 'bg-orange-500'}`} />
            <div className="p-3 sm:p-5">
              <div className="flex justify-between items-start mb-3 sm:mb-4">
                <div className="flex items-center gap-2 sm:gap-3"><div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-600 rounded-xl flex items-center justify-center"><GraduationCap className="text-white" size={16} /></div><div><h3 className="font-semibold text-white text-sm sm:text-base">{student.full_name}</h3><p className="text-[10px] sm:text-xs text-slate-500">{student.usn || 'No USN'}</p></div></div>
                <div className="flex flex-col items-end gap-0.5 sm:gap-1"><span className={`px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-semibold rounded-full border ${dueStatus.color}`}>{dueStatus.icon} {dueStatus.text}</span><span className={`px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-xs rounded-full border ${busStatus.color}`}>{busStatus.icon} {busStatus.text.split('(')[0].trim()}</span></div>
              </div>
              <div className="space-y-2 sm:space-y-3 mb-3 sm:mb-4">
                <div className="flex items-center gap-2 text-xs sm:text-sm"><BookOpen size={12} className="text-slate-500" /><span className="text-slate-400">{student.branch || 'N/A'}</span></div>
                <div className="bg-slate-900/50 rounded-lg p-2 sm:p-3 border border-slate-700">
                  <div className="flex items-center justify-between text-xs sm:text-sm mb-2"><span className="text-slate-500">Intervals</span><button onClick={() => openIntervalModal(student)} className="text-purple-400 hover:text-purple-300 text-[10px] sm:text-xs flex items-center gap-1"><Plus size={12} /> Add</button></div>
                  <div className="flex items-center gap-2 text-slate-300"><Layers size={12} /><span className="text-xs sm:text-sm">{intervals.length} interval{intervals.length !== 1 ? 's' : ''}</span></div>
                  {intervals.length > 0 && <div className="mt-2 pt-2 border-t border-slate-700 max-h-32 sm:max-h-40 overflow-y-auto space-y-1">
                    {intervals.map((interval) => <div key={interval.id} className={`flex items-center justify-between text-[10px] sm:text-xs bg-slate-800/50 rounded px-1.5 sm:px-2 py-1 cursor-pointer hover:bg-slate-700/50 transition-colors ${selectedIntervalId === interval.id ? 'bg-blue-900/30 border border-blue-800' : ''}`} onClick={() => openIntervalDetails(interval, student)}>
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
                        <input type="checkbox" checked={selectedIntervals.includes(interval.id)} onChange={(e) => { e.stopPropagation(); toggleIntervalSelection(interval.id); }} className="w-3 h-3 rounded border-slate-600 bg-slate-800 text-blue-500" />
                        <span className="text-slate-400 font-mono">#{interval.interval_number}</span>
                        <span className="text-slate-300 truncate">{formatDate(interval.start_date)} - {formatDate(interval.end_date)}</span>
                        <span className={`px-1 py-0.5 rounded text-[8px] sm:text-[10px] whitespace-nowrap ${interval.status === 'paid' ? 'bg-emerald-900/50 text-emerald-400' : interval.status === 'partial' ? 'bg-amber-900/50 text-amber-400' : 'bg-orange-900/50 text-orange-400'}`}>{interval.status || 'pending'}</span>
                        <span className="text-orange-400 whitespace-nowrap">₹{interval.due_amount || 0}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={(e) => { e.stopPropagation(); openEditIntervalModal(interval, student); }} className="p-1 text-blue-400 hover:bg-blue-600/20 rounded transition-colors"><Edit size={10} /></button>
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteInterval(interval.id); }} className="p-1 text-red-400 hover:bg-red-600/20 rounded transition-colors"><Trash2 size={10} /></button>
                      </div>
                    </div>)}
                  </div>}
                </div>
                <div className="bg-slate-900/50 rounded-lg p-2 sm:p-3 border border-slate-700">
                  <div className="flex justify-between text-xs sm:text-sm mb-1"><span className="text-slate-500">Fees Status</span><div className="flex gap-1"><button onClick={() => openPaymentModal(student)} className="text-emerald-400 hover:text-emerald-300 text-[10px] sm:text-xs flex items-center gap-1"><DollarSign size={12} /> Pay</button><button onClick={() => openDueDateModal(student)} className="text-purple-400 hover:text-purple-300 text-[10px] sm:text-xs flex items-center gap-1"><Calendar size={12} /> Due</button></div></div>
                  <div className="w-full bg-slate-700 rounded-full h-1 sm:h-1.5 mb-1.5 sm:mb-2"><div className={`h-1 sm:h-1.5 rounded-full transition-all ${due === 0 ? 'bg-emerald-500' : 'bg-orange-500'}`} style={{ width: `${pct}%` }} /></div>
                  <div className="flex justify-between text-[10px] sm:text-xs"><span className="text-emerald-400">Paid: {formatCurrency(paid)}</span><span className="text-orange-400">Due: {formatCurrency(due)}</span><span className="text-slate-400">Total: {formatCurrency(totalFees)}</span></div>
                </div>
              </div>
              <div className="flex flex-wrap justify-end gap-1.5 sm:gap-2 pt-2 sm:pt-3 border-t border-slate-700">
                <button onClick={() => openPaymentModal(student)} className="px-2 sm:px-3 py-1 sm:py-1.5 bg-emerald-600/20 text-emerald-400 rounded-lg text-[10px] sm:text-xs hover:bg-emerald-600/30 transition-colors flex items-center gap-1"><DollarSign size={12} /> Pay</button>
                <button onClick={() => openIntervalModal(student)} className="px-2 sm:px-3 py-1 sm:py-1.5 bg-purple-600/20 text-purple-400 rounded-lg text-[10px] sm:text-xs hover:bg-purple-600/30 transition-colors flex items-center gap-1"><Layers size={12} /> Add</button>
                <button onClick={() => handleDeleteStudent(student)} className="p-1 sm:p-1.5 text-red-400 hover:bg-red-600/20 rounded-lg transition-colors"><Trash2 size={14} /></button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// EDIT INTERVAL MODAL (With Zero Auto-Remove)
// ============================================================
export function EditIntervalModal({ show, onClose, interval, student, onSave, formatCurrency, saving }) {
  const [totalFees, setTotalFees] = useState('');
  const [dueAmount, setDueAmount] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    if (interval) {
      setTotalFees(String(interval.total_fees || ''));
      setDueAmount(String(interval.due_amount || ''));
      setStartDate(interval.start_date || '');
      setEndDate(interval.end_date || '');
    }
  }, [interval]);

  if (!show || !interval) return null;

  const handleNumberChange = (e, setter) => {
    let value = e.target.value;
    if (value.length > 1 && value.startsWith('0') && !value.includes('.')) value = value.replace(/^0+/, '');
    if (value === '' || /^\d*\.?\d*$/.test(value)) setter(value);
  };

  const handleSubmit = (e) => { e.preventDefault(); onSave({ id: interval.id, total_fees: parseFloat(totalFees) || 0, due_amount: parseFloat(dueAmount) || 0, start_date: startDate, end_date: endDate }); };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-md">
        <div className="px-6 py-4 border-b border-slate-700 flex justify-between items-center"><div className="flex items-center gap-3"><div className="p-2 bg-blue-600 rounded-xl"><Edit className="text-white" size={20} /></div><h3 className="text-xl font-bold text-white">Edit Interval</h3></div><button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-300 hover:bg-slate-700 rounded-lg"><X size={20} /></button></div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div><label className="block text-sm font-medium text-slate-300 mb-2">Student</label><div className="px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-slate-200">{student?.full_name} ({student?.usn})</div></div>
          <div><label className="block text-sm font-medium text-slate-300 mb-2">Interval Number</label><div className="px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-slate-200">#{interval?.interval_number}</div></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-slate-300 mb-2">Start Date</label><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 text-slate-200" required /></div>
            <div><label className="block text-sm font-medium text-slate-300 mb-2">End Date</label><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 text-slate-200" required /></div>
          </div>
          <div><label className="block text-sm font-medium text-slate-300 mb-2">Total Fees (₹)</label><div className="relative"><div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500"><IndianRupee size={16} /></div><input type="text" inputMode="decimal" value={totalFees} onChange={(e) => handleNumberChange(e, setTotalFees)} className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 text-slate-200" placeholder="Enter total fees" /></div></div>
          <div><label className="block text-sm font-medium text-slate-300 mb-2">Due Amount (₹)</label><div className="relative"><div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500"><IndianRupee size={16} /></div><input type="text" inputMode="decimal" value={dueAmount} onChange={(e) => handleNumberChange(e, setDueAmount)} className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 text-slate-200" placeholder="Enter due amount" /></div></div>
          <div className="bg-amber-950/30 p-3 rounded-lg border border-amber-800"><p className="text-amber-400 text-xs flex items-center gap-2"><AlertCircle size={14} />Changing total fees will update the interval amount. Due amount can be adjusted separately.</p></div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
            <button type="button" onClick={onClose} className="px-6 py-3 text-slate-300 bg-slate-700 rounded-xl hover:bg-slate-600">Cancel</button>
            <button type="submit" disabled={saving} className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50">{saving ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Saving...</> : <><Save size={16} /> Save Changes</>}</button>
          </div>
        </form>
      </div>
    </div>
  );
}