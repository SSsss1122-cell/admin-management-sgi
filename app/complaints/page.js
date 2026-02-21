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
    
    // Update time
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
        complaint.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        complaint.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        complaint.students?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        complaint.students?.usn?.toLowerCase().includes(searchTerm.toLowerCase())
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

      // Show toast
      alert(`Status updated to ${newStatus.replace('_', ' ')}`);
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Error updating status');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'resolved': return 'bg-green-500/10 text-green-500 border border-green-500/20';
      case 'in_progress': return 'bg-blue-500/10 text-blue-500 border border-blue-500/20';
      case 'pending': return 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20';
      default: return 'bg-gray-500/10 text-gray-400 border border-gray-500/20';
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

  const stats = getStats();
  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: '#0a0a0f',
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
        `}</style>
        <div style={{ textAlign: 'center' }}>
          <div style={{ position: 'relative', width: 80, height: 80, margin: '0 auto 20px' }}>
            <div style={{ 
              width: 80, 
              height: 80, 
              border: '4px solid #1e1e2e', 
              borderTop: '4px solid #f97316', 
              borderRadius: '50%', 
              animation: 'spin 1s linear infinite' 
            }}></div>
            <div style={{ 
              position: 'absolute', 
              top: '50%', 
              left: '50%', 
              transform: 'translate(-50%, -50%)', 
              width: 40, 
              height: 40, 
              background: '#f97316', 
              borderRadius: '50%', 
              animation: 'pulse 1.5s ease infinite' 
            }}></div>
          </div>
          <p style={{ color: '#f97316', fontWeight: 600 }}>Loading complaints...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        
        * { 
          box-sizing: border-box; 
          margin: 0; 
          padding: 0; 
        }
        
        :root {
          --bg-primary: #0a0a0f;
          --bg-secondary: #11111f;
          --bg-card: #16162a;
          --bg-card-hover: #1c1c34;
          --border: rgba(255,255,255,0.08);
          --border-hover: rgba(255,255,255,0.15);
          --text-primary: #ffffff;
          --text-secondary: #a0a0c0;
          --text-muted: #6b6b8b;
          --accent-orange: #f97316;
          --accent-green: #10b981;
          --accent-red: #ef4444;
          --accent-yellow: #eab308;
          --accent-blue: #3b82f6;
          --accent-purple: #8b5cf6;
        }
        
        body { 
          font-family: 'Inter', sans-serif; 
          background: var(--bg-primary);
          color: var(--text-primary);
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes slideIn {
          from { transform: translateX(20px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes scaleIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        
        @keyframes float {
          0%,100% { transform: translateY(0px); }
          50% { transform: translateY(-5px); }
        }
        
        @keyframes glow {
          0%,100% { filter: blur(60px) opacity(0.5); }
          50% { filter: blur(80px) opacity(0.8); }
        }
        
        @keyframes pulse {
          0%,100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.05); }
        }
        
        .animate-fade-in { animation: fadeIn 0.3s ease forwards; }
        .animate-float { animation: float 3s ease-in-out infinite; }
        .animate-pulse-slow { animation: pulse 2s ease-in-out infinite; }
        
        .glass-effect {
          background: rgba(22, 22, 42, 0.8);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        
        .search-bar {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 40px;
          padding: 8px 20px;
          transition: all 0.3s ease;
        }
        
        .search-bar:focus-within {
          border-color: #f97316;
          box-shadow: 0 0 0 3px rgba(249,115,22,0.2);
        }
        
        .stat-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 20px;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }
        
        .stat-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, #f97316, #eab308);
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        
        .stat-card:hover {
          transform: translateY(-4px);
          background: var(--bg-card-hover);
          border-color: var(--border-hover);
        }
        
        .stat-card:hover::before {
          opacity: 1;
        }
        
        .complaint-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 20px;
          transition: all 0.3s ease;
          cursor: pointer;
        }
        
        .complaint-card:hover {
          background: var(--bg-card-hover);
          border-color: #f97316;
          transform: translateY(-2px);
        }
        
        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 30px;
          font-size: 12px;
          font-weight: 600;
        }
        
        .info-item {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          background: rgba(255,255,255,0.02);
          border: 1px solid var(--border);
          border-radius: 30px;
          font-size: 12px;
          color: var(--text-secondary);
        }
        
        .filter-chip {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 30px;
          padding: 6px 14px;
          font-size: 12px;
          font-weight: 500;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .filter-chip:hover {
          border-color: #f97316;
          color: #f97316;
        }
        
        .filter-chip.active {
          background: #f97316;
          color: white;
          border-color: #f97316;
        }
        
        .action-button {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 40px;
          padding: 8px 16px;
          font-size: 13px;
          font-weight: 500;
          color: var(--text-secondary);
          display: inline-flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .action-button:hover {
          background: var(--bg-card-hover);
          border-color: #f97316;
          color: #f97316;
        }
        
        .action-button.primary {
          background: linear-gradient(135deg, #f97316, #eab308);
          color: white;
          border: none;
        }
        
        .action-button.primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px -5px #f97316;
        }
        
        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.8);
          backdrop-filter: blur(8px);
          z-index: 50;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .modal-content {
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 32px;
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
          max-width: 900px;
          width: 90%;
          max-height: 90vh;
          overflow-y: auto;
          animation: scaleIn 0.2s ease;
        }
        
        @media (max-width: 768px) {
          .stat-card { padding: 16px; }
          .complaint-card { padding: 16px; }
          .modal-content { width: 95%; }
        }
      `}</style>

      <div style={{ 
        minHeight: '100vh', 
        background: 'radial-gradient(circle at 50% 50%, #1a1a2e, #0a0a0f)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Background Orbs */}
        <div style={{
          position: 'fixed',
          width: 600,
          height: 600,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(249,115,22,0.15) 0%, transparent 70%)',
          top: -200,
          left: -200,
          filter: 'blur(80px)',
          pointerEvents: 'none',
          zIndex: 0,
          animation: 'glow 8s ease-in-out infinite'
        }}></div>
        <div style={{
          position: 'fixed',
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(234,179,8,0.1) 0%, transparent 70%)',
          bottom: -150,
          right: -150,
          filter: 'blur(80px)',
          pointerEvents: 'none',
          zIndex: 0,
          animation: 'glow 10s ease-in-out infinite reverse'
        }}></div>

        {/* Mobile Header */}
        <div className="glass-effect" style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          padding: '12px 16px',
          borderBottom: '1px solid var(--border)',
          display: 'block'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                onClick={handleBack}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)'
                }}
              >
                <ArrowLeft size={18} />
              </button>
              <div>
                <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Complaints</h1>
                <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{currentTime}</p>
              </div>
            </div>
            <button 
              onClick={fetchComplaints}
              className="action-button primary"
              style={{ padding: '8px 16px' }}
            >
              <RefreshCw size={14} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        <div style={{ position: 'relative', zIndex: 10, maxWidth: 1400, margin: '0 auto', padding: '16px' }}>
          {/* Desktop Header */}
          <div style={{ 
            display: 'none',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 24,
            background: 'var(--bg-card)',
            borderRadius: 20,
            padding: 20,
            border: '1px solid var(--border)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <button
                onClick={handleBack}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)'
                }}
              >
                <ArrowLeft size={20} />
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ 
                  width: 48, 
                  height: 48, 
                  borderRadius: 14, 
                  background: 'rgba(249,115,22,0.1)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  border: '1px solid rgba(249,115,22,0.2)'
                }}>
                  <AlertTriangle size={24} color="#f97316" />
                </div>
                <div>
                  <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)' }}>Complaints Management</h1>
                  <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 4 }}>{dateStr} • {currentTime}</p>
                </div>
              </div>
            </div>
            <button 
              onClick={fetchComplaints}
              className="action-button primary"
            >
              <RefreshCw size={16} />
              <span>Refresh</span>
            </button>
          </div>

          {/* Stats Cards */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 12,
            marginBottom: 20
          }}>
            <div className="stat-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Total Complaints</p>
                  <p style={{ fontSize: 28, fontWeight: 700, color: '#f97316', marginTop: 4 }}>{stats.total}</p>
                </div>
                <div style={{ 
                  width: 40, 
                  height: 40, 
                  borderRadius: 12, 
                  background: 'rgba(249,115,22,0.1)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center'
                }}>
                  <AlertTriangle size={20} color="#f97316" />
                </div>
              </div>
            </div>

            <div className="stat-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Pending</p>
                  <p style={{ fontSize: 28, fontWeight: 700, color: '#eab308', marginTop: 4 }}>{stats.pending}</p>
                </div>
                <div style={{ 
                  width: 40, 
                  height: 40, 
                  borderRadius: 12, 
                  background: 'rgba(234,179,8,0.1)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center'
                }}>
                  <Clock size={20} color="#eab308" />
                </div>
              </div>
            </div>

            <div className="stat-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>In Progress</p>
                  <p style={{ fontSize: 28, fontWeight: 700, color: '#3b82f6', marginTop: 4 }}>{stats.inProgress}</p>
                </div>
                <div style={{ 
                  width: 40, 
                  height: 40, 
                  borderRadius: 12, 
                  background: 'rgba(59,130,246,0.1)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center'
                }}>
                  <Activity size={20} color="#3b82f6" />
                </div>
              </div>
            </div>

            <div className="stat-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Resolved</p>
                  <p style={{ fontSize: 28, fontWeight: 700, color: '#10b981', marginTop: 4 }}>{stats.resolved}</p>
                </div>
                <div style={{ 
                  width: 40, 
                  height: 40, 
                  borderRadius: 12, 
                  background: 'rgba(16,185,129,0.1)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center'
                }}>
                  <CheckCircle size={20} color="#10b981" />
                </div>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div style={{ 
            background: 'var(--bg-card)',
            borderRadius: 20,
            padding: 16,
            marginBottom: 20,
            border: '1px solid var(--border)'
          }}>
            <div className="search-bar" style={{ 
              marginBottom: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 12
            }}>
              <Search size={16} color="var(--text-muted)" />
              <input
                type="text"
                placeholder="Search by student name, USN, or complaint title..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  fontSize: 13,
                  background: 'transparent',
                  color: 'var(--text-primary)'
                }}
              />
            </div>
            
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Filter size={12} />
                Status:
              </span>
              <button
                onClick={() => setStatusFilter('all')}
                className={`filter-chip ${statusFilter === 'all' ? 'active' : ''}`}
              >
                All
              </button>
              <button
                onClick={() => setStatusFilter('pending')}
                className={`filter-chip ${statusFilter === 'pending' ? 'active' : ''}`}
              >
                Pending
              </button>
              <button
                onClick={() => setStatusFilter('in_progress')}
                className={`filter-chip ${statusFilter === 'in_progress' ? 'active' : ''}`}
              >
                In Progress
              </button>
              <button
                onClick={() => setStatusFilter('resolved')}
                className={`filter-chip ${statusFilter === 'resolved' ? 'active' : ''}`}
              >
                Resolved
              </button>
            </div>
          </div>

          {/* Results Count */}
          <div style={{ 
            marginBottom: 16, 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            background: 'var(--bg-card)',
            padding: '12px 16px',
            borderRadius: 16,
            border: '1px solid var(--border)'
          }}>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Showing <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{filteredComplaints.length}</span> of{' '}
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{complaints.length}</span> complaints
            </p>
          </div>

          {/* Complaints List */}
          {filteredComplaints.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: 60,
              background: 'var(--bg-card)',
              borderRadius: 24,
              border: '1px solid var(--border)'
            }}>
              <AlertTriangle size={48} color="var(--text-muted)" style={{ marginBottom: 16, opacity: 0.5 }} />
              <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>No Complaints Found</h3>
              <p style={{ color: 'var(--text-muted)' }}>Try adjusting your search or filter criteria</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filteredComplaints.map((complaint) => (
                <div 
                  key={complaint.id} 
                  className="complaint-card"
                  style={{ cursor: 'pointer' }}
                  onClick={() => openComplaintDetails(complaint)}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                      <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
                        {complaint.title}
                      </h3>
                      <div className={`status-badge ${getStatusColor(complaint.status)}`}>
                        {getStatusIcon(complaint.status)}
                        <span style={{ textTransform: 'capitalize' }}>
                          {complaint.status?.replace('_', ' ') || 'Unknown'}
                        </span>
                      </div>
                    </div>

                    {/* Description */}
                    <p style={{ 
                      fontSize: 13, 
                      color: 'var(--text-secondary)',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      lineHeight: '1.5'
                    }}>
                      {complaint.description || 'No description provided'}
                    </p>

                    {/* Meta Info */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                      <div className="info-item">
                        <User size={12} />
                        <span>{complaint.students?.full_name || 'Unknown'} ({complaint.students?.usn || 'N/A'})</span>
                      </div>
                      <div className="info-item">
                        <Clock size={12} />
                        <span>{formatTimeAgo(complaint.created_at)}</span>
                      </div>
                      {complaint.photo_url && (
                        <div className="info-item" style={{ color: '#3b82f6' }}>
                          <Image size={12} />
                          <span>Photo</span>
                        </div>
                      )}
                      {complaint.video_url && (
                        <div className="info-item" style={{ color: '#8b5cf6' }}>
                          <Video size={12} />
                          <span>Video</span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div style={{ 
                      display: 'flex', 
                      gap: 8, 
                      marginTop: 8,
                      borderTop: '1px solid var(--border)',
                      paddingTop: 12
                    }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openComplaintDetails(complaint);
                        }}
                        className="action-button primary"
                        style={{ flex: 1 }}
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
                        style={{
                          background: 'var(--bg-card)',
                          border: '1px solid var(--border)',
                          borderRadius: 40,
                          padding: '8px 16px',
                          fontSize: 13,
                          color: 'var(--text-primary)',
                          cursor: 'pointer',
                          outline: 'none'
                        }}
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

      {/* Complaint Details Modal */}
      {showModal && selectedComplaint && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div style={{
              padding: 24,
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ 
                  width: 44, 
                  height: 44, 
                  borderRadius: 12, 
                  background: 'rgba(249,115,22,0.1)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  border: '1px solid rgba(249,115,22,0.2)'
                }}>
                  <AlertTriangle size={22} color="#f97316" />
                </div>
                <div>
                  <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>
                    {selectedComplaint.title}
                  </h3>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    Complaint ID: {selectedComplaint.id}
                  </p>
                </div>
              </div>
              <button
                onClick={closeModal}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--text-muted)'
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: 24 }}>
              {/* Student Information */}
              <div style={{ 
                background: 'rgba(59,130,246,0.05)', 
                border: '1px solid rgba(59,130,246,0.2)',
                borderRadius: 16,
                padding: 16,
                marginBottom: 20
              }}>
                <h4 style={{ fontSize: 14, fontWeight: 600, color: '#3b82f6', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <User size={16} />
                  Student Information
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                  <div>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Name</p>
                    <p style={{ fontSize: 13, color: 'var(--text-primary)' }}>{selectedComplaint.students?.full_name || 'N/A'}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>USN</p>
                    <p style={{ fontSize: 13, color: 'var(--text-primary)' }}>{selectedComplaint.students?.usn || 'N/A'}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Branch</p>
                    <p style={{ fontSize: 13, color: 'var(--text-primary)' }}>{selectedComplaint.students?.branch || 'N/A'}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Email</p>
                    <p style={{ fontSize: 13, color: 'var(--text-primary)' }}>{selectedComplaint.students?.email || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Complaint Description */}
              <div style={{ marginBottom: 20 }}>
                <h4 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <MessageSquare size={16} color="#f97316" />
                  Description
                </h4>
                <div style={{ 
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  padding: 16,
                  fontSize: 14,
                  color: 'var(--text-secondary)',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap'
                }}>
                  {selectedComplaint.description || 'No description provided.'}
                </div>
              </div>

              {/* Media Attachments */}
              {(selectedComplaint.photo_url || selectedComplaint.video_url) && (
                <div style={{ marginBottom: 20 }}>
                  <h4 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Image size={16} color="#8b5cf6" />
                    Media Attachments
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                    {selectedComplaint.photo_url && (
                      <div>
                        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Photo</p>
                        <img
                          src={selectedComplaint.photo_url}
                          alt="Complaint"
                          style={{
                            width: '100%',
                            height: 160,
                            objectFit: 'cover',
                            borderRadius: 12,
                            border: '1px solid var(--border)'
                          }}
                        />
                      </div>
                    )}
                    {selectedComplaint.video_url && (
                      <div>
                        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Video</p>
                        <video
                          src={selectedComplaint.video_url}
                          controls
                          style={{
                            width: '100%',
                            height: 160,
                            objectFit: 'cover',
                            borderRadius: 12,
                            border: '1px solid var(--border)'
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Status Update */}
              <div style={{ 
                background: 'rgba(249,115,22,0.05)',
                border: '1px solid rgba(249,115,22,0.2)',
                borderRadius: 16,
                padding: 16,
                marginBottom: 20
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <h4 style={{ fontSize: 14, fontWeight: 600, color: '#f97316', marginBottom: 4 }}>Current Status</h4>
                    <div className={`status-badge ${getStatusColor(selectedComplaint.status)}`} style={{ padding: '4px 12px' }}>
                      {getStatusIcon(selectedComplaint.status)}
                      <span style={{ textTransform: 'capitalize' }}>
                        {selectedComplaint.status?.replace('_', ' ') || 'Unknown'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <h4 style={{ fontSize: 14, fontWeight: 600, color: '#f97316', marginBottom: 4 }}>Update Status</h4>
                    <select
                      value={selectedComplaint.status}
                      onChange={(e) => {
                        updateStatus(selectedComplaint.id, e.target.value);
                        setSelectedComplaint(prev => ({ ...prev, status: e.target.value }));
                      }}
                      style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        borderRadius: 30,
                        padding: '8px 16px',
                        fontSize: 13,
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                        outline: 'none',
                        minWidth: 140
                      }}
                    >
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div style={{ 
                borderTop: '1px solid var(--border)',
                paddingTop: 16,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: 12,
                color: 'var(--text-muted)'
              }}>
                <span>Submitted: {formatDate(selectedComplaint.created_at)}</span>
                <span>Last updated: {formatTimeAgo(selectedComplaint.created_at)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default withAuth(AdminComplaints);