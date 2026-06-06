import { NextResponse } from 'next/server';
import { handleAdminCommands } from './admin';
import { handleStudentCommands } from './student';
import { handleHostelAdminCommands } from './hostel';
import { supabase } from '@/lib/supabase';

// Simple in-memory session store for admin modes
const adminSessions = new Map(); // Stores mode: 'bus' or 'hostel'

export async function POST(request) {
  try {
    const payload = await request.json();
    console.log('📦 Payload received');
    
    let senderNumber = null;
    let userMessage = null;
    
    if (payload.data) {
      senderNumber = payload.data.senderPhoneNumber || payload.data.sender || payload.data.from;
      userMessage = payload.data.content?.text?.trim() || payload.data.message || payload.data.text;
    }
    
    if (!senderNumber) {
      senderNumber = payload.senderPhoneNumber || payload.sender || payload.from || payload.phone;
    }
    if (!userMessage) {
      userMessage = payload.content?.text?.trim() || payload.message || payload.text || payload.body;
    }
    
    console.log(`📱 Sender: ${senderNumber}`);
    console.log(`💬 Message: ${userMessage}`);
    
    if (!senderNumber || !userMessage) {
      return NextResponse.json({ success: true });
    }
    
    // Clean phone number
    let cleanNumber = senderNumber.toString().replace(/[^\d]/g, '');
    if (cleanNumber.startsWith('91')) cleanNumber = cleanNumber.substring(2);
    cleanNumber = cleanNumber.replace(/^0+/, '');
    
    // Check if admin from DATABASE
    const { data: adminData, error: adminError } = await supabase
      .from('admins')
      .select('mobile_number')
      .eq('mobile_number', cleanNumber)
      .maybeSingle();
    
    const isAdmin = adminData !== null;
    
    console.log(`👑 Is Admin: ${isAdmin}`);
    
    let replyMessage = '';
    
    if (isAdmin) {
      const upperMsg = userMessage?.toUpperCase().trim() || '';
      const currentMode = adminSessions.get(cleanNumber); // 'bus', 'hostel', or undefined
      
      console.log(`📍 Current Mode: ${currentMode || 'none'}`);
      console.log(`📍 Message: ${upperMsg}`);
      
      // ============ SHOW MODE SELECTION MENU ============
      // If user sends hi, hello, hey, or any greeting
      if (['HI', 'HELLO', 'HEY', 'START', 'MENU', 'H'].includes(upperMsg) || 
          (upperMsg !== 'BUS' && upperMsg !== 'HOSTEL' && upperMsg !== 'EXIT' && upperMsg !== 'BACK' && !currentMode)) {
        replyMessage = getModeSelectionMenu();
        // Clear any existing mode
        adminSessions.delete(cleanNumber);
      }
      // ============ SWITCH TO BUS MODE ============
      else if (upperMsg === 'BUS') {
        console.log(`🚌 Switching to BUS ADMIN mode`);
        adminSessions.set(cleanNumber, 'bus');
        const busMenu = await handleAdminCommands('MENU', cleanNumber);
        replyMessage = `🚌 *BUS ADMIN MODE ACTIVATED*\n\n${busMenu}`;
      }
      // ============ SWITCH TO HOSTEL MODE ============
      else if (upperMsg === 'HOSTEL') {
        console.log(`🏨 Switching to HOSTEL ADMIN mode`);
        adminSessions.set(cleanNumber, 'hostel');
        const hostelMenu = await handleHostelAdminCommands('MENU', cleanNumber);
        replyMessage = `🏨 *HOSTEL ADMIN MODE ACTIVATED*\n\n${hostelMenu}`;
      }
      // ============ EXIT CURRENT MODE ============
      else if (upperMsg === 'EXIT' || upperMsg === 'BACK' || upperMsg === 'MAIN MENU') {
        console.log(`🔙 Exiting ${currentMode} mode`);
        adminSessions.delete(cleanNumber);
        replyMessage = getModeSelectionMenu();
      }
      // ============ ROUTE TO BUS MODE HANDLER ============
      else if (currentMode === 'bus') {
        console.log(`🚌 Routing to BUS ADMIN handler`);
        replyMessage = await handleAdminCommands(userMessage, cleanNumber);
      }
      // ============ ROUTE TO HOSTEL MODE HANDLER ============
      else if (currentMode === 'hostel') {
        console.log(`🏨 Routing to HOSTEL ADMIN handler`);
        replyMessage = await handleHostelAdminCommands(userMessage, cleanNumber);
      }
      // ============ DEFAULT - SHOW MODE SELECTION ============
      else {
        replyMessage = getModeSelectionMenu();
      }
    } else {
      console.log(`🔄 Routing to STUDENT handler`);
      replyMessage = await handleStudentCommands(userMessage, cleanNumber);
    }
    
    // Send reply
    if (replyMessage) {
      await sendWhatsAppMessage(senderNumber, replyMessage);
    }
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error("🔥 Error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 200 });
  }
}

// Mode selection menu function
function getModeSelectionMenu() {
  return `
╔════════════════════════════╗
║   👑 *ADMIN ACCESS*          ║
╚════════════════════════════╝

Welcome Admin! Please select a module:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚌 *BUS ADMIN*
• Manage bus routes
• Track bus stops
• Driver management
• Bus maintenance

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🏨 *HOSTEL ADMIN*
• Resident management
• Room allocation
• Fee tracking
• Admission records

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 *Type one of the following:*

• *BUS* - Enter Bus Admin Mode
• *HOSTEL* - Enter Hostel Admin Mode

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📝 *Example:* Type *BUS* or *HOSTEL*

⚡ *Once inside a mode, type EXIT to return here*`;
}

// Send WhatsApp message function with PHONE_NUMBER_ID from env
async function sendWhatsAppMessage(to, message) {
  const apiKey = process.env.VIRALBOOSTUP_API_KEY;
  const phoneNoId = process.env.PHONE_NUMBER_ID;
  
  if (!apiKey) {
    console.log("❌ VIRALBOOSTUP_API_KEY missing");
    return;
  }
  
  if (!phoneNoId) {
    console.log("❌ PHONE_NUMBER_ID missing in environment variables");
    return;
  }
  
  try {
    const response = await fetch("https://app.viralboostup.in/api/v2/whatsapp-business/messages", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        to: to,
        phoneNoId: phoneNoId,
        type: "text",
        text: message
      })
    });
    
    const result = await response.json();
    console.log(`📬 API Response: ${response.status}`);
    return result;
  } catch (error) {
    console.error("Send error:", error);
  }
}