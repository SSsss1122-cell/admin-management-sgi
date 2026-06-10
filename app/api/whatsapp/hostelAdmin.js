import { supabase } from '../../lib/supabase';

export async function handleHostelAdminCommands(userMessage, cleanNumber) {
  const upper = userMessage?.toUpperCase().trim() || '';
  const lower = userMessage?.toLowerCase().trim() || '';

  console.log(`🏨 Hostel Admin: "${userMessage}"`);

  // Single-letter commands
  if (['HOSTEL', 'MENU', 'START', 'HELP'].includes(upper)) return getMenu();
  if (upper === 'A') return await getResidentList();
  if (upper === 'B') return '🔍 *SEARCH*\nFormat: B <name or PRN>\nExample: B Suhani';
  if (upper === 'C') return await getResidentCountWithCourse();
  if (upper === 'D') return await getRoomList();
  if (upper === 'E') return '🚪 *ROOM DETAILS*\nFormat: E <room_no>\nExample: E 26';
  if (upper === 'F') return await getVacantRooms();
  if (upper === 'G') return '💰 *FEE CHECK*\nFormat: G <name or PRN>\nExample: G Suhani';
  if (upper === 'I') return await getHostelFeesSummary();
  if (upper === 'N') return await getHostelStatistics();
  if (upper === 'M') return await getMessManagement();
  if (upper === 'ATT') return await getAttendanceSummary();
  if (upper === 'WARN') return await getWarningsList();

  // Commands with arguments
  if (lower.startsWith('b ')) return await searchResident(userMessage.substring(2).trim());
  if (lower.startsWith('e ')) return await getRoomOccupants(userMessage.substring(2).trim());
  if (lower.startsWith('g ')) return await getResidentFeeDetails(userMessage.substring(2).trim());
  if (lower.startsWith('h ')) return await updateResidentFee(userMessage.substring(2).trim().split('|'));
  if (lower.startsWith('add ')) return await addResident(userMessage.substring(4).trim().split('|'));
  if (lower.startsWith('del ')) return await deleteResident(userMessage.substring(4).trim());
  if (lower.startsWith('move ')) return await moveResidentRoom(userMessage.substring(5).trim().split('|'));
  if (lower.startsWith('due ')) return await getDueResidents();
  if (lower.startsWith('pay ')) return await recordFeePayment(userMessage.substring(4).trim().split('|'));
  if (lower.startsWith('att ')) return await markAttendance(userMessage.substring(4).trim().split('|'));
  if (lower.startsWith('fine ')) return await addFine(userMessage.substring(5).trim().split('|'));
  if (lower.startsWith('scholar ')) return await addScholarship(userMessage.substring(8).trim().split('|'));
  if (lower.startsWith('late ')) return await markLateEntry(userMessage.substring(5).trim().split('|'));
  if (lower.startsWith('mess ')) return await updateMessSubscription(userMessage.substring(5).trim().split('|'));
  if (lower.startsWith('warn ')) return await addWarning(userMessage.substring(5).trim().split('|'));
  if (lower.startsWith('roomtype ')) return await updateRoomType(userMessage.substring(9).trim().split('|'));
  if (lower.startsWith('block ')) return await updateHostelBlock(userMessage.substring(6).trim().split('|'));
  if (lower.startsWith('paymode ')) return await updatePaymentMode(userMessage.substring(8).trim().split('|'));

  return `❓ Command samajh nahi aaya.\n\nType *MENU* for help.`;
}

// ─── MENU ──────────────────────────────────────────────

