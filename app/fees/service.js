// app/fees/service.js
import { supabase } from '../../lib/supabase';

export const feesService = {
  async fetchStudentsWithIntervals(institutionId) {
    const { data: students, error: sErr } = await supabase.from('students_new').select('id, full_name, usn, branch, phone, email, created_at, updated_at, current_interval_id').eq('institution_id', institutionId).order('full_name');
    if (sErr) throw sErr;
    const { data: intervals, error: iErr } = await supabase.from('student_intervals').select('*').in('student_id', students.map(s => s.id));
    if (iErr) throw iErr;
    const map = {};
    intervals.forEach(i => { if (!map[i.student_id]) map[i.student_id] = []; map[i.student_id].push(i); });
    return { students, intervalsMap: map };
  },

  calculateFinancialSummary(students, map) {
    let totalFees = 0, totalCollected = 0, totalDue = 0, pending = 0;
    students.forEach(s => {
      const intervals = map[s.id] || [];
      const fees = intervals.reduce((sum, i) => sum + (i.total_fees || 0), 0);
      const paid = intervals.reduce((sum, i) => sum + (i.paid_amount || 0), 0);
      const due = intervals.reduce((sum, i) => sum + (i.due_amount || 0), 0);
      totalFees += fees; totalCollected += paid; totalDue += due;
      if (due > 0) pending++;
    });
    return { total_fees: totalFees, total_collected: totalCollected, total_due: totalDue, collection_rate: totalFees > 0 ? (totalCollected / totalFees) * 100 : 0, monthly_collection: 0, pending_count: pending };
  },

  exportToCSV(students, map) {
    const headers = ['USN', 'Name', 'Branch', 'Total Fees', 'Paid Amount', 'Due Amount', 'Due Status', 'Intervals Count'];
    const data = students.map(s => {
      const intervals = map[s.id] || [];
      const total = intervals.reduce((sum, i) => sum + (i.total_fees || 0), 0);
      const paid = intervals.reduce((sum, i) => sum + (i.paid_amount || 0), 0);
      const due = intervals.reduce((sum, i) => sum + (i.due_amount || 0), 0);
      return [s.usn || '', s.full_name || '', s.branch || 'N/A', total, paid, due, due === 0 ? 'Paid' : due > 0 ? 'Pending' : 'Overdue', intervals.length];
    });
    const csv = [headers.join(','), ...data.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `fees_report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }
};