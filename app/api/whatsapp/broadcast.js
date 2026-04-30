import { supabase } from '@/lib/supabase';

// ViralBoost API Configuration
const VIRALBOOST_API_URL = 'https://app.viralboostup.in/api/v2/whatsapp-business/messages';

async function sendWhatsAppMessage(to, message) {
  try {
    // Don't format phone number - use as is from database
    const phoneNumber = to.toString();
    
    console.log(`📤 Sending to: ${phoneNumber}`);
    
    const requestBody = {
      to: phoneNumber,
      type: 'text',
      text: { body: message }
    };
    
    console.log('📦 Request body:', JSON.stringify(requestBody, null, 2));
    
    const response = await fetch(VIRALBOOST_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.VIRALBOOSTUP_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });
    
    const result = await response.json();
    console.log(`📬 Response:`, result);
    
    if (response.ok && !result.type === 'Unauthorized') {
      return { success: true, result };
    } else {
      return { success: false, error: result.message || result.error || 'Failed' };
    }
  } catch (error) {
    console.error(`❌ Failed:`, error);
    return { success: false, error: error.message };
  }
}

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
    
    const { data: students, error } = await supabase
      .from('students_test')
      .select('phone, full_name')
      .not('phone', 'is', null)
      .not('phone', 'eq', '');
    
    if (error) {
      return `❌ *Failed*: ${error.message}`;
    }
    
    if (!students || students.length === 0) {
      return `📭 *No students with phone numbers found*`;
    }
    
    console.log(`📊 Found ${students.length} students`);
    console.log('📞 Phone numbers:', students.map(s => `${s.full_name}: ${s.phone}`).join(', '));
    
    let successCount = 0;
    let failCount = 0;
    const failedNumbers = [];
    
    for (const student of students) {
      const result = await sendWhatsAppMessage(student.phone, message);
      if (result.success) {
        successCount++;
        console.log(`✅ Sent to ${student.full_name} (${student.phone})`);
      } else {
        failCount++;
        failedNumbers.push(`${student.full_name} (${student.phone}) - ${result.error}`);
        console.log(`❌ Failed to send to ${student.full_name}: ${result.error}`);
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Save to notices
    try {
      await supabase.from('notices').insert({
        title: '📢 Announcement',
        description: message,
        created_at: new Date().toISOString(),
        sent_to: students.length,
        delivered: successCount,
        failed: failCount
      });
    } catch (saveError) {
      console.error('Save error:', saveError);
    }
    
    let response = `📢 *BROADCAST COMPLETED*\n`;
    response += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    response += `📝 *Message:*\n${message}\n\n`;
    response += `👥 *Total:* ${students.length}\n`;
    response += `✅ *Sent:* ${successCount}\n`;
    response += `❌ *Failed:* ${failCount}\n`;
    
    if (failedNumbers.length > 0) {
      response += `\n⚠️ *Failed:*\n`;
      failedNumbers.slice(0, 5).forEach(num => {
        response += `• ${num}\n`;
      });
    }
    
    response += `\n━━━━━━━━━━━━━━━━━━━━━━\n`;
    response += `💡 Numbers should be stored with 91 country code`;
    
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
      .select('title, description, created_at, delivered, failed')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) throw error;
    
    if (!announcements || announcements.length === 0) {
      return '📢 *No announcements yet*';
    }
    
    let message = `📢 *ANNOUNCEMENT HISTORY*\n━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    announcements.forEach((a, i) => {
      const date = new Date(a.created_at).toLocaleString();
      message += `${i+1}. 📌 *${a.title}*\n`;
      message += `   ${a.description}\n`;
      message += `   📅 ${date}\n`;
      if (a.delivered) {
        message += `   ✅ Sent: ${a.delivered} | ❌ Failed: ${a.failed || 0}\n`;
      }
      message += `\n`;
    });
    
    return message;
  } catch (error) {
    return `❌ *Error*: ${error.message}`;
  }
}