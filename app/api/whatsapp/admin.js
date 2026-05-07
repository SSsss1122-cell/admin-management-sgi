import { supabase } from '@/lib/supabase';

export async function handleAdminCommands(userMessage, cleanNumber) {
  // Check if sender is admin from the database
  const { data: adminData, error: adminError } = await supabase
    .from('admins')
    .select('mobile_number, admin_name, institution_id')
    .eq('mobile_number', cleanNumber)
    .single();
  
  // If not admin, return null - nothing to send on WhatsApp
  if (adminError || !adminData) {
    return null;
  }

  const upperMsg = userMessage?.toUpperCase().trim() || '';
  let replyMessage = '';
  
  // Help/Menu
  if (['HELP', 'MENU', 'ADMIN', 'ADMIN HELP'].includes(upperMsg)) {
    replyMessage = getAdminMenu(adminData);
  }
  
  // Broadcast message to all students
  else if (upperMsg.startsWith('BROADCAST') || upperMsg.startsWith('BC ')) {
    const message = userMessage.replace(/^(BROADCAST|BC)\s+/i, '').trim();
    replyMessage = await handleBroadcast(message, cleanNumber, adminData);
  }
  
  // Send message to specific student by USN
  else if (upperMsg.startsWith('SEND ') || upperMsg.startsWith('MSG ')) {
    const content = userMessage.replace(/^(SEND|MSG)\s+/i, '').trim();
    replyMessage = await handleSendToStudent(content, cleanNumber, adminData);
  }
  
  // Send message to specific route/class/branch
  else if (upperMsg.startsWith('ROUTE ') || upperMsg.startsWith('CLASS ') || upperMsg.startsWith('BRANCH ')) {
    const parts = userMessage.split(/\s+/);
    const command = parts[0].toUpperCase();
    const target = parts[1];
    const message = parts.slice(2).join(' ');
    replyMessage = await handleGroupMessage(command, target, message, cleanNumber, adminData);
  }
  
  // View pending messages
  else if (upperMsg === 'PENDING' || upperMsg === 'PENDING MSG') {
    replyMessage = await viewPendingMessages(adminData);
  }
  
  // Delete a pending message
  else if (upperMsg.startsWith('DELETE ')) {
    const msgId = upperMsg.replace('DELETE ', '').trim();
    replyMessage = await deleteMessage(msgId, adminData);
  }
  
  // View all sent messages history
  else if (upperMsg === 'HISTORY' || upperMsg === 'MSG HISTORY') {
    replyMessage = await viewMessageHistory(adminData);
  }
  
  // View admin list
  else if (upperMsg === 'ADMINS' || upperMsg === 'ADMIN LIST') {
    replyMessage = await getAdminList(adminData);
  }
  
  // Default - no valid command, return null
  else {
    return null;
  }
  
  return replyMessage;
}

// ============================================
// ADMIN MENU
// ============================================

function getAdminMenu(adminData) {
  const adminName = adminData?.admin_name || 'Admin';
  
  return `╔════════════════════════════╗
║   👑 *ADMIN PANEL*        ║
║   SGI Bus Management      ║
╚════════════════════════════╝

👋 *Welcome, ${adminName}!*

┌─────────────────────────────┐
│ 📢 *BROADCAST COMMANDS*     │
├─────────────────────────────┤
│ Broadcast to ALL students:  │
│ *BROADCAST <message>*       │
│                             │
│ Send to specific student:   │
│ *SEND <USN> <message>*      │
│                             │
│ Send to specific route:     │
│ *ROUTE <route> <message>*   │
│                             │
│ Send to specific class:     │
│ *CLASS <class> <message>*   │
│                             │
│ Send to specific branch:    │
│ *BRANCH <branch> <message>* │
└─────────────────────────────┘

┌─────────────────────────────┐
│ 📋 *MANAGEMENT*             │
├─────────────────────────────┤
│ • PENDING - View pending    │
│ • DELETE <id> - Delete msg  │
│ • HISTORY - Message history │
│ • ADMINS - View admin list  │
│ • MENU - Show this menu     │
└─────────────────────────────┘

📌 *Examples:*
• BROADCAST Bus will be late by 10 min
• SEND 3TS25CS004 Check route 5
• ROUTE Route-5 Bus at stop A

💡 *Reply with any command to execute*`;
}

