// app/api/whatsapp/cron.js

import { supabase } from '@/lib/supabase';

// ============================================
// VERCEL CRON HANDLER (called daily by Vercel)
// ============================================

export async function GET(request) {
  console.log('🕐 Vercel Cron: Running daily payment check...');
  
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
    
    console.log(`📅 Checking date: ${today}`);
    
    // Find: next-payment-date-test < today AND due_amount > 0 AND has phone
    const { data: students, error } = await supabase
      .from('students')
      .select('*')
      .lt('next-payment-date-test', today)  // Date crossed
      .gt('due_amount', 0)                  // Due > 0
      .not('phone', 'is', null)             // Has phone number
      .order('due_amount', { ascending: false });
    
    if (error) {
      console.error('Database error:', error);
      return { success: false, error: error.message };
    }
    
    if (!students || students.length === 0) {
      console.log('✅ No overdue payments today');
      return { success: true, remindersSent: 0, message: 'No overdue payments' };
    }
    
    console.log(`📊 Found ${students.length} overdue students`);
    
    let sentCount = 0;
    let failedCount = 0;
    
    for (const student of students) {
      // Only send if due_amount > 0
      if (student.due_amount <= 0) {
        console.log(`⏭️ Skipping ${student.full_name} - due is 0`);
        continue;
      }
      
      const message = formatReminderMessage(student);
      
      try {
        await sendWhatsAppMessage(student.phone, message);
        sentCount++;
        console.log(`✅ Sent to ${student.full_name} (₹${student.due_amount} due)`);
        
        // Wait between messages to avoid rate limit
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        failedCount++;
        console.error(`❌ Failed: ${student.full_name}`);
      }
    }
    
    return { 
      success: true, 
      totalDue: students.length,
      remindersSent: sentCount,
      failed: failedCount
    };
    
  } catch (error) {
    console.error('Error:', error);
    return { success: false, error: error.message };
  }
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
│ 📅 Due Date: ${student['next-payment-date-test']}
│ ⏰ Days Overdue: ${daysOverdue} days
└─────────────────────────────┘

📢 *Please pay immediately to avoid penalties!*

📞 *Admin Contact:* 9845926992

🏦 *Payment Modes:*
• Online Transfer
• Cash at College Office

_SGI College - Automated Reminder_`;
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
    return;
  }
  
  try {
    let cleanTo = to.toString().replace(/[^\d]/g, '');
    if (!cleanTo.startsWith('91')) {
      cleanTo = '91' + cleanTo;
    }
    
    console.log(`📤 Sending to: ${cleanTo}`);
    
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
    console.log(`📬 Response: ${response.status}`);
    return result;
  } catch (error) {
    console.error("Send error:", error);
    throw error;
  }
}