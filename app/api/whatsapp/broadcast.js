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
    
    if (!students || students.length === 0) {
      return `📭 *No students with phone numbers found in students_test table*`;
    }
    
    // Save to notices table - removed 'sent_to' column
    const { error: saveError } = await supabase
      .from('notices')
      .insert({
        title: '📢 Announcement',
        description: message,
        created_at: new Date().toISOString()
      });
    
    if (saveError) {
      console.error('Save error:', saveError);
      // Don't return error, just log it
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
    response += `💡 Message will be sent to ${students.length} students.`;
    
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