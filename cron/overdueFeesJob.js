// cron/overdueFeesJob.js
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// WhatsApp Configuration - TERA CUSTOM API
const API_URL = 'https://app.viralboostup.in/api/v2/whatsapp-business/messages';
const API_KEY = process.env.WHATSAPP_API_KEY;  // Bearer token
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const TEMPLATE_NAME = 'fees_due';
const TEST_MODE = false;  // false = real send, true = test mode

function formatPhoneNumber(phone) {
  if (!phone) return null;
  let cleaned = phone.toString().replace(/\D/g, '');
  if (cleaned.length === 10) cleaned = `91${cleaned}`;
  return cleaned;
}

async function sendWhatsAppMessage(to) {
  if (TEST_MODE) {
    console.log(`   📱 [TEST MODE] Would send to: ${to}`);
    return true;
  }

  try {
    const body = {
      to: to,
      phoneNoId: PHONE_NUMBER_ID,
      type: 'template',
      name: TEMPLATE_NAME,
      language: 'en'
    };

    console.log(`   📤 Sending to: ${to}`);
    console.log(`   📦 Body:`, JSON.stringify(body, null, 2));

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
      console.log(`   ✅ WhatsApp sent successfully to ${to}`);
      console.log(`   📨 Response:`, data);
      return true;
    } else {
      console.log(`   ❌ Failed:`);
      console.log(`   Status: ${response.status}`);
      console.log(`   Error:`, data);
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
  console.log(`📱 Mode: ${TEST_MODE ? 'TEST MODE' : 'LIVE MODE (Sending WhatsApp)'}`);
  console.log(`📝 Template: ${TEMPLATE_NAME}`);
  console.log(`🌐 API: ${API_URL}\n`);
  console.log('='.repeat(60));

  // Check API credentials
  if (!TEST_MODE) {
    console.log(`🔑 API Key: ${API_KEY ? '✅ Present' : '❌ MISSING'}`);
    console.log(`📞 Phone ID: ${PHONE_NUMBER_ID ? '✅ Present' : '❌ MISSING'}`);
    console.log('');
  }

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
        // Wait 2 seconds between messages
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        console.log(`   ⚠️ No phone number found`);
        failed++;
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`📊 SUMMARY:`);
  console.log(`   ✅ Sent: ${sent}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📱 Mode: ${TEST_MODE ? 'TEST (No actual send)' : 'LIVE'}`);
  console.log('='.repeat(60));
}

// Run
checkOverdue();