function getMenu() {
  return `🏨 *HOSTEL ADMIN PANEL v2.0*
━━━━━━━━━━━━━━━━━━━━

👥 *RESIDENTS*
 A → Resident list
 B → Search resident (B Suhani)
 C → Count by course
 ADD → Add resident (ADD name|PRN|course|room)

🚪 *ROOMS*
 D → Room list
 E → Room details (E 26)
 F → Vacant rooms
 MOVE → Move resident (MOVE PRN|newRoom)
 ROOMTYPE → Update room type (ROOMTYPE PRN|type)
 BLOCK → Update hostel block (BLOCK PRN|block)

💰 *FEES*
 G → Fee check (G Suhani)
 H → Update fee (H PRN|amount)
 I → Fee summary
 DUE → Due payments list
 PAY → Record payment (PAY PRN|amount)
 PAYMODE → Update payment mode (PAYMODE PRN|mode)
 SCHOLAR → Add scholarship (SCHOLAR PRN|amount|type)

📊 *ATTENDANCE*
 ATT → Attendance summary
 ATT PRN|status → Mark attendance
 LATE PRN|minutes → Mark late entry

⚠️ *DISCIPLINE*
 WARN → View all warnings
 WARN PRN|reason → Add warning
 FINE PRN|amount|reason → Add fine

🍽️ *MESS*
 M → Mess management
 MESS PRN|subscribe → Update mess (YES/NO)

━━━━━━━━━━━━━━━━━━━━
💡 Command formats:
• ADD name|PRN|course|room|batch|total|due|sharing
• FINE PRN|500|Late night entry
• SCHOLAR PRN|25000|Merit
• ROOMTYPE PRN|Deluxe
• BLOCK PRN|B`;
}

// ─── RESIDENTS (Enhanced) ─────────────────────────────────────────

async function getResidentList() {
  try {
    const { data, error } = await supabase
      .from('Hostel new')
      .select('"Resident Name", Course, Room, "Due amount", "Room Type", "Hostel Block"')
      .order('"Resident Name"');

    if (error) return `❌ DB Error: ${error.message}`;
    if (!data || data.length === 0) return '📭 No residents found.';

    let msg = `👥 *RESIDENT LIST* (${data.length})\n━━━━━━━━━━━━━━━━━━━━\n\n`;
    const displayData = data.slice(0, 30);
    for (let i = 0; i < displayData.length; i++) {
      const r = displayData[i];
      const due = r["Due amount"] || 0;
      const dueIcon = due > 0 ? '⚠️' : '✅';
      msg += `${i + 1}. *${r["Resident Name"]}*\n`;
      msg += `   📚 ${r.Course} | Room ${r.Room}\n`;
      msg += `   🏢 Block ${r["Hostel Block"] || 'A'} | ${r["Room Type"] || 'Standard'}\n`;
      msg += `   ${dueIcon} Due: ₹${due.toLocaleString()}\n\n`;
    }
    if (data.length > 30) msg += `_...${data.length - 30} more. Use B to search._`;
    return msg;
  } catch (e) {
    return `❌ Error: ${e.message}`;
  }
}

async function searchResident(query) {
  if (!query) return '🔍 Format: B <name or PRN>';
  try {
    let results = [];

    // Search by PRN
    const { data: prnData } = await supabase
      .from('Hostel new')
      .select('*')
      .ilike('"PRN/Mobile  Number"', `%${query}%`);
    
    if (prnData && prnData.length > 0) results = prnData;

    // Search by name if no PRN results
    if (results.length === 0) {
      const { data: nameData } = await supabase
        .from('Hostel new')
        .select('*')
        .ilike('"Resident Name"', `%${query}%`);
      if (nameData && nameData.length > 0) results = nameData;
    }

    if (results.length === 0) return `❌ No resident found for: *${query}*`;

    let msg = `🔍 *SEARCH: "${query}"* (${results.length})\n━━━━━━━━━━━━━━━━━━━━\n\n`;
    for (const r of results) {
      msg += `👤 *${r["Resident Name"]}*\n`;
      msg += `📱 PRN: ${r["PRN/Mobile  Number"] || 'N/A'}\n`;
      msg += `📚 ${r.Course || 'N/A'} | Batch ${r.Batch || 'N/A'}\n`;
      msg += `🚪 Room ${r.Room || 'N/A'} (${r.Sharing || 'N/A'}-sharing)\n`;
      msg += `🏢 Block ${r["Hostel Block"] || 'A'} | ${r["Room Type"] || 'Standard'}\n`;
      msg += `💰 Total: ₹${(r["Total Amount"] || 0).toLocaleString()}\n`;
      msg += `💵 Due: ₹${(r["Due amount"] || 0).toLocaleString()}\n`;
      msg += `📅 Due Date: ${r["Fees Due Date(DD-MM-YY)"] || 'N/A'}\n`;
      msg += `🍽️ Mess: ${r["Mess Subscription"] ? 'Yes' : 'No'}\n`;
      msg += `⚠️ Warnings: ${r["Warning Count"] || 0}\n`;
      msg += `💰 Fines: ₹${(r["Fine Amount"] || 0).toLocaleString()}\n`;
      msg += `🎓 Scholarship: ₹${(r["Scholarship Amount"] || 0).toLocaleString()}\n\n`;
    }
    return msg;
  } catch (e) {
    return `❌ Error: ${e.message}`;
  }
}

