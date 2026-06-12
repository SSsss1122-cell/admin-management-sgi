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
const API_KEY = process.env.WHATSAPP_API_KEY;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const TEMPLATE_NAME = 'fees_due';

function formatPhoneNumber(phone) {
  if (!phone) return null;
  let cleaned = phone.toString().replace(/\D/g, '');
  if (cleaned.length === 10) cleaned = `91${cleaned}`;
  return cleaned;
}

function getDaysOverdue(dueDate) {
  if (!dueDate) return 0;
  const today = new Date();
  const due = new Date(dueDate);
  const diffTime = today - due;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
}

async function sendWhatsAppMessage(to) {
  try {
    const body = {
      to: to,
      phoneNoId: PHONE_NUMBER_ID,
      type: 'template',
      name: TEMPLATE_NAME,
      language: 'en'
    };

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    
    if (response.ok) {
      return { success: true, error: null };
    } else {
      return { success: false, error: data.error || data.message || 'Unknown error' };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function insertLog(student, status, phoneNumber, dueAmount, daysOverdue, errorMsg = null) {
  try {
    const { error } = await supabase
      .from('reminder_logs')
      .insert({
        student_id: student.id,
        student_name: student.full_name,
        student_usn: student.usn,
        phone: phoneNumber,
        due_amount: dueAmount,
        due_date: student.next_payment_date,
        days_overdue: daysOverdue,
        status: status,
        sent_at: new Date().toISOString()
      });
    
    if (error) {
      console.error('Log insert error:', error);
    }
  } catch (err) {
    console.error('Log error:', err);
  }
}

export async function GET() {
  try {
    console.log('🚀 Cron job triggered at:', new Date().toISOString());
    
    const today = new Date().toISOString().split('T')[0];
    
    // Get all students with dues
    const { data: students, error } = await supabase
      .from('students')
      .select('id, full_name, usn, due_amount, next_payment_date, phone')
      .gt('due_amount', 0)
      .not('next_payment_date', 'is', null);

    if (error) {
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 500 });
    }

    if (!students || students.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No overdue students found',
        sent: 0,
        failed: 0,
        details: []
      });
    }

    let sent = 0;
    let failed = 0;
    const details = [];

    for (const student of students) {
      const isOverdue = student.next_payment_date < today;
      const dueAmount = Number(student.due_amount) || 0;
      const daysOverdue = getDaysOverdue(student.next_payment_date);
      
      if (isOverdue && dueAmount > 0) {
        const phoneNumber = formatPhoneNumber(student.phone);
        
        if (phoneNumber) {
          const result = await sendWhatsAppMessage(phoneNumber);
          
          if (result.success) {
            sent++;
            await insertLog(student, 'sent', phoneNumber, dueAmount, daysOverdue);
            details.push({
              name: student.full_name,
              phone: phoneNumber,
              status: 'sent',
              due_amount: dueAmount
            });
          } else {
            failed++;
            await insertLog(student, 'failed', phoneNumber, dueAmount, daysOverdue, result.error);
            details.push({
              name: student.full_name,
              phone: phoneNumber,
              status: 'failed',
              due_amount: dueAmount,
              error: result.error
            });
          }
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
          failed++;
          await insertLog(student, 'failed', null, dueAmount, daysOverdue, 'No phone number');
          details.push({
            name: student.full_name,
            phone: null,
            status: 'failed',
            due_amount: dueAmount,
            error: 'No phone number'
          });
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Cron job completed: ${sent} sent, ${failed} failed`,
      sent: sent,
      failed: failed,
      total: sent + failed,
      details: details,
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