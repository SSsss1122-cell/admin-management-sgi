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

// ============================================
// GET STUDENT MENU (For Voice AI)
// NOTE: No 'export' keyword here - export only at the end
// ============================================

async function getStudentMenu() {
  return `╔════════════════════════════╗
║   🎓 *STUDENT MENU*       ║
╚════════════════════════════╝

┌─────────────────────────┐
│  📚 *AVAILABLE COMMANDS* │
├─────────────────────────┤
│ • My Fees / My Balance  │
│ • Complaints Status      │
│ • New Complaint          │
│ • Bus List              │
│ • Notices               │
└─────────────────────────┘

💡 *Tips:* 
• Send "my fees" to check your fee status
• Send "complaint status" to check complaints
• Send "bus list" to see all buses

📞 For help: Contact Admin`;
}

// ============================================
// GET STUDENT FEE STATUS (For Voice AI)
// NOTE: No 'export' keyword here - export only at the end
// ============================================

async function getStudentFeeStatus(phoneNumber) {
  console.log(`💰 [Student] Fee status for: ${phoneNumber}`);
  
  try {
    const { data: student, error } = await supabase
      .from('students')
      .select('full_name, usn, total_fees, paid_amount, due_amount, fees_due, last_payment_date')
      .eq('phone', phoneNumber)
      .single();
    
    if (error || !student) {
      return "❌ *Student not found*\n\nYour phone number is not registered. Please contact college administration.";
    }
    
    let message = `💰 *YOUR FEE DETAILS*
━━━━━━━━━━━━━━━━━━━━━━

👤 *Name:* ${student.full_name}
📋 *USN:* ${student.usn}

💵 *Total Fees:* ₹${(student.total_fees || 0).toLocaleString()}
✅ *Paid Amount:* ₹${(student.paid_amount || 0).toLocaleString()}
⚠️ *Due Amount:* ₹${(student.due_amount || 0).toLocaleString()}

📊 *Status:* ${student.fees_due ? '🔴 PENDING' : '🟢 PAID'}`;

    if (student.last_payment_date) {
      message += `\n📅 *Last Payment:* ${student.last_payment_date}`;
    }
    
    if (student.due_amount > 0) {
      message += `\n\n💡 Please clear your dues at the accounts section.`;
    } else {
      message += `\n\n✅ Your fees are fully paid!`;
    }
    
    return message;
    
  } catch (error) {
    console.error("Fee status error:", error);
    return "❌ Error fetching fee details. Please try again later.";
  }
}

// ============================================
// GET STUDENT COMPLAINT STATUS (For Voice AI)
// NOTE: No 'export' keyword here - export only at the end
// ============================================

async function getStudentComplaintStatus(phoneNumber) {
  console.log(`📋 [Student] Complaint status for: ${phoneNumber}`);
  
  try {
    // First get student ID
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id')
      .eq('phone', phoneNumber)
      .single();
    
    if (studentError || !student) {
      return "❌ *Student not found*\n\nYour phone number is not registered.";
    }
    
    // Get complaints
    const { data: complaints, error } = await supabase
      .from('complaints')
      .select('title, description, status, created_at')
      .eq('student_id', student.id)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (error) {
      return "❌ Error fetching complaints.";
    }
    
    if (!complaints || complaints.length === 0) {
      return `📋 *COMPLAINT STATUS*\n━━━━━━━━━━━━━━━━━━━━━━\n\n✅ No complaints found.\n\n💡 To register a complaint: COMPLAINT <title>|<description>`;
    }
    
    let message = `📋 *YOUR COMPLAINTS* (${complaints.length})\n━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    complaints.forEach((c, i) => {
      const statusIcon = c.status === 'resolved' ? '✅' : c.status === 'processing' ? '🟡' : '🔴';
      const date = c.created_at ? new Date(c.created_at).toLocaleDateString() : '';
      
      message += `${i+1}. ${statusIcon} *${c.title}*\n`;
      message += `   📝 ${c.description?.substring(0, 50)}${c.description?.length > 50 ? '...' : ''}\n`;
      message += `   📊 Status: ${c.status.toUpperCase()}`;
      if (date) message += ` | 📅 ${date}`;
      message += `\n\n`;
    });
    
    message += `💡 To register new complaint: COMPLAINT <title>|<description>`;
    
    return message;
    
  } catch (error) {
    console.error("Complaint status error:", error);
    return "❌ Error fetching complaints. Please try again later.";
  }
}

// ============================================
// REGISTER COMPLAINT FROM STUDENT (For Voice AI)
// NOTE: No 'export' keyword here - export only at the end
// ============================================

async function registerStudentComplaint(phoneNumber, complaintText) {
  const parts = complaintText.split('|');
  const title = parts[0]?.trim();
  const description = parts[1]?.trim();
  
  if (!title || !description) {
    return `🛠️ *REGISTER COMPLAINT*\n\nFormat: COMPLAINT <title>|<description>\n\nExample: COMPLAINT Bus late|Bus is coming 30 mins late regularly`;
  }
  
  try {
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id')
      .eq('phone', phoneNumber)
      .single();
    
    if (studentError || !student) {
      return "❌ *Student not found*\n\nYour phone number is not registered.";
    }
    
    const { error } = await supabase
      .from('complaints')
      .insert({
        student_id: student.id,
        title: title,
        description: description,
        status: 'pending'
      });
    
    if (error) {
      console.error("Complaint insert error:", error);
      return "❌ *Failed to register complaint*\n\nPlease try again later.";
    }
    
    return `✅ *COMPLAINT REGISTERED*
━━━━━━━━━━━━━━━━━━━━━━

📌 *Title:* ${title}
📝 *Description:* ${description}
📊 *Status:* PENDING
🆔 *Reference ID:* ${Date.now().toString().slice(-6)}

💡 You will be notified when complaint is resolved.`;
    
  } catch (error) {
    console.error("Complaint error:", error);
    return "❌ *Error registering complaint*";
  }
}

// ============================================
// EXPORT ALL FUNCTIONS FOR VOICE AI
// ONLY ONE EXPORT - AT THE END
// ============================================

export {
    getStudentMenu,
    getStudentFeeStatus,
    getStudentComplaintStatus,
    registerStudentComplaint
};