// app/cron-control/page.js
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function CronControl() {
  const [enabled, setEnabled] = useState(false);
  const [scheduleTime, setScheduleTime] = useState('13:25');
  const [loading, setLoading] = useState(true);
  const [updatingTime, setUpdatingTime] = useState(false);
  const [lastRun, setLastRun] = useState(null);
  const [triggering, setTriggering] = useState(false);
  const [message, setMessage] = useState('');
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [runResult, setRunResult] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedLogs, setSelectedLogs] = useState([]);
  const [selectAll, setSelectAll] = useState(false);

  // Fetch logs from Supabase
  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('reminder_logs')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setLogs(data || []);
      setSelectedLogs([]);
      setSelectAll(false);
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLogsLoading(false);
    }
  };

  // Delete selected logs
  const deleteSelectedLogs = async () => {
    if (selectedLogs.length === 0) {
      setMessage('⚠️ Please select logs to delete');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    if (!confirm(`Delete ${selectedLogs.length} log(s)? This action cannot be undone.`)) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from('reminder_logs')
        .delete()
        .in('id', selectedLogs);

      if (error) throw error;

      setMessage(`✅ ${selectedLogs.length} log(s) deleted successfully`);
      fetchLogs(); // Refresh logs
    } catch (error) {
      console.error('Error deleting logs:', error);
      setMessage('❌ Error deleting logs: ' + error.message);
    } finally {
      setDeleting(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  // Delete all logs
  const deleteAllLogs = async () => {
    if (!confirm('Delete ALL logs? This action cannot be undone!')) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from('reminder_logs')
        .delete()
        .neq('id', 0); // Delete all rows

      if (error) throw error;

      setMessage('✅ All logs deleted successfully');
      fetchLogs(); // Refresh logs
    } catch (error) {
      console.error('Error deleting all logs:', error);
      setMessage('❌ Error deleting logs: ' + error.message);
    } finally {
      setDeleting(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  // Toggle single log selection
  const toggleLogSelection = (logId) => {
    setSelectedLogs(prev => 
      prev.includes(logId) 
        ? prev.filter(id => id !== logId)
        : [...prev, logId]
    );
  };

  // Toggle select all
  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedLogs([]);
    } else {
      setSelectedLogs(logs.map(log => log.id));
    }
    setSelectAll(!selectAll);
  };

  // Fetch current status
  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/cron-toggle');
      const data = await res.json();
      setEnabled(data.enabled);
      setLastRun(data.lastRun);
      if (data.scheduleTime) {
        setScheduleTime(data.scheduleTime);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Toggle on/off
  const toggleCron = async () => {
    try {
      const res = await fetch('/api/cron-toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !enabled })
      });
      const data = await res.json();
      if (data.success) {
        setEnabled(!enabled);
        setMessage(`✅ Cron ${!enabled ? 'enabled' : 'disabled'} successfully`);
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      setMessage('❌ Error toggling cron');
      console.error(error);
    }
  };

  // Update schedule time
  const updateScheduleTime = async () => {
    setUpdatingTime(true);
    try {
      const res = await fetch('/api/cron-toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduleTime: scheduleTime })
      });
      const data = await res.json();
      if (data.success) {
        setMessage(`✅ Schedule time updated to ${scheduleTime}`);
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      setMessage('❌ Error updating schedule time');
      console.error(error);
    } finally {
      setUpdatingTime(false);
    }
  };

  // Convert time (HH:MM) to cron format
  const convertTimeToCron = (time) => {
    const [hour, minute] = time.split(':');
    return `${parseInt(minute)} ${parseInt(hour)} * * *`;
  };

  // Manually trigger cron
  const triggerManually = async () => {
    setTriggering(true);
    setMessage('🔄 Running cron job...');
    setRunResult(null);
    
    try {
      const res = await fetch('/api/cron/send');
      const data = await res.json();
      
      if (data.success) {
        setRunResult(data);
        setMessage(`✅ ${data.message}`);
        fetchStatus();
        fetchLogs();
      } else {
        setMessage(`⚠️ ${data.message || data.error || 'Error occurred'}`);
      }
    } catch (error) {
      setMessage('❌ Error triggering cron');
    } finally {
      setTriggering(false);
      setTimeout(() => setMessage(''), 5000);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchLogs();
  }, []);

  useEffect(() => {
    const interval = setInterval(fetchLogs, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    if (status === 'sent') {
      return <span className="px-2 py-1 bg-emerald-900 text-emerald-400 rounded-full text-xs font-medium">✅ Sent</span>;
    } else if (status === 'failed') {
      return <span className="px-2 py-1 bg-red-900 text-red-400 rounded-full text-xs font-medium">❌ Failed</span>;
    }
    return <span className="px-2 py-1 bg-gray-700 text-gray-400 rounded-full text-xs font-medium">⚠️ {status}</span>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 py-10 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Cron Job Control Panel</h1>
          <p className="text-gray-400">Manage automatic fee reminder messages</p>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Controls */}
          <div>
            {/* Main Card */}
            <div className="bg-gray-800 rounded-2xl border border-gray-700 p-8 shadow-xl">
              {/* Toggle Section */}
              <div className="flex items-center justify-between mb-6 pb-6 border-b border-gray-700">
                <div>
                  <h2 className="text-xl font-semibold text-white">Auto Reminder</h2>
                  <p className="text-gray-400 text-sm mt-1">
                    Send automatic WhatsApp reminders for overdue fees
                  </p>
                </div>
                <button
                  onClick={toggleCron}
                  className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none ${
                    enabled ? 'bg-green-600' : 'bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                      enabled ? 'translate-x-8' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Schedule Time Section */}
              <div className="mb-6 pb-6 border-b border-gray-700">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Schedule Time (24-hour format)
                </label>
                <div className="flex gap-3">
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="flex-1 px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={updateScheduleTime}
                    disabled={updatingTime}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {updatingTime ? 'Saving...' : 'Save Time'}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Cron schedule: {convertTimeToCron(scheduleTime)} (Minute Hour)
                </p>
              </div>

              {/* Status Section */}
              <div className="mb-6 p-4 bg-gray-900 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-gray-400">Status</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    enabled ? 'bg-green-900 text-green-400' : 'bg-red-900 text-red-400'
                  }`}>
                    {enabled ? '🟢 ACTIVE' : '🔴 DISABLED'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Last Run</span>
                  <span className="text-white font-mono text-sm">
                    {lastRun ? formatDate(lastRun) : 'Never'}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-gray-400">Schedule</span>
                  <span className="text-blue-400 font-mono text-sm">
                    Daily at {scheduleTime}
                  </span>
                </div>
              </div>

              {/* Manual Trigger Button */}
              <button
                onClick={triggerManually}
                disabled={!enabled || triggering}
                className={`w-full py-3 rounded-xl font-semibold transition-all ${
                  enabled && !triggering
                    ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                    : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                }`}
              >
                {triggering ? '⏳ Running...' : '🚀 Run Manually'}
              </button>

              {/* Run Result */}
              {runResult && (
                <div className="mt-4 p-4 bg-gray-900 rounded-xl">
                  <h3 className="font-semibold text-white mb-2">Run Result</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Sent:</span>
                      <span className="text-emerald-400 font-semibold">{runResult.sent || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Failed:</span>
                      <span className="text-red-400 font-semibold">{runResult.failed || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total:</span>
                      <span className="text-white font-semibold">{runResult.total || 0}</span>
                    </div>
                    {runResult.details && runResult.details.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-700">
                        <p className="text-gray-400 text-xs mb-1">Details:</p>
                        {runResult.details.map((d, i) => (
                          <div key={i} className="text-xs">
                            <span className="text-gray-500">{d.name}</span>
                            <span className={d.status === 'sent' ? 'text-emerald-400 ml-2' : 'text-red-400 ml-2'}>
                              {d.status === 'sent' ? '✓' : '✗'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Message */}
              {message && (
                <div className="mt-4 p-3 bg-gray-900 rounded-lg text-center text-sm text-gray-300">
                  {message}
                </div>
              )}

              {/* Info Box */}
              <div className="mt-6 p-4 bg-blue-900/30 border border-blue-800 rounded-xl">
                <h3 className="text-blue-400 font-semibold mb-2">ℹ️ How it works</h3>
                <ul className="text-gray-300 text-sm space-y-1">
                  <li>• When enabled, checks for overdue fees automatically</li>
                  <li>• Sends WhatsApp template "fees_due" to students</li>
                  <li>• Runs automatically at your scheduled time</li>
                  <li>• You can also manually run it anytime</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Right Column - Logs with Delete Option */}
          <div>
            <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-700">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold text-white">📋 Reminder History</h2>
                  <span className="text-xs text-gray-500 bg-gray-900 px-2 py-1 rounded-full">
                    {logs.length} records
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={fetchLogs}
                    className="text-gray-400 hover:text-white transition-colors"
                    title="Refresh logs"
                  >
                    🔄
                  </button>
                </div>
              </div>

              {/* Delete Buttons */}
              {logs.length > 0 && (
                <div className="flex gap-2 mb-4 pb-3 border-b border-gray-700">
                  <button
                    onClick={deleteSelectedLogs}
                    disabled={deleting || selectedLogs.length === 0}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      selectedLogs.length > 0
                        ? 'bg-red-600 hover:bg-red-700 text-white cursor-pointer'
                        : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    🗑️ Delete Selected ({selectedLogs.length})
                  </button>
                  <button
                    onClick={deleteAllLogs}
                    disabled={deleting}
                    className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                  >
                    🗑️ Delete All
                  </button>
                </div>
              )}

              {logsLoading ? (
                <div className="text-center py-8 text-gray-500">Loading logs...</div>
              ) : logs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">📭</div>
                  <p>No reminder logs yet</p>
                  <p className="text-xs mt-1">Run cron job to see records</p>
                </div>
              ) : (
                <>
                  {/* Select All Checkbox */}
                  <div className="mb-2 flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectAll}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-600 bg-gray-900 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-xs text-gray-400">Select All</span>
                  </div>

                  {/* Logs List */}
                  <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
                    {logs.map((log) => (
                      <div key={log.id} className="bg-gray-900 rounded-lg p-3 border border-gray-700 hover:border-gray-600 transition-all">
                        <div className="flex items-start gap-2">
                          <input
                            type="checkbox"
                            checked={selectedLogs.includes(log.id)}
                            onChange={() => toggleLogSelection(log.id)}
                            className="mt-1 rounded border-gray-600 bg-gray-900 text-blue-600 focus:ring-blue-500"
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-white text-sm">{log.student_name}</span>
                                <span className="text-xs text-gray-500">{log.student_usn || 'No USN'}</span>
                              </div>
                              {getStatusBadge(log.status)}
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-gray-500">Phone:</span>
                                <span className="text-gray-300 ml-1">{log.phone || 'N/A'}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Due Amount:</span>
                                <span className="text-orange-400 ml-1">₹{log.due_amount || 0}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Due Date:</span>
                                <span className="text-gray-300 ml-1">{log.due_date || 'N/A'}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Days Overdue:</span>
                                <span className="text-red-400 ml-1">{log.days_overdue || 0} days</span>
                              </div>
                            </div>
                            <div className="mt-2 text-xs text-gray-500">
                              📅 {formatDate(log.sent_at)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Schedule Info */}
        <div className="mt-6 text-center text-gray-500 text-sm">
          <p>⏰ Scheduled: Daily at {scheduleTime}</p>
          <p className="mt-1">📱 Students with overdue fees will receive WhatsApp reminders</p>
        </div>
      </div>
    </div>
  );
}