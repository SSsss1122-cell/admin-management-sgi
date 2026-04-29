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
  
  if (!phoneNumber || phoneNumber.length < 10) {
    return `📱 *Phone number not registered*

Your number is not linked to any student account.

📞 *Admin Contact:* 9845926992`;
  }
  
  try {
    // Search using ONLY the 'phone' column (text)
    const { data: students, error } = await supabase
      .from('students')
      .select('*')
      .eq('phone', phoneNumber)
      .limit(1);
    
    // If not found, try without country code
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
    }
    
    if (error) {
      console.error('Database error:', error);
      return `📱 *Phone number not registered*

Your number is not linked to any student account.

📞 *Admin Contact:* 9845926992`;
    }
    
    if (!students || students.length === 0) {
      return `📱 *Phone number not registered*

Your number is not linked to any student account.

📞 *Admin Contact:* 9845926992`;
    }
    
    return formatStudentDetails(students[0]);
    
  } catch (error) {
    console.error('Error:', error);
    return `📱 *Phone number not registered*

Your number is not linked to any student account.

📞 *Admin Contact:* 9845926992`;
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