// ─── ROOM MANAGEMENT (Enhanced) ─────────────────────────────────

async function getRoomList() {
  try {
    const { data, error } = await supabase.from('Hostel new').select('Room, Sharing, "Room Type", "Hostel Block"');
    if (error) return `❌ DB Error: ${error.message}`;
    if (!data || data.length === 0) return '🚪 No rooms found.';

    const roomMap = new Map();
    for (const r of data) {
      const roomNum = r.Room;
      const key = `${r["Hostel Block"] || 'A'}-${roomNum}`;
      if (!roomMap.has(key)) {
        roomMap.set(key, { 
          sharing: r.Sharing, 
          count: 0, 
          roomType: r["Room Type"] || 'Standard',
          block: r["Hostel Block"] || 'A'
        });
      }
      roomMap.get(key).count++;
    }

    const rooms = Array.from(roomMap.entries()).sort();
    let msg = `🚪 *ROOMS DETAILS* (${rooms.length})\n━━━━━━━━━━━━━━━━━━━━\n\n`;
    for (const [room, d] of rooms) {
      const full = d.count >= d.sharing;
      msg += `${full ? '🔴' : '🟢'} ${room} — ${d.count}/${d.sharing}\n`;
      msg += `   📦 Type: ${d.roomType}\n\n`;
    }
    msg += `\n💡 Commands:\n• ROOMTYPE PRN|type\n• BLOCK PRN|block`;
    return msg;
  } catch (e) {
    return `❌ Error: ${e.message}`;
  }
}

async function updateRoomType(parts) {
  const prn = parts[0];
  const roomType = parts[1];
  
  if (!prn || !roomType) return '❌ Format: ROOMTYPE <PRN>|<type>\nTypes: Standard, Deluxe, Premium, AC, Non-AC';
  
  try {
    const { error } = await supabase
      .from('Hostel new')
      .update({ "Room Type": roomType })
      .ilike('"PRN/Mobile  Number"', `%${prn}%`);
      
    if (error) return `❌ Update failed: ${error.message}`;
    return `✅ Room type updated to *${roomType}* for PRN: ${prn}`;
  } catch (e) {
    return `❌ Error: ${e.message}`;
  }
}

async function updateHostelBlock(parts) {
  const prn = parts[0];
  const block = parts[1];
  
  if (!prn || !block) return '❌ Format: BLOCK <PRN>|<block>\nBlocks: A, B, C, D';
  
  try {
    const { error } = await supabase
      .from('Hostel new')
      .update({ "Hostel Block": block.toUpperCase() })
      .ilike('"PRN/Mobile  Number"', `%${prn}%`);
      
    if (error) return `❌ Update failed: ${error.message}`;
    return `✅ Hostel block updated to *${block.toUpperCase()}* for PRN: ${prn}`;
  } catch (e) {
    return `❌ Error: ${e.message}`;
  }
}

// ─── FEE MANAGEMENT (Enhanced) ─────────────────────────────────

