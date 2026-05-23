'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Megaphone, Plus, X, Send, Trash2, Edit, ArrowLeft, Calendar, Clock, Bell } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getAdminInstitution } from '../lib/getInstitution';
import withAuth from '../../components/withAuth';

function Announcements() {
  const [announcements, setAnnouncements] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState({ title: '', message: '' });
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState('');
  const [adminData, setAdminData] = useState(null);

  const router = useRouter();

  useEffect(() => {
    initializePage();

    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const initializePage = async () => {
    try {
      const admin = await getAdminInstitution();

      console.log('ADMIN DATA:', admin);

      if (!admin) {
        alert('Admin institution not found');
        setLoading(false);
        return;
      }

      setAdminData(admin);
      fetchAnnouncements(admin.institution_id);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const fetchAnnouncements = async (institutionId) => {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('institution_id', institutionId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAnnouncements(data || []);
    } catch (error) {
      console.error('Error fetching announcements:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAnnouncement = async (e) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase
        .from('announcements')
        .insert([{
          title: newAnnouncement.title,
          message: newAnnouncement.message,
          institution_id: adminData.institution_id
        }])
        .select();

      if (error) throw error;

      alert('Announcement created successfully!');
      setNewAnnouncement({ title: '', message: '' });
      setShowForm(false);
      fetchAnnouncements(adminData.institution_id);
    } catch (error) {
      console.error('Error creating announcement:', error);
      alert('Error creating announcement: ' + error.message);
    }
  };

  const deleteAnnouncement = async (announcementId) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;

    try {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', announcementId)
        .eq('institution_id', adminData.institution_id);

      if (error) throw error;

      alert('Announcement deleted successfully!');
      fetchAnnouncements(adminData.institution_id);
    } catch (error) {
      console.error('Error deleting announcement:', error);
      alert('Error deleting announcement: ' + error.message);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTimeAgo = (dateString) => {
    if (!dateString) return 'recently';
    
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'just now';
      if (diffMins < 60) return `${diffMins} min ago`;
      if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
      return formatDate(dateString);
    } catch (e) {
      return 'recently';
    }
  };

  const handleBack = () => {
    router.back();
  };

  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-5">
            <div className="absolute inset-0 border-4 border-slate-700 border-t-blue-600 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 bg-blue-600 rounded-full animate-pulse"></div>
            </div>
          </div>
          <p className="text-blue-400 font-semibold">Loading announcements...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <div className="bg-slate-800/50 border-b border-slate-700 sticky top-0 z-40 p-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="p-2 text-slate-400 hover:text-blue-400 transition-all rounded-xl hover:bg-slate-800 border border-slate-700"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-lg font-bold text-white sm:text-xl">Announcements</h1>
              <p className="text-xs text-slate-400">{currentTime}</p>
            </div>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all"
          >
            <Plus size={14} />
            <span>New</span>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-slate-400">Total Announcements</p>
                <p className="text-2xl font-bold text-blue-400 mt-1">{announcements.length}</p>
              </div>
              <div className="p-2 bg-blue-600 rounded-xl">
                <Megaphone size={18} className="text-white" />
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-slate-400">Latest</p>
                <p className="text-2xl font-bold text-cyan-400 mt-1">
                  {announcements.length > 0 ? formatTimeAgo(announcements[0]?.created_at).split(' ')[0] : '0'}
                </p>
              </div>
              <div className="p-2 bg-cyan-600 rounded-xl">
                <Clock size={18} className="text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Announcements List */}
        <div className="space-y-3">
          {announcements.length === 0 ? (
            <div className="text-center py-12 bg-slate-800/50 rounded-2xl border border-slate-700">
              <Megaphone size={48} className="mx-auto text-slate-600 mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No Announcements</h3>
              <p className="text-slate-400 mb-6">Create your first announcement to get started.</p>
              <button
                onClick={() => setShowForm(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
              >
                <Plus size={16} className="inline mr-2" />
                Create Announcement
              </button>
            </div>
          ) : (
            announcements.map((announcement) => (
              <div key={announcement.id} className="bg-slate-800/50 rounded-2xl border border-slate-700 hover:border-blue-500/30 transition-all p-5">
                <div className="flex justify-between items-start mb-4 flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                      <Megaphone size={18} className="text-white" />
                    </div>
                    <h3 className="font-semibold text-white">{announcement.title}</h3>
                  </div>
                  <button
                    onClick={() => deleteAnnouncement(announcement.id)}
                    className="p-2 text-red-400 hover:bg-red-600/20 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <p className="text-sm text-slate-300 leading-relaxed mb-4 bg-slate-900/50 rounded-xl p-4 whitespace-pre-wrap">
                  {announcement.message}
                </p>

                <div className="flex flex-wrap gap-3 pt-3 border-t border-slate-700">
                  <div className="flex items-center gap-1 px-3 py-1 bg-slate-900 rounded-full text-xs text-slate-400 border border-slate-700">
                    <Calendar size={10} />
                    <span>{formatDate(announcement.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-1 px-3 py-1 bg-slate-900 rounded-full text-xs text-slate-400 border border-slate-700">
                    <Clock size={10} />
                    <span>{formatTimeAgo(announcement.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-1 px-3 py-1 bg-blue-950/50 rounded-full text-xs text-blue-400 border border-blue-800">
                    <Bell size={10} />
                    <span>Active</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Create Announcement Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
          <div className="bg-slate-800 rounded-2xl border border-slate-700 max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="sticky top-0 bg-slate-800 border-b border-slate-700 px-6 py-4 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-xl">
                  <Megaphone size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Create Announcement</h3>
                  <p className="text-xs text-slate-400">Share important updates with everyone</p>
                </div>
              </div>
              <button
                onClick={() => setShowForm(false)}
                className="p-2 text-slate-400 hover:text-slate-300 hover:bg-slate-700 rounded-lg transition-all"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateAnnouncement} className="p-6">
              <div className="mb-5">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newAnnouncement.title}
                  onChange={(e) => setNewAnnouncement(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 text-slate-200"
                  placeholder="Enter announcement title"
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Message <span className="text-red-400">*</span>
                </label>
                <textarea
                  required
                  rows={8}
                  value={newAnnouncement.message}
                  onChange={(e) => setNewAnnouncement(prev => ({ ...prev, message: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 text-slate-200 resize-vertical"
                  placeholder="Enter announcement message"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-5 py-2.5 text-slate-300 bg-slate-700 rounded-lg hover:bg-slate-600 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all flex items-center gap-2"
                >
                  <Send size={16} />
                  Create Announcement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default withAuth(Announcements);