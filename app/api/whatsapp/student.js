// app/api/whatsapp/student.js

import { supabase } from '@/lib/supabase';

export async function handleStudentCommands(userMessage, cleanNumber) {
  // ALWAYS search by phone number only - no USN or name search
  // This ensures students can only see their OWN details
  return await getStudentByPhone(cleanNumber);
}

// ============================================
// GET STUDENT BY PHONE NUMBER (ONLY METHOD)
// ============================================

async function getStudentByPhone(phoneNumber) {
  console.log(`🔍 [Student] Looking up by phone: ${phoneNumber}`);
  
  const phoneNum = parseInt(phoneNumber);
  
  if (!phoneNum || isNaN(phoneNum)) {
    return `❌ *Phone number not registered*

Your number is not linked to any student account.

Please contact admin to register your number.

📞 *Admin Contact:* 9480072737`;
  }
  
  try {
    // Search by phone_number field (bigint in your schema)
    const { data: students, error } = await supabase
      .from('students')
      .select('*')
      .or(`phone_number.eq.${phoneNum},phone.eq.${phoneNumber}`)
      .limit(1);
    
    if (error) {
      console.error('Phone search error:', error);
      return `❌ *Error finding your details*

Please try again later.

📞 *Admin Contact:* 9480072737`;
    }
    
    if (!students || students.length === 0) {
      return `❌ *No student found with this number*

Your number: ${phoneNumber}

Your phone number is not linked to any student record.

📞 *Admin Contact:* 9480072737`;
    }
    
    return formatStudentDetails(students[0]);
    
  } catch (error) {
    console.error('Error:', error);
    return `❌ *Something went wrong*

📞 *Admin Contact:* 9480072737`;
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
│ 📞 *Phone:* ${student.phone_number || student.phone || 'N/A'}
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

📞 *Admin Contact:* 9480072737`;
  
  return message;
}