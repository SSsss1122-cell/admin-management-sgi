// app/api/student-whatsapp/route.js

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request) {
  try {
    // Check if supabaseAdmin is available
    if (!supabaseAdmin) {
      console.error('Supabase admin client is not initialized');
      return NextResponse.json({ 
        success: false, 
        error: 'Database connection not available. Check your environment variables.' 
      }, { status: 500 });
    }

    const payload = await request.json();
    const eventData = payload.data;
    
    let senderNumber = null;
    let userMessage = null;
    
    if (eventData) {
      senderNumber = eventData.senderPhoneNumber;
      userMessage = eventData.content?.text?.trim();
    }
    
    console.log(`📱 Sender: ${senderNumber}`);
    console.log(`💬 Message: ${userMessage}`);
    
    if (!senderNumber || !userMessage) {
      return NextResponse.json({ success: true });
    }
    
    // Clean the phone number
    let cleanNumber = senderNumber.toString();
    if (cleanNumber.startsWith('+91')) {
      cleanNumber = cleanNumber.substring(3);
    } else if (cleanNumber.startsWith('91')) {
      cleanNumber = cleanNumber.substring(2);
    }
    
    console.log(`🧹 Clean Number: ${cleanNumber}`);
    
    const upperMsg = userMessage.toUpperCase();
    let replyMessage = '';
    
    // Help/Menu command
    if (upperMsg === 'HELP' || upperMsg === 'MENU' || upperMsg === 'START' || upperMsg === 'HI' || upperMsg === 'HELLO') {
      replyMessage = getStudentMenu();
    }
    // Search commands
    else if (upperMsg.match(/^(SEARCH|FIND|DETAILS|INFO|MY|CHECK)\b/i) || /^[A-Z0-9]{5,15}$/i.test(userMessage)) {
      let query = userMessage;
      const commandMatch = userMessage.match(/^(SEARCH|FIND|DETAILS|INFO|MY|CHECK)\s+(.+)/i);
      if (commandMatch) {
        query = commandMatch[2];
      }
      replyMessage = await searchStudentDetails(query, cleanNumber);
    }
    // Default response
    else {
      if (userMessage.length >= 3 && userMessage.length <= 20) {
        replyMessage = await searchStudentDetails(userMessage, cleanNumber);
      } else {
        replyMessage = getStudentMenu();
      }
    }
    
    // Send reply via WhatsApp
    if (replyMessage) {
      const sent = await sendWhatsAppMessage(senderNumber, replyMessage);
      return NextResponse.json({ 
        success: true, 
        message: 'Reply sent',
        apiResponse: sent 
      });
    }
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error("🔥 Error:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 200 });
  }
}

// ============================================
// STUDENT MENU
// ============================================

function getStudentMenu() {
  return `╔════════════════════════════╗
║   🎓 *STUDENT PORTAL*     ║
║   SGI College              ║
╚════════════════════════════╝

┌─────────────────────────────┐
│ 📚 *How to check details:*  │
├─────────────────────────────┤
│ Send your *USN* or *Name*   │
│ to get your details         │
│                             │
│ 📌 *Examples:*              │
│ • 3TS25CS004                │
│ • SEARCH 3TS25CS004         │
│ • MY DETAILS                │
│ • FIND Rohit                │
└─────────────────────────────┘

💡 *Tip:* Send your USN to see
your complete details instantly!

📞 *Admin Contact:* 9480072737`;
}

// ============================================
// SEARCH STUDENT DETAILS
// ============================================

async function searchStudentDetails(query, phoneNumber) {
  if (!query || query.trim().length < 2) {
    return `❌ *Please provide a valid USN or name*

Send your *USN* or *Name* to check your details.

📌 Example: *3TS25CS004*`;
  }
  
  query = query.trim();
  console.log(`🔍 Searching for: "${query}"`);
  
  let student = null;
  
  try {
    // Try exact USN match first
    const { data: usnMatch } = await supabaseAdmin
      .from('students')
      .select('*')
      .ilike('usn', query)
      .limit(1);
    
    if (usnMatch && usnMatch.length > 0) {
      student = usnMatch[0];
    }
    
    // Try phone number match (for MY DETAILS)
    if (!student && query.match(/^(MY|ME|MINE)$/i)) {
      const phoneNum = parseInt(phoneNumber);
      if (!isNaN(phoneNum)) {
        const { data: phoneMatch } = await supabaseAdmin
          .from('students')
          .select('*')
          .or(`phone_number.eq.${phoneNum},phone.eq.${phoneNumber}`)
          .limit(1);
        
        if (phoneMatch && phoneMatch.length > 0) {
          student = phoneMatch[0];
        }
      }
    }
    
    // Try partial USN match
    if (!student) {
      const { data: partialMatch } = await supabaseAdmin
        .from('students')
        .select('*')
        .ilike('usn', `%${query}%`)
        .limit(1);
      
      if (partialMatch && partialMatch.length > 0) {
        student = partialMatch[0];
      }
    }
    
    // Try name match
    if (!student) {
      const { data: nameMatch } = await supabaseAdmin
        .from('students')
        .select('*')
        .ilike('full_name', `%${query}%`)
        .limit(1);
      
      if (nameMatch && nameMatch.length > 0) {
        student = nameMatch[0];
      }
    }
    
  } catch (error) {
    console.error('Search error:', error);
    return `❌ *Database error occurred*

Please try again later.

📞 Contact admin: 9480072737`;
  }
  
  if (!student) {
    return `❌ *No student found for:* "${query}"

📋 Please check your details and try again.

💡 *Examples:*
• Your USN (e.g., 3TS25CS004)
• Your name
• My DETAILS (if phone registered)

📞 Contact admin: 9480072737`;
  }
  
  return formatStudentDetails(student);
}

// ============================================
// FORMAT STUDENT DETAILS
// ============================================

function formatStudentDetails(student) {
  let message = `╔════════════════════════════╗
║   🎓 *STUDENT DETAILS*   ║
╚════════════════════════════╝

┌─────── *PERSONAL INFO* ──────┐
│ 👤 *Name:* ${student.full_name || 'N/A'}
│ 📋 *USN:* ${student.usn || 'N/A'}
`;
  
  if (student.semester) message += `│ 📚 *Semester:* ${student.semester}\n`;
  if (student.class) {
    message += `│ 🏫 *Class:* ${student.class}`;
    if (student.division) message += ` - ${student.division}`;
    message += `\n`;
  }
  if (student.branch) {
    message += `│ 🔬 *Branch:* ${student.branch}\n`;
    
    // Medical or Engineering
    const branch = student.branch.toLowerCase();
    if (branch.includes('medical') || branch.includes('mbbs') || branch.includes('bds') || branch.includes('pharma')) {
      message += `│ 🏥 *Stream:* Medical\n`;
    } else {
      message += `│ 🔧 *Stream:* Engineering\n`;
    }
  }
  
  message += `├─────────────────────────────┤
│ 📞 *Phone:* ${student.phone_number || student.phone || 'N/A'}
│ 📧 *Email:* ${student.email || 'N/A'}
├─────────────────────────────┤
`;
  
  if (student.routes) message += `│ 🚌 *Route:* ${student.routes}\n`;
  if (student.bus_id) message += `│ 🚍 *Bus ID:* ${student.bus_id}\n`;
  
  message += `├─────────────────────────────┤
│ 💰 *FEE DETAILS*             │
│ Total Fees: ₹${student.total_fees || 0}
│ Paid: ₹${student.paid_amount || 0}
│ Due: ₹${student.due_amount || 0}
│ Status: ${student.fees_due ? '🔴 PENDING' : '🟢 PAID'}
`;
  
  if (student.last_payment_date) {
    message += `│ 📅 Last Payment: ${student.last_payment_date}\n`;
  }
  
  message += `└─────────────────────────────┘

💡 *Need help?* Send HELP for options

📞 *Admin:* 9480072737`;
  
  return message;
}

// ============================================
// SEND WHATSAPP MESSAGE - THIS WAS MISSING!
// ============================================

async function sendWhatsAppMessage(to, message) {
  const apiKey = process.env.VIRALBOOSTUP_API_KEY;
  
  if (!apiKey) {
    console.log("⚠️ WhatsApp API key not configured. Skipping message send.");
    console.log("📤 Would have sent to:", to);
    console.log("💬 Message:", message.substring(0, 100) + "...");
    return { status: 'skipped', reason: 'API key not configured' };
  }
  
  try {
    console.log(`📤 Sending WhatsApp message to: ${to}`);
    
    const response = await fetch("https://app.viralboostup.in/api/v2/whatsapp-business/messages", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        to: to,
        phoneNoId: "595231930349201",
        type: "text",
        text: message
      })
    });
    
    const result = await response.json();
    console.log(`📬 WhatsApp API Response: ${response.status}`, result);
    return result;
  } catch (error) {
    console.error("❌ WhatsApp send error:", error);
    return { status: 'error', error: error.message };
  }
}