// ============================================
// GET ADMIN LIST
// ============================================

async function getAdminList(adminData) {
  // Get all admins from the same institution
  const { data: admins, error } = await supabase
    .from('admins')
    .select('mobile_number, admin_name, created_at')
    .eq('institution_id', adminData.institution_id);
  
  if (error) {
    return `❌ Error fetching admin list: ${error.message}`;
  }
  
  if (!admins || admins.length === 0) {
    return `👥 No admins found.`;
  }
  
  const adminList = admins.map((admin, index) => {
    const name = admin.admin_name || 'Unnamed Admin';
    return `${index + 1}. 📱 ${name}\n   └─ ${admin.mobile_number}`;
  }).join('\n\n');
  
  return `╔════════════════════════════╗
║   👑 *ADMIN LIST*          ║
╚════════════════════════════╝

*Your Institution Admins:*

${adminList}

━━━━━━━━━━━━━━━━━━━━━━
📊 *Total Admins:* ${admins.length}

💡 Send *HELP* for admin commands`;
}

// ============================================
// BROADCAST TO ALL STUDENTS
// ============================================

async function handleBroadcast(message, adminPhone, adminData) {
  if (!message || message.trim().length === 0) {
    return `❌ *Please provide a message to broadcast*

📌 Example: *BROADCAST Bus will be late today*`;
  }

  try {
    // Fetch all students from the same institution with phone numbers
    const { data: students, error: fetchError } = await supabase
      .from('students')
      .select('usn, full_name, phone_number, phone, routes, class, branch')
      .eq('institution_id', adminData.institution_id)
      .not('phone_number', 'is', null);

    if (fetchError) {
      console.error('Error fetching students:', fetchError);
      return `❌ *Error fetching students*\n\n${fetchError.message}`;
    }

    if (!students || students.length === 0) {
      return `❌ *No students found in your institution*`;
    }

    // Store message in admin_messages table
    const { data: insertedMsg, error: insertError } = await supabase
      .from('admin_messages')
      .insert([
        {
          message: message.trim(),
          sent_by: adminPhone,
          sent_by_name: adminData.admin_name,
          institution_id: adminData.institution_id,
          type: 'broadcast',
          target: 'all',
          recipient_count: students.length,
          status: 'pending',
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting message:', insertError);
      return `❌ *Error storing message*\n\n${insertError.message}`;
    }

    // Store individual message records for each student
    const messageRecords = students
      .filter(s => s.phone_number || s.phone)
      .map(student => ({
        message_id: insertedMsg.id,
        student_usn: student.usn,
        student_name: student.full_name,
        student_phone: student.phone_number || student.phone,
        message: message.trim(),
        status: 'pending',
        route: student.routes || null,
        class: student.class || null,
        branch: student.branch || null,
        institution_id: adminData.institution_id,
        created_at: new Date().toISOString()
      }));

    if (messageRecords.length > 0) {
      const { error: recordError } = await supabase
        .from('admin_message_logs')
        .insert(messageRecords);

      if (recordError) {
        console.error('Error inserting message records:', recordError);
      }
    }

    // Format response
    let response = `✅ *Broadcast Message Stored!*

📋 *Message ID:* ${insertedMsg.id}
👤 *Sent by:* ${adminData.admin_name || adminPhone}
📝 *Message:* ${message.trim()}
👥 *Recipients:* ${students.length} students
📅 *Time:* ${new Date().toLocaleString()}

━━━━━━━━━━━━━━━━━━━━━━

*📋 First 20 Students:*\n`;

    // Show first 20 students
    const displayStudents = students.slice(0, 20);
    displayStudents.forEach((s, index) => {
      response += `${index + 1}. ${s.full_name} (${s.usn})\n`;
    });

    if (students.length > 20) {
      response += `\n... and ${students.length - 20} more students\n`;
    }

    response += `\n━━━━━━━━━━━━━━━━━━━━━━
💡 *Commands:*
• PENDING - View pending msgs
• DELETE ${insertedMsg.id} - Cancel this msg
• HISTORY - View all messages`;

    return response;

  } catch (error) {
    console.error('Broadcast error:', error);
    return `❌ *Broadcast failed*\n\nError: ${error.message}\n\nPlease try again.`;
  }
}

// ============================================
// SEND TO SPECIFIC STUDENT
// ============================================

async function handleSendToStudent(content, adminPhone, adminData) {
  const parts = content.split(/\s+/);
  
  if (parts.length < 2) {
    return `❌ *Invalid format*

📌 Usage: *SEND <USN> <message>*

Example: *SEND 3TS25CS004 Bus route changed*`;
  }

  const usn = parts[0];
  const message = parts.slice(1).join(' ');

  try {
    // Find student by USN in the same institution
    const { data: student, error: fetchError } = await supabase
      .from('students')
      .select('*')
      .eq('institution_id', adminData.institution_id)
      .ilike('usn', usn)
      .single();

    if (fetchError || !student) {
      return `❌ *Student not found with USN:* ${usn}\n\nPlease check the USN and try again.`;
    }

    if (!student.phone_number && !student.phone) {
      return `❌ *No phone number for:* ${student.full_name} (${student.usn})\n\nCannot send message to this student.`;
    }

    // Store message in admin_messages table
    const { data: insertedMsg, error: insertError } = await supabase
      .from('admin_messages')
      .insert([
        {
          message: message.trim(),
          sent_by: adminPhone,
          sent_by_name: adminData.admin_name,
          institution_id: adminData.institution_id,
          type: 'direct',
          target: usn,
          recipient_count: 1,
          status: 'pending',
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting message:', insertError);
      return `❌ *Error storing message*`;
    }

    // Store individual message record
    const { error: recordError } = await supabase
      .from('admin_message_logs')
      .insert([
        {
          message_id: insertedMsg.id,
          student_usn: student.usn,
          student_name: student.full_name,
          student_phone: student.phone_number || student.phone,
          message: message.trim(),
          status: 'pending',
          route: student.routes || null,
          class: student.class || null,
          branch: student.branch || null,
          institution_id: adminData.institution_id,
          created_at: new Date().toISOString()
        }
      ]);

    if (recordError) {
      console.error('Error inserting message record:', recordError);
    }

    return `✅ *Message Stored for Student*

📋 *Message ID:* ${insertedMsg.id}
👤 *Sent by:* ${adminData.admin_name || adminPhone}
👤 *Student:* ${student.full_name}
📋 *USN:* ${student.usn}
📞 *Phone:* ${student.phone_number || student.phone}
📝 *Message:* ${message.trim()}

━━━━━━━━━━━━━━━━━━━━━━
🟡 Message will be delivered when student messages the bot

💡 *Commands:*
• PENDING - View pending msgs
• DELETE ${insertedMsg.id} - Cancel this msg`;

  } catch (error) {
    console.error('Send to student error:', error);
    return `❌ *Failed to send message*\n\nError: ${error.message}`;
  }
}

// ============================================
// SEND TO GROUP (ROUTE/CLASS/BRANCH)
// ============================================

async function handleGroupMessage(command, target, message, adminPhone, adminData) {
  if (!target || !message || message.trim().length === 0) {
    return `❌ *Invalid format*

📌 Usage: *${command} <${command === 'ROUTE' ? 'route-name' : command === 'CLASS' ? 'class-name' : 'branch-name'}> <message>*

Example: *${command} ${command === 'ROUTE' ? 'Route-5' : command === 'CLASS' ? '10A' : 'CSE'} Bus timing changed*`;
  }

  try {
    let query = supabase
      .from('students')
      .select('*')
      .eq('institution_id', adminData.institution_id);

    // Build query based on command type
    if (command === 'ROUTE') {
      query = query.ilike('routes', `%${target}%`);
    } else if (command === 'CLASS') {
      query = query.ilike('class', `%${target}%`);
    } else if (command === 'BRANCH') {
      query = query.ilike('branch', `%${target}%`);
    }

    const { data: students, error: fetchError } = await query;

    if (fetchError) {
      console.error('Error fetching students:', fetchError);
      return `❌ *Error fetching students*`;
    }

    if (!students || students.length === 0) {
      return `❌ *No students found in ${command.toLowerCase()}:* ${target}`;
    }

    // Store message in admin_messages table
    const { data: insertedMsg, error: insertError } = await supabase
      .from('admin_messages')
      .insert([
        {
          message: message.trim(),
          sent_by: adminPhone,
          sent_by_name: adminData.admin_name,
          institution_id: adminData.institution_id,
          type: 'group',
          target: `${command}:${target}`,
          recipient_count: students.length,
          status: 'pending',
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting message:', insertError);
      return `❌ *Error storing message*`;
    }

    // Store individual message records
    const messageRecords = students
      .filter(s => s.phone_number || s.phone)
      .map(student => ({
        message_id: insertedMsg.id,
        student_usn: student.usn,
        student_name: student.full_name,
        student_phone: student.phone_number || student.phone,
        message: message.trim(),
        status: 'pending',
        route: student.routes || null,
        class: student.class || null,
        branch: student.branch || null,
        institution_id: adminData.institution_id,
        created_at: new Date().toISOString()
      }));

    if (messageRecords.length > 0) {
      const { error: recordError } = await supabase
        .from('admin_message_logs')
        .insert(messageRecords);

      if (recordError) {
        console.error('Error inserting message records:', recordError);
      }
    }

    return `✅ *Group Message Stored!*

📋 *Message ID:* ${insertedMsg.id}
👤 *Sent by:* ${adminData.admin_name || adminPhone}
🎯 *Target:* ${command} - ${target}
👥 *Recipients:* ${students.length} students
📝 *Message:* ${message.trim()}

━━━━━━━━━━━━━━━━━━━━━━
🟡 Message will be delivered when students message the bot

━━━━━━━━━━━━━━━━━━━━━━
*📋 Students in ${target}:*
${students.slice(0, 15).map((s, i) => `${i + 1}. ${s.full_name} (${s.usn})`).join('\n')}
${students.length > 15 ? `\n... and ${students.length - 15} more` : ''}

💡 *Commands:*
• PENDING - View pending msgs
• DELETE ${insertedMsg.id} - Cancel this msg`;

  } catch (error) {
    console.error('Group message error:', error);
    return `❌ *Failed to send group message*\n\nError: ${error.message}`;
  }
}

// ============================================
// VIEW PENDING MESSAGES
// ============================================

async function viewPendingMessages(adminData) {
  try {
    const { data: messages, error } = await supabase
      .from('admin_messages')
      .select('*')
      .eq('institution_id', adminData.institution_id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching pending messages:', error);
      return `❌ *Error fetching pending messages*`;
    }

    if (!messages || messages.length === 0) {
      return `📋 *No Pending Messages*

All messages have been delivered.

💡 Send *BROADCAST <message>* to create new message`;
    }

    let response = `📋 *PENDING MESSAGES* (${messages.length})\n\n━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    messages.forEach((msg, index) => {
      response += `📌 *ID:* ${msg.id}
👤 *Sent by:* ${msg.sent_by_name || msg.sent_by}
📝 *Message:* ${msg.message.substring(0, 50)}${msg.message.length > 50 ? '...' : ''}
🎯 *Type:* ${msg.type} | *Target:* ${msg.target}
👥 *Recipients:* ${msg.recipient_count}
📅 *Time:* ${new Date(msg.created_at).toLocaleString()}
${index < messages.length - 1 ? '\n──────────────────────\n\n' : ''}`;
    });

    response += `\n━━━━━━━━━━━━━━━━━━━━━━
💡 *Delete message:* DELETE <id>`;

    return response;

  } catch (error) {
    console.error('View pending error:', error);
    return `❌ *Error viewing messages*`;
  }
}

// ============================================
// DELETE MESSAGE
// ============================================

async function deleteMessage(msgId, adminData) {
  try {
    // First check if message exists and belongs to admin's institution
    const { data: msg, error: checkError } = await supabase
      .from('admin_messages')
      .select('*')
      .eq('id', msgId)
      .eq('institution_id', adminData.institution_id)
      .single();

    if (checkError || !msg) {
      return `❌ *Message not found or access denied*\n\nID: ${msgId}`;
    }

    if (msg.status !== 'pending') {
      return `❌ *Cannot delete message*\n\nThis message has already been ${msg.status}.`;
    }

    // Update message status to cancelled
    const { error: updateError } = await supabase
      .from('admin_messages')
      .update({ status: 'cancelled' })
      .eq('id', msgId);

    if (updateError) {
      return `❌ *Error deleting message*`;
    }
    
    // Update all associated logs
    await supabase
      .from('admin_message_logs')
      .update({ status: 'cancelled' })
      .eq('message_id', msgId)
      .eq('status', 'pending');

    return `✅ *Message Cancelled*

📋 *ID:* ${msgId}
👤 *Sent by:* ${msg.sent_by_name || msg.sent_by}
📝 *Message:* ${msg.message}
🎯 *Type:* ${msg.type} | *Target:* ${msg.target}
👥 *Affected Recipients:* ${msg.recipient_count}`;

  } catch (error) {
    console.error('Delete message error:', error);
    return `❌ *Error deleting message*`;
  }
}

// ============================================
// VIEW MESSAGE HISTORY
// ============================================

async function viewMessageHistory(adminData) {
  try {
    const { data: messages, error } = await supabase
      .from('admin_messages')
      .select('*')
      .eq('institution_id', adminData.institution_id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching history:', error);
      return `❌ *Error fetching message history*`;
    }

    if (!messages || messages.length === 0) {
      return `📋 *No Messages Found*\n\nNo messages have been sent yet.`;
    }

    let response = `📋 *MESSAGE HISTORY*\n\n━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    messages.forEach((msg, index) => {
      const statusEmoji = msg.status === 'delivered' ? '🟢' : 
                          msg.status === 'cancelled' ? '🔴' : 
                          msg.status === 'pending' ? '🟡' : '⚪';
      
      response += `${statusEmoji} *ID:* ${msg.id} | *Status:* ${msg.status.toUpperCase()}
👤 *Sent by:* ${msg.sent_by_name || msg.sent_by}
📝 *Message:* ${msg.message.substring(0, 60)}${msg.message.length > 60 ? '...' : ''}
🎯 *Type:* ${msg.type} | *Target:* ${msg.target}
👥 *Recipients:* ${msg.recipient_count}
📅 *Time:* ${new Date(msg.created_at).toLocaleString()}
${index < messages.length - 1 ? '\n──────────────────────\n\n' : ''}`;
    });

    response += `\n━━━━━━━━━━━━━━━━━━━━━━
💡 Total messages shown: ${messages.length}`;

    return response;

  } catch (error) {
    console.error('View history error:', error);
    return `❌ *Error viewing history*`;
  }
}

// ============================================
// CHECK AND DELIVER PENDING MESSAGES
// This is called when a student messages the bot
// ============================================

export async function checkAndDeliverAdminMessages(phoneNumber) {
  try {
    console.log(`📬 Checking pending messages for: ${phoneNumber}`);
    
    // Find pending messages for this phone number
    const { data: pendingMessages, error } = await supabase
      .from('admin_message_logs')
      .select('*')
      .or(`student_phone.eq.${phoneNumber},student_phone.eq.${parseInt(phoneNumber)}`)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(5);

    if (error) {
      console.error('Error fetching pending messages:', error);
      return null;
    }

    if (!pendingMessages || pendingMessages.length === 0) {
      console.log('📬 No pending messages found');
      return null;
    }

    console.log(`📬 Found ${pendingMessages.length} pending messages`);

    // Format messages for return
    const messages = pendingMessages.map(log => ({
      id: log.id,
      message: `📢 *MESSAGE FROM ADMIN*

━━━━━━━━━━━━━━━━━━━━━━
${log.message}
━━━━━━━━━━━━━━━━━━━━━━

📅 *Date:* ${new Date(log.created_at).toLocaleDateString()}
🕐 *Time:* ${new Date(log.created_at).toLocaleTimeString()}`,
      logId: log.id,
      messageId: log.message_id,
      studentUsn: log.student_usn
    }));

    return messages;

  } catch (error) {
    console.error('Check admin messages error:', error);
    return null;
  }
}

// ============================================
// MARK MESSAGES AS DELIVERED
// ============================================

export async function markMessageAsDelivered(messageIds) {
  try {
    if (!messageIds || messageIds.length === 0) {
      console.log('No message IDs to mark as delivered');
      return false;
    }

    console.log(`✅ Marking ${messageIds.length} messages as delivered`);
    
    // Update individual message logs to delivered
    const { error: updateError } = await supabase
      .from('admin_message_logs')
      .update({ 
        status: 'delivered',
        delivered_at: new Date().toISOString()
      })
      .in('id', messageIds);

    if (updateError) {
      console.error('Error marking as delivered:', updateError);
      return false;
    }

    // Get message IDs that were updated
    const { data: updatedLogs } = await supabase
      .from('admin_message_logs')
      .select('message_id')
      .in('id', messageIds);

    if (!updatedLogs || updatedLogs.length === 0) {
      return true;
    }

    // Get unique parent message IDs
    const parentIds = [...new Set(updatedLogs.map(log => log.message_id))];

    // Check if all child messages are delivered for each parent
    for (const msgId of parentIds) {
      const { data: remainingPending } = await supabase
        .from('admin_message_logs')
        .select('id')
        .eq('message_id', msgId)
        .eq('status', 'pending');

      // If no more pending messages for this parent, mark parent as delivered
      if (!remainingPending || remainingPending.length === 0) {
        await supabase
          .from('admin_messages')
          .update({ 
            status: 'delivered',
            delivered_at: new Date().toISOString()
          })
          .eq('id', msgId);
          
        console.log(`✅ Parent message ${msgId} fully delivered`);
      }
    }

    return true;

  } catch (error) {
    console.error('Mark delivered error:', error);
    return false;
  }
}

// ============================================
// PROCESS PENDING MESSAGES (BACKGROUND JOB)
// Optional: Can be called periodically
// ============================================

export async function processPendingMessages() {
  try {
    console.log('🔄 Processing pending messages batch...');
    
    // Get all pending message logs
    const { data: pendingLogs, error: fetchError } = await supabase
      .from('admin_message_logs')
      .select(`
        id,
        message_id,
        student_usn,
        student_name,
        student_phone,
        message,
        status,
        created_at,
        admin_messages!inner(status)
      `)
      .eq('status', 'pending')
      .eq('admin_messages.status', 'pending')
      .limit(50);

    if (fetchError || !pendingLogs || pendingLogs.length === 0) {
      console.log('No pending messages to process');
      return { processed: 0, message: 'No pending messages to process' };
    }

    console.log(`Found ${pendingLogs.length} pending messages to process`);
    
    let processedCount = 0;
    let failedCount = 0;

    for (const log of pendingLogs) {
      try {
        // Format the message for WhatsApp
        const formattedMessage = `📢 *MESSAGE FROM ADMIN*

━━━━━━━━━━━━━━━━━━━━━━
${log.message}
━━━━━━━━━━━━━━━━━━━━━━

📅 *Date:* ${new Date(log.created_at).toLocaleDateString()}
🕐 *Time:* ${new Date(log.created_at).toLocaleTimeString()}

💡 Reply with HELP for options`;

        // HERE: You would send via WhatsApp API
        // For now, we just mark as delivered
        // When you integrate with WhatsApp sending, replace this comment
        
        // Example WhatsApp API call:
        // await sendWhatsAppMessage(log.student_phone, formattedMessage);

        // Mark as delivered
        await supabase
          .from('admin_message_logs')
          .update({ 
            status: 'delivered',
            delivered_at: new Date().toISOString()
          })
          .eq('id', log.id);

        processedCount++;
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`Error processing log ${log.id}:`, error);
        failedCount++;
        
        // Mark as failed
        await supabase
          .from('admin_message_logs')
          .update({ 
            status: 'failed',
            error_message: error.message
          })
          .eq('id', log.id);
      }
    }

    // Update parent message status if all logs are processed
    if (processedCount > 0) {
      const parentMessageIds = [...new Set(pendingLogs.map(log => log.message_id))];
      
      for (const msgId of parentMessageIds) {
        const { data: remainingPending } = await supabase
          .from('admin_message_logs')
          .select('id')
          .eq('message_id', msgId)
          .eq('status', 'pending');

        if (!remainingPending || remainingPending.length === 0) {
          await supabase
            .from('admin_messages')
            .update({ 
              status: 'delivered',
              delivered_at: new Date().toISOString()
            })
            .eq('id', msgId);
            
          console.log(`✅ Parent message ${msgId} fully delivered`);
        }
      }
    }

    console.log(`✅ Processed: ${processedCount} delivered, ${failedCount} failed`);
    
    return { 
      processed: processedCount, 
      failed: failedCount,
      total: pendingLogs.length,
      message: `Processed ${processedCount}/${pendingLogs.length} messages`
    };

  } catch (error) {
    console.error('Process pending messages error:', error);
    return { processed: 0, error: error.message };
  }
}