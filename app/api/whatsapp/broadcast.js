import { supabase } from '@/lib/supabase';

const VIRALBOOST_API_URL = 'https://app.viralboostup.in/api/v2/whatsapp-business/messages';
const YOUR_WHATSAPP_NUMBER = '917676522231';

async function sendWhatsAppMessage(to, message) {
  try {
    let recipientNumber = to.toString().replace(/[^0-9]/g, '');
    if (!recipientNumber.startsWith('91') && recipientNumber.length === 10) {
      recipientNumber = `91${recipientNumber}`;
    }
    
    const requestBody = {
      from: YOUR_WHATSAPP_NUMBER,
      to: recipientNumber,
      type: 'text',
      text: { body: message }
    };
    
    const response = await fetch(VIRALBOOST_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.VIRALBOOSTUP_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });
    
    const result = await response.json();
    
    if (response.ok && result.status !== 'error') {
      return { success: true };
    } else {
      return { success: false, error: result.message || 'Failed' };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ============================================
// SAVE ANNOUNCEMENT (Called from admin.js)
// ============================================
export async function createAnnouncement(message, createdBy) {
  if (!message || message.trim() === '') {
    return `❌ *Invalid Format*

📢 *Command:* ANNOUNCE <message>

📝 *Example:*
ANNOUNCE Tomorrow is holiday`;
  }
  
  try {
    const { error } = await supabase
      .from('announcements')
      .insert({
        title: '📢 Announcement',
        message: message,
        created_at: new Date().toISOString()
      });
    
    if (error) {
      return `❌ *Failed*: ${error.message}`;
    }
    
    return `✅ *ANNOUNCEMENT SAVED*
━━━━━━━━━━━━━━━━━━━━━━

📝 *Message:* ${message}

📅 *Time:* ${new Date().toLocaleString()}

🔄 *Status:* Will be sent automatically at next cron job (9 AM daily)`;
    
  } catch (error) {
    return `❌ *Error*: ${error.message}`;
  }
}

// ============================================
// PROCESS & SEND ANNOUNCEMENTS (Called by cron)
// ============================================
export async function processPendingAnnouncements() {
  console.log('🔍 Checking for announcements...');
  
  try {
    // Get all announcements
    const { data: announcements, error } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('Fetch error:', error);
      return;
    }
    
    if (!announcements || announcements.length === 0) {
      console.log('📭 No announcements to send');
      return;
    }
    
    // Get all students with phone numbers
    const { data: students, error: studentError } = await supabase
      .from('students_test')
      .select('phone, full_name')
      .not('phone', 'is', null)
      .not('phone', 'eq', '');
    
    if (studentError || !students || students.length === 0) {
      console.log('📭 No students found');
      return;
    }
    
    console.log(`📢 Found ${announcements.length} announcement(s)`);
    console.log(`👥 Sending to ${students.length} students`);
    
    let totalSent = 0;
    let totalFailed = 0;
    
    // Send each announcement
    for (const announcement of announcements) {
      console.log(`📝 Sending: ${announcement.message}`);
      
      let successCount = 0;
      let failCount = 0;
      
      for (const student of students) {
        const result = await sendWhatsAppMessage(student.phone, announcement.message);
        if (result.success) {
          successCount++;
        } else {
          failCount++;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      totalSent += successCount;
      totalFailed += failCount;
      
      console.log(`✅ Sent: ${successCount} | ❌ Failed: ${failCount}`);
      
      // Delete after sending
      await supabase.from('announcements').delete().eq('id', announcement.id);
    }
    
    console.log(`🎉 Broadcast complete! Sent: ${totalSent}, Failed: ${totalFailed}`);
    
  } catch (error) {
    console.error('Process error:', error);
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