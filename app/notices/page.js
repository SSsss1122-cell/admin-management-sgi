'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Bell, Send, User, Mail, Calendar, Plus, X, Users, 
  FileText, Target, ArrowLeft, Clock, ChevronDown, 
  CheckCircle, AlertCircle, BookOpen, Link as LinkIcon
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import withAuth from '../../components/withAuth';

function Notices() {
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [recentNotices, setRecentNotices] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [sendToAll, setSendToAll] = useState(false);
  const [currentTime, setCurrentTime] = useState('');

  const router = useRouter();

  // Fetch all students
  useEffect(() => {
    const fetchStudents = async () => {
      const { data, error } = await supabase
        .from("students")
        .select("id, full_name, usn, branch, email")
        .order('full_name');

      if (!error) setStudents(data || []);
      else console.error(error);
    };

    fetchStudents();
    fetchRecentNotices();
    
    // Update time
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch recent notices
  const fetchRecentNotices = async () => {
    const { data, error } = await supabase
      .from("notices")
      .select(`
        *,
        students (full_name, usn)
      `)
      .order('created_at', { ascending: false })
      .limit(5);

    if (!error) setRecentNotices(data || []);
  };

  // Send notice
  const sendNotice = async () => {
    if ((!selectedStudent && !sendToAll) || !title) {
      alert("Please select a student or choose 'Send to All', and enter a title!");
      return;
    }

    setLoading(true);

    try {
      let noticeData;

      if (sendToAll) {
        // Send to all students
        const notices = students.map(student => ({
          title,
          description,
          pdf_url: pdfUrl || null,
          student_id: student.id,
        }));

        const { data, error } = await supabase
          .from("notices")
          .insert(notices)
          .select();

        if (error) throw error;
        noticeData = data;
      } else {
        // Send to single student
        const { data, error } = await supabase
          .from("notices")
          .insert([{
            title,
            description,
            pdf_url: pdfUrl || null,
            student_id: selectedStudent,
          }])
          .select();

        if (error) throw error;
        noticeData = data;
      }

      alert(`Notice sent successfully to ${sendToAll ? 'all students' : 'selected student'}!`);

      // Reset fields
      setTitle("");
      setDescription("");
      setPdfUrl("");
      setSelectedStudent("");
      setSendToAll(false);
      setShowForm(false);
      
      // Refresh recent notices
      fetchRecentNotices();
    } catch (error) {
      console.error(error);
      alert("Error sending notice: " + error.message);
    } finally {
      setLoading(false);
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

  const getSelectedStudentName = () => {
    if (sendToAll) return "All Students";
    const student = students.find(s => s.id === selectedStudent);
    return student ? `${student.full_name} (${student.usn})` : "";
  };

  const handleBack = () => {
    router.back();
  };

  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

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
          --accent-blue: #3b82f6;
          --accent-cyan: #06b6d4;
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
        
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        
        .animate-fade-in { animation: fadeIn 0.3s ease forwards; }
        .animate-float { animation: float 3s ease-in-out infinite; }
        
        .glass-effect {
          background: rgba(22, 22, 42, 0.8);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        
        .gradient-text {
          background: linear-gradient(135deg, #3b82f6, #06b6d4);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
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
          background: linear-gradient(90deg, #3b82f6, #06b6d4);
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
        
        .notice-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 16px;
          transition: all 0.3s ease;
        }
        
        .notice-card:hover {
          background: var(--bg-card-hover);
          border-color: #3b82f6;
          transform: translateY(-2px);
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
          border-color: #3b82f6;
          color: #3b82f6;
        }
        
        .action-button.primary {
          background: linear-gradient(135deg, #3b82f6, #06b6d4);
          color: white;
          border: none;
        }
        
        .action-button.primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px -5px #3b82f6;
        }
        
        .info-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          background: rgba(255,255,255,0.02);
          border: 1px solid var(--border);
          border-radius: 30px;
          font-size: 11px;
          color: var(--text-secondary);
        }
        
        .radio-card {
          background: rgba(255,255,255,0.02);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 12px 16px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .radio-card:hover {
          background: rgba(59,130,246,0.05);
          border-color: #3b82f6;
        }
        
        .radio-card.selected {
          background: rgba(59,130,246,0.1);
          border-color: #3b82f6;
        }
        
        .input-field {
          width: 100%;
          padding: 12px 16px;
          background: var(--bg-primary);
          border: 1px solid var(--border);
          border-radius: 12px;
          font-size: 14px;
          color: var(--text-primary);
          outline: none;
          transition: all 0.2s ease;
        }
        
        .input-field:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59,130,246,0.2);
        }
        
        .input-field::placeholder {
          color: var(--text-muted);
        }
        
        .tip-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: rgba(59,130,246,0.05);
          border: 1px solid rgba(59,130,246,0.2);
          border-radius: 10px;
          font-size: 12px;
          color: var(--text-secondary);
        }
        
        @media (max-width: 768px) {
          .stat-card { padding: 16px; }
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
          background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)',
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
          background: 'radial-gradient(circle, rgba(6,182,212,0.1) 0%, transparent 70%)',
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
                <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Notices</h1>
                <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{currentTime}</p>
              </div>
            </div>
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
                  background: 'rgba(59,130,246,0.1)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  border: '1px solid rgba(59,130,246,0.2)',
                  animation: 'float 3s ease-in-out infinite'
                }}>
                  <Bell size={24} color="#3b82f6" />
                </div>
                <div>
                  <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)' }}>Student Notices</h1>
                  <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 4 }}>
                    {dateStr} • {currentTime}
                  </p>
                </div>
              </div>
            </div>
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
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Total Students</p>
                  <p style={{ fontSize: 28, fontWeight: 700, color: '#3b82f6', marginTop: 4 }}>{students.length}</p>
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
                  <Users size={20} color="#3b82f6" />
                </div>
              </div>
            </div>

            <div className="stat-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Recent Notices</p>
                  <p style={{ fontSize: 28, fontWeight: 700, color: '#06b6d4', marginTop: 4 }}>{recentNotices.length}</p>
                </div>
                <div style={{ 
                  width: 40, 
                  height: 40, 
                  borderRadius: 12, 
                  background: 'rgba(6,182,212,0.1)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center'
                }}>
                  <FileText size={20} color="#06b6d4" />
                </div>
              </div>
            </div>
          </div>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr',
            gap: 20
          }}>
            {/* Send Notice Form */}
            <div style={{ 
              background: 'var(--bg-card)',
              borderRadius: 24,
              border: '1px solid var(--border)',
              padding: 24
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 12,
                marginBottom: 24
              }}>
                <div style={{ 
                  width: 48, 
                  height: 48, 
                  borderRadius: 14, 
                  background: 'rgba(59,130,246,0.1)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  border: '1px solid rgba(59,130,246,0.2)'
                }}>
                  <Send size={22} color="#3b82f6" />
                </div>
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>
                    Send New Notice
                  </h2>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    Create and send important announcements
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Send To Options */}
                <div>
                  <label style={{ 
                    display: 'block', 
                    fontSize: 13, 
                    fontWeight: 600, 
                    color: 'var(--text-primary)',
                    marginBottom: 12 
                  }}>
                    Send To
                  </label>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <div 
                      className={`radio-card ${sendToAll ? 'selected' : ''}`}
                      onClick={() => setSendToAll(true)}
                      style={{ flex: 1 }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 18,
                          height: 18,
                          borderRadius: '50%',
                          border: '2px solid',
                          borderColor: sendToAll ? '#3b82f6' : 'var(--border)',
                          background: sendToAll ? '#3b82f6' : 'transparent',
                          transition: 'all 0.2s ease'
                        }} />
                        <Users size={18} color={sendToAll ? '#3b82f6' : 'var(--text-muted)'} />
                        <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                          All Students ({students.length})
                        </span>
                      </div>
                    </div>

                    <div 
                      className={`radio-card ${!sendToAll ? 'selected' : ''}`}
                      onClick={() => setSendToAll(false)}
                      style={{ flex: 1 }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 18,
                          height: 18,
                          borderRadius: '50%',
                          border: '2px solid',
                          borderColor: !sendToAll ? '#3b82f6' : 'var(--border)',
                          background: !sendToAll ? '#3b82f6' : 'transparent',
                          transition: 'all 0.2s ease'
                        }} />
                        <Target size={18} color={!sendToAll ? '#3b82f6' : 'var(--text-muted)'} />
                        <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                          Specific Student
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Student Selection */}
                {!sendToAll && (
                  <div>
                    <label style={{ 
                      display: 'block', 
                      fontSize: 13, 
                      fontWeight: 600, 
                      color: 'var(--text-primary)',
                      marginBottom: 8 
                    }}>
                      Select Student
                    </label>
                    <select
                      value={selectedStudent}
                      onChange={(e) => setSelectedStudent(e.target.value)}
                      className="input-field"
                      style={{ appearance: 'none' }}
                    >
                      <option value="">-- Choose a student --</option>
                      {students.map((student) => (
                        <option key={student.id} value={student.id}>
                          {student.full_name} ({student.usn}) - {student.branch}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Notice Title */}
                <div>
                  <label style={{ 
                    display: 'block', 
                    fontSize: 13, 
                    fontWeight: 600, 
                    color: 'var(--text-primary)',
                    marginBottom: 8 
                  }}>
                    Notice Title <span style={{ color: '#3b82f6' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter notice title..."
                    className="input-field"
                  />
                </div>

                {/* Notice Description */}
                <div>
                  <label style={{ 
                    display: 'block', 
                    fontSize: 13, 
                    fontWeight: 600, 
                    color: 'var(--text-primary)',
                    marginBottom: 8 
                  }}>
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Enter notice description..."
                    rows={4}
                    className="input-field"
                    style={{ resize: 'vertical', minHeight: 100 }}
                  />
                </div>

                {/* PDF URL */}
                <div>
                  <label style={{ 
                    display: 'block', 
                    fontSize: 13, 
                    fontWeight: 600, 
                    color: 'var(--text-primary)',
                    marginBottom: 8 
                  }}>
                    PDF URL (Optional)
                  </label>
                  <div style={{ position: 'relative' }}>
                    <LinkIcon size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="url"
                      value={pdfUrl}
                      onChange={(e) => setPdfUrl(e.target.value)}
                      placeholder="https://example.com/notice.pdf"
                      className="input-field"
                      style={{ paddingLeft: 36 }}
                    />
                  </div>
                </div>

                {/* Preview */}
                {(title || description) && (
                  <div style={{ 
                    background: 'rgba(59,130,246,0.05)',
                    border: '1px solid rgba(59,130,246,0.2)',
                    borderRadius: 16,
                    padding: 16
                  }}>
                    <h3 style={{ fontSize: 13, fontWeight: 600, color: '#3b82f6', marginBottom: 8 }}>
                      Preview
                    </h3>
                    <div style={{ 
                      fontSize: 14, 
                      color: 'var(--text-secondary)',
                      background: 'var(--bg-primary)',
                      borderRadius: 12,
                      padding: 12
                    }}>
                      <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                        {title || 'No title'}
                      </p>
                      <p style={{ whiteSpace: 'pre-wrap', marginBottom: 8 }}>
                        {description || 'No description'}
                      </p>
                      <div className="info-chip" style={{ display: 'inline-flex' }}>
                        <User size={10} />
                        <span>To: {getSelectedStudentName() || 'Not selected'}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Send Button */}
                <button
                  onClick={sendNotice}
                  disabled={loading}
                  className="action-button primary"
                  style={{ 
                    padding: '14px', 
                    fontSize: 14,
                    justifyContent: 'center',
                    marginTop: 8
                  }}
                >
                  {loading ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="animate-spin" style={{ width: 16, height: 16, border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%' }}></div>
                      <span>Sending...</span>
                    </div>
                  ) : (
                    <>
                      <Send size={16} />
                      <span>{sendToAll ? `Send to All Students` : 'Send Notice'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Right Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Recent Notices */}
              <div style={{ 
                background: 'var(--bg-card)',
                borderRadius: 24,
                border: '1px solid var(--border)',
                padding: 20
              }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>
                  Recent Notices
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {recentNotices.length > 0 ? (
                    recentNotices.map((notice) => (
                      <div key={notice.id} className="notice-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                          <h4 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                            {notice.title}
                          </h4>
                          <span className="info-chip" style={{ fontSize: 10 }}>
                            <Clock size={8} />
                            {formatTimeAgo(notice.created_at)}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
                          To: {notice.students?.full_name} ({notice.students?.usn})
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                          {formatDate(notice.created_at)}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ 
                      textAlign: 'center', 
                      padding: 32,
                      color: 'var(--text-muted)',
                      fontSize: 13
                    }}>
                      <Bell size={32} style={{ marginBottom: 8, opacity: 0.3 }} />
                      <p>No notices sent yet</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Tips */}
              <div style={{ 
                background: 'rgba(59,130,246,0.05)',
                borderRadius: 24,
                border: '1px solid rgba(59,130,246,0.2)',
                padding: 20
              }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: '#3b82f6', marginBottom: 16 }}>
                  Tips
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div className="tip-item">
                    <Bell size={14} color="#3b82f6" />
                    <span>Use clear and concise titles</span>
                  </div>
                  <div className="tip-item">
                    <Target size={14} color="#3b82f6" />
                    <span>Select specific students for targeted communication</span>
                  </div>
                  <div className="tip-item">
                    <FileText size={14} color="#3b82f6" />
                    <span>Attach PDFs for detailed information</span>
                  </div>
                  <div className="tip-item">
                    <CheckCircle size={14} color="#3b82f6" />
                    <span>Preview before sending to check formatting</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
export default withAuth(Notices);