async function addFine(parts) {
  const prn = parts[0];
  const amount = parts[1];
  const reason = parts[2] || 'No reason specified';
  
  if (!prn || !amount) return '❌ Format: FINE <PRN>|<amount>|<reason>\nExample: FINE 9876543210|500|Late night entry';
  
  try {
    const { data: resident } = await supabase
      .from('Hostel new')
      .select('"Fine Amount", "Resident Name"')
      .ilike('"PRN/Mobile  Number"', `%${prn}%`)
      .single();
      
    if (!resident) return `❌ Resident not found: ${prn}`;
    
    const currentFine = Number(resident["Fine Amount"]) || 0;
    const newFine = currentFine + Number(amount);
    
    const { error } = await supabase
      .from('Hostel new')
      .update({ 
        "Fine Amount": newFine,
        "Fine Reason": reason,
        "Due amount": (Number(resident["Due amount"]) || 0) + Number(amount)
      })
      .ilike('"PRN/Mobile  Number"', `%${prn}%`);
      
    if (error) return `❌ Failed to add fine: ${error.message}`;
    
    return `⚠️ *FINE ADDED*
━━━━━━━━━━━━━━━━━━━━
👤 ${resident["Resident Name"]}
💰 Fine Amount: ₹${Number(amount).toLocaleString()}
📝 Reason: ${reason}
💵 Total Fine: ₹${newFine.toLocaleString()}`;
  } catch (e) {
    return `❌ Error: ${e.message}`;
  }
}

async function addScholarship(parts) {
  const prn = parts[0];
  const amount = parts[1];
  const type = parts[2] || 'General';
  
  if (!prn || !amount) return '❌ Format: SCHOLAR <PRN>|<amount>|<type>\nExample: SCHOLAR 9876543210|25000|Merit';
  
  try {
    const { data: resident } = await supabase
      .from('Hostel new')
      .select('"Scholarship Amount", "Due amount", "Resident Name"')
      .ilike('"PRN/Mobile  Number"', `%${prn}%`)
      .single();
      
    if (!resident) return `❌ Resident not found: ${prn}`;
    
    const currentScholarship = Number(resident["Scholarship Amount"]) || 0;
    const newScholarship = currentScholarship + Number(amount);
    const newDue = Math.max(0, (Number(resident["Due amount"]) || 0) - Number(amount));
    
    const { error } = await supabase
      .from('Hostel new')
      .update({ 
        "Scholarship Amount": newScholarship,
        "Scholarship Type": type,
        "Due amount": newDue
      })
      .ilike('"PRN/Mobile  Number"', `%${prn}%`);
      
    if (error) return `❌ Failed to add scholarship: ${error.message}`;
    
    return `🎓 *SCHOLARSHIP ADDED*
━━━━━━━━━━━━━━━━━━━━
👤 ${resident["Resident Name"]}
💰 Amount: ₹${Number(amount).toLocaleString()}
📝 Type: ${type}
💵 New Due: ₹${newDue.toLocaleString()}`;
  } catch (e) {
    return `❌ Error: ${e.message}`;
  }
}

async function updatePaymentMode(parts) {
  const prn = parts[0];
  const mode = parts[1];
  
  if (!prn || !mode) return '❌ Format: PAYMODE <PRN>|<mode>\nModes: Cash, Card, UPI, Bank Transfer, Cheque';
  
  try {
    const { error } = await supabase
      .from('Hostel new')
      .update({ "Payment Mode": mode })
      .ilike('"PRN/Mobile  Number"', `%${prn}%`);
      
    if (error) return `❌ Update failed: ${error.message}`;
    return `✅ Payment mode updated to *${mode}* for PRN: ${prn}`;
  } catch (e) {
    return `❌ Error: ${e.message}`;
  }
}

// ─── ATTENDANCE MANAGEMENT ─────────────────────────────────

