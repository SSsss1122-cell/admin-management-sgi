import { supabase } from '@/lib/supabase';

// ============================================
// ONLY STORE ANNOUNCEMENT - NO SENDING
// ============================================
export async function createAnnouncement(message, createdBy) {
  if (!message || message.trim() === '') {
    return `❌ *Invalid Format*

📢 *Command:* ANNOUNCE <message>

📝 *Example:*
ANNOUNCE Tomorrow is holiday`;
  }
  
  try {
    // ONLY store in database - NO sending
    const { error } = await supabase
      .from('announcements')
      .insert({
        title: '📢 Announcement',
        message: message,
        created_at: new Date().toISOString()
      });
    
    if (error) {
      console.error('Store error:', error);
      return `❌ *Failed to save*: ${error.message}`;
    }
    
    return `✅ *ANNOUNCEMENT SAVED*
━━━━━━━━━━━━━━━━━━━━━━

📝 *Message:* ${message}

📅 *Time:* ${new Date().toLocaleString()}

🔄 *Status:* Will be sent at next cron job (9 AM)

💡 To check pending: Send PENDING`;
    
  } catch (error) {
    console.error('Error:', error);
    return `❌ *Error*: ${error.message}`;
  }
}

// ============================================
// VIEW PENDING ANNOUNCEMENTS
// ============================================
export async function getPendingAnnouncements() {
  try {
    const { data: announcements, error } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    if (!announcements || announcements.length === 0) {
      return '📢 *No pending announcements*\n\nUse: ANNOUNCE <message>';
    }
    
    let message = `📢 *PENDING ANNOUNCEMENTS* (${announcements.length})\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    announcements.forEach((a, i) => {
      const date = new Date(a.created_at).toLocaleString();
      message += `${i+1}. 📌 ${a.title}\n`;
      message += `   📝 ${a.message}\n`;
      message += `   📅 Created: ${date}\n\n`;
    });
    
    message += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `⏰ Will be sent at next cron job (9 AM daily)`;
    
    return message;
  } catch (error) {
    return `❌ *Error*: ${error.message}`;
  }
}

// ============================================
// PROCESS & SEND (Called by CRON only)
// ============================================
export async function processPendingAnnouncements() {
  console.log('🔍 Checking for pending announcements...');
  
  try {
    // Get all pending announcements
    const { data: announcements, error } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('Fetch error:', error);
      return;
    }
    
    if (!announcements || announcements.length === 0) {
      console.log('📭 No pending announcements');
      return;
    }
    
    // Get all students
    const { data: students, error: studentError } = await supabase
      .from('students_test')
      .select('phone, full_name')
      .not('phone', 'is', null)
      .not('phone', 'eq', '');
    
    if (studentError || !students || students.length === 0) {
      console.log('📭 No students found');
      return;
    }
    
    console.log(`📢 Sending ${announcements.length} announcement(s) to ${students.length} students`);
    
    // Send each announcement
    for (const announcement of announcements) {
      console.log(`📝 Sending: ${announcement.message}`);
      
      for (const student of students) {
        // Here you'll add actual WhatsApp sending later
        console.log(`   📤 Would send to: ${student.full_name} (${student.phone})`);
        // await sendWhatsAppMessage(student.phone, announcement.message);
      }
      
      // Delete after processing
      await supabase.from('announcements').delete().eq('id', announcement.id);
      console.log(`✅ Deleted announcement ${announcement.id}`);
    }
    
    console.log('🎉 All announcements processed!');
    
  } catch (error) {
    console.error('Process error:', error);
  }
}