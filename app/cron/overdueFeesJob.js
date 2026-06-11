// cron/overdueFeesJob.js
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkOverdueFees() {
  console.log('\n🔍 Checking for overdue students...\n');
  
  const today = new Date().toISOString().split('T')[0];
  console.log(`📅 Today: ${today}\n`);
  console.log('='.repeat(50));

  try {
    const { data: students, error } = await supabase
      .from('students')
      .select('full_name, due_amount, next_payment_date, phone, usn')
      .gt('due_amount', 0)
      .not('next_payment_date', 'is', null);

    if (error) {
      console.log('❌ Error:', error.message);
      return;
    }

    if (!students || students.length === 0) {
      console.log('✅ No students with pending fees found.');
      return;
    }

    console.log(`📊 Found ${students.length} student(s) with pending fees\n`);

    let overdueCount = 0;

    for (const student of students) {
      const dueDate = student.next_payment_date;
      const isOverdue = dueDate < today;
      const dueAmount = Number(student.due_amount) || 0;

      if (isOverdue && dueAmount > 0) {
        overdueCount++;
        
        console.log(`👤 Name: ${student.full_name}`);
        console.log(`   📚 USN: ${student.usn || 'N/A'}`);
        console.log(`   💰 Due Amount: ₹${dueAmount.toLocaleString()}`);
        console.log(`   📅 Due Date: ${dueDate}`);
        console.log(`   📱 Phone: ${student.phone || 'Not provided'}`);
        console.log(`   ⚠️ STATUS: OVERDUE`);
        console.log('');
      }
    }

    console.log('='.repeat(50));
    console.log(`📊 Total Overdue Students: ${overdueCount}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the function
checkOverdueFees();