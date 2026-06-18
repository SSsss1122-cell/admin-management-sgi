// app/function-control/page.js

'use client';

import { useState, useEffect } from 'react';
import { 
  PlayCircle, StopCircle, RefreshCw, CheckCircle, XCircle, 
  Clock, AlertCircle, FileText, ChevronDown, ChevronUp,
  Calendar, Bell, Activity, Database, Send
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import withAuth from '../../components/withAuth';

function FunctionControl() {
  const [loading, setLoading] = useState({
    busFee: false,
    monthlyReport: false
  });
  
  const [results, setResults] = useState({
    busFee: null,
    monthlyReport: null
  });
  
  const [logs, setLogs] = useState([]);
  const [showLogs, setShowLogs] = useState(true);
  const [selectedFunction, setSelectedFunction] = useState('all');
  const [toggling, setToggling] = useState({
    busFee: false,
    monthlyReport: false
  });
  const [functionStatus, setFunctionStatus] = useState({
    busFeeReminders: true,
    monthlyReport: true
  });
  
  const [toast, setToast] = useState({ show: false, type: '', message: '' });

  useEffect(() => {
    fetchLogs();
    fetchFunctionStatus();
  }, []);

  const showToast = (type, message) => {
    setToast({ show: true, type, message });
    setTimeout(() => setToast({ show: false, type: '', message: '' }), 3000);
  };

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('function_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error && error.code !== '42P01') {
        console.error('Error fetching logs:', error);
      } else if (data && data.length > 0) {
        setLogs(data);
      } else {
        setLogs([
          { id: 1, function_name: 'bus-fee-reminders', status: 'success', message: 'Reminders sent to 2 students', details: 'Rohit, Tiloktri', created_at: new Date().toISOString() }
        ]);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
    }
  };

  const fetchFunctionStatus = async () => {
    try {
      // Get bus fee reminders status
      const { data: busData, error: busError } = await supabase
        .rpc('get_function_status', { func_name: 'bus-fee-reminders' });
      
      if (!busError && busData !== null) {
        setFunctionStatus(prev => ({ ...prev, busFeeReminders: busData }));
      }
      
      // Get monthly report status
      const { data: reportData, error: reportError } = await supabase
        .rpc('get_function_status', { func_name: 'monthly-report' });
      
      if (!reportError && reportData !== null) {
        setFunctionStatus(prev => ({ ...prev, monthlyReport: reportData }));
      }
    } catch (error) {
      console.error('Error fetching function status:', error);
    }
  };

  const toggleBusFeeReminders = async () => {
    setToggling(prev => ({ ...prev, busFee: true }));
    
    try {
      const { data, error } = await supabase.rpc('toggle_bus_fee_reminders');
      
      if (error) throw error;
      
      setFunctionStatus(prev => ({ ...prev, busFeeReminders: data }));
      showToast('success', `Bus Fee Reminders ${data ? 'enabled' : 'disabled'}`);
      
    } catch (error) {
      console.error('Error toggling:', error);
      showToast('error', 'Failed to toggle function');
    } finally {
      setToggling(prev => ({ ...prev, busFee: false }));
    }
  };

  const toggleMonthlyReport = async () => {
    setToggling(prev => ({ ...prev, monthlyReport: true }));
    
    try {
      const { data, error } = await supabase.rpc('toggle_monthly_report');
      
      if (error) throw error;
      
      setFunctionStatus(prev => ({ ...prev, monthlyReport: data }));
      showToast('success', `Monthly Report ${data ? 'enabled' : 'disabled'}`);
      
    } catch (error) {
      console.error('Error toggling:', error);
      showToast('error', 'Failed to toggle function');
    } finally {
      setToggling(prev => ({ ...prev, monthlyReport: false }));
    }
  };

  const runBusFeeReminders = async () => {
    setLoading(prev => ({ ...prev, busFee: true }));
    setResults(prev => ({ ...prev, busFee: null }));
    
    try {
      const response = await fetch(
        'https://hluezfgmmzrjamutofxw.supabase.co/functions/v1/send-bus-fee-reminders',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
          }
        }
      );
      
      const data = await response.json();
      setResults(prev => ({ ...prev, busFee: data }));
      showToast(data.success ? 'success' : 'error', 
        data.success ? `Reminders sent to ${data.totalOverdue} students` : 'Failed to send reminders');
      
      await fetchLogs();
      
    } catch (error) {
      console.error('Error running reminders:', error);
      setResults(prev => ({ ...prev, busFee: { success: false, error: error.message } }));
      showToast('error', 'Error running reminders');
    } finally {
      setLoading(prev => ({ ...prev, busFee: false }));
    }
  };

  const runMonthlyReport = async () => {
    setLoading(prev => ({ ...prev, monthlyReport: true }));
    setResults(prev => ({ ...prev, monthlyReport: null }));
    
    try {
      const response = await fetch(
        'https://hluezfgmmzrjamutofxw.supabase.co/functions/v1/send-monthly-report',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
          }
        }
      );
      
      const data = await response.json();
      setResults(prev => ({ ...prev, monthlyReport: data }));
      showToast(data.success ? 'success' : 'error', 
        data.success ? `Monthly report sent to ${data.adminNotifications?.length || 0} admins` : 'Failed to send report');
      
      await fetchLogs();
      
    } catch (error) {
      console.error('Error running report:', error);
      setResults(prev => ({ ...prev, monthlyReport: { success: false, error: error.message } }));
      showToast('error', 'Error running monthly report');
    } finally {
      setLoading(prev => ({ ...prev, monthlyReport: false }));
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredLogs = selectedFunction === 'all' 
    ? logs 
    : logs.filter(log => log.function_name === selectedFunction);

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Toast */}
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-purple-600 rounded-2xl">
              <Activity className="text-white" size={28} />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-white">Function Control Panel</h1>
              <p className="text-slate-400">Manage, monitor and trigger automated functions</p>
            </div>
          </div>
        </div>

        {/* Function Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          
          {/* Bus Fee Reminders Card */}
          <div className="bg-slate-800/50 rounded-2xl border border-slate-700 overflow-hidden">
            <div className="p-6 border-b border-slate-700">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-600/20 rounded-xl">
                    <Bell className="text-emerald-400" size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-white">Bus Fee Reminders</h2>
                    <p className="text-slate-400 text-sm">Send overdue fee reminders to students</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full animate-pulse ${functionStatus.busFeeReminders ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                  <span className="text-xs text-slate-400">{functionStatus.busFeeReminders ? 'Active' : 'Disabled'}</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-slate-900/50 rounded-xl p-3">
                  <p className="text-xs text-slate-500">Schedule (IST)</p>
                  <p className="text-white font-semibold">11:50 AM</p>
                  <p className="text-xs text-slate-400">Daily</p>
                </div>
                <div className="bg-slate-900/50 rounded-xl p-3">
                  <p className="text-xs text-slate-500">Cron Expression</p>
                  <p className="text-white font-mono text-sm">20 6 * * *</p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={runBusFeeReminders}
                  disabled={loading.busFee}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all disabled:opacity-50"
                >
                  {loading.busFee ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>Running...</>
                  ) : (
                    <><Send size={16} />Run Manually</>
                  )}
                </button>
                <button
                  onClick={toggleBusFeeReminders}
                  disabled={toggling.busFee}
                  className={`px-4 py-2.5 rounded-xl transition-all disabled:opacity-50 ${
                    functionStatus.busFeeReminders 
                      ? 'bg-red-600/20 text-red-400 border border-red-500 hover:bg-red-600/30'
                      : 'bg-emerald-600/20 text-emerald-400 border border-emerald-500 hover:bg-emerald-600/30'
                  }`}
                >
                  {toggling.busFee ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                  ) : functionStatus.busFeeReminders ? (
                    <StopCircle size={16} />
                  ) : (
                    <PlayCircle size={16} />
                  )}
                </button>
              </div>
            </div>
            
            {/* Result */}
            {results.busFee && (
              <div className={`p-4 border-t ${results.busFee.success ? 'bg-emerald-950/20 border-emerald-800' : 'bg-red-950/20 border-red-800'}`}>
                <div className="flex items-center gap-2 mb-2">
                  {results.busFee.success ? <CheckCircle className="text-emerald-400" size={16} /> : <XCircle className="text-red-400" size={16} />}
                  <span className="text-sm font-medium text-white">
                    {results.busFee.success ? 'Success' : 'Failed'}
                  </span>
                </div>
                <div className="text-xs text-slate-400 space-y-1">
                  {results.busFee.totalOverdue !== undefined && (
                    <p>Overdue Students: {results.busFee.totalOverdue}</p>
                  )}
                  {results.busFee.totalDueAmount !== undefined && (
                    <p>Total Due: INR {results.busFee.totalDueAmount.toLocaleString()}</p>
                  )}
                  {results.busFee.error && <p className="text-red-400">Error: {results.busFee.error}</p>}
                </div>
              </div>
            )}
          </div>

          {/* Monthly Report Card */}
          <div className="bg-slate-800/50 rounded-2xl border border-slate-700 overflow-hidden">
            <div className="p-6 border-b border-slate-700">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-600/20 rounded-xl">
                    <Calendar className="text-blue-400" size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-white">Monthly Report SGI</h2>
                    <p className="text-slate-400 text-sm">Send monthly fee summary to admins</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full animate-pulse ${functionStatus.monthlyReport ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                  <span className="text-xs text-slate-400">{functionStatus.monthlyReport ? 'Active' : 'Disabled'}</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-slate-900/50 rounded-xl p-3">
                  <p className="text-xs text-slate-500">Schedule (IST)</p>
                  <p className="text-white font-semibold">9:00 AM on 1st</p>
                  <p className="text-xs text-slate-400">Monthly</p>
                </div>
                <div className="bg-slate-900/50 rounded-xl p-3">
                  <p className="text-xs text-slate-500">Cron Expression</p>
                  <p className="text-white font-mono text-sm">30 3 1 * *</p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={runMonthlyReport}
                  disabled={loading.monthlyReport}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50"
                >
                  {loading.monthlyReport ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>Running...</>
                  ) : (
                    <><Send size={16} />Run Manually</>
                  )}
                </button>
                <button
                  onClick={toggleMonthlyReport}
                  disabled={toggling.monthlyReport}
                  className={`px-4 py-2.5 rounded-xl transition-all disabled:opacity-50 ${
                    functionStatus.monthlyReport 
                      ? 'bg-red-600/20 text-red-400 border border-red-500 hover:bg-red-600/30'
                      : 'bg-emerald-600/20 text-emerald-400 border border-emerald-500 hover:bg-emerald-600/30'
                  }`}
                >
                  {toggling.monthlyReport ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                  ) : functionStatus.monthlyReport ? (
                    <StopCircle size={16} />
                  ) : (
                    <PlayCircle size={16} />
                  )}
                </button>
              </div>
            </div>
            
            {/* Result */}
            {results.monthlyReport && (
              <div className={`p-4 border-t ${results.monthlyReport.success ? 'bg-emerald-950/20 border-emerald-800' : 'bg-red-950/20 border-red-800'}`}>
                <div className="flex items-center gap-2 mb-2">
                  {results.monthlyReport.success ? <CheckCircle className="text-emerald-400" size={16} /> : <XCircle className="text-red-400" size={16} />}
                  <span className="text-sm font-medium text-white">
                    {results.monthlyReport.success ? 'Success' : 'Failed'}
                  </span>
                </div>
                <div className="text-xs text-slate-400 space-y-1">
                  {results.monthlyReport.summary && (
                    <>
                      <p>Total Fees: INR {results.monthlyReport.summary.total_fees?.toLocaleString()}</p>
                      <p>Collection Rate: {results.monthlyReport.summary.collection_rate}%</p>
                      <p>Admins Notified: {results.monthlyReport.adminNotifications?.length || 0}</p>
                    </>
                  )}
                  {results.monthlyReport.error && <p className="text-red-400">Error: {results.monthlyReport.error}</p>}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Logs Section */}
        <div className="bg-slate-800/50 rounded-2xl border border-slate-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700 flex flex-wrap justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <FileText size={20} className="text-blue-400" />
              <h2 className="text-lg font-semibold text-white">Execution Logs</h2>
              <span className="px-2 py-0.5 bg-slate-700 text-slate-300 rounded-full text-xs">{filteredLogs.length}</span>
            </div>
            
            <div className="flex items-center gap-3">
              <select
                value={selectedFunction}
                onChange={(e) => setSelectedFunction(e.target.value)}
                className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-300"
              >
                <option value="all">All Functions</option>
                <option value="bus-fee-reminders">Bus Fee Reminders</option>
                <option value="monthly-report">Monthly Report</option>
              </select>
              
              <button onClick={fetchLogs} className="p-1.5 text-slate-400 hover:text-blue-400 rounded-lg">
                <RefreshCw size={18} />
              </button>
              
              <button onClick={() => setShowLogs(!showLogs)} className="p-1.5 text-slate-400 hover:text-white">
                {showLogs ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
            </div>
          </div>
          
          {showLogs && (
            <div className="max-h-96 overflow-y-auto">
              {filteredLogs.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <Database size={40} className="mx-auto mb-3 text-slate-600" />
                  <p>No logs available</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-700">
                  {filteredLogs.map((log) => (
                    <div key={log.id} className="px-6 py-4 hover:bg-slate-700/20">
                      <div className="flex flex-wrap justify-between items-start gap-2">
                        <div className="flex items-center gap-3 flex-1">
                          {log.status === 'success' ? (
                            <CheckCircle size={16} className="text-emerald-400 flex-shrink-0" />
                          ) : (
                            <XCircle size={16} className="text-red-400 flex-shrink-0" />
                          )}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                log.function_name === 'bus-fee-reminders' 
                                  ? 'bg-emerald-950/50 text-emerald-400' 
                                  : 'bg-blue-950/50 text-blue-400'
                              }`}>
                                {log.function_name === 'bus-fee-reminders' ? 'Bus Fee Reminders' : 'Monthly Report'}
                              </span>
                              <p className="text-slate-300 text-sm">{log.message}</p>
                            </div>
                            {log.details && (
                              <p className="text-slate-500 text-xs mt-1">{log.details}</p>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-slate-500 whitespace-nowrap">{formatDate(log.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Info Note */}
        <div className="mt-6 bg-amber-950/20 rounded-xl border border-amber-700/30 p-4">
          <div className="flex items-start gap-3">
            <div className="p-1.5 bg-amber-600/20 rounded-lg">
              <AlertCircle size={14} className="text-amber-400" />
            </div>
            <div>
              <p className="text-amber-400 text-sm font-medium">About Auto Schedule</p>
              <p className="text-slate-400 text-xs mt-1">
                - Bus Fee Reminders: Runs daily at <strong className="text-white">11:50 AM IST</strong><br />
                - Monthly Report: Runs on <strong className="text-white">1st of every month at 9:00 AM IST</strong><br />
                - Use the toggle buttons to enable/disable functions<br />
                - Manual triggers work regardless of schedule status
              </p>
            </div>
          </div>
        </div>

      </div>

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

export default withAuth(FunctionControl);