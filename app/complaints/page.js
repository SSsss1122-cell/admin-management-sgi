'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { getAdminInstitution } from '../lib/getInstitution';

import { 
  AlertTriangle, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  CheckCircle, 
  Clock, 
  XCircle,
  User,
  Image,
  Video,
  MessageSquare,
  RefreshCw,
  ChevronDown,
  ArrowLeft,
  BarChart3,
  TrendingUp,
  Shield,
  Activity,
  Zap,
  Menu,
  X
} from 'lucide-react';
import withAuth from '../../components/withAuth';

function AdminComplaints() {
  const [complaints, setComplaints] = useState([]);
  const [filteredComplaints, setFilteredComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [currentTime, setCurrentTime] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const router = useRouter();

  useEffect(() => {
    fetchComplaints();
    
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    filterComplaints();
  }, [complaints, searchTerm, statusFilter]);

  const fetchComplaints = async () => {
    try {
      let institutionId = null;
      try {
        const adminString = localStorage.getItem('admin');
        if (adminString) {
          const admin = JSON.parse(adminString);
          institutionId = admin?.institution_id || null;
        }
      } catch (e) {
        institutionId = null;
      }

      if (!institutionId) {
        const adminData = await getAdminInstitution();
        institutionId = adminData?.institution_id || null;
      }

      if (!institutionId) {
        setComplaints([]);
        setFilteredComplaints([]);
        setLoading(false);
        return;
      }

      // Fetch complaints with student data from students_new table
      const { data, error } = await supabase
        .from('complaints')
        .select(`
          *,
          students:students_new (
            id,
            full_name,
            usn,
            branch,
            email,
            phone,
            role,
            created_at
          )
        `)
        .eq('institution_id', institutionId)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Supabase fetch error (complaints):', error);
        setComplaints([]);
        setFilteredComplaints([]);
        setLoading(false);
        return;
      }

      // Transform data to maintain backward compatibility
      const transformedData = (data || []).map(complaint => ({
        ...complaint,
        students: complaint.students || null,
        // Keep old field name for compatibility
        student: complaint.students || null
      }));

      setComplaints(transformedData);
      setLoading(false);

    } catch (err) {
      console.warn('Fetch complaints error:', err);
      setLoading(false);
    }
  };

  const filterComplaints = () => {
    let filtered = complaints;

    if (searchTerm) {
      filtered = filtered.filter(complaint =>
        complaint.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        complaint.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        complaint.students?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        complaint.students?.usn?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(complaint => complaint.status === statusFilter);
    }

    setFilteredComplaints(filtered);
  };

  const updateStatus = async (complaintId, newStatus) => {
    try {
      const { error } = await supabase
        .from('complaints')
        .update({ status: newStatus })
        .eq('id', complaintId);

      if (error) throw error;

      // Update local state
      setComplaints(prev => 
        prev.map(complaint => 
          complaint.id === complaintId 
            ? { ...complaint, status: newStatus }
            : complaint
        )
      );

      // Show success message
      alert(`Status updated to ${newStatus.replace('_', ' ')}`);
    } catch (error) {
      console.warn('Error updating status:', error);
      alert('Error updating status');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'resolved': return 'bg-emerald-950/50 text-emerald-400 border border-emerald-800';
      case 'in_progress': return 'bg-blue-950/50 text-blue-400 border border-blue-800';
      case 'pending': return 'bg-amber-950/50 text-amber-400 border border-amber-800';
      default: return 'bg-slate-800/50 text-slate-400 border border-slate-700';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'resolved': return <CheckCircle size={14} />;
      case 'in_progress': return <Clock size={14} />;
      case 'pending': return <AlertTriangle size={14} />;
      default: return <XCircle size={14} />;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
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

  const openComplaintDetails = (complaint) => {
    setSelectedComplaint(complaint);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedComplaint(null);
  };

  const getStats = () => {
    const total = complaints.length;
    const pending = complaints.filter(c => c.status === 'pending').length;
    const inProgress = complaints.filter(c => c.status === 'in_progress').length;
    const resolved = complaints.filter(c => c.status === 'resolved').length;

    return { total, pending, inProgress, resolved };
  };

  const handleBack = () => {
    router.back();
  };

  const handleExport = () => {
    const headers = [
      'Complaint ID',
      'Student Name',
      'USN',
      'Branch',
      'Title',
      'Description',
      'Status',
      'Created At',
      'Updated At'
    ];

    const csvData = filteredComplaints.map(complaint => [
      complaint.id,
      complaint.students?.full_name || 'N/A',
      complaint.students?.usn || 'N/A',
      complaint.students?.branch || 'N/A',
      complaint.title || '',
      complaint.description || '',
      complaint.status || 'pending',
      complaint.created_at || '',
      complaint.updated_at || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `complaints_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const stats = getStats();
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
          <p className="text-blue-400 font-semibold">Loading complaints...</p>
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
              <h1 className="text-lg font-bold text-white sm:text-xl">Complaints Management</h1>
              <p className="text-xs text-slate-400">{currentTime}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-xl hover:bg-slate-600 transition-all"
            >
              <Download size={14} />
              <span className="hidden sm:inline">Export</span>
            </button>
            <button 
              onClick={fetchComplaints}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all"
            >
              <RefreshCw size={14} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-slate-400">Total Complaints</p>
                <p className="text-2xl font-bold text-blue-400 mt-1">{stats.total}</p>
              </div>
              <div className="p-2 bg-blue-600 rounded-xl">
                <AlertTriangle size={18} className="text-white" />
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-slate-400">Pending</p>
                <p className="text-2xl font-bold text-amber-400 mt-1">{stats.pending}</p>
              </div>
              <div className="p-2 bg-amber-600 rounded-xl">
                <Clock size={18} className="text-white" />
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-slate-400">In Progress</p>
                <p className="text-2xl font-bold text-cyan-400 mt-1">{stats.inProgress}</p>
              </div>
              <div className="p-2 bg-cyan-600 rounded-xl">
                <Activity size={18} className="text-white" />
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-slate-400">Resolved</p>
                <p className="text-2xl font-bold text-emerald-400 mt-1">{stats.resolved}</p>
              </div>
              <div className="p-2 bg-emerald-600 rounded-xl">
                <CheckCircle size={18} className="text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-4 mb-5">
          <div className="flex items-center gap-3 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 mb-3">
            <Search size={16} className="text-slate-500" />
            <input
              type="text"
              placeholder="Search by student name, USN, or complaint title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none text-slate-200 text-sm"
            />
          </div>
          
          <div className="flex gap-2 flex-wrap">
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Filter size={10} /> Status:
            </span>
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                statusFilter === 'all' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-slate-800 text-slate-400 hover:text-blue-400'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                statusFilter === 'pending' 
                  ? 'bg-amber-600 text-white' 
                  : 'bg-slate-800 text-slate-400 hover:text-amber-400'
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => setStatusFilter('in_progress')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                statusFilter === 'in_progress' 
                  ? 'bg-cyan-600 text-white' 
                  : 'bg-slate-800 text-slate-400 hover:text-cyan-400'
              }`}
            >
              In Progress
            </button>
            <button
              onClick={() => setStatusFilter('resolved')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                statusFilter === 'resolved' 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-slate-800 text-slate-400 hover:text-emerald-400'
              }`}
            >
              Resolved
            </button>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-4 bg-slate-800/50 rounded-xl border border-slate-700 px-4 py-2 flex justify-between items-center">
          <p className="text-xs text-slate-400">
            Showing <span className="font-semibold text-white">{filteredComplaints.length}</span> of{' '}
            <span className="font-semibold text-white">{complaints.length}</span> complaints
          </p>
        </div>

        {/* Complaints List */}
        {filteredComplaints.length === 0 ? (
          <div className="text-center py-12 bg-slate-800/50 rounded-2xl border border-slate-700">
            <AlertTriangle size={48} className="mx-auto text-slate-600 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No Complaints Found</h3>
            <p className="text-slate-400">Try adjusting your search or filter criteria</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredComplaints.map((complaint) => (
              <div 
                key={complaint.id} 
                className="bg-slate-800/50 rounded-2xl border border-slate-700 hover:border-blue-500/30 transition-all p-5 cursor-pointer"
                onClick={() => openComplaintDetails(complaint)}
              >
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-start flex-wrap gap-3">
                    <h3 className="font-semibold text-white">{complaint.title}</h3>
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(complaint.status)}`}>
                      {getStatusIcon(complaint.status)}
                      <span className="capitalize">{complaint.status?.replace('_', ' ') || 'Unknown'}</span>
                    </span>
                  </div>

                  <p className="text-sm text-slate-400 line-clamp-2">
                    {complaint.description || 'No description provided'}
                  </p>

                  <div className="flex flex-wrap gap-2 items-center">
                    <div className="flex items-center gap-1 px-2 py-1 bg-slate-900 rounded-full text-xs text-slate-400 border border-slate-700">
                      <User size={10} />
                      <span>{complaint.students?.full_name || 'Unknown'} ({complaint.students?.usn || 'N/A'})</span>
                    </div>
                    <div className="flex items-center gap-1 px-2 py-1 bg-slate-900 rounded-full text-xs text-slate-400 border border-slate-700">
                      <Clock size={10} />
                      <span>{formatTimeAgo(complaint.created_at)}</span>
                    </div>
                    {complaint.photo_url && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-slate-900 rounded-full text-xs text-blue-400 border border-blue-800">
                        <Image size={10} />
                        <span>Photo</span>
                      </div>
                    )}
                    {complaint.video_url && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-slate-900 rounded-full text-xs text-purple-400 border border-purple-800">
                        <Video size={10} />
                        <span>Video</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 pt-2 border-t border-slate-700">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openComplaintDetails(complaint);
                      }}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-sm"
                    >
                      <Eye size={14} />
                      View Details
                    </button>
                    <select
                      value={complaint.status}
                      onChange={(e) => {
                        e.stopPropagation();
                        updateStatus(complaint.id, e.target.value);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-200 cursor-pointer focus:outline-none focus:border-blue-500"
                    >
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Complaint Details Modal */}
      {showModal && selectedComplaint && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={closeModal}>
          <div className="bg-slate-800 rounded-2xl border border-slate-700 max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="sticky top-0 bg-slate-800 border-b border-slate-700 px-6 py-4 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-xl">
                  <AlertTriangle size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{selectedComplaint.title}</h3>
                  <p className="text-xs text-slate-400">Complaint ID: {selectedComplaint.id}</p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="p-2 text-slate-400 hover:text-slate-300 hover:bg-slate-700 rounded-lg transition-all"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6">
              {/* Student Information */}
              <div className="bg-blue-950/30 rounded-xl border border-blue-800 p-4 mb-5">
                <h4 className="text-sm font-semibold text-blue-400 mb-3 flex items-center gap-2">
                  <User size={14} />
                  Student Information
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-slate-400">Name</p>
                    <p className="text-sm text-white">{selectedComplaint.students?.full_name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">USN</p>
                    <p className="text-sm text-white">{selectedComplaint.students?.usn || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Branch</p>
                    <p className="text-sm text-white">{selectedComplaint.students?.branch || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Email</p>
                    <p className="text-sm text-white">{selectedComplaint.students?.email || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Phone</p>
                    <p className="text-sm text-white">{selectedComplaint.students?.phone || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Role</p>
                    <p className="text-sm text-white capitalize">{selectedComplaint.students?.role || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Complaint Description */}
              <div className="mb-5">
                <h4 className="text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
                  <MessageSquare size={14} className="text-blue-400" />
                  Description
                </h4>
                <div className="bg-slate-900 rounded-xl border border-slate-700 p-4 text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {selectedComplaint.description || 'No description provided.'}
                </div>
              </div>

              {/* Media Attachments */}
              {(selectedComplaint.photo_url || selectedComplaint.video_url) && (
                <div className="mb-5">
                  <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                    <Image size={14} className="text-purple-400" />
                    Media Attachments
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedComplaint.photo_url && (
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Photo</p>
                        <img
                          src={selectedComplaint.photo_url}
                          alt="Complaint"
                          className="w-full h-40 object-cover rounded-xl border border-slate-700"
                        />
                      </div>
                    )}
                    {selectedComplaint.video_url && (
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Video</p>
                        <video
                          src={selectedComplaint.video_url}
                          controls
                          className="w-full h-40 object-cover rounded-xl border border-slate-700"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Status Update */}
              <div className="bg-amber-950/30 rounded-xl border border-amber-800 p-4 mb-5">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <h4 className="text-sm font-semibold text-amber-400 mb-1">Current Status</h4>
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedComplaint.status)}`}>
                      {getStatusIcon(selectedComplaint.status)}
                      <span className="capitalize">{selectedComplaint.status?.replace('_', ' ') || 'Unknown'}</span>
                    </span>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-amber-400 mb-1">Update Status</h4>
                    <select
                      value={selectedComplaint.status}
                      onChange={(e) => {
                        updateStatus(selectedComplaint.id, e.target.value);
                        setSelectedComplaint(prev => ({ ...prev, status: e.target.value }));
                      }}
                      className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-200 cursor-pointer focus:outline-none focus:border-amber-500"
                    >
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="pt-4 border-t border-slate-700 flex justify-between items-center text-xs text-slate-400">
                <span>Submitted: {formatDate(selectedComplaint.created_at)}</span>
                <span>Last updated: {formatTimeAgo(selectedComplaint.updated_at || selectedComplaint.created_at)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default withAuth(AdminComplaints);