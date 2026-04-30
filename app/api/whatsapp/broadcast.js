import { supabase } from '@/lib/supabase';

export async function sendBroadcast(message) {
  if (!message || message.trim() === '') {
    return `❌ *Invalid Format*

📢 *Broadcast Commands:*
• ANNOUNCE <message>
• BROADCAST <message>
• SEND <message>

📝 *Examples:*
• ANNOUNCE Tomorrow is holiday
• BROADCAST College closed on Monday`;
  }
  
  try {
    console.log('📢 Broadcasting using table: students_test');
    console.log('📝 Message:', message);
    
    // First, check if table exists and has any data
    const { count, error: countError } = await supabase
      .from('students_test')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('Count error:', countError);
      return `❌ *Table Error*: ${countError.message}\n\nMake sure 'students_test' table exists.`;
    }
    
    console.log(`📊 Total records in students_test: ${count}`);
    
    if (count === 0) {
      return `📭 *No data in students_test table*

Please add test data first:

1. Go to Supabase SQL Editor
2. Run this SQL:

INSERT INTO students_test (full_name, usn, branch, phone) VALUES
('Test Student 1', 'TEST001', 'CSE', '919900842058'),
('Test Student 2', 'TEST002', 'ECE', '919480072737');

3. Then try ANNOUNCE again`;
    }
    
    // Get all students with phone numbers
    const { data: students, error } = await supabase
      .from('students_test')
      .select('phone, full_name')
      .not('phone', 'is', null)
      .not('phone', 'eq', '');
    
    if (error) {
      console.error('Broadcast fetch error:', error);
      return `❌ *Failed*: ${error.message}`;
    }
    
    console.log(`📞 Students with phone numbers: ${students?.length || 0}`);
    
    if (!students || students.length === 0) {
      // Show sample of what's in the table
      const { data: sample } = await supabase
        .from('students_test')
        .select('full_name, phone')
        .limit(5);
      
      let sampleInfo = '';
      if (sample && sample.length > 0) {
        sampleInfo = '\n\n📊 *Sample data in table:*\n';
        sample.forEach(s => {
          sampleInfo += `• ${s.full_name}: Phone = ${s.phone || 'NULL'}\n`;
        });
      }
      
      return `📭 *No students with phone numbers found*

Total students in table: ${count}
Students with phone numbers: 0

${sampleInfo}

💡 To fix:
UPDATE students_test SET phone = '919900842058' WHERE phone IS NULL;`;
    }
    
    // Save to notices table
    const { error: saveError } = await supabase
      .from('notices')
      .insert({
        title: '📢 Announcement',
        description: message,
        created_at: new Date().toISOString(),
        sent_to: students.length
      });
    
    if (saveError) {
      console.error('Save error:', saveError);
    }
    
    // Build response
    let response = `📢 *ANNOUNCEMENT READY*\n`;
    response += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    response += `📝 *Message:*\n${message}\n\n`;
    response += `👥 *Total Recipients:* ${students.length}\n\n`;
    response += `📞 *Recipients List:*\n`;
    
    students.forEach((s, i) => {
      response += `${i+1}. ${s.full_name} - ${s.phone}\n`;
    });
    
    response += `\n━━━━━━━━━━━━━━━━━━━━━━\n`;
    response += `✅ *Broadcast ready!*\n`;
    
    return response;
  } catch (error) {
    console.error('Broadcast error:', error);
    return `❌ *Error*: ${error.message}`;
  }
}

export async function getAnnouncements() {
  try {
    const { data: announcements, error } = await supabase
      .from('notices')
      .select('title, description, created_at')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) throw error;
    
    if (!announcements || announcements.length === 0) {
      return '📢 *No announcements yet*\n\nSend: ANNOUNCE <message>';
    }
    
    let message = `📢 *PREVIOUS ANNOUNCEMENTS*\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    announcements.forEach((a, i) => {
      const date = new Date(a.created_at).toLocaleString();
      message += `${i+1}. 📌 *${a.title}*\n`;
      message += `   ${a.description}\n`;
      message += `   📅 ${date}\n\n`;
    });
    
    return message;
  } catch (error) {
    return `❌ *Error*: ${error.message}`;
  }
}