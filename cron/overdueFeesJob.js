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
      return true;
    } else {
      console.log(`   ❌ Failed: ${data.error || data.message || 'Unknown error'}`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return false;
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
    .select('full_name, due_amount, next_payment_date, phone')
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
    
    if (isOverdue && dueAmount > 0) {
      console.log(`\n👤 Student: ${student.full_name}`);
      console.log(`   💰 Due: ₹${dueAmount}`);
      console.log(`   📅 Due Date: ${student.next_payment_date}`);
      
      const phoneNumber = formatPhoneNumber(student.phone);
      
      if (phoneNumber) {
        const success = await sendWhatsAppMessage(phoneNumber);
        if (success) {
          sent++;
        } else {
          failed++;
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        console.log(`   ⚠️ No phone number`);
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