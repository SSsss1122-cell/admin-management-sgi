// cron/overdueFeesJob.js
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

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

    console.log(`   📤 Sending to: ${to}`);

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
      console.log(`   ✅ Sent to ${to}`);
      return { success: true, error: null };
    } else {
      console.log(`   ❌ Failed: ${data.error || data.message || 'Unknown error'}`);
      return { success: false, error: data.error || data.message || 'Unknown error' };
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function checkOverdue() {
  console.log('\n🔍 Checking overdue students...\n');
  
  const today = new Date().toISOString().split('T')[0];
  console.log(`📅 Today: ${today}`);
  console.log(`📱 Mode: LIVE (Sending WhatsApp)`);
  console.log(`📝 Template: ${TEMPLATE_NAME}\n`);
  console.log('='.repeat(50));

  const { data: students, error } = await supabase
    .from('students')
    .select('id, full_name, usn, due_amount, next_payment_date, phone')
    .gt('due_amount', 0)
    .not('next_payment_date', 'is', null);

  if (error) {
    console.log('❌ DB Error:', error.message);
    return;
  }

  if (!students || students.length === 0) {
    console.log('✅ No students with pending fees');
    return;
  }

  let sent = 0;
  let failed = 0;

  for (const student of students) {
    const isOverdue = student.next_payment_date < today;
    const dueAmount = Number(student.due_amount) || 0;
    const daysOverdue = getDaysOverdue(student.next_payment_date);
    
    if (isOverdue && dueAmount > 0) {
      console.log(`\n👤 Student: ${student.full_name}`);
      console.log(`   💰 Due: ₹${dueAmount}`);
      console.log(`   📅 Due Date: ${student.next_payment_date}`);
      console.log(`   ⏰ Days Overdue: ${daysOverdue}`);
      
      const phoneNumber = formatPhoneNumber(student.phone);
      
      if (phoneNumber) {
        const result = await sendWhatsAppMessage(phoneNumber);
        
        // Insert log into reminder_logs table
        const { error: logError } = await supabase
          .from('reminder_logs')
          .insert({
            student_id: student.id,
            student_name: student.full_name,
            student_usn: student.usn,
            phone: phoneNumber,
            due_amount: dueAmount,
            due_date: student.next_payment_date,
            days_overdue: daysOverdue,
            status: result.success ? 'sent' : 'failed',
            sent_at: new Date().toISOString()
          });

        if (logError) {
          console.log(`   ⚠️ Log error: ${logError.message}`);
        }
        
        if (result.success) {
          sent++;
        } else {
          failed++;
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        console.log(`   ⚠️ No phone number`);
        
        // Log as failed
        const { error: logError } = await supabase
          .from('reminder_logs')
          .insert({
            student_id: student.id,
            student_name: student.full_name,
            student_usn: student.usn,
            phone: null,
            due_amount: dueAmount,
            due_date: student.next_payment_date,
            days_overdue: daysOverdue,
            status: 'failed',
            sent_at: new Date().toISOString()
          });
        
        failed++;
      }
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`📊 SUMMARY:`);
  console.log(`   ✅ Sent: ${sent}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log('='.repeat(50));
}

// Run the function
checkOverdue().catch(console.error);