async function getAttendanceSummary() {
  try {
    const { data, error } = await supabase
      .from('Hostel new')
      .select('"Resident Name", "Total Present Days", "Total Absent Days", "Total Late Entries"')
      .order('"Total Present Days"', { ascending: false });
      
    if (error) return `❌ DB Error: ${error.message}`;
    if (!data || data.length === 0) return '📭 No attendance data found.';
    
    let msg = `📊 *ATTENDANCE SUMMARY*\n━━━━━━━━━━━━━━━━━━━━\n\n`;
    const displayData = data.slice(0, 20);
    for (let i = 0; i < displayData.length; i++) {
      const r = displayData[i];
      const totalDays = (r["Total Present Days"] || 0) + (r["Total Absent Days"] || 0);
      const attendanceRate = totalDays > 0 ? ((r["Total Present Days"] || 0) / totalDays * 100).toFixed(1) : 0;
      msg += `${i + 1}. *${r["Resident Name"]}*\n`;
      msg += `   ✅ Present: ${r["Total Present Days"] || 0}\n`;
      msg += `   ❌ Absent: ${r["Total Absent Days"] || 0}\n`;
      msg += `   🕐 Late: ${r["Total Late Entries"] || 0}\n`;
      msg += `   📈 Rate: ${attendanceRate}%\n\n`;
    }
    return msg;
  } catch (e) {
    return `❌ Error: ${e.message}`;
  }
}

async function markAttendance(parts) {
  const prn = parts[0];
  const status = parts[1]?.toUpperCase();
  
  if (!prn || !status) return '❌ Format: ATT <PRN>|<status>\nStatus: PRESENT, ABSENT, LATE';
  
  try {
    const { data: resident } = await supabase
      .from('Hostel new')
      .select('"Total Present Days", "Total Absent Days"')
      .ilike('"PRN/Mobile  Number"', `%${prn}%`)
      .single();
      
    if (!resident) return `❌ Resident not found: ${prn}`;
    
    let updateData = {};
    if (status === 'PRESENT') {
      updateData["Total Present Days"] = (resident["Total Present Days"] || 0) + 1;
    } else if (status === 'ABSENT') {
      updateData["Total Absent Days"] = (resident["Total Absent Days"] || 0) + 1;
    } else {
      return '❌ Invalid status. Use: PRESENT, ABSENT, or LATE';
    }
    
    const { error } = await supabase
      .from('Hostel new')
      .update(updateData)
      .ilike('"PRN/Mobile  Number"', `%${prn}%`);
      
    if (error) return `❌ Failed to mark attendance: ${error.message}`;
    
    return `✅ Attendance marked as *${status}* for PRN: ${prn}`;
  } catch (e) {
    return `❌ Error: ${e.message}`;
  }
}

async function markLateEntry(parts) {
  const prn = parts[0];
  const minutes = parts[1];
  
  if (!prn || !minutes) return '❌ Format: LATE <PRN>|<minutes>\nExample: LATE 9876543210|30';
  
  try {
    const { data: resident } = await supabase
      .from('Hostel new')
      .select('"Total Late Entries"')
      .ilike('"PRN/Mobile  Number"', `%${prn}%`)
      .single();
      
    if (!resident) return `❌ Resident not found: ${prn}`;
    
    const { error } = await supabase
      .from('Hostel new')
      .update({ 
        "Total Late Entries": (resident["Total Late Entries"] || 0) + 1
      })
      .ilike('"PRN/Mobile  Number"', `%${prn}%`);
      
    if (error) return `❌ Failed to mark late entry: ${error.message}`;
    
    let fineMessage = '';
    const lateMinutes = parseInt(minutes);
    if (lateMinutes > 30) {
      fineMessage = '\n⚠️ Late fee of ₹50 added due to excessive delay';
      await addFine([prn, '50', 'Late entry exceeding 30 minutes']);
    }
    
    return `🕐 *LATE ENTRY MARKED*\nPRN: ${prn}\nLate by: ${minutes} minutes${fineMessage}`;
  } catch (e) {
    return `❌ Error: ${e.message}`;
  }
}

// ─── DISCIPLINE MANAGEMENT ─────────────────────────────────

