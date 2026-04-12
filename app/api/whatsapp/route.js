import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function POST(request) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
  };
  
  try {
    const payload = await request.json();
    const senderNumber = payload.data?.senderPhoneNumber;
    const userMessage = payload.data?.content?.text?.trim() || '';
    
    console.log(`📱 Received from: ${senderNumber}`);
    console.log(`💬 Message: ${userMessage}`);
    
    if (!senderNumber) {
      return NextResponse.json({ 
        success: false, 
        reply: "No sender number found" 
      }, { headers });
    }
    
    // Clean the number (remove +91, 91, spaces, etc.)
    let cleanNumber = senderNumber.toString().trim();
    if (cleanNumber.startsWith('+91')) {
      cleanNumber = cleanNumber.substring(3);
    } else if (cleanNumber.startsWith('91')) {
      cleanNumber = cleanNumber.substring(2);
    }
    
    // Remove any non-digit characters
    cleanNumber = cleanNumber.replace(/\D/g, '');
    
    console.log(`🧹 Cleaned number: ${cleanNumber}`);
    
    // ============================================
    // CHECK IF NUMBER EXISTS IN ADMINS TABLE
    // ============================================
    const { data: admin, error: adminError } = await supabase
      .from('admins')
      .select('id, mobile_number, admin_name, user_id')
      .eq('mobile_number', cleanNumber)
      .single();
    
    if (adminError || !admin) {
      console.log(`❌ Not admin: ${cleanNumber}`);
      console.log(`Error: ${adminError?.message}`);
      
      return NextResponse.json({ 
        success: false, 
        reply: "⛔ Access Denied\n\nYou are not authorized to use this admin bot.\nPlease contact system administrator."
      }, { headers });
    }
    
    console.log(`✅ Admin authenticated: ${admin.admin_name || admin.mobile_number}`);
    
    // ============================================
    // PARSE COMMAND (RETURN ONLY COMMAND TYPE)
    // ============================================
    const upperMsg = userMessage.toUpperCase();
    
    let command = '';
    let params = {};
    
    // MENU COMMANDS
    if (upperMsg === 'MENU' || upperMsg === 'HI' || upperMsg === 'START' || upperMsg === 'HELP') {
      command = 'SHOW_MENU';
    }
    
    // BUS COMMANDS
    else if (upperMsg === 'BUS LIST' || upperMsg === '1' || upperMsg === 'BUSES') {
      command = 'SHOW_BUS_LIST';
    }
    else if (upperMsg === 'BUS STOPS' || upperMsg === '3') {
      command = 'SHOW_BUS_STOPS_FORMAT';
    }
    else if (upperMsg === 'BUS DETAILS' || upperMsg === '4') {
      command = 'SHOW_BUS_DETAILS_FORMAT';
    }
    
    // STUDENT COMMANDS
    else if (upperMsg === 'STUDENT LIST' || upperMsg === '8' || upperMsg === 'STUDENTS') {
      command = 'SHOW_STUDENT_LIST';
    }
    else if (upperMsg === 'STUDENT COUNT' || upperMsg === '10' || upperMsg === 'COUNT') {
      command = 'SHOW_STUDENT_COUNT';
    }
    else if (userMessage?.match(/^SEARCH\s/i)) {
      command = 'SEARCH_STUDENT';
      params.query = userMessage.replace(/^SEARCH\s/i, '').trim();
    }
    
    // FEE COMMANDS
    else if (upperMsg === 'FEE SUMMARY' || upperMsg === '7' || upperMsg === 'SUMMARY') {
      command = 'SHOW_FEE_SUMMARY';
    }
    else if (upperMsg === 'FEE DUE' || upperMsg === '6' || upperMsg === 'DUE LIST' || upperMsg === 'DUE') {
      command = 'SHOW_DUE_LIST';
    }
    else if (userMessage?.match(/^FEE\s/i)) {
      command = 'GET_FEE_DETAILS';
      params.usn = userMessage.replace(/^FEE\s/i, '').trim();
    }
    
    // OTHER COMMANDS
    else if (upperMsg === 'NOTICES' || upperMsg === '12') {
      command = 'SHOW_NOTICES';
    }
    else if (upperMsg === 'DRIVERS' || upperMsg === '13') {
      command = 'SHOW_DRIVERS';
    }
    else if (upperMsg === 'COMPLAINT' || upperMsg === '11') {
      command = 'SHOW_COMPLAINT_FORMAT';
    }
    
    // UNKNOWN COMMAND
    else if (userMessage && userMessage !== '') {
      command = 'UNKNOWN';
    }
    
    console.log(`🎯 Command: ${command}`);
    
    // ============================================
    // RETURN COMMAND TO BOT
    // ============================================
    return NextResponse.json({ 
      success: true,
      isAdmin: true,
      adminId: admin.id,
      adminName: admin.admin_name || 'Admin',
      mobileNumber: admin.mobile_number,
      command: command,
      params: params
    }, { headers });
    
  } catch (error) {
    console.error("🔥 Error:", error);
    return NextResponse.json({ 
      success: false, 
      reply: "❌ Server error. Please try again." 
    }, { headers });
  }
}