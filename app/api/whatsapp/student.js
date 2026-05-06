// app/api/whatsapp/student.js

import { supabase } from '@/lib/supabase';

export async function handleStudentCommands(userMessage, cleanNumber) {
  // ALWAYS search by phone number only
  return await getStudentByPhone(cleanNumber);
}

// ============================================
// GET STUDENT BY PHONE NUMBER
// ============================================

async function getStudentByPhone(phoneNumber) {
  console.log(`🔍 [Student] Looking up by phone: ${phoneNumber}`);
  
  // Validate phone number
  if (!phoneNumber || phoneNumber.length < 10 || typeof phoneNumber !== 'string') {
    console.log('❌ Invalid phone number provided');
    return null;
  }
  
  try {
    // Ensure supabase client is initialized
    if (!supabase) {
      console.error('❌ Supabase client not initialized');
      return null;
    }
    
    // Clean the phone number (remove any non-digit characters)
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    
    // Search using 'phone' column with exact match
    const { data: students, error } = await supabase
      .from('students')
      .select('*')
      .eq('phone', cleanPhone)
      .limit(1);
    
    if (error) {
      console.error('❌ Database error:', error.message);
      return null;
    }
    
    // If not found with full number, try without country code (91)
    if (!students || students.length === 0) {
      const shortNumber = cleanPhone.replace(/^91/, '');
      
      // Only try if short number is different from original
      if (shortNumber !== cleanPhone) {
        const { data: students2, error: error2 } = await supabase
          .from('students')
          .select('*')
          .eq('phone', shortNumber)
          .limit(1);
        
        if (!error2 && students2 && students2.length > 0) {
          console.log('✅ Student found with short number');
          return formatStudentDetails(students2[0]);
        }
      }
      
      // Also try with country code added (if not present)
      if (!cleanPhone.startsWith('91') && cleanPhone.length === 10) {
        const longNumber = `91${cleanPhone}`;
        const { data: students3, error: error3 } = await supabase
          .from('students')
          .select('*')
          .eq('phone', longNumber)
          .limit(1);
        
        if (!error3 && students3 && students3.length > 0) {
          console.log('✅ Student found with country code');
          return formatStudentDetails(students3[0]);
        }
      }
      
      // Number not found - return null (no reply sent)
      console.log('❌ Phone number not registered in database');
      return null;
    }
    
    // Student found - send details
    console.log('✅ Student found successfully');
    return formatStudentDetails(students[0]);
    
  } catch (error) {
    console.error('❌ Unexpected error in getStudentByPhone:', error.message);
    return null;
  }
}

// ============================================
// FORMAT STUDENT DETAILS
// ============================================

function formatStudentDetails(student) {
  // Validate student object
  if (!student || typeof student !== 'object') {
    console.error('❌ Invalid student data provided to formatter');
    return getErrorMessage();
  }
  
  // Safely extract values with defaults
  const fullName = student.full_name || student.name || 'N/A';
  const usn = student.usn || 'N/A';
  const branch = student.branch || 'N/A';
  const semester = student.semester || student.sem || 'N/A';
  const className = student.class || student.class_name || 'N/A';
  const division = student.division || '';
  const phone = student.phone || 'N/A';
  const email = student.email || 'N/A';
  const routes = student.routes || student.route || 'Not Assigned';
  
  // Fee details with proper number handling
  const totalFees = parseFloat(student.total_fees) || 0;
  const paidAmount = parseFloat(student.paid_amount) || 0;
  const dueAmount = parseFloat(student.due_amount) || (totalFees - paidAmount);
  const feesDue = student.fees_due === true || student.fees_due === 'true' || dueAmount > 0;
  
  const lastPaymentDate = student.last_payment_date || student.last_payment || 'N/A';
  const paymentMode = student.payment_mode || student.paymentMethod || 'N/A';
  const nextPaymentDate = student.next_payment_date || student.nextPayment || 'Not Scheduled';
  
  // Build formatted message
  let message = `╔════════════════════════════╗
║   🎓 *STUDENT DETAILS*   ║
╚════════════════════════════╝

┌──────── *PERSONAL INFO* ──────┐
│ 👤 *Name:* ${fullName}
│ 📋 *USN:* ${usn}
│ 🔬 *Branch:* ${branch}
│ 📚 *Semester:* ${semester}
│ 🏫 *Class:* ${className}`;
  
  if (division && division !== 'N/A') {
    message += ` - ${division}`;
  }
  
  message += `
├─────────────────────────────┤
│ 📞 *Phone:* ${phone}
│ 📧 *Email:* ${email}
`;

  if (routes && routes !== 'Not Assigned') {
    message += `│ 🚌 *Route:* ${routes}\n`;
  }
  
  message += `├─────────────────────────────┤
│ 💰 *FEE DETAILS*             │
│ 💵 Total Fees: ₹${totalFees.toLocaleString('en-IN')}
│ ✅ Paid Amount: ₹${paidAmount.toLocaleString('en-IN')}
│ ⚠️ Due Amount: ₹${dueAmount.toLocaleString('en-IN')}
│ 📊 Status: ${feesDue ? '🔴 PENDING' : '🟢 PAID'}
`;

  if (lastPaymentDate !== 'N/A' && lastPaymentDate !== null) {
    message += `│ 📅 Last Payment: ${formatDate(lastPaymentDate)}\n`;
  }
  
  if (paymentMode !== 'N/A' && paymentMode !== null) {
    message += `│ 💳 Payment Mode: ${paymentMode}\n`;
  }
  
  if (nextPaymentDate !== 'Not Scheduled' && nextPaymentDate !== null) {
    message += `│ 📆 Next Payment: ${formatDate(nextPaymentDate)}\n`;
  }
  
  message += `└─────────────────────────────┘

💡 *Tip:* Send any message to view your details

📞 *Admin Contact:* 9845926992`;
  
  return message;
}

// ============================================
// HELPER: FORMAT DATE
// ============================================

function formatDate(dateString) {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch (error) {
    return dateString;
  }
}

// ============================================
// HELPER: ERROR MESSAGE
// ============================================

function getErrorMessage() {
  return `╔════════════════════════════╗
║   ❌ *ERROR*   ║
╚════════════════════════════╝

Unable to retrieve your details at the moment.

Please contact admin:
📞 *9845926992*

Thank you for your patience.`;
}

// ============================================
// EXPORT ADDITIONAL UTILITIES
// ============================================

export async function checkStudentExists(phoneNumber) {
  const result = await getStudentByPhone(phoneNumber);
  return result !== null;
}

export async function getStudentFeesStatus(phoneNumber) {
  const student = await getStudentByPhone(phoneNumber);
  if (!student) return null;
  
  // Extract fee status from formatted message or query directly
  try {
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    const { data, error } = await supabase
      .from('students')
      .select('fees_due, due_amount, total_fees, paid_amount')
      .eq('phone', cleanPhone)
      .limit(1);
    
    if (error || !data || data.length === 0) return null;
    
    return {
      hasDue: data[0].fees_due || data[0].due_amount > 0,
      dueAmount: data[0].due_amount || 0,
      totalFees: data[0].total_fees || 0,
      paidAmount: data[0].paid_amount || 0
    };
  } catch (error) {
    console.error('Error fetching fee status:', error);
    return null;
  }
}