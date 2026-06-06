import { NextResponse } from 'next/server';
import { handleAdminCommands } from './admin';
import { handleStudentCommands } from './student';
import { handleHostelAdminCommands } from './hostelAdmin';
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
    
    console.log(`📞 Clean Number: ${cleanNumber}`);
    
    // Check if admin from DATABASE and get their role
    const { data: adminData, error: adminError } = await supabase
      .from('admins')
      .select('mobile_number, role')
      .eq('mobile_number', cleanNumber)
      .maybeSingle();
    
    if (adminError) {
      console.error('Admin fetch error:', adminError);
    }
    
    const isAdmin = adminData !== null;
    let adminRole = adminData?.role || null;
    
    // If role is null or empty, assign default based on number or set as super_admin
    if (isAdmin && (!adminRole || adminRole === '')) {
      // You can set default roles based on phone numbers here
      // For example, let's set some known numbers
      const defaultRoles = {
        '9480072737': 'super_admin',  // Your number
        // Add other numbers with their roles
      };
      
      adminRole = defaultRoles[cleanNumber] || 'bus_admin'; // Default to bus_admin
      
      // Update the database with the role
      const { error: updateError } = await supabase
        .from('admins')
        .update({ role: adminRole })
        .eq('mobile_number', cleanNumber);
      
      if (updateError) {
        console.error('Failed to update role:', updateError);
      } else {
        console.log(`✅ Updated role for ${cleanNumber} to: ${adminRole}`);
      }
    }
    
    console.log(`👑 Is Admin: ${isAdmin}`);
    console.log(`📋 Admin Role: ${adminRole}`);
    
    let replyMessage = '';
    
    if (isAdmin) {
      const upperMsg = userMessage?.toUpperCase().trim() || '';
      const currentMode = adminSessions.get(cleanNumber);
      
      console.log(`📍 Current Mode: ${currentMode || 'none'}`);
      console.log(`📍 Message: ${upperMsg}`);
      console.log(`📍 Role: ${adminRole}`);
      
      // ============ SUPER ADMIN - Full Access ============
      if (adminRole === 'super_admin') {
        // Show mode selection menu for super admin
        if (['HI', 'HELLO', 'HEY', 'START', 'MENU', 'H', ''].includes(upperMsg) || 
            (upperMsg !== 'BUS' && upperMsg !== 'HOSTEL' && upperMsg !== 'EXIT' && upperMsg !== 'BACK' && !currentMode)) {
          replyMessage = getSuperAdminMenu();
          adminSessions.delete(cleanNumber);
        }
        // SWITCH TO BUS MODE
        else if (upperMsg === 'BUS') {
          console.log(`🚌 Super Admin switching to BUS mode`);
          adminSessions.set(cleanNumber, 'bus');
          const busMenu = await handleAdminCommands('MENU', cleanNumber);
          replyMessage = `🚌 *BUS ADMIN MODE ACTIVATED*\n\n${busMenu}`;
        }
        // SWITCH TO HOSTEL MODE
        else if (upperMsg === 'HOSTEL') {
          console.log(`🏨 Super Admin switching to HOSTEL mode`);
          adminSessions.set(cleanNumber, 'hostel');
          const hostelMenu = await handleHostelAdminCommands('MENU', cleanNumber);
          replyMessage = `🏨 *HOSTEL ADMIN MODE ACTIVATED*\n\n${hostelMenu}`;
        }
        // EXIT CURRENT MODE
        else if (upperMsg === 'EXIT' || upperMsg === 'BACK' || upperMsg === 'MAIN MENU') {
          console.log(`🔙 Exiting ${currentMode} mode`);
          adminSessions.delete(cleanNumber);
          replyMessage = getSuperAdminMenu();
        }
        // ROUTE TO BUS MODE HANDLER
        else if (currentMode === 'bus') {
          console.log(`🚌 Routing to BUS handler`);
          replyMessage = await handleAdminCommands(userMessage, cleanNumber);
        }
        // ROUTE TO HOSTEL MODE HANDLER
        else if (currentMode === 'hostel') {
          console.log(`🏨 Routing to HOSTEL handler`);
          replyMessage = await handleHostelAdminCommands(userMessage, cleanNumber);
        }
        else {
          replyMessage = getSuperAdminMenu();
        }
      }
      
      // ============ BUS ADMIN - Only Bus Access ============
      else if (adminRole === 'bus_admin') {
        // BLOCK any attempt to access hostel
        if (upperMsg === 'HOSTEL') {
          replyMessage = `❌ *ACCESS DENIED*\n\nYou are a Bus Admin. You only have access to Bus Administration.\n\nType *MENU* to see Bus Admin options.`;
        }
        // Auto-route to bus mode for any message
        else {
          // Always stay in bus mode
          adminSessions.set(cleanNumber, 'bus');
          replyMessage = await handleAdminCommands(userMessage, cleanNumber);
        }
      }
      
      // ============ HOSTEL ADMIN - Only Hostel Access ============
      else if (adminRole === 'hostel_admin') {
        // BLOCK any attempt to access bus
        if (upperMsg === 'BUS') {
          replyMessage = `❌ *ACCESS DENIED*\n\nYou are a Hostel Admin. You only have access to Hostel Administration.\n\nType *MENU* to see Hostel Admin options.`;
        }
        // Auto-route to hostel mode for any message
        else {
          // Always stay in hostel mode
          adminSessions.set(cleanNumber, 'hostel');
          replyMessage = await handleHostelAdminCommands(userMessage, cleanNumber);
        }
      }
      
      // ============ DEFAULT - Unknown role ============
      else {
        // If role is not recognized, treat as bus admin by default
        console.log(`⚠️ Unknown role "${adminRole}", defaulting to bus_admin`);
        adminSessions.set(cleanNumber, 'bus');
        replyMessage = await handleAdminCommands(userMessage, cleanNumber);
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

// Super Admin Menu - Can choose between Bus and Hostel
function getSuperAdminMenu() {
  return `
👑 *SUPER ADMIN ACCESS*

Please select a module:

🚌 *BUS* - Bus Administration
🏨 *HOSTEL* - Hostel Administration

👉 Type *BUS* or *HOSTEL* to continue.
`;
}

// Send WhatsApp message function
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