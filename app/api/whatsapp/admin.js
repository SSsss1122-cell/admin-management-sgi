import { supabase } from '@/lib/supabase';

// ============================================
// ADMIN NUMBERS LIST
// ============================================

const ADMIN_NUMBERS = ['9480072737', '9900842058'];

// ============================================
// HANDLE ADMIN COMMANDS
// ============================================

export async function handleAdminCommands(userMessage, cleanNumber) {
  // Check if sender is admin
  if (!ADMIN_NUMBERS.includes(cleanNumber)) {
    return `❌ *Access Denied*

Only admin can use this feature.

📞 Contact admin: ${ADMIN_NUMBERS.join(' or ')}`;
  }

  const upperMsg = userMessage?.toUpperCase().trim() || '';
  let replyMessage = '';
  
  // Help/Menu
  if (['HELP', 'MENU', 'ADMIN', 'ADMIN HELP'].includes(upperMsg)) {
    replyMessage = getAdminMenu();
  }
  
  // Broadcast message to all students
  else if (upperMsg.startsWith('BROADCAST') || upperMsg.startsWith('BC ')) {
    const message = userMessage.replace(/^(BROADCAST|BC)\s+/i, '').trim();
    replyMessage = await handleBroadcast(message, cleanNumber);
  }
  
  // Send message to specific student by USN
  else if (upperMsg.startsWith('SEND ') || upperMsg.startsWith('MSG ')) {
    const content = userMessage.replace(/^(SEND|MSG)\s+/i, '').trim();
    replyMessage = await handleSendToStudent(content, cleanNumber);
  }
  
  // Send message to specific route/class/branch
  else if (upperMsg.startsWith('ROUTE ') || upperMsg.startsWith('CLASS ') || upperMsg.startsWith('BRANCH ')) {
    const parts = userMessage.split(/\s+/);
    const command = parts[0].toUpperCase();
    const target = parts[1];
    const message = parts.slice(2).join(' ');
    replyMessage = await handleGroupMessage(command, target, message, cleanNumber);
  }
  
  // View pending messages
  else if (upperMsg === 'PENDING' || upperMsg === 'PENDING MSG') {
    replyMessage = await viewPendingMessages();
  }
  
  // Delete a pending message
  else if (upperMsg.startsWith('DELETE ')) {
    const msgId = upperMsg.replace('DELETE ', '').trim();
    replyMessage = await deleteMessage(msgId);
  }
  
  // View all sent messages history
  else if (upperMsg === 'HISTORY' || upperMsg === 'MSG HISTORY') {
    replyMessage = await viewMessageHistory();
  }
  
  // View admin list
  else if (upperMsg === 'ADMINS' || upperMsg === 'ADMIN LIST') {
    replyMessage = getAdminList();
  }
  
  // Default
  else {
    replyMessage = getAdminMenu();
  }
  
  return replyMessage;
}

// ============================================
// ADMIN MENU
// ============================================

function getAdminMenu() {
  return `╔════════════════════════════╗
║   👑 *ADMIN PANEL*        ║
║   SGI Bus Management      ║
╚════════════════════════════╝

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

👥 *Admins:* ${ADMIN_NUMBERS.join(', ')}`;
}

// ============================================
// GET ADMIN LIST
// ============================================

function getAdminList() {
  return `╔════════════════════════════╗
║   👑 *ADMIN LIST*         ║
╚════════════════════════════╝

📞 *Admin Contacts:*
${ADMIN_NUMBERS.map((num, i) => `   ${i + 1}. ${num}`).join('\n')}

💡 *Total Admins:* ${ADMIN_NUMBERS.length}

━━━━━━━━━━━━━━━━━━━━━━
Send HELP for admin commands`;
}

// ============================================
// BROADCAST TO ALL STUDENTS
// ============================================

