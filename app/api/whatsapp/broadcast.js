import { supabase } from '@/lib/supabase';

// ============================================
// TEST MODE - Change this to false for production
// ============================================
const TEST_MODE = true;  // true = use students_test table

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
    // Use test table when TEST_MODE is true
    const tableName = TEST_MODE ? 'students_test' : 'students';
    
    console.log(`📢 Broadcasting using table: ${tableName}`);
    console.log(`📝 Message: ${message}`);
    
    // Get all students with phone numbers
    const { data: students, error } = await supabase
      .from(tableName)
      .select('phone, full_name')
      .not('phone', 'is', null)
      .not('phone', 'eq', '');
    
    if (error) {
      console.error('Broadcast fetch error:', error);
      return `❌ *Failed*: ${error.message}`;
    }
    
    if (!students || students.length === 0) {
      return `📭 *No students with phone numbers found in ${tableName} table*`;
    }
    
    // Save to notices table
    const { error: saveError } = await supabase
      .from('notices')
      .insert({
        title: TEST_MODE ? '🧪 TEST ANNOUNCEMENT' : '📢 Announcement',
        description: message,
        created_at: new Date().toISOString(),
        sent_to: students.length,
        mode: TEST_MODE ? 'test' : 'production'
      });
    
    if (saveError) {
      console.error('Save error:', saveError);
    }
    
    // Build response
    let response = `🧪 *TEST BROADCAST* ${TEST_MODE ? '(TEST MODE)' : '(PRODUCTION)'}\n`;
    response += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    response += `📝 *Message:*\n${message}\n\n`;
    response += `👥 *Total Recipients:* ${students.length}\n\n`;
    response += `📞 *Recipients List:*\n`;
    
    students.forEach((s, i) => {
      response += `${i+1}. ${s.full_name} - ${s.phone}\n`;
    });
    
    response += `\n━━━━━━━━━━━━━━━━━━━━━━\n`;
    response += `✅ *Test broadcast completed!*\n`;
    response += `⚠️ No actual messages sent to real students.\n`;
    response += `💡 Set TEST_MODE = false in broadcast.js for production.`;
    
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
      .select('title, description, created_at, mode')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) throw error;
    
    if (!announcements || announcements.length === 0) {
      return '📢 *No announcements yet*';
    }
    
    let message = `📢 *PREVIOUS ANNOUNCEMENTS*\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    announcements.forEach((a, i) => {
      const date = new Date(a.created_at).toLocaleString();
      const modeTag = a.mode === 'test' ? '🧪 TEST' : '📢 REAL';
      message += `${i+1}. ${modeTag} *${a.title}*\n`;
      message += `   ${a.description}\n`;
      message += `   📅 ${date}\n\n`;
    });
    
    return message;
  } catch (error) {
    return `❌ *Error*: ${error.message}`;
  }
}