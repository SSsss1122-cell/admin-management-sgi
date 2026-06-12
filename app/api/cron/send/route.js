// app/api/cron/send/route.js
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// WhatsApp Config
const API_URL = 'https://app.viralboostup.in/api/v2/whatsapp-business/messages';
const TEMPLATE_NAME = 'fees_due';

function formatPhoneNumber(phone) {
  if (!phone) return null;
  let cleaned = phone.toString().replace(/\D/g, '');
  if (cleaned.length === 10) cleaned = `91${cleaned}`;
  return cleaned;
}

async function sendWhatsAppMessage(to) {
  try {
    const body = {
      to: to,
      phoneNoId: process.env.PHONE_NUMBER_ID,
      type: 'template',
      name: TEMPLATE_NAME,
      language: 'en'
    };

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.WHATSAPP_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    return response.ok;
  } catch (error) {
    console.error('WhatsApp error:', error);
    return false;
  }
}

export async function GET() {
  try {
    console.log('🚀 Cron job triggered at:', new Date().toISOString());
    
    const today = new Date().toISOString().split('T')[0];
    
    // Get overdue students
    const { data: students, error } = await supabase
      .from('students')
      .select('full_name, due_amount, next_payment_date, phone')
      .gt('due_amount', 0)
      .not('next_payment_date', 'is', null);

    if (error) throw error;

    let sent = 0;
    let failed = 0;

    for (const student of students) {
      const isOverdue = student.next_payment_date < today;
      if (isOverdue && student.due_amount > 0) {
        const phoneNumber = formatPhoneNumber(student.phone);
        if (phoneNumber) {
          const success = await sendWhatsAppMessage(phoneNumber);
          if (success) sent++;
          else failed++;
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      sent, 
      failed,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Cron failed:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}