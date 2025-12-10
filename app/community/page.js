'use client';

import React, { useEffect, useState, useRef } from "react";
import { supabase } from "../lib/supabase";
import { 
  MessageCircle, 
  Trash2, 
  Users, 
  Search, 
  Send,
  User,
  Clock,
  Shield,
  Smile,
  Paperclip,
  ArrowLeft // Added back arrow icon
} from "lucide-react";
import { useRouter } from "next/navigation"; // Added for navigation

export default function AdminMessages() {
  const router = useRouter();
  const [messages, setMessages] = useState([]);
  const [filteredMessages, setFilteredMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [adminMessage, setAdminMessage] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  // Fetch all messages with student info
  const fetchMessages = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("community_messages")
        .select(`
          id, 
          message, 
          created_at, 
          student_id,
          students (
            id,
            full_name, 
            usn,
            branch
          )
        `)
        .order("created_at", { ascending: true }); // Changed to ascending for chat view

      if (error) {
        console.error("Error fetching messages:", error);
      } else {
        setMessages(data || []);
      }
    } catch (error) {
      console.error("Exception:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();

    // Real-time subscription for new messages or deleted messages
    const subscription = supabase
      .channel("admin_messages_channel")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "community_messages" },
        async (payload) => {
          // Fetch the complete message with student data
          const { data: newMessage, error } = await supabase
            .from("community_messages")
            .select(`
              id, 
              message, 
              created_at, 
              student_id,
              students (
                id,
                full_name, 
                usn,
                branch
              )
            `)
            .eq("id", payload.new.id)
            .single();

          if (!error && newMessage) {
            setMessages((prev) => [...prev, newMessage]);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "community_messages" },
        (payload) => {
          setMessages((prev) => prev.filter((m) => m.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => supabase.removeChannel(subscription);
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Filter messages based on search
  useEffect(() => {
    let filtered = messages;

    if (searchTerm) {
      filtered = filtered.filter(message =>
        message.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        message.students?.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        message.students?.usn.toLowerCase().includes(searchTerm.toLowerCase()) ||
        message.students?.branch?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredMessages(filtered);
  }, [messages, searchTerm]);

  // Delete a message
  const deleteMessage = async (id) => {
    const confirmed = window.confirm("Are you sure you want to delete this message? This action cannot be undone.");
    if (!confirmed) return;

    setDeletingId(id);
    try {
      const { error } = await supabase
        .from("community_messages")
        .delete()
        .eq("id", id);

      if (error) {
        alert("Error deleting message: " + error.message);
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert("Error deleting message");
    } finally {
      setDeletingId(null);
    }
  };

  // Send message as admin
  const sendAdminMessage = async () => {
    if (!adminMessage.trim()) {
      alert("Please enter a message");
      return;
    }

    setSending(true);
    try {
      // Create a special admin user ID or use a placeholder
      // For now, we'll use a placeholder - in production, you might want to create an admin user
      const adminUserId = '00000000-0000-0000-0000-000000000000'; // Placeholder UUID
      
      const { error } = await supabase
        .from("community_messages")
        .insert([
          {
            student_id: adminUserId,
            message: `[ADMIN]: ${adminMessage.trim()}`,
          },
        ]);

      if (error) {
        console.error("Error sending message:", error);
        alert("Error sending message: " + error.message);
      } else {
        setAdminMessage("");
      }
    } catch (error) {
      console.error("Send error:", error);
      alert("Error sending message");
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendAdminMessage();
    }
  };

  // Handle back navigation
  const handleBack = () => {
    router.back(); // Go back to previous page
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short'
    });
  };

  const isToday = (dateString) => {
    const today = new Date();
    const messageDate = new Date(dateString);
    return today.toDateString() === messageDate.toDateString();
  };

  const getInitials = (name) => {
    if (!name) return 'A'; // A for Admin
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  };

  const getRandomColor = (str, isAdmin = false) => {
    if (isAdmin) return 'bg-red-500'; // Red for admin
    if (!str) return 'bg-gray-500';
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-purple-500', 
      'bg-pink-500', 'bg-indigo-500', 'bg-teal-500',
      'bg-orange-500', 'bg-yellow-500'
    ];
    const index = str.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[index % colors.length];
  };

  const isAdminMessage = (message) => {
    return message.student_id === '00000000-0000-0000-0000-000000000000' || 
           message.message.startsWith('[ADMIN]:');
  };

  const getDisplayName = (message) => {
    if (isAdminMessage(message)) {
      return 'Admin';
    }
    return message.students?.full_name || 'Unknown User';
  };

  const getDisplayMessage = (message) => {
    if (isAdminMessage(message)) {
      return message.message.replace('[ADMIN]:', '').trim();
    }
    return message.message;
  };

  const stats = {
    total: messages.length,
    today: messages.filter(m => {
      const today = new Date();
      const messageDate = new Date(m.created_at);
      return today.toDateString() === messageDate.toDateString();
    }).length,
    uniqueStudents: new Set(messages.map(m => m.students?.id).filter(id => id)).size
  };

  const displayMessages = searchTerm ? filteredMessages : messages;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Chat Area */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200">
              {/* Chat Header */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {/* Back Button */}
                    <button
                      onClick={handleBack}
                      className="bg-white/20 p-2 rounded-lg hover:bg-white/30 transition-colors duration-200 text-white"
                      title="Go back"
                    >
                      <ArrowLeft size={20} />
                    </button>
                    <div className="bg-white/20 p-2 rounded-lg">
                      <Shield className="text-white" size={24} />
                    </div>
                    <div>
                      <h1 className="text-xl font-bold text-white">Admin Chat Monitor</h1>
                      <p className="text-blue-100 text-sm">
                        {loading ? "Loading..." : `${displayMessages.length} messages • ${stats.uniqueStudents} students`}
                      </p>
                    </div>
                  </div>
                  
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-200" size={16} />
                    <input
                      type="text"
                      placeholder="Search messages..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 bg-white/20 text-white placeholder-blue-200 rounded-lg border border-white/30 focus:ring-2 focus:ring-white focus:border-white transition-all duration-200 w-48"
                    />
                  </div>
                </div>
              </div>

              {/* Messages Container */}
              <div className="h-[500px] overflow-y-auto p-4 bg-gray-50">
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="mt-2 text-gray-600 text-sm">Loading messages...</p>
                    </div>
                  </div>
                ) : displayMessages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <MessageCircle className="mx-auto text-gray-300 mb-2" size={48} />
                      <h3 className="text-lg font-semibold text-gray-600">
                        {searchTerm ? 'No messages found' : 'No messages yet'}
                      </h3>
                      <p className="text-gray-500 text-sm">
                        {searchTerm 
                          ? 'Try adjusting your search criteria'
                          : 'When students start chatting, messages will appear here'
                        }
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {displayMessages.map((message, index) => {
                      const isAdmin = isAdminMessage(message);
                      const isOwnMessage = isAdmin; // Admin's own messages
                      const showDate = index === 0 || 
                        !isToday(displayMessages[index - 1]?.created_at) && 
                        isToday(message.created_at);

                      return (
                        <div key={message.id}>
                          {/* Date Separator */}
                          {showDate && (
                            <div className="flex items-center justify-center my-6">
                              <div className="bg-gray-200 px-3 py-1 rounded-full text-xs text-gray-600">
                                {isToday(message.created_at) ? 'Today' : formatDate(message.created_at)}
                              </div>
                            </div>
                          )}

                          {/* Message */}
                          <div className={`flex items-start space-x-3 ${isOwnMessage ? 'flex-row-reverse space-x-reverse' : ''}`}>
                            {/* Avatar */}
                            <div className={`flex-shrink-0 w-8 h-8 rounded-full ${getRandomColor(message.students?.full_name, isAdmin)} flex items-center justify-center text-white text-xs font-bold`}>
                              {getInitials(getDisplayName(message))}
                            </div>

                            {/* Message Content */}
                            <div className={`flex-1 max-w-[70%] ${isOwnMessage ? 'text-right' : ''}`}>
                              <div className={`inline-block px-4 py-2 rounded-2xl ${
                                isAdmin 
                                  ? 'bg-red-600 text-white rounded-br-none' 
                                  : isOwnMessage 
                                    ? 'bg-blue-600 text-white rounded-br-none'
                                    : 'bg-white text-gray-900 border border-gray-200 rounded-bl-none'
                              }`}>
                                <p className="text-sm whitespace-pre-wrap">{getDisplayMessage(message)}</p>
                              </div>
                              
                              {/* Message Info */}
                              <div className={`flex items-center space-x-2 mt-1 text-xs text-gray-500 ${isOwnMessage ? 'justify-end' : ''}`}>
                                <span className={`font-medium ${isAdmin ? 'text-red-600' : ''}`}>
                                  {getDisplayName(message)}
                                  {isAdmin && " 👑"}
                                </span>
                                <span>•</span>
                                <span>{formatTime(message.created_at)}</span>
                                {!isAdmin && message.students?.usn && (
                                  <>
                                    <span>•</span>
                                    <span className="text-gray-400">{message.students.usn}</span>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Delete Button (for non-admin messages) */}
                            {!isAdmin && (
                              <button
                                onClick={() => deleteMessage(message.id)}
                                disabled={deletingId === message.id}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Delete message"
                              >
                                {deletingId === message.id ? (
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                                ) : (
                                  <Trash2 size={16} />
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Admin Message Input */}
              <div className="border-t border-gray-200 p-4 bg-white">
                <div className="flex space-x-3">
                  <div className="flex-1">
                    <textarea
                      value={adminMessage}
                      onChange={(e) => setAdminMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Type your message as Admin... (Press Enter to send)"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white text-gray-900 placeholder-gray-500 resize-none transition-all duration-200"
                      rows={2}
                      disabled={sending}
                    />
                  </div>
                  <button
                    onClick={sendAdminMessage}
                    disabled={!adminMessage.trim() || sending}
                    className="bg-red-600 text-white px-6 py-3 rounded-xl hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {sending ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : (
                      <Send size={20} />
                    )}
                  </button>
                </div>
                
                {/* Quick Actions */}
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center space-x-2">
                    <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                      <Smile size={18} />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                      <Paperclip size={18} />
                    </button>
                  </div>
                  <div className="text-xs text-gray-500">
                    Admin Mode • {adminMessage.length}/1000
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <MessageCircle size={20} className="mr-2 text-blue-600" />
                Chat Statistics
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Total Messages</span>
                  <span className="font-semibold text-gray-900">{stats.total}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Today</span>
                  <span className="font-semibold text-green-600">{stats.today}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Active Students</span>
                  <span className="font-semibold text-purple-600">{stats.uniqueStudents}</span>
                </div>
              </div>
            </div>

            {/* Active Students */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Users size={20} className="mr-2 text-green-600" />
                Active Students
              </h3>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {Array.from(new Set(messages.map(m => m.students?.id).filter(id => id)))
                  .map((studentId) => {
                    const studentMsg = messages.find(m => m.students?.id === studentId);
                    if (!studentMsg?.students) return null;
                    
                    return (
                      <div key={studentId} className="flex items-center space-x-3">
                        <div className="relative">
                          <div className={`w-8 h-8 rounded-full ${getRandomColor(studentMsg.students.full_name)} flex items-center justify-center text-white text-xs font-bold`}>
                            {getInitials(studentMsg.students.full_name)}
                          </div>
                          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {studentMsg.students.full_name}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {studentMsg.students.branch || 'No branch'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                {stats.uniqueStudents === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No active students
                  </p>
                )}
              </div>
            </div>

            {/* Admin Guidelines */}
            <div className="bg-red-50 rounded-2xl p-6 border border-red-200">
              <h3 className="text-lg font-semibold text-red-900 mb-3 flex items-center">
                <Shield size={20} className="mr-2" />
                Admin Controls
              </h3>
              <ul className="space-y-2 text-sm text-red-800">
                <li className="flex items-start">
                  <div className="bg-red-200 rounded-full p-1 mr-2 mt-0.5">
                    <MessageCircle size={12} className="text-red-700" />
                  </div>
                  Send messages as Admin (red bubbles)
                </li>
                <li className="flex items-start">
                  <div className="bg-red-200 rounded-full p-1 mr-2 mt-0.5">
                    <Trash2 size={12} className="text-red-700" />
                  </div>
                  Delete inappropriate messages
                </li>
                <li className="flex items-start">
                  <div className="bg-red-200 rounded-full p-1 mr-2 mt-0.5">
                    <Search size={12} className="text-red-700" />
                  </div>
                  Search through all messages
                </li>
                <li className="flex items-start">
                  <div className="bg-red-200 rounded-full p-1 mr-2 mt-0.5">
                    <Users size={12} className="text-red-700" />
                  </div>
                  Monitor student activity
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}