'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Send, User, Mail, Calendar, Plus, X, Users, FileText, Target, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Notices() {
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [recentNotices, setRecentNotices] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [sendToAll, setSendToAll] = useState(false);

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
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSelectedStudentName = () => {
    if (sendToAll) return "All Students";
    const student = students.find(s => s.id === selectedStudent);
    return student ? `${student.full_name} (${student.usn})` : "";
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Header */}
          <div className="text-center relative">
            {/* Back Button */}
            <button
              onClick={handleBack}
              className="absolute left-0 top-1/2 transform -translate-y-1/2 flex items-center text-gray-600 hover:text-gray-900 transition-colors p-2 rounded-lg hover:bg-white"
              title="Go back"
            >
              <ArrowLeft size={20} />
            </button>
            
            <div className="flex items-center justify-center mb-4">
              <div className="bg-blue-600 p-3 rounded-full">
                <Bell className="text-white" size={32} />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Student Notices</h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Send important announcements, updates, and notifications to students
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Send Notice Form */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 border border-gray-200">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Send New Notice</h2>
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <Send className="text-blue-600" size={24} />
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Send To Options */}
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Send To
                    </label>
                    <div className="space-y-3">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          checked={sendToAll}
                          onChange={() => setSendToAll(true)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                        />
                        <span className="ml-2 text-sm text-gray-700 flex items-center">
                          <Users size={16} className="mr-2" />
                          Send to All Students ({students.length} students)
                        </span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          checked={!sendToAll}
                          onChange={() => setSendToAll(false)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                        />
                        <span className="ml-2 text-sm text-gray-700 flex items-center">
                          <Target size={16} className="mr-2" />
                          Send to Specific Student
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Student Selection */}
                  {!sendToAll && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Student
                      </label>
                      <select
                        value={selectedStudent}
                        onChange={(e) => setSelectedStudent(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 transition-all duration-200"
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notice Title *
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Enter notice title..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 placeholder-gray-500 transition-all duration-200"
                    />
                  </div>

                  {/* Notice Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description *
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Enter notice description..."
                      rows={4}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 placeholder-gray-500 resize-none transition-all duration-200"
                    />
                  </div>

                  {/* PDF URL */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      PDF URL (Optional)
                    </label>
                    <input
                      type="url"
                      value={pdfUrl}
                      onChange={(e) => setPdfUrl(e.target.value)}
                      placeholder="https://example.com/notice.pdf"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 placeholder-gray-500 transition-all duration-200"
                    />
                  </div>

                  {/* Send Button */}
                  <button
                    onClick={sendNotice}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 px-6 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center"
                  >
                    {loading ? (
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                    ) : (
                      <>
                        <Send size={20} className="mr-2" />
                        {sendToAll ? `Send to All Students` : 'Send Notice'}
                      </>
                    )}
                  </button>

                  {/* Preview */}
                  {(title || description) && (
                    <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                      <h3 className="text-sm font-medium text-blue-900 mb-2">Preview</h3>
                      <div className="text-sm text-blue-800">
                        <p className="font-semibold">{title || 'No title'}</p>
                        <p className="mt-1 whitespace-pre-line">{description || 'No description'}</p>
                        <p className="mt-2 text-blue-600 text-xs">
                          To: {getSelectedStudentName()}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Recent Notices & Stats */}
            <div className="space-y-6">
              {/* Stats Card */}
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Total Students</span>
                    <span className="font-semibold text-gray-900">{students.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Recent Notices</span>
                    <span className="font-semibold text-gray-900">{recentNotices.length}</span>
                  </div>
                </div>
              </div>

              {/* Recent Notices */}
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Notices</h3>
                <div className="space-y-4">
                  {recentNotices.map((notice) => (
                    <div key={notice.id} className="border-l-4 border-blue-500 pl-4 py-2">
                      <p className="font-medium text-gray-900 text-sm">{notice.title}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        To: {notice.students?.full_name} ({notice.students?.usn})
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatDate(notice.created_at)}
                      </p>
                    </div>
                  ))}
                  {recentNotices.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No notices sent yet
                    </p>
                  )}
                </div>
              </div>

              {/* Quick Tips */}
              <div className="bg-blue-50 rounded-2xl p-6 border border-blue-200">
                <h3 className="text-lg font-semibold text-blue-900 mb-3">Tips</h3>
                <ul className="space-y-2 text-sm text-blue-800">
                  <li className="flex items-start">
                    <div className="bg-blue-200 rounded-full p-1 mr-2 mt-0.5">
                      <Bell size={12} className="text-blue-700" />
                    </div>
                    Use clear and concise titles
                  </li>
                  <li className="flex items-start">
                    <div className="bg-blue-200 rounded-full p-1 mr-2 mt-0.5">
                      <User size={12} className="text-blue-700" />
                    </div>
                    Select specific students for targeted communication
                  </li>
                  <li className="flex items-start">
                    <div className="bg-blue-200 rounded-full p-1 mr-2 mt-0.5">
                      <FileText size={12} className="text-blue-700" />
                    </div>
                    Attach PDFs for detailed information
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}