async function handleBroadcast(message, adminPhone) {
  if (!message || message.trim().length === 0) {
    return `❌ *Please provide a message to broadcast*

📌 Example: *BROADCAST Bus will be late today*`;
  }

  try {
    // Fetch all students with phone numbers
    const { data: students, error: fetchError } = await supabase
      .from('students')
      .select('usn, full_name, phone_number, phone, routes, class, branch')
      .not('phone_number', 'is', null);

    if (fetchError) {
      console.error('Error fetching students:', fetchError);
      return `❌ *Error fetching students*

${fetchError.message}`;
    }

    if (!students || students.length === 0) {
      return `❌ *No students found in database*`;
    }

    // Store message in admin_messages table
    const { data: insertedMsg, error: insertError } = await supabase
      .from('admin_messages')
      .insert([
        {
          message: message.trim(),
          sent_by: adminPhone,
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
      return `❌ *Error storing message*

${insertError.message}`;
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
👤 *Sent by Admin:* ${adminPhone}
📝 *Message:* ${message.trim()}
👥 *Recipients:* ${students.length} students
📅 *Time:* ${new Date().toLocaleString()}

━━━━━━━━━━━━━━━━━━━━━━

*📋 First 20 Students:*
`;

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
    return `❌ *Broadcast failed*

Error: ${error.message}

Please try again.`;
  }
}

// ============================================
// SEND TO SPECIFIC STUDENT
// ============================================

async function handleSendToStudent(content, adminPhone) {
  const parts = content.split(/\s+/);
  
  if (parts.length < 2) {
    return `❌ *Invalid format*

📌 Usage: *SEND <USN> <message>*

Example: *SEND 3TS25CS004 Bus route changed*`;
  }

  const usn = parts[0];
  const message = parts.slice(1).join(' ');

  try {
    // Find student by USN
    const { data: student, error: fetchError } = await supabase
      .from('students')
      .select('*')
      .ilike('usn', usn)
      .single();

    if (fetchError || !student) {
      return `❌ *Student not found with USN:* ${usn}

Please check the USN and try again.`;
    }

    if (!student.phone_number && !student.phone) {
      return `❌ *No phone number for:* ${student.full_name} (${student.usn})

Cannot send message to this student.`;
    }

    // Store message in admin_messages table
    const { data: insertedMsg, error: insertError } = await supabase
      .from('admin_messages')
      .insert([
        {
          message: message.trim(),
          sent_by: adminPhone,
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
          created_at: new Date().toISOString()
        }
      ]);

    if (recordError) {
      console.error('Error inserting message record:', recordError);
    }

    return `✅ *Message Stored for Student*

📋 *Message ID:* ${insertedMsg.id}
👤 *Sent by Admin:* ${adminPhone}
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
    return `❌ *Failed to send message*

Error: ${error.message}`;
  }
}

// ============================================
// SEND TO GROUP (ROUTE/CLASS/BRANCH)
// ============================================

async function handleGroupMessage(command, target, message, adminPhone) {
  if (!target || !message || message.trim().length === 0) {
    return `❌ *Invalid format*

📌 Usage: *${command} <${command === 'ROUTE' ? 'route-name' : command === 'CLASS' ? 'class-name' : 'branch-name'}> <message>*

Example: *${command} ${command === 'ROUTE' ? 'Route-5' : command === 'CLASS' ? '10A' : 'CSE'} Bus timing changed*`;
  }

  try {
    let query = supabase.from('students').select('*');
    let filterField = '';

    // Build query based on command type
    if (command === 'ROUTE') {
      filterField = 'routes';
      query = query.ilike('routes', `%${target}%`);
    } else if (command === 'CLASS') {
      filterField = 'class';
      query = query.ilike('class', `%${target}%`);
    } else if (command === 'BRANCH') {
      filterField = 'branch';
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
👤 *Sent by Admin:* ${adminPhone}
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
    return `❌ *Failed to send group message*

Error: ${error.message}`;
  }
}

// ============================================
// VIEW PENDING MESSAGES
// ============================================

async function viewPendingMessages() {
  try {
    const { data: messages, error } = await supabase
      .from('admin_messages')
      .select('*')
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

    let response = `📋 *PENDING MESSAGES* (${messages.length})\n
━━━━━━━━━━━━━━━━━━━━━━\n`;

    messages.forEach((msg, index) => {
      const adminLabel = ADMIN_NUMBERS.includes(msg.sent_by) ? '👑 Admin' : 'User';
      response += `📌 *ID:* ${msg.id}
👤 *Sent by:* ${msg.sent_by} (${adminLabel})
📝 *Message:* ${msg.message}
🎯 *Type:* ${msg.type} | *Target:* ${msg.target}
👥 *Recipients:* ${msg.recipient_count}
📅 *Time:* ${new Date(msg.created_at).toLocaleString()}
${index < messages.length - 1 ? '\n──────────────────────\n' : ''}`;
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

async function deleteMessage(msgId) {
  try {
    // Update message status to cancelled
    const { data: msg, error: updateError } = await supabase
      .from('admin_messages')
      .update({ status: 'cancelled' })
      .eq('id', msgId)
      .eq('status', 'pending')
      .select()
      .single();

    if (updateError || !msg) {
      return `❌ *Message not found or already processed*

ID: ${msgId}`;
    }

    // Check if the admin who sent this message is deleting it
    // (Any admin can delete any message)
    
    // Update all associated logs
    await supabase
      .from('admin_message_logs')
      .update({ status: 'cancelled' })
      .eq('message_id', msgId)
      .eq('status', 'pending');

    return `✅ *Message Cancelled*

📋 *ID:* ${msgId}
👤 *Sent by Admin:* ${msg.sent_by}
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

async function viewMessageHistory() {
  try {
    const { data: messages, error } = await supabase
      .from('admin_messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching history:', error);
      return `❌ *Error fetching message history*`;
    }

    if (!messages || messages.length === 0) {
      return `📋 *No Messages Found*

No messages have been sent yet.`;
    }

    let response = `📋 *MESSAGE HISTORY*\n
━━━━━━━━━━━━━━━━━━━━━━\n`;

    messages.forEach((msg, index) => {
      const statusEmoji = msg.status === 'delivered' ? '🟢' : 
                          msg.status === 'cancelled' ? '🔴' : 
                          msg.status === 'pending' ? '🟡' : '⚪';
      
      const adminLabel = ADMIN_NUMBERS.includes(msg.sent_by) ? '👑 Admin' : 'User';
      
      response += `${statusEmoji} *ID:* ${msg.id} | *Status:* ${msg.status.toUpperCase()}
👤 *Sent by:* ${msg.sent_by} (${adminLabel})
📝 *Message:* ${msg.message}
🎯 *Type:* ${msg.type} | *Target:* ${msg.target}
👥 *Recipients:* ${msg.recipient_count}
📅 *Time:* ${new Date(msg.created_at).toLocaleString()}
${index < messages.length - 1 ? '\n──────────────────────\n' : ''}`;
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