'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Send,
  User,
  Users,
  FileText,
  Target,
  ArrowLeft,
  Clock,
  CheckCircle,
  Link as LinkIcon,
} from 'lucide-react';

import { supabase } from '../../lib/supabase';
import withAuth from '../../components/withAuth';

function Notices() {
  const router = useRouter();

  // ================= STATES =================

  const [institutionId, setInstitutionId] = useState(null);

  const [students, setStudents] = useState([]);
  const [recentNotices, setRecentNotices] = useState([]);

  const [selectedStudent, setSelectedStudent] = useState('');
  const [sendToAll, setSendToAll] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');

  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState('');

  // ================= LOAD INITIAL DATA =================

  useEffect(() => {
    const institutionId = localStorage.getItem('institutionId');

    if (!institutionId) {
      router.push('/login');
      return;
    }

    setInstitutionId(institutionId);
    fetchStudents(institutionId);
    fetchRecentNotices(institutionId);
  }, []);

  // ================= CLOCK =================

  useEffect(() => {
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  const updateClock = () => {
    const now = new Date();
    setCurrentTime(
      now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    );
  };

  // ================= FETCH STUDENTS =================

  const fetchStudents = async (instId) => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('id, full_name, usn, branch, email')
        .eq('institution_id', instId)
        .order('full_name', { ascending: true });

      if (error) {
        console.error('Fetch Students Error:', error);
        return;
      }

      setStudents(data || []);
    } catch (err) {
      console.error('Fetch Students Exception:', err);
    }
  };

  // ================= FETCH NOTICES =================

  const fetchRecentNotices = async (instId) => {
    try {
      const { data, error } = await supabase
        .from('notices')
        .select(`
          id,
          title,
          description,
          pdf_url,
          created_at,
          student_id,
          institution_id,
          students (
            full_name,
            usn
          )
        `)
        .eq('institution_id', instId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        console.error('Fetch Notices Error:', error);
        return;
      }

      setRecentNotices(data || []);
    } catch (err) {
      console.error('Fetch Notices Exception:', err);
    }
  };

  // ================= FILTERED STUDENTS =================

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const matchesSearch =
        student.full_name
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        student.usn
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase());

      const matchesBranch =
        !selectedBranch || student.branch === selectedBranch;

      return matchesSearch && matchesBranch;
    });
  }, [students, searchTerm, selectedBranch]);

  // ================= SEND NOTICE =================

  const sendNotice = async () => {
    try {
      if (!institutionId) {
        alert('Institution ID missing');
        return;
      }

      if (!title.trim()) {
        alert('Please enter notice title');
        return;
      }

      if (!sendToAll && !selectedStudent) {
        alert('Please select a student');
        return;
      }

      setLoading(true);

      // ===== SEND TO ALL =====

      if (sendToAll) {
        if (filteredStudents.length === 0) {
          alert('No students found');
          return;
        }

        const noticesPayload = filteredStudents.map((student) => ({
          title: title.trim(),
          description: description.trim(),
          pdf_url: pdfUrl || null,
          student_id: student.id,
          institution_id: institutionId,
        }));

        const { error } = await supabase
          .from('notices')
          .insert(noticesPayload);

        if (error) throw error;
      }

      // ===== SEND TO SINGLE =====

      else {
        const { error } = await supabase.from('notices').insert([
          {
            title: title.trim(),
            description: description.trim(),
            pdf_url: pdfUrl || null,
            student_id: selectedStudent,
            institution_id: institutionId,
          },
        ]);

        if (error) throw error;
      }

      alert(
        `Notice sent successfully to ${
          sendToAll ? 'all students' : 'student'
        }`
      );

      // RESET FORM
      setTitle('');
      setDescription('');
      setPdfUrl('');
      setSelectedStudent('');
      setSearchTerm('');
      setSelectedBranch('');
      setSendToAll(false);

      // REFRESH NOTICES
      fetchRecentNotices(institutionId);
    } catch (error) {
      console.error('Send Notice Error:', error);
      alert(error.message || 'Failed to send notice');
    } finally {
      setLoading(false);
    }
  };

  // ================= HELPERS =================

  const handleBack = () => {
    router.back();
  };

  const getSelectedStudentName = () => {
    if (sendToAll) return 'All Students';

    const student = students.find(
      (s) => s.id === selectedStudent
    );

    return student
      ? `${student.full_name} (${student.usn})`
      : '';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';

    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatTimeAgo = (dateString) => {
    if (!dateString) return 'recently';

    const date = new Date(dateString);
    const now = new Date();

    const diffMs = now - date;

    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24)
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7)
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

    return formatDate(dateString);
  };

  const today = new Date();

  const dateStr = today.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // ================= RETURN UI =================

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
              <h1 className="text-lg font-bold text-white sm:text-xl">Student Notices</h1>
              <p className="text-xs text-slate-400">{currentTime}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-slate-400">Total Students</p>
                <p className="text-2xl font-bold text-blue-400 mt-1">{students.length}</p>
              </div>
              <div className="p-2 bg-blue-600 rounded-xl">
                <Users size={18} className="text-white" />
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-slate-400">Recent Notices</p>
                <p className="text-2xl font-bold text-cyan-400 mt-1">{recentNotices.length}</p>
              </div>
              <div className="p-2 bg-cyan-600 rounded-xl">
                <FileText size={18} className="text-white" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Send Notice Form */}
          <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-5">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 bg-blue-600 rounded-xl">
                <Send size={20} className="text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Send New Notice</h2>
                <p className="text-xs text-slate-400">Create and send important announcements</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Send To Options */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Send To</label>
                <div className="grid grid-cols-2 gap-3">
                  <div 
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      sendToAll 
                        ? 'bg-blue-600/10 border-blue-500' 
                        : 'bg-slate-900 border-slate-700 hover:border-slate-600'
                    }`}
                    onClick={() => setSendToAll(true)}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full border-2 ${sendToAll ? 'border-blue-500 bg-blue-500' : 'border-slate-500'}`} />
                      <Users size={16} className={sendToAll ? 'text-blue-400' : 'text-slate-400'} />
                      <span className="text-sm text-white">All Students ({students.length})</span>
                    </div>
                  </div>

                  <div 
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      !sendToAll 
                        ? 'bg-blue-600/10 border-blue-500' 
                        : 'bg-slate-900 border-slate-700 hover:border-slate-600'
                    }`}
                    onClick={() => setSendToAll(false)}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full border-2 ${!sendToAll ? 'border-blue-500 bg-blue-500' : 'border-slate-500'}`} />
                      <Target size={16} className={!sendToAll ? 'text-blue-400' : 'text-slate-400'} />
                      <span className="text-sm text-white">Specific Student</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Student Selection */}
              {!sendToAll && (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search student by name or USN..."
                    className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 text-slate-200 text-sm"
                  />
                  
                  <select
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 text-slate-200 text-sm"
                  >
                    <option value="">All Branches</option>
                    {[...new Set(students.map((s) => s.branch))].map((branch) => (
                      <option key={branch} value={branch}>{branch}</option>
                    ))}
                  </select>

                  <select
                    value={selectedStudent}
                    onChange={(e) => setSelectedStudent(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 text-slate-200 text-sm"
                  >
                    <option value="">-- Choose a student --</option>
                    {filteredStudents.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.full_name} ({student.usn}) - {student.branch}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Notice Title */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Notice Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter notice title..."
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 text-slate-200 text-sm"
                />
              </div>

              {/* Notice Description */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter notice description..."
                  rows={4}
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 text-slate-200 text-sm resize-vertical"
                />
              </div>

              {/* PDF URL */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">PDF URL (Optional)</label>
                <div className="relative">
                  <LinkIcon size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" />
                  <input
                    type="url"
                    value={pdfUrl}
                    onChange={(e) => setPdfUrl(e.target.value)}
                    placeholder="https://example.com/notice.pdf"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 text-slate-200 text-sm"
                  />
                </div>
              </div>

              {/* Preview */}
              {(title || description) && (
                <div className="bg-blue-950/30 rounded-xl border border-blue-800 p-4">
                  <h3 className="text-sm font-semibold text-blue-400 mb-2">Preview</h3>
                  <div className="bg-slate-900 rounded-lg p-3">
                    <p className="font-medium text-white text-sm mb-1">{title || 'No title'}</p>
                    <p className="text-slate-400 text-sm whitespace-pre-wrap mb-2">{description || 'No description'}</p>
                    <div className="inline-flex items-center gap-1 px-2 py-1 bg-slate-800 rounded-full text-xs text-slate-400">
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
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    <span>{sendToAll ? 'Send to All Students' : 'Send Notice'}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-5">
            {/* Recent Notices */}
            <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-5">
              <h3 className="font-semibold text-white mb-4">Recent Notices</h3>
              <div className="space-y-3">
                {recentNotices.length > 0 ? (
                  recentNotices.map((notice) => (
                    <div key={notice.id} className="bg-slate-800 rounded-xl border border-slate-700 p-3 hover:border-blue-500/30 transition-all">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-white text-sm">{notice.title}</h4>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-700 rounded-full text-xs text-slate-300">
                          <Clock size={8} />
                          {formatTimeAgo(notice.created_at)}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mb-2">
                        To: {notice.students?.full_name} ({notice.students?.usn})
                      </div>
                      <div className="text-xs text-slate-500">
                        {formatDate(notice.created_at)}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <Bell size={32} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No notices sent yet</p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Tips */}
            <div className="bg-blue-950/30 rounded-2xl border border-blue-800 p-5">
              <h3 className="font-semibold text-blue-400 mb-3">Tips</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-2 bg-slate-800 rounded-lg text-xs text-slate-300">
                  <Bell size={12} className="text-blue-400" />
                  <span>Use clear and concise titles</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-slate-800 rounded-lg text-xs text-slate-300">
                  <Target size={12} className="text-blue-400" />
                  <span>Select specific students for targeted communication</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-slate-800 rounded-lg text-xs text-slate-300">
                  <FileText size={12} className="text-blue-400" />
                  <span>Attach PDFs for detailed information</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-slate-800 rounded-lg text-xs text-slate-300">
                  <CheckCircle size={12} className="text-blue-400" />
                  <span>Preview before sending to check formatting</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default withAuth(Notices);