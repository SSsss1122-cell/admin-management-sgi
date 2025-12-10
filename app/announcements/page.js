'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Megaphone, Plus, X, Send, Trash2, Edit, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Announcements() {
  const [announcements, setAnnouncements] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState({ title: '', message: '' });
  const [loading, setLoading] = useState(true);

  const router = useRouter();

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
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
          message: newAnnouncement.message
        }])
        .select();

      if (error) throw error;

      alert('Announcement created successfully!');
      setNewAnnouncement({ title: '', message: '' });
      setShowForm(false);
      fetchAnnouncements();
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
        .eq('id', announcementId);

      if (error) throw error;

      alert('Announcement deleted successfully!');
      fetchAnnouncements();
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

  const handleBack = () => {
    router.back();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={handleBack}
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors p-2 rounded-lg hover:bg-gray-100"
                title="Go back"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Announcements</h1>
                <p className="text-gray-600 mt-1">Manage and create announcements</p>
              </div>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center w-full sm:w-auto justify-center"
            >
              <Plus size={16} className="mr-2" />
              New Announcement
            </button>
          </div>

          {/* Announcements List */}
          <div className="space-y-4">
            {announcements.map((announcement) => (
              <div key={announcement.id} className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-3">
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 flex-1">{announcement.title}</h3>
                  <div className="flex items-center space-x-2">
                    <div className="bg-blue-100 p-2 rounded-lg">
                      <Megaphone className="text-blue-600" size={20} />
                    </div>
                    <button
                      onClick={() => deleteAnnouncement(announcement.id)}
                      className="text-red-600 hover:text-red-800 p-2 rounded-lg hover:bg-red-50"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <p className="text-gray-600 mb-4 whitespace-pre-line">{announcement.message}</p>
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-500">Posted on {formatDate(announcement.created_at)}</p>
                </div>
              </div>
            ))}

            {announcements.length === 0 && (
              <div className="bg-white rounded-xl shadow-sm p-8 sm:p-12 text-center border border-gray-200">
                <Megaphone className="mx-auto text-gray-400 mb-4" size={48} />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Announcements</h3>
                <p className="text-gray-600">Create your first announcement to get started.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Announcement Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Create Announcement</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateAnnouncement} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={newAnnouncement.title}
                  onChange={(e) => setNewAnnouncement(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                  placeholder="Enter announcement title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                <textarea
                  required
                  rows={6}
                  value={newAnnouncement.message}
                  onChange={(e) => setNewAnnouncement(prev => ({ ...prev, message: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                  placeholder="Enter announcement message"
                />
              </div>
              <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg w-full sm:w-auto"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center w-full sm:w-auto"
                >
                  <Send size={16} className="mr-2" />
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