// app/api/whatsapp/cron/route.js

import { supabase } from '@/lib/supabase';

// ============================================
// VERCEL CRON HANDLER
// ============================================

export async function GET(request) {
  console.log('🕐 Running daily payment check...');
  
  try {
    const result = await sendPaymentReminders();
    return Response.json(result);
  } catch (error) {
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

// ============================================
// SEND PAYMENT REMINDERS
// ============================================

async function sendPaymentReminders() {
  try {
    const today = new Date().toISOString().split('T')[0];
    console.log(`📅 Today's date: ${today}`);
    
    // ============================================
    // DEBUG: Show ALL students first
    // ============================================
    const { data: allStudents, error: allError } = await supabase
      .from('students')
      .select('full_name, phone, due_amount, "next-payment-date-test", usn');
    
    if (allError) {
      console.error('❌ Error fetching all students:', allError);
    } else {
      console.log(`📋 Total students in database: ${allStudents?.length || 0}`);
      console.log('──────────────────────────────────────────');
      allStudents?.forEach(s => {
        const dateVal = s['next-payment-date-test'];
        const crossed = dateVal && dateVal < today ? '🔴 OVERDUE' : '🟢 OK';
        const hasPhone = s.phone ? '✅' : '❌';
        const hasDue = s.due_amount > 0 ? '⚠️' : '✅';
        console.log(`  ${s.full_name} | Due: ₹${s.due_amount} | Date: ${dateVal || 'NULL'} | ${crossed} | Phone: ${hasPhone} | Due>0: ${hasDue}`);
      });
      console.log('──────────────────────────────────────────');
    }
    
    // ============================================
    // Find overdue students
    // ============================================
    console.log('🔍 Searching for overdue students...');
    
    const { data: students, error } = await supabase
      .from('students')
      .select('*')
      .lt('"next-payment-date-test"', today)
      .gt('due_amount', 0)
      .not('phone', 'is', null);
    
    if (error) {
      console.error('❌ Query error:', error);
      return { success: false, error: error.message };
    }
    
    console.log(`📊 Query result: ${students?.length || 0} students found`);
    
    if (!students || students.length === 0) {
      // Try alternative query without double quotes
      console.log('🔄 Trying alternative query...');
      
      const { data: students2, error: error2 } = await supabase
        .from('students')
        .select('*')
        .filter('next-payment-date-test', 'lt', today)
        .filter('due_amount', 'gt', 0)
        .filter('phone', 'not.is', null);
      
      if (error2) {
        console.error('❌ Alternative query error:', error2);
      } else {
        console.log(`📊 Alternative query result: ${students2?.length || 0} students found`);
        
        if (students2 && students2.length > 0) {
          return await sendRemindersToStudents(students2, today);
        }
      }
      
      console.log('✅ No overdue payments today');
      return { success: true, remindersSent: 0, message: 'No overdue payments' };
    }
    
    return await sendRemindersToStudents(students, today);
    
  } catch (error) {
    console.error('❌ Error:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// SEND REMINDERS TO STUDENTS
// ============================================

async function sendRemindersToStudents(students, today) {
  console.log(`📤 Sending reminders to ${students.length} students...`);
  
  let sentCount = 0;
  let failedCount = 0;
  
  for (const student of students) {
    if (student.due_amount <= 0) {
      console.log(`⏭️ Skipping ${student.full_name} - due amount is 0`);
      continue;
    }
    
    if (!student.phone) {
      console.log(`⏭️ Skipping ${student.full_name} - no phone number`);
      continue;
    }
    
    const message = formatReminderMessage(student);
    
    try {
      console.log(`📤 Sending to ${student.full_name} (${student.phone})...`);
      await sendWhatsAppMessage(student.phone, message);
      sentCount++;
      console.log(`✅ Sent to ${student.full_name} (₹${student.due_amount} due)`);
      
      // Wait 1 second between messages
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      failedCount++;
      console.error(`❌ Failed to send to ${student.full_name}:`, error.message);
    }
  }
  
  console.log(`✅ Done! Sent: ${sentCount}, Failed: ${failedCount}`);
  
  return { 
    success: true, 
    totalDue: students.length,
    remindersSent: sentCount,
    failed: failedCount,
    date: today
  };
}

// ============================================
// FORMAT REMINDER MESSAGE
// ============================================

function formatReminderMessage(student) {
  const daysOverdue = calculateDaysOverdue(student['next-payment-date-test']);
  
  return `╔════════════════════════════╗
║   ⚠️ *PAYMENT REMINDER*   ║
╚════════════════════════════╝

Dear *${student.full_name}*,

Your fee payment is *OVERDUE*!

┌──────── *DETAILS* ────────────┐
│ 👤 *Name:* ${student.full_name}
│ 📋 *USN:* ${student.usn || 'N/A'}
│ 📚 *Branch:* ${student.branch || 'N/A'}
├─────────────────────────────┤
│ 💰 Total Fees: ₹${student.total_fees || 0}
│ ✅ Paid: ₹${student.paid_amount || 0}
│ ⚠️ Due: ₹${student.due_amount || 0}
├─────────────────────────────┤
│ 📅 Due Date: ${student['next-payment-date-test'] || 'N/A'}
│ ⏰ Days Overdue: ${daysOverdue} days
└─────────────────────────────┘

📢 *Please pay immediately to avoid penalties!*

📞 *Admin Contact:* 9845926992

Thank you.`;
}

// ============================================
// CALCULATE DAYS OVERDUE
// ============================================

function calculateDaysOverdue(paymentDate) {
  if (!paymentDate) return 'N/A';
  
  const dueDate = new Date(paymentDate);
  const today = new Date();
  const diffTime = today.getTime() - dueDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays > 0 ? diffDays : 0;
}

// ============================================
// SEND WHATSAPP MESSAGE
// ============================================

async function sendWhatsAppMessage(to, message) {
  const apiKey = process.env.VIRALBOOSTUP_API_KEY;
  
  if (!apiKey) {
    console.log('❌ WhatsApp API key missing');
    throw new Error('API key missing');
  }
  
  // Clean phone number
  let cleanTo = to.toString().replace(/[^\d]/g, '');
  if (!cleanTo.startsWith('91')) {
    cleanTo = '91' + cleanTo;
  }
  
  console.log(`📱 Sending to: ${cleanTo}`);
  
  try {
    const response = await fetch("https://app.viralboostup.in/api/v2/whatsapp-business/messages", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        to: cleanTo,
        phoneNoId: "595231930349201",
        type: "text",
        text: message
      })
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      console.error('❌ API Error:', result);
      throw new Error(result.error || 'WhatsApp API error');
    }
    
    console.log(`✅ WhatsApp response: ${response.status}`);
    return result;
  } catch (error) {
    console.error('❌ Send error:', error.message);
    throw error;
  }
}