async function addWarning(parts) {
  const prn = parts[0];
  const reason = parts[1] || 'General misconduct';
  
  if (!prn) return '❌ Format: WARN <PRN>|<reason>\nExample: WARN 9876543210|Room noisy after hours';
  
  try {
    const { data: resident } = await supabase
      .from('Hostel new')
      .select('"Warning Count", "Resident Name"')
      .ilike('"PRN/Mobile  Number"', `%${prn}%`)
      .single();
      
    if (!resident) return `❌ Resident not found: ${prn}`;
    
    const newWarningCount = (resident["Warning Count"] || 0) + 1;
    const isBlacklisted = newWarningCount >= 3;
    
    const { error } = await supabase
      .from('Hostel new')
      .update({ 
        "Warning Count": newWarningCount,
        "IsBlacklisted": isBlacklisted,
        "Fine Reason": reason
      })
      .ilike('"PRN/Mobile  Number"', `%${prn}%`);
      
    if (error) return `❌ Failed to add warning: ${error.message}`;
    
    let blacklistMsg = '';
    if (isBlacklisted) {
      blacklistMsg = '\n\n⚠️ *STUDENT HAS BEEN BLACKLISTED* ⚠️\nImmediate action required!';
    }
    
    return `⚠️ *WARNING ISSUED*
━━━━━━━━━━━━━━━━━━━━
👤 ${resident["Resident Name"]}
📝 Reason: ${reason}
⚠️ Total Warnings: ${newWarningCount}/3${blacklistMsg}`;
  } catch (e) {
    return `❌ Error: ${e.message}`;
  }
}

async function getWarningsList() {
  try {
    const { data, error } = await supabase
      .from('Hostel new')
      .select('"Resident Name", "PRN/Mobile  Number", "Warning Count", "Fine Reason", "IsBlacklisted"')
      .gt('"Warning Count"', 0)
      .order('"Warning Count"', { ascending: false });
      
    if (error) return `❌ DB Error: ${error.message}`;
    if (!data || data.length === 0) return '✅ No active warnings. All students have clean records.';
    
    let msg = `⚠️ *WARNINGS LIST* (${data.length})\n━━━━━━━━━━━━━━━━━━━━\n\n`;
    for (const r of data) {
      msg += `👤 *${r["Resident Name"]}*\n`;
      msg += `📱 ${r["PRN/Mobile  Number"]}\n`;
      msg += `⚠️ Warnings: ${r["Warning Count"]}/3\n`;
      if (r["IsBlacklisted"]) msg += `🔴 *BLACKLISTED*\n`;
      if (r["Fine Reason"]) msg += `📝 Last: ${r["Fine Reason"]}\n`;
      msg += `\n`;
    }
    return msg;
  } catch (e) {
    return `❌ Error: ${e.message}`;
  }
}

// ─── MESS MANAGEMENT ─────────────────────────────────

async function getMessManagement() {
  try {
    const { data, error } = await supabase
      .from('Hostel new')
      .select('"Mess Subscription", "Mess Type"')
      .eq('"Mess Subscription"', true);
      
    if (error) return `❌ DB Error: ${error.message}`;
    
    const totalSubscribed = data?.length || 0;
    const veg = data?.filter(r => r["Mess Type"] === 'Vegetarian').length || 0;
    const nonVeg = data?.filter(r => r["Mess Type"] === 'Non-Vegetarian').length || 0;
    const jain = data?.filter(r => r["Mess Type"] === 'Jain').length || 0;
    
    return `🍽️ *MESS MANAGEMENT*
━━━━━━━━━━━━━━━━━━━━
📊 Total Subscribed: *${totalSubscribed}*

🥗 Vegetarian: ${veg}
🍗 Non-Vegetarian: ${nonVeg}
🕉️ Jain: ${jain}

━━━━━━━━━━━━━━━━━━━━
💡 Commands:
• MESS PRN|YES/NO - Update subscription
• MESS PRN|TYPE|Veg/NonVeg/Jain - Update type`;
  } catch (e) {
    return `❌ Error: ${e.message}`;
  }
}

async function updateMessSubscription(parts) {
  const prn = parts[0];
  const subscribe = parts[1]?.toUpperCase();
  
  if (!prn || !subscribe) return '❌ Format: MESS <PRN>|<YES/NO>\nExample: MESS 9876543210|YES';
  
  try {
    const isSubscribed = subscribe === 'YES';
    const { error } = await supabase
      .from('Hostel new')
      .update({ "Mess Subscription": isSubscribed })
      .ilike('"PRN/Mobile  Number"', `%${prn}%`);
      
    if (error) return `❌ Update failed: ${error.message}`;
    return `✅ Mess subscription updated to *${subscribe}* for PRN: ${prn}`;
  } catch (e) {
    return `❌ Error: ${e.message}`;
  }
}

// ─── ENHANCED STATISTICS ─────────────────────────────────

async function getHostelStatistics() {
  try {
    const { data, error } = await supabase.from('Hostel new').select('*');
    if (error) return `❌ DB Error: ${error.message}`;
    if (!data || data.length === 0) return '📭 No data.';

    const rooms = new Map();
    let totalFees = 0;
    let totalDue = 0;
    let totalFines = 0;
    let totalScholarship = 0;
    let totalWarnings = 0;
    let blacklisted = 0;
    let messSubscribers = 0;
    
    for (const r of data) {
      totalFees += Number(r["Total Amount"]) || 0;
      totalDue += Number(r["Due amount"]) || 0;
      totalFines += Number(r["Fine Amount"]) || 0;
      totalScholarship += Number(r["Scholarship Amount"]) || 0;
      totalWarnings += Number(r["Warning Count"]) || 0;
      if (r["IsBlacklisted"]) blacklisted++;
      if (r["Mess Subscription"]) messSubscribers++;
      
      const roomNum = r.Room;
      if (!rooms.has(roomNum)) {
        rooms.set(roomNum, { count: 0, sharing: r.Sharing });
      }
      rooms.get(roomNum).count++;
    }

    let full = 0, vacant = 0;
    for (const d of rooms.values()) {
      if (d.count >= d.sharing) full++;
      else vacant++;
    }

    const totalPaid = totalFees - totalDue;
    const collectionRate = totalFees > 0 ? (totalPaid / totalFees) * 100 : 0;
    const occupancyRate = (data.length / (rooms.size * 4)) * 100;

    const uniqueCourses = new Set();
    const uniqueBatches = new Set();
    for (const r of data) {
      if (r.Course) uniqueCourses.add(r.Course);
      if (r.Batch) uniqueBatches.add(r.Batch);
    }

    return `📊 *HOSTEL STATISTICS*
━━━━━━━━━━━━━━━━━━━━
👥 Residents: *${data.length}*
🚪 Rooms: *${rooms.size}* (🔴 ${full} full | 🟢 ${vacant} vacant)
📈 Occupancy: ${occupancyRate.toFixed(1)}%
📚 Courses: ${uniqueCourses.size} | Batches: ${uniqueBatches.size}

💰 *FINANCIALS*
Total Fees: ₹${totalFees.toLocaleString()}
Paid: ₹${totalPaid.toLocaleString()}
Due: ₹${totalDue.toLocaleString()}
Collection Rate: ${collectionRate.toFixed(1)}%
Fines Collected: ₹${totalFines.toLocaleString()}
Scholarship Given: ₹${totalScholarship.toLocaleString()}

⚠️ *DISCIPLINE*
Total Warnings: ${totalWarnings}
Blacklisted: ${blacklisted}

🍽️ *MESS*
Subscribers: ${messSubscribers}/${data.length} (${((messSubscribers/data.length)*100).toFixed(1)}%)`;
  } catch (e) {
    return `❌ Error: ${e.message}`;
  }
}

// Keep all your existing functions (getResidentCountWithCourse, getRoomOccupants, getVacantRooms, etc.)
// ... (rest of your existing functions remain the same)