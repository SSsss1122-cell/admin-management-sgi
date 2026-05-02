// app/api/whatsapp/student.js

import { supabase } from '@/lib/supabase';

export async function handleStudentCommands(userMessage, cleanNumber) {
  // ALWAYS search by phone number only
  return await getStudentByPhone(cleanNumber);
}
// Add at the TOP of your student.js file

export {
    getStudentMenu,
    getStudentFeeStatus,
    getStudentComplaintStatus
};

// ============================================
// GET STUDENT BY PHONE NUMBER
// ============================================

async function getStudentByPhone(phoneNumber) {
  console.log(`🔍 [Student] Looking up by phone: ${phoneNumber}`);
  
  if (!phoneNumber || phoneNumber.length < 10) {
    // Return null = no reply sent
    return null;
  }
  
  try {
    // Search using 'phone' column
    const { data: students, error } = await supabase
      .from('students')
      .select('*')
      .eq('phone', phoneNumber)
      .limit(1);
    
    if (error) {
      console.error('Database error:', error);
      return null; // No reply
    }
    
    // If not found with full number, try without country code
    if (!students || students.length === 0) {
      const shortNumber = phoneNumber.replace(/^91/, '');
      const { data: students2, error: error2 } = await supabase
        .from('students')
        .select('*')
        .eq('phone', shortNumber)
        .limit(1);
      
      if (!error2 && students2 && students2.length > 0) {
        return formatStudentDetails(students2[0]);
      }
      
      // Number not found - return null (no reply)
      console.log('❌ Phone not registered, no reply sent');
      return null;
    }
    
    // Student found - send details
    return formatStudentDetails(students[0]);
    
  } catch (error) {
    console.error('Error:', error);
    return null; // No reply on error
  }
}

// ============================================
// FORMAT STUDENT DETAILS
// ============================================

function formatStudentDetails(student) {
  let message = `╔════════════════════════════╗
║   🎓 *STUDENT DETAILS*   ║
╚════════════════════════════╝

┌──────── *PERSONAL INFO* ──────┐
│ 👤 *Name:* ${student.full_name || 'N/A'}
│ 📋 *USN:* ${student.usn || 'N/A'}
│ 🔬 *Branch:* ${student.branch || 'N/A'}
`;
  
  if (student.semester) {
    message += `│ 📚 *Semester:* ${student.semester}\n`;
  }
  
  if (student.class) {
    message += `│ 🏫 *Class:* ${student.class}`;
    if (student.division) message += ` - ${student.division}`;
    message += `\n`;
  }
  
  message += `├─────────────────────────────┤
│ 📞 *Phone:* ${student.phone || 'N/A'}
│ 📧 *Email:* ${student.email || 'N/A'}
`;
  
  if (student.routes) {
    message += `│ 🚌 *Route:* ${student.routes}\n`;
  }
  
  message += `├─────────────────────────────┤
│ 💰 *FEE DETAILS*             │
│ 💵 Total Fees: ₹${student.total_fees || 0}
│ ✅ Paid Amount: ₹${student.paid_amount || 0}
│ ⚠️ Due Amount: ₹${student.due_amount || 0}
│ 📊 Status: ${student.fees_due ? '🔴 PENDING' : '🟢 PAID'}
`;
  
  if (student.last_payment_date) {
    message += `│ 📅 Last Payment: ${student.last_payment_date}\n`;
  }
  
  if (student.payment_mode) {
    message += `│ 💳 Payment Mode: ${student.payment_mode}\n`;
  }
  
  if (student.next_payment_date) {
    message += `│ 📆 Next Payment: ${student.next_payment_date}\n`;
  }
  
  message += `└─────────────────────────────┘

💡 *Tip:* Send any message to view your details

📞 *Admin Contact:* 9845926992`;
  
  return message;
}