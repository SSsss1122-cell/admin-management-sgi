// app/cron-control/page.js
'use client';

import { useState, useEffect } from 'react';

export default function CronControl() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastRun, setLastRun] = useState(null);
  const [triggering, setTriggering] = useState(false);
  const [message, setMessage] = useState('');

  // Fetch current status
  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/cron-toggle');
      const data = await res.json();
      setEnabled(data.enabled);
      setLastRun(data.lastRun);
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

  // Manually trigger cron
  const triggerManually = async () => {
    setTriggering(true);
    setMessage('🔄 Running cron job...');
    
    try {
      const res = await fetch('/api/cron/trigger');
      const data = await res.json();
      
      if (data.success) {
        setMessage('✅ Cron job completed successfully!');
        fetchStatus(); // Refresh last run time
      } else {
        setMessage(`⚠️ ${data.message}`);
      }
    } catch (error) {
      setMessage('❌ Error triggering cron');
    } finally {
      setTriggering(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Cron Job Control Panel</h1>
          <p className="text-gray-400">Manage automatic fee reminder messages</p>
        </div>

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
                {lastRun ? new Date(lastRun).toLocaleString() : 'Never'}
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
              <li>• Sends WhatsApp template "{enabled ? 'fees_due' : '...'}" to students</li>
              <li>• Runs automatically every day at 9:00 AM</li>
              <li>• You can also manually run it anytime</li>
            </ul>
          </div>
        </div>

        {/* Schedule Info */}
        <div className="mt-6 text-center text-gray-500 text-sm">
          <p>⏰ Scheduled: Daily at 9:00 AM</p>
          <p className="mt-1">📱 Students with overdue fees will receive WhatsApp reminders</p>
        </div>
      </div>
    </div>
  );
}