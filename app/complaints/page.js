'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';

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
  ArrowLeft
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

  const router = useRouter();

  useEffect(() => {
    fetchComplaints();
  }, []);

  useEffect(() => {
    filterComplaints();
  }, [complaints, searchTerm, statusFilter]);

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('complaints')
        .select(`
          id, 
          title, 
          description, 
          status, 
          photo_url, 
          video_url, 
          created_at,
          student_id, 
          students(full_name, usn, branch, email, phone)
        `)
        .order('created_at', { ascending: false });

      if (!error) {
        setComplaints(data || []);
      } else {
        console.error('Error fetching complaints:', error);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterComplaints = () => {
    let filtered = complaints;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(complaint =>
        complaint.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        complaint.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        complaint.students?.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        complaint.students?.usn.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
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

      alert(`Status updated to ${newStatus.replace('_', ' ')}`);
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Error updating status');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'resolved': return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
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
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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

  const stats = getStats();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading complaints...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center space-x-3">
              <button
                onClick={handleBack}
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors p-2 rounded-lg hover:bg-gray-100"
                title="Go back"
              >
                <ArrowLeft size={20} />
              </button>
              <div className="bg-red-100 p-3 rounded-xl">
                <AlertTriangle className="text-red-600" size={32} />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Complaints Management</h1>
                <p className="text-gray-600 mt-1">Manage and resolve student complaints</p>
              </div>
            </div>
            <button
              onClick={fetchComplaints}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
            >
              <RefreshCw size={16} className="mr-2" />
              Refresh
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Complaints</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <AlertTriangle className="text-blue-400" size={24} />
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                </div>
                <Clock className="text-yellow-400" size={24} />
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">In Progress</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
                </div>
                <Clock className="text-blue-400" size={24} />
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Resolved</p>
                  <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
                </div>
                <CheckCircle className="text-green-400" size={24} />
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    placeholder="Search by student name, USN, or complaint title..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                  />
                </div>
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
          </div>

          {/* Complaints List */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                All Complaints ({filteredComplaints.length})
              </h3>
            </div>
            <div className="overflow-x-auto">
              {filteredComplaints.length === 0 ? (
                <div className="text-center py-12">
                  <AlertTriangle className="mx-auto text-gray-400 mb-4" size={48} />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Complaints Found</h3>
                  <p className="text-gray-600">Try adjusting your search criteria.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {filteredComplaints.map((complaint) => (
                    <div key={complaint.id} className="p-4 sm:p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-3">
                            <h4 className="text-lg font-semibold text-gray-900 pr-4">
                              {complaint.title}
                            </h4>
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(complaint.status)}`}>
                              {getStatusIcon(complaint.status)}
                              <span className="ml-1 capitalize">{complaint.status.replace('_', ' ')}</span>
                            </span>
                          </div>

                          <p className="text-gray-600 mb-4 line-clamp-2">
                            {complaint.description}
                          </p>

                          <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                            <div className="flex items-center">
                              <User size={14} className="mr-1" />
                              <span>{complaint.students?.full_name} ({complaint.students?.usn})</span>
                            </div>
                            <div className="flex items-center">
                              <Clock size={14} className="mr-1" />
                              <span>{formatDate(complaint.created_at)}</span>
                            </div>
                            {complaint.photo_url && (
                              <div className="flex items-center">
                                <Image size={14} className="mr-1" />
                                <span>Has Photo</span>
                              </div>
                            )}
                            {complaint.video_url && (
                              <div className="flex items-center">
                                <Video size={14} className="mr-1" />
                                <span>Has Video</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row lg:flex-col gap-2">
                          <button
                            onClick={() => openComplaintDetails(complaint)}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center text-sm"
                          >
                            <Eye size={14} className="mr-1" />
                            View Details
                          </button>
                          
                          <select
                            value={complaint.status}
                            onChange={(e) => updateStatus(complaint.id, e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white text-sm"
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
          </div>
        </div>
      </div>

      {/* Complaint Details Modal */}
      {showModal && selectedComplaint && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-start">
                <h3 className="text-xl font-bold text-gray-900">{selectedComplaint.title}</h3>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <XCircle size={24} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Student Information */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h4 className="font-semibold text-blue-900 mb-2 flex items-center">
                  <User size={16} className="mr-2" />
                  Student Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-blue-800">Name:</span>
                    <span className="text-blue-700 ml-2">{selectedComplaint.students?.full_name}</span>
                  </div>
                  <div>
                    <span className="font-medium text-blue-800">USN:</span>
                    <span className="text-blue-700 ml-2">{selectedComplaint.students?.usn}</span>
                  </div>
                  <div>
                    <span className="font-medium text-blue-800">Branch:</span>
                    <span className="text-blue-700 ml-2">{selectedComplaint.students?.branch || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="font-medium text-blue-800">Email:</span>
                    <span className="text-blue-700 ml-2">{selectedComplaint.students?.email || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Complaint Details */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                  <MessageSquare size={16} className="mr-2" />
                  Complaint Description
                </h4>
                <p className="text-gray-700 whitespace-pre-line bg-gray-50 p-4 rounded-lg border">
                  {selectedComplaint.description || 'No description provided.'}
                </p>
              </div>

              {/* Media Attachments */}
              {(selectedComplaint.photo_url || selectedComplaint.video_url) && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <Image size={16} className="mr-2" />
                    Media Attachments
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedComplaint.photo_url && (
                      <div>
                        <p className="text-sm text-gray-600 mb-2">Photo Evidence</p>
                        <img
                          src={selectedComplaint.photo_url}
                          alt="Complaint photo"
                          className="w-full h-48 object-cover rounded-lg border"
                        />
                      </div>
                    )}
                    {selectedComplaint.video_url && (
                      <div>
                        <p className="text-sm text-gray-600 mb-2">Video Evidence</p>
                        <video
                          src={selectedComplaint.video_url}
                          controls
                          className="w-full h-48 object-cover rounded-lg border"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Status Update */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Update Status</h4>
                <select
                  value={selectedComplaint.status}
                  onChange={(e) => {
                    updateStatus(selectedComplaint.id, e.target.value);
                    setSelectedComplaint(prev => ({ ...prev, status: e.target.value }));
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>

              {/* Complaint Metadata */}
              <div className="border-t border-gray-200 pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-600">
                  <div>
                    <span className="font-medium">Submitted:</span>
                    <span className="ml-2">{formatDate(selectedComplaint.created_at)}</span>
                  </div>
                  <div>
                    <span className="font-medium">Complaint ID:</span>
                    <span className="ml-2">{selectedComplaint.id}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default withAuth(AdminComplaints);