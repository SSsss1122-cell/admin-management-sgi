// app/api/whatsapp/cron/route.js - Diagnostic Version

import { supabase } from '@/lib/supabase';

const CRON_SECRET = process.env.CRON_SECRET_KEY || 'sgi_bus_admin_2024';

export async function GET(request) {
  console.log('🕐 Payment check started...');
  
  const { searchParams } = new URL(request.url);
  const authHeader = request.headers.get('authorization') || '';
  const isVercelCron = authHeader.includes('vercel-cron') || request.headers.get('x-vercel-cron') === '1';
  const hasValidKey = searchParams.get('key') === CRON_SECRET;
  
  if (!isVercelCron && !hasValidKey) {
    return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const result = await sendPaymentReminders();
    return Response.json(result);
  } catch (error) {
    console.error('❌ Error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}

async function sendPaymentReminders() {
  const today = new Date().toISOString().split('T')[0];
  console.log(`📅 Today: ${today}`);
  
  // Get overdue students
  const { data: students, error } = await supabase
    .from('students_test')
    .select('id, full_name, phone, due_amount, next_payment_date, usn, branch, total_fees, paid_amount')
    .lt('next_payment_date', today)
    .gt('due_amount', 0)
    .not('phone', 'is', null)
    .neq('phone', '');
  
  if (error) {
    console.error('❌ Database error:', error);
    return { success: false, error: error.message };
  }
  
  if (!students || students.length === 0) {
    console.log('✅ No overdue payments found');
    return { success: true, message: 'No overdue payments', count: 0 };
  }
  
  console.log(`📊 Found ${students.length} student(s) with overdue payments`);
  
  let successCount = 0;
  let failCount = 0;
  const failedStudents = [];
  
  for (const student of students) {
    console.log(`\n📤 Processing: ${student.full_name}`);
    console.log(`📱 Raw phone number from DB: "${student.phone}"`);
    console.log(`📱 Phone type: ${typeof student.phone}`);
    
    // Try multiple phone number formats
    const phoneFormats = [
      student.phone.toString().replace(/\D/g, ''), // Just digits
      '91' + student.phone.toString().replace(/\D/g, ''), // With 91 prefix
      student.phone.toString().replace(/\D/g, '').slice(-10), // Last 10 digits
      '91' + student.phone.toString().replace(/\D/g, '').slice(-10), // 91 + last 10 digits
    ];
    
    // Remove duplicates
    const uniqueFormats = [...new Set(phoneFormats)];
    
    console.log(`📱 Trying phone formats:`, uniqueFormats);
    
    const daysOverdue = calculateDaysOverdue(student.next_payment_date, today);
    const message = createMessage(student, daysOverdue);
    
    let sent = false;
    let lastError = '';
    
    // Try each phone format
    for (const phoneNumber of uniqueFormats) {
      if (phoneNumber.length < 10) continue;
      
      console.log(`\n📡 Attempting with: ${phoneNumber}`);
      const result = await sendWhatsAppMessageWithDetails(phoneNumber, message);
      
      if (result.success) {
        sent = true;
        console.log(`✅ Success with format: ${phoneNumber}`);
        break;
      } else {
        lastError = result.error;
        console.log(`❌ Failed with format: ${phoneNumber} - ${result.error}`);
      }
    }
    
    if (sent) {
      successCount++;
      console.log(`✅ Sent to ${student.full_name}`);
    } else {
      failCount++;
      failedStudents.push({ 
        name: student.full_name, 
        reason: `WhatsApp API failed: ${lastError}`,
        phoneNumber: student.phone 
      });
      console.log(`❌ Failed to send to ${student.full_name} - ${lastError}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  return {
    success: true,
    date: today,
    totalOverdue: students.length,
    remindersSent: successCount,
    failed: failCount,
    failedStudents: failedStudents
  };
}

async function sendWhatsAppMessageWithDetails(phoneNumber, message) {
  const apiKey = process.env.VIRALBOOSTUP_API_KEY;
  
  console.log(`🔍 WhatsApp API Debug:`);
  console.log(`  - API Key present: ${!!apiKey}`);
  console.log(`  - API Key length: ${apiKey?.length || 0}`);
  console.log(`  - Phone number: ${phoneNumber}`);
  console.log(`  - Phone number length: ${phoneNumber.length}`);
  
  if (!apiKey) {
    return { success: false, error: 'API key missing' };
  }
  
  const endpoint = "https://app.viralboostup.in/api/v2/whatsapp-business/messages";
  const payload = {
    to: phoneNumber,
    phoneNoId: "595231930349201",
    type: "text",
    text: message.substring(0, 100) + "..." // Log first 100 chars only
  };
  
  console.log(`  - Endpoint: ${endpoint}`);
  console.log(`  - Payload:`, JSON.stringify(payload, null, 2));
  
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: phoneNumber,
        phoneNoId: "595231930349201",
        type: "text",
        text: message
      })
    });
    
    const responseText = await response.text();
    let responseJson = {};
    
    try {
      responseJson = JSON.parse(responseText);
    } catch (e) {
      console.log(`  - Response is not JSON: ${responseText.substring(0, 200)}`);
    }
    
    console.log(`  - Response Status: ${response.status}`);
    console.log(`  - Response Headers:`, Object.fromEntries(response.headers));
    console.log(`  - Response Body:`, responseText.substring(0, 500));
    
    if (response.ok) {
      return { success: true };
    } else {
      return { 
        success: false, 
        error: `HTTP ${response.status}: ${responseText.substring(0, 100)}`
      };
    }
  } catch (error) {
    console.error(`  - Network Error:`, error.message);
    return { success: false, error: `Network error: ${error.message}` };
  }
}

function calculateDaysOverdue(paymentDate, today) {
  if (!paymentDate) return 0;
  const dueDate = new Date(paymentDate);
  const currentDate = new Date(today);
  dueDate.setHours(0, 0, 0, 0);
  currentDate.setHours(0, 0, 0, 0);
  const diffTime = currentDate - dueDate;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
}

function createMessage(student, daysOverdue) {
  return `*SGI EDUCATION - FEE REMINDER*

Dear ${student.full_name},

Your fee payment is OVERDUE by ${daysOverdue} day(s)!

Amount Due: ₹${student.due_amount}
Due Date: ${student.next_payment_date}

Please pay immediately to avoid penalties.

Contact Admin: 9845926992

Thank you.`;
}

function validateAndCleanPhone(phone) {
  if (!phone) return null;
  let clean = phone.toString().replace(/\D/g, '');
  if (clean.startsWith('0')) clean = clean.substring(1);
  if (clean.length < 10) return null;
  if (clean.length > 10) clean = clean.slice(-10);
  return '91' + clean;
}