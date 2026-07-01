// app/announcements/page.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Megaphone, RefreshCw, AlertCircle, 
  ArrowLeft, Eye, ChevronDown, ChevronUp,
  CheckCircle, XCircle, Clock, FileText,
  Send, Edit, X, Users, User, Search,
  Loader2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getAdminInstitution } from '../lib/getInstitution';
import withAuth from '../../components/withAuth';

function Announcements() {
  const router = useRouter();
  
  // State
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [adminData, setAdminData] = useState(null);
  const [students, setStudents] = useState([]);
  
  // Send modal states
  const [showSendModal, setShowSendModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [variableValues, setVariableValues] = useState({});
  const [recipientType, setRecipientType] = useState('all');
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [sending, setSending] = useState(false);
  const [sendStatus, setSendStatus] = useState(null);
  const [sendProgress, setSendProgress] = useState({ current: 0, total: 0 });
  const [studentSearch, setStudentSearch] = useState('');
  const [selectAll, setSelectAll] = useState(false);

  // Get environment variables
  const PHONE_NUMBER_ID = process.env.NEXT_PUBLIC_WHATSAPP_PHONE_ID || '';
  const API_KEY = process.env.NEXT_PUBLIC_VIRALBOOST_API_KEY || '';

  useEffect(() => {
    initializePage();
  }, []);

  // Initialize page
  const initializePage = async () => {
    try {
      const admin = await getAdminInstitution();
      console.log('Admin data:', admin);
      
      if (!admin) {
        setError('Admin institution not found');
        setLoading(false);
        return;
      }
      setAdminData(admin);
      
      // Fetch students first
      await fetchStudents(admin.institution_id);
      
      // Then fetch templates
      await fetchTemplates();
    } catch (err) {
      console.error('Initialization error:', err);
      setError('Failed to initialize page');
      setLoading(false);
    }
  };

  // Fetch students
  const fetchStudents = async (institutionId) => {
    try {
      console.log('Fetching students for institution:', institutionId);
      
      const { data, error } = await supabase
        .from('students_new')
        .select('id, full_name, usn, branch, phone, email')
        .eq('institution_id', institutionId)
        .neq('phone', null)
        .neq('phone', '');

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      console.log('✅ Students loaded:', data?.length || 0);
      setStudents(data || []);
      
    } catch (error) {
      console.error('Error fetching students:', error);
      setError('Failed to fetch students: ' + error.message);
    }
  };

  // Fetch templates
  const fetchTemplates = async () => {
    if (!PHONE_NUMBER_ID) {
      setError('WhatsApp phone number ID not configured');
      setLoading(false);
      return;
    }

    if (!API_KEY) {
      setError('ViralBoost API key not configured');
      setLoading(false);
      return;
    }

    setRefreshing(true);
    setError('');

    try {
      const url = `https://app.viralboostup.in/api/v2/whatsapp-business/templates/${PHONE_NUMBER_ID}`;
      console.log('Fetching templates from:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        }
      });

      const responseText = await response.text();
      console.log('Raw response:', responseText);
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse JSON:', e);
        throw new Error('Server returned invalid response');
      }

      if (!response.ok) {
        const errorMsg = data?.error || data?.message || data?.detail || response.statusText;
        throw new Error(`API Error (${response.status}): ${errorMsg}`);
      }

      let allTemplates = [];
      if (Array.isArray(data)) {
        allTemplates = data;
      } else if (data.data && Array.isArray(data.data)) {
        allTemplates = data.data;
      } else if (data.templates && Array.isArray(data.templates)) {
        allTemplates = data.templates;
      }

      console.log('Templates found:', allTemplates.length);
      console.log('First template:', allTemplates[0]);

      // Process templates - extract body and variables
      const processedTemplates = allTemplates.map(template => {
        console.log('Processing template:', template.name);
        console.log('Template data:', template);
        
        // Extract body
        let body = '';
        if (template.body) {
          body = template.body;
        } else if (template.text) {
          body = template.text;
        } else if (template.content) {
          body = template.content;
        } else if (template.template_body) {
          body = template.template_body;
        } else if (template.components) {
          const bodyComponent = template.components.find(c => c.type === 'BODY');
          if (bodyComponent) {
            body = bodyComponent.text || bodyComponent.content || '';
          }
        } else if (template.body_text) {
          body = template.body_text;
        }
        
        // Extract variables from template.variables or from components
        let variables = [];
        if (template.variables && Array.isArray(template.variables) && template.variables.length > 0) {
          variables = template.variables;
        } else if (template.components) {
          const bodyComponent = template.components.find(c => c.type === 'BODY');
          if (bodyComponent && bodyComponent.example && bodyComponent.example.body_text) {
            const example = bodyComponent.example.body_text;
            if (Array.isArray(example)) {
              // Extract variable names from example
              variables = example.map((_, i) => `variable_${i + 1}`);
            }
          }
        }
        
        // If no variables found, check body for placeholders
        if (variables.length === 0 && body) {
          const matches = body.match(/\{\{(\d+)\}\}/g);
          if (matches) {
            const maxPlaceholder = Math.max(...matches.map(m => parseInt(m.match(/\d+/)[0])));
            variables = Array.from({ length: maxPlaceholder }, (_, i) => `variable_${i + 1}`);
          }
        }
        
        console.log('Extracted body:', body);
        console.log('Extracted variables:', variables);
        
        return {
          ...template,
          body: body || 'No body content',
          variables: variables
        };
      });

      setTemplates(processedTemplates);
      
    } catch (error) {
      console.error('Error fetching templates:', error);
      setError(error.message || 'Failed to fetch templates');
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  // Open send modal
  const openSendModal = (template) => {
    console.log('Opening modal for template:', template);
    console.log('Template variables:', template.variables);
    console.log('Students available:', students.length);
    
    if (template.status?.toUpperCase() !== 'APPROVED') {
      setError('This template is not approved yet.');
      return;
    }

    setSelectedTemplate(template);
    
    // Initialize variables with empty values - IMPORTANT: Use all variables
    const initialValues = {};
    if (template.variables && template.variables.length > 0) {
      template.variables.forEach(v => {
        initialValues[v] = '';
      });
    }
    console.log('Initial variables:', initialValues);
    setVariableValues(initialValues);
    
    setSelectedStudents([]);
    setSelectAll(false);
    setSendStatus(null);
    setShowSendModal(true);
  };

  // Handle variable changes
  const handleVariableChange = (key, value) => {
    console.log('Variable changed:', key, value);
    setVariableValues(prev => {
      const newValues = { ...prev, [key]: value };
      console.log('New variable values:', newValues);
      return newValues;
    });
  };

  // Toggle student selection
  const toggleStudent = (studentId) => {
    setSelectedStudents(prev => {
      if (prev.includes(studentId)) {
        return prev.filter(id => id !== studentId);
      } else {
        return [...prev, studentId];
      }
    });
  };

  // Select all students
  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedStudents([]);
    } else {
      const filtered = getFilteredStudents();
      setSelectedStudents(filtered.map(s => s.id));
    }
    setSelectAll(!selectAll);
  };

  // Get filtered students
  const getFilteredStudents = () => {
    let filtered = students;
    if (studentSearch) {
      filtered = filtered.filter(s => 
        s.full_name?.toLowerCase().includes(studentSearch.toLowerCase()) ||
        s.usn?.toLowerCase().includes(studentSearch.toLowerCase()) ||
        s.phone?.includes(studentSearch)
      );
    }
    return filtered;
  };

  // Get recipients
  const getRecipients = () => {
    if (recipientType === 'all') {
      return students;
    } else {
      return students.filter(s => selectedStudents.includes(s.id));
    }
  };

  // Generate preview - FIXED to properly replace all variables
  const generatePreview = () => {
    if (!selectedTemplate) return 'No template selected';
    let preview = selectedTemplate.body || '';
    const vars = selectedTemplate.variables || [];
    console.log('Generating preview with vars:', vars);
    console.log('Current variable values:', variableValues);
    
    // Replace each variable placeholder
    vars.forEach((v, i) => {
      const regex = new RegExp(`{{${i + 1}}}`, 'g');
      const value = variableValues[v] || `[${v}]`;
      preview = preview.replace(regex, value);
    });
    
    console.log('Generated preview:', preview);
    return preview;
  };

  // Send messages - FIXED with better error handling
  const sendWhatsAppMessages = async () => {
    const recipients = getRecipients();
    if (recipients.length === 0) {
      alert('No recipients found!');
      return;
    }

    const vars = selectedTemplate.variables || [];
    const emptyVars = vars.filter(v => !variableValues[v] || variableValues[v].trim() === '');
    if (emptyVars.length > 0) {
      alert(`Please fill all variables: ${emptyVars.join(', ')}`);
      return;
    }

    if (!PHONE_NUMBER_ID) {
      alert('WhatsApp phone number ID not configured');
      return;
    }

    if (!API_KEY) {
      alert('ViralBoost API key not configured');
      return;
    }

    setSending(true);
    setSendStatus(null);
    setSendProgress({ current: 0, total: recipients.length });

    try {
      let successCount = 0;
      let failedCount = 0;
      const results = [];

      const BATCH_SIZE = 10;
      for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
        const batch = recipients.slice(i, i + BATCH_SIZE);
        const batchPromises = batch.map(async (student) => {
          try {
            // Prepare body parameters
            const bodyParams = selectedTemplate.variables.map(v => {
              if (v === 'student_name') return student.full_name;
              if (v === 'usn') return student.usn || '';
              if (v === 'branch') return student.branch || '';
              if (v === 'phone') return student.phone || '';
              if (v === 'email') return student.email || '';
              return variableValues[v] || '';
            });

            const payload = {
              to: student.phone,
              phoneNoId: PHONE_NUMBER_ID,
              type: "template",
              name: selectedTemplate.name,
              language: selectedTemplate.language || "en_US",
              bodyParams: bodyParams
            };

            console.log(`📤 Sending to ${student.full_name}:`, payload);

            const response = await fetch('https://app.viralboostup.in/api/v2/whatsapp-business/messages', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
              },
              body: JSON.stringify(payload)
            });

            const data = await response.json();
            console.log(`📥 Response for ${student.full_name}:`, data);

            if (!response.ok) {
              throw new Error(data.error || data.message || 'Failed to send');
            }

            return {
              student,
              success: true,
              error: null
            };
          } catch (error) {
            console.error(`❌ Failed to send to ${student.full_name}:`, error.message);
            return {
              student,
              success: false,
              error: error.message
            };
          }
        });

        const batchResults = await Promise.all(batchPromises);
        
        batchResults.forEach(result => {
          if (result.success) {
            successCount++;
            results.push({ name: result.student.full_name, status: 'sent' });
          } else {
            failedCount++;
            results.push({ name: result.student.full_name, status: 'failed', error: result.error });
          }
        });

        setSendProgress({ 
          current: Math.min(i + BATCH_SIZE, recipients.length), 
          total: recipients.length 
        });
        
        if (i + BATCH_SIZE < recipients.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      setSendStatus({ 
        success: successCount, 
        failed: failedCount, 
        total: recipients.length, 
        results 
      });
    } catch (error) {
      console.error('Error sending messages:', error);
      setSendStatus({ 
        success: 0, 
        failed: recipients.length, 
        total: recipients.length, 
        error: error.message 
      });
    } finally {
      setSending(false);
    }
  };

  // Get status color
  const getStatusColor = (status) => {
    const map = {
      'APPROVED': 'text-emerald-400 bg-emerald-950/30 border-emerald-800',
      'PENDING': 'text-amber-400 bg-amber-950/30 border-amber-800',
      'REJECTED': 'text-red-400 bg-red-950/30 border-red-800',
      'PAUSED': 'text-slate-400 bg-slate-950/30 border-slate-800',
      'DISABLED': 'text-slate-400 bg-slate-950/30 border-slate-800'
    };
    return map[status?.toUpperCase()] || map.PENDING;
  };

  const getStatusIcon = (status) => {
    const map = {
      'APPROVED': <CheckCircle size={16} className="text-emerald-400" />,
      'PENDING': <Clock size={16} className="text-amber-400" />,
      'REJECTED': <XCircle size={16} className="text-red-400" />,
      'PAUSED': <Clock size={16} className="text-slate-400" />,
      'DISABLED': <XCircle size={16} className="text-slate-400" />
    };
    return map[status?.toUpperCase()] || map.PENDING;
  };

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleBack = () => router.back();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-700 border-t-blue-600 mx-auto"></div>
          <p className="text-blue-400 mt-4">Loading templates...</p>
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
              className="p-2 text-slate-400 hover:text-blue-400 rounded-xl hover:bg-slate-800 border border-slate-700 transition-colors"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-lg font-bold text-white sm:text-xl">📱 WhatsApp Templates</h1>
              <p className="text-xs text-slate-400">{templates.length} templates • {students.length} students</p>
            </div>
          </div>
          <button
            onClick={fetchTemplates}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-300 hover:text-blue-400 hover:border-blue-500 transition-all text-sm disabled:opacity-50"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {error && (
          <div className="mb-6 p-4 bg-red-950/50 border border-red-800 rounded-xl text-red-400 flex items-center gap-3">
            <AlertCircle size={20} />
            <span>{error}</span>
            <button onClick={() => setError('')} className="ml-auto text-blue-400 hover:text-blue-300 text-sm">Dismiss</button>
          </div>
        )}

        {templates.length === 0 ? (
          <div className="text-center py-12 bg-slate-800/50 rounded-2xl border border-slate-700">
            <Megaphone size={48} className="mx-auto text-slate-600 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No Templates Found</h3>
            <p className="text-slate-400 mb-4">Create templates in ViralBoostup dashboard first.</p>
            <button onClick={fetchTemplates} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <RefreshCw size={16} className="inline mr-2" /> Refresh
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {templates.map((template) => (
              <div key={template.id} className="bg-slate-800/50 rounded-2xl border border-slate-700 overflow-hidden hover:border-blue-500/30 transition-all">
                {/* Header */}
                <div className="p-5 cursor-pointer hover:bg-slate-800/30 transition-colors" onClick={() => toggleExpand(template.id)}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full border flex items-center gap-1 ${getStatusColor(template.status)}`}>
                          {getStatusIcon(template.status)} {template.status || 'PENDING'}
                        </span>
                        <span className="text-xs text-slate-500 px-2 py-0.5 bg-slate-700/50 rounded-full">{template.language || 'en'}</span>
                        {template.variables && template.variables.length > 0 && (
                          <span className="text-xs bg-blue-950/30 text-blue-400 px-2 py-0.5 rounded-full border border-blue-800">
                            {template.variables.length} vars
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold text-white text-base">{template.name}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); openSendModal(template); }}
                        disabled={template.status?.toUpperCase() !== 'APPROVED'}
                        className={`px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 transition-colors ${
                          template.status?.toUpperCase() === 'APPROVED'
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        <Send size={14} /> Send
                      </button>
                      <button className="p-1 text-slate-400 hover:text-slate-300 transition-colors">
                        {expandedId === template.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 bg-slate-900/30 rounded-lg p-2">
                    <p className="text-xs text-slate-400 line-clamp-2">{template.body}</p>
                  </div>
                </div>

                {/* Expanded Content */}
                {expandedId === template.id && (
                  <div className="px-5 pb-5 pt-0 border-t border-slate-700/50">
                    <div className="mt-4 space-y-4">
                      <div>
                        <h4 className="text-xs font-medium text-slate-400 mb-2 flex items-center gap-2">
                          <FileText size={14} /> Full Template Body
                        </h4>
                        <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700">
                          <p className="text-sm text-slate-200 whitespace-pre-wrap font-mono">{template.body}</p>
                        </div>
                      </div>

                      {template.variables && template.variables.length > 0 && (
                        <div>
                          <h4 className="text-xs font-medium text-slate-400 mb-2 flex items-center gap-2">
                            <Edit size={14} /> Variables
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {template.variables.map((v, i) => (
                              <span key={i} className="text-xs bg-blue-950/30 text-blue-400 px-3 py-1.5 rounded-full border border-blue-800/50">
                                {`{{${i + 1}}}`} {v}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="bg-slate-900/30 rounded-lg p-2">
                          <span className="text-slate-500">ID:</span>
                          <span className="ml-2 text-slate-300 font-mono">{template.id}</span>
                        </div>
                        {template.category && (
                          <div className="bg-slate-900/30 rounded-lg p-2">
                            <span className="text-slate-500">Category:</span>
                            <span className="ml-2 text-slate-300">{template.category}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Send Modal */}
      {showSendModal && selectedTemplate && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-slate-800 border-b border-slate-700 px-6 py-4 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-white">Send Template</h3>
                <p className="text-xs text-slate-400">{selectedTemplate.name}</p>
              </div>
              <button onClick={() => setShowSendModal(false)} className="p-2 text-slate-400 hover:text-slate-300 hover:bg-slate-700 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Variables - FIXED to show all variables */}
              <div>
                <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                  <Edit size={16} className="text-blue-400" /> Fill Variables
                </h4>
                {selectedTemplate.variables && selectedTemplate.variables.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {selectedTemplate.variables.map((v, i) => (
                      <div key={i}>
                        <label className="block text-xs text-slate-400 mb-1">
                          {`{{${i + 1}}}`} {v}
                          {['student_name', 'usn', 'branch', 'phone', 'email'].includes(v) && (
                            <span className="ml-1 text-blue-400 text-xs">(auto)</span>
                          )}
                        </label>
                        <input
                          type="text"
                          value={variableValues[v] || ''}
                          onChange={(e) => handleVariableChange(v, e.target.value)}
                          disabled={['student_name', 'usn', 'branch', 'phone', 'email'].includes(v)}
                          className={`w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 text-slate-200 text-sm ${
                            ['student_name', 'usn', 'branch', 'phone', 'email'].includes(v) 
                              ? 'opacity-50 cursor-not-allowed' 
                              : ''
                          }`}
                          placeholder={['student_name', 'usn', 'branch', 'phone', 'email'].includes(v) 
                            ? 'Auto-filled from student data' 
                            : `Enter ${v}`
                          }
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">No variables in this template</p>
                )}
              </div>

              {/* Recipients */}
              <div>
                <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                  <Users size={16} className="text-blue-400" /> Select Recipients
                </h4>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <button
                    onClick={() => setRecipientType('all')}
                    className={`p-2 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${
                      recipientType === 'all'
                        ? 'border-blue-500 bg-blue-950/30 text-blue-400'
                        : 'border-slate-700 bg-slate-900/50 text-slate-400'
                    }`}
                  >
                    <Users size={16} /> All Students ({students.length})
                  </button>
                  <button
                    onClick={() => setRecipientType('individual')}
                    className={`p-2 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${
                      recipientType === 'individual'
                        ? 'border-blue-500 bg-blue-950/30 text-blue-400'
                        : 'border-slate-700 bg-slate-900/50 text-slate-400'
                    }`}
                  >
                    <User size={16} /> Individual ({selectedStudents.length})
                  </button>
                </div>

                {recipientType === 'individual' && (
                  <>
                    <div className="relative mb-3">
                      <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={studentSearch}
                        onChange={(e) => setStudentSearch(e.target.value)}
                        placeholder="Search students by name, USN, or phone..."
                        className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 text-slate-200 text-sm"
                      />
                    </div>
                    <div className="bg-slate-900/50 rounded-xl border border-slate-700 max-h-48 overflow-y-auto">
                      {students.length === 0 ? (
                        <p className="p-4 text-center text-slate-400 text-sm">No students found</p>
                      ) : (
                        <table className="w-full text-sm">
                          <thead className="bg-slate-800/50 sticky top-0">
                            <tr>
                              <th className="px-3 py-2 w-8">
                                <input 
                                  type="checkbox" 
                                  checked={selectAll} 
                                  onChange={toggleSelectAll} 
                                  className="rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-blue-500"
                                />
                              </th>
                              <th className="px-3 py-2 text-left text-xs text-slate-400 font-medium">Name</th>
                              <th className="px-3 py-2 text-left text-xs text-slate-400 font-medium hidden md:table-cell">USN</th>
                              <th className="px-3 py-2 text-left text-xs text-slate-400 font-medium hidden sm:table-cell">Phone</th>
                            </tr>
                          </thead>
                          <tbody>
                            {getFilteredStudents().map((s) => (
                              <tr 
                                key={s.id} 
                                className="border-t border-slate-700/50 hover:bg-slate-800/50 cursor-pointer transition-colors"
                                onClick={() => toggleStudent(s.id)}
                              >
                                <td className="px-3 py-2">
                                  <input 
                                    type="checkbox" 
                                    checked={selectedStudents.includes(s.id)} 
                                    onChange={() => toggleStudent(s.id)} 
                                    onClick={(e) => e.stopPropagation()}
                                    className="rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-blue-500"
                                  />
                                </td>
                                <td className="px-3 py-2 text-slate-200">{s.full_name}</td>
                                <td className="px-3 py-2 text-slate-400 hidden md:table-cell">{s.usn || '-'}</td>
                                <td className="px-3 py-2 text-slate-400 hidden sm:table-cell">{s.phone || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Preview - FIXED to show updated preview */}
              <div>
                <h4 className="text-sm font-medium text-white mb-2 flex items-center gap-2">
                  <Eye size={16} className="text-blue-400" /> Preview
                </h4>
                <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700">
                  <p className="text-sm text-slate-200 whitespace-pre-wrap font-mono">{generatePreview()}</p>
                </div>
              </div>

              {/* Status */}
              {sendStatus && (
                <div className={`p-4 rounded-xl ${sendStatus.failed === 0 ? 'bg-emerald-950/30 border border-emerald-800' : 'bg-red-950/30 border border-red-800'}`}>
                  <p className="text-sm font-medium text-white">
                    ✅ Sent: {sendStatus.success} | ❌ Failed: {sendStatus.failed}
                  </p>
                  {sendStatus.error && (
                    <p className="text-xs text-red-400 mt-1">Error: {sendStatus.error}</p>
                  )}
                  {sendStatus.results?.slice(0, 5).map((r, i) => (
                    <div key={i} className="text-xs text-slate-400 mt-1">
                      {r.name}: {r.status === 'sent' ? '✅' : '❌'} {r.error || ''}
                    </div>
                  ))}
                  {sendStatus.results?.length > 5 && (
                    <div className="text-xs text-slate-500 mt-1">+{sendStatus.results.length - 5} more</div>
                  )}
                </div>
              )}

              {/* Progress */}
              {sending && sendProgress.total > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-slate-400">
                    <span>Sending messages...</span>
                    <span>{sendProgress.current} / {sendProgress.total}</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${(sendProgress.current / sendProgress.total) * 100}%` }} 
                    />
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
                <button 
                  onClick={() => setShowSendModal(false)} 
                  className="px-5 py-2.5 text-slate-300 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors disabled:opacity-50"
                  disabled={sending}
                >
                  Cancel
                </button>
                <button
                  onClick={sendWhatsAppMessages}
                  disabled={sending || (recipientType === 'individual' && selectedStudents.length === 0) || students.length === 0}
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Sending...
                    </>
                  ) : (
                    <>
                      <Send size={16} /> 
                      Send to {recipientType === 'all' ? `${students.length} Students` : `${selectedStudents.length} Student${selectedStudents.length > 1 ? 's' : ''}`}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default withAuth(Announcements);