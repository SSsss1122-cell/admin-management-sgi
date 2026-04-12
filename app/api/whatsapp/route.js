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
    
    if (!senderNumber) {
      return NextResponse.json({ 
        isAdmin: false,
        reply: "No sender number found" 
      }, { headers });
    }
    
    // Clean the number
    let cleanNumber = senderNumber.toString();
    if (cleanNumber.startsWith('+91')) {
      cleanNumber = cleanNumber.substring(3);
    } else if (cleanNumber.startsWith('91')) {
      cleanNumber = cleanNumber.substring(2);
    }
    cleanNumber = cleanNumber.replace(/\D/g, '');
    
    // Check if admin exists in admins table
    const { data: admin, error: adminError } = await supabase
      .from('admins')
      .select('id, mobile_number, admin_name')
      .eq('mobile_number', cleanNumber)
      .single();
    
    // ============================================
    // RETURN THE EXACT FORMAT YOU WANT
    // ============================================
    
    if (adminError || !admin) {
      // Not an admin
      return NextResponse.json({ 
        isAdmin: false,
        name: null,
        reply: "⛔ Access Denied. You are not authorized."
      }, { headers });
    }
    
    // Is Admin - Return this format
    return NextResponse.json({ 
      isAdmin: true,
      name: admin.admin_name || admin.mobile_number,
      reply: `Welcome ${admin.admin_name || 'Admin'}`
    }, { headers });
    
  } catch (error) {
    console.error("🔥 Error:", error);
    return NextResponse.json({ 
      isAdmin: false,
      name: null,
      reply: "Server error. Please try again."
    }, { headers });
  }
}