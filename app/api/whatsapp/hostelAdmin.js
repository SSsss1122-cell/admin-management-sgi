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

  return `❓ Command samajh nahi aaya.\n\nType *MENU* for help.`;
}

// ─── MENU ──────────────────────────────────────────────

function getMenu() {
  return `🏨 *HOSTEL ADMIN PANEL*
━━━━━━━━━━━━━━━━━━━━

👥 *RESIDENTS*
 A → Resident list
 B → Search resident (B Suhani)
 C → Count by course

🚪 *ROOMS*
 D → Room list
 E → Room details (E 26)
 F → Vacant rooms

💰 *FEES*
 G → Fee check (G Suhani)
 H → Update fee (H PRN|amount)
 I → Fee summary
 DUE → Due payments list
 PAY → Record payment (PAY PRN|amount)

📊 *OTHER*
 N → Statistics
 ADD → ADD name|PRN|course|room
 DEL → DEL PRN
 MOVE → MOVE PRN|newRoom

━━━━━━━━━━━━━━━━━━━━
💡 Example: ADD John|9876543210|BAMS|26`;
}

// ─── RESIDENTS ─────────────────────────────────────────

async function getResidentList() {
  try {
    const { data, error } = await supabase
      .from('Hostel new')
      .select('"Resident Name", Course, Room')
      .order('"Resident Name"');

    if (error) return `❌ DB Error: ${error.message}`;
    if (!data || data.length === 0) return '📭 No residents found.';

    let msg = `👥 *RESIDENT LIST* (${data.length})\n━━━━━━━━━━━━━━━━━━━━\n\n`;
    const displayData = data.slice(0, 30);
    for (let i = 0; i < displayData.length; i++) {
      const r = displayData[i];
      msg += `${i + 1}. *${r["Resident Name"]}*\n   ${r.Course} | Room ${r.Room}\n\n`;
    }
    if (data.length > 30) msg += `_...${data.length - 30} more. Use B to search._`;
    return msg;
  } catch (e) {
    return `❌ Error: ${e.message}`;
  }
}

async function getResidentCountWithCourse() {
  try {
    const { data, error } = await supabase.from('Hostel new').select('Course');
    if (error) return `❌ DB Error: ${error.message}`;
    if (!data || data.length === 0) return '📭 No residents found.';

    const counts = {};
    for (const r of data) {
      const c = r.Course || 'Unknown';
      counts[c] = (counts[c] || 0) + 1;
    }

    let msg = `📊 *RESIDENTS BY COURSE*\n━━━━━━━━━━━━━━━━━━━━\n\n`;
    const sortedCourses = Object.keys(counts).sort();
    for (const course of sortedCourses) {
      msg += `• ${course}: *${counts[course]}*\n`;
    }
    msg += `\n🏨 Total: *${data.length}*`;
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
      msg += `💰 Total: ₹${(r["Total Amount"] || 0).toLocaleString()}\n`;
      msg += `💵 Due: ₹${(r["Due amount"] || 0).toLocaleString()}\n`;
      msg += `📅 Due Date: ${r["Fees Due Date(DD-MM-YY)"] || 'N/A'}\n\n`;
    }
    return msg;
  } catch (e) {
    return `❌ Error: ${e.message}`;
  }
}

// ─── ROOMS ─────────────────────────────────────────────

async function getRoomList() {
  try {
    const { data, error } = await supabase.from('Hostel new').select('Room, Sharing');
    if (error) return `❌ DB Error: ${error.message}`;
    if (!data || data.length === 0) return '🚪 No rooms found.';

    const roomMap = new Map();
    for (const r of data) {
      const roomNum = r.Room;
      if (!roomMap.has(roomNum)) {
        roomMap.set(roomNum, { sharing: r.Sharing, count: 0 });
      }
      roomMap.get(roomNum).count++;
    }

    const rooms = Array.from(roomMap.entries()).sort((a, b) => Number(a[0]) - Number(b[0]));
    let msg = `🚪 *ROOMS* (${rooms.length})\n━━━━━━━━━━━━━━━━━━━━\n\n`;
    for (const [room, d] of rooms) {
      const full = d.count >= d.sharing;
      msg += `${full ? '🔴' : '🟢'} Room *${room}* — ${d.count}/${d.sharing}\n`;
    }
    msg += `\n💡 E <room_no> for details`;
    return msg;
  } catch (e) {
    return `❌ Error: ${e.message}`;
  }
}

async function getRoomOccupants(roomNo) {
  if (!roomNo) return '🚪 Format: E <room_no>  Example: E 26';
  try {
    const { data, error } = await supabase
      .from('Hostel new')
      .select('*')
      .eq('Room', parseInt(roomNo));
    
    if (error) return `❌ DB Error: ${error.message}`;
    if (!data || data.length === 0) return `🚪 Room *${roomNo}* is vacant.`;

    const sharing = data[0].Sharing || '?';
    let msg = `🚪 *ROOM ${roomNo}* — ${data.length}/${sharing} occupied\n━━━━━━━━━━━━━━━━━━━━\n\n`;
    for (let i = 0; i < data.length; i++) {
      const r = data[i];
      msg += `${i + 1}. *${r["Resident Name"]}*\n`;
      msg += `   📱 ${r["PRN/Mobile  Number"]}\n`;
      msg += `   📚 ${r.Course} (${r.Batch})\n`;
      msg += `   💰 Total: ₹${(r["Total Amount"] || 0).toLocaleString()}\n`;
      msg += `   💵 Due: ₹${(r["Due amount"] || 0).toLocaleString()}\n`;
      msg += `   📅 Due: ${r["Fees Due Date(DD-MM-YY)"] || 'N/A'}\n\n`;
    }
    return msg;
  } catch (e) {
    return `❌ Error: ${e.message}`;
  }
}

async function getVacantRooms() {
  try {
    const { data, error } = await supabase.from('Hostel new').select('Room, Sharing');
    if (error) return `❌ DB Error: ${error.message}`;

    const roomMap = new Map();
    for (const r of data) {
      const roomNum = r.Room;
      if (!roomMap.has(roomNum)) {
        roomMap.set(roomNum, { sharing: r.Sharing, count: 0 });
      }
      roomMap.get(roomNum).count++;
    }

    const vacant = Array.from(roomMap.entries())
      .filter(([_, d]) => d.count < d.sharing)
      .sort((a, b) => Number(a[0]) - Number(b[0]));

    if (vacant.length === 0) return '🏨 All rooms are full.';

    let msg = `🟢 *VACANT ROOMS* (${vacant.length})\n━━━━━━━━━━━━━━━━━━━━\n\n`;
    for (const [room, d] of vacant) {
      msg += `Room *${room}* — ${d.sharing - d.count} seat(s) free\n`;
    }
    msg += `\n💡 MOVE PRN|newRoom to reassign`;
    return msg;
  } catch (e) {
    return `❌ Error: ${e.message}`;
  }
}

// ─── FEES ──────────────────────────────────────────────

async function getResidentFeeDetails(query) {
  if (!query) return '💰 Format: G <name or PRN>';
  try {
    let resident = null;

    // Search by PRN
    const { data: prnData } = await supabase
      .from('Hostel new')
      .select('*')
      .ilike('"PRN/Mobile  Number"', `%${query}%`)
      .maybeSingle();
    
    if (prnData) resident = prnData;

    // Search by name
    if (!resident) {
      const { data: nameData } = await supabase
        .from('Hostel new')
        .select('*')
        .ilike('"Resident Name"', `%${query}%`)
        .maybeSingle();
      if (nameData) resident = nameData;
    }

    if (!resident) return `❌ No resident found: *${query}*`;

    const totalAmount = resident["Total Amount"] || 0;
    const dueAmount = resident["Due amount"] || 0;
    const paidAmount = totalAmount - dueAmount;

    return `💰 *FEE DETAILS*
━━━━━━━━━━━━━━━━━━━━
👤 ${resident["Resident Name"]}
📱 PRN: ${resident["PRN/Mobile  Number"]}
📚 ${resident.Course} | Batch ${resident.Batch}
🚪 Room ${resident.Room} (${resident.Sharing}-sharing)

💵 Total Fees: ₹${totalAmount.toLocaleString()}
✅ Paid: ₹${paidAmount.toLocaleString()}
⚠️ Due: ₹${dueAmount.toLocaleString()}
📅 Due Date: ${resident["Fees Due Date(DD-MM-YY)"] || 'N/A'}
📅 Admission: ${resident["Admission Date"] || 'N/A'}

💡 Update: H ${resident["PRN/Mobile  Number"]}|<amount>
💡 Record Payment: PAY ${resident["PRN/Mobile  Number"]}|<amount>`;
  } catch (e) {
    return `❌ Error: ${e.message}`;
  }
}

async function getHostelFeesSummary() {
  try {
    const { data, error } = await supabase.from('Hostel new').select('"Total Amount", "Due amount", Course');
    if (error) return `❌ DB Error: ${error.message}`;
    if (!data || data.length === 0) return '📭 No data.';

    let totalFees = 0;
    let totalDue = 0;
    const stats = {};
    
    for (const r of data) {
      const fees = Number(r["Total Amount"]) || 0;
      const due = Number(r["Due amount"]) || 0;
      totalFees += fees;
      totalDue += due;
      
      const c = r.Course || 'Unknown';
      if (!stats[c]) {
        stats[c] = { total: 0, due: 0, count: 0 };
      }
      stats[c].total += fees;
      stats[c].due += due;
      stats[c].count++;
    }

    const totalPaid = totalFees - totalDue;
    const collectionRate = totalFees > 0 ? (totalPaid / totalFees) * 100 : 0;

    let msg = `📊 *FEE SUMMARY*
━━━━━━━━━━━━━━━━━━━━
💰 Total Fees: ₹${totalFees.toLocaleString()}
✅ Total Paid: ₹${totalPaid.toLocaleString()}
⚠️ Total Due: ₹${totalDue.toLocaleString()}
📈 Collection Rate: ${collectionRate.toFixed(1)}%
👥 Residents: ${data.length}

📚 *COURSE BREAKDOWN*
━━━━━━━━━━━━━━━━━━━━\n`;

    const sortedCourses = Object.keys(stats).sort();
    for (const course of sortedCourses) {
      const s = stats[course];
      const coursePaid = s.total - s.due;
      const rate = s.total > 0 ? (coursePaid / s.total) * 100 : 0;
      msg += `\n*${course}* (${s.count} students)
   Total: ₹${s.total.toLocaleString()}
   Due: ₹${s.due.toLocaleString()}
   Rate: ${rate.toFixed(1)}%`;
    }
    return msg;
  } catch (e) {
    return `❌ Error: ${e.message}`;
  }
}

async function updateResidentFee(parts) {
  const prn = parts[0];
  const amount = parts[1];
  
  if (!prn || !amount) return '❌ Format: H <PRN>|<amount>\nExample: H 9876543210|50000';
  try {
    const { data: resident, error: fe } = await supabase
      .from('Hostel new')
      .select('*')
      .ilike('"PRN/Mobile  Number"', `%${prn.trim()}%`)
      .single();

    if (fe || !resident) return `❌ Resident not found: ${prn}`;

    const prevDue = Number(resident["Due amount"]) || 0;
    const addAmount = Number(amount);
    const newDue = prevDue + addAmount;
    const newTotal = Number(resident["Total Amount"] || 0) + addAmount;

    const { error: ue } = await supabase
      .from('Hostel new')
      .update({ 
        "Due amount": newDue,
        "Total Amount": newTotal
      })
      .ilike('"PRN/Mobile  Number"', `%${prn.trim()}%`);

    if (ue) return `❌ Update failed: ${ue.message}`;

    return `✅ *FEE UPDATED*
━━━━━━━━━━━━━━━━━━━━
👤 ${resident["Resident Name"]}
💰 Previous Due: ₹${prevDue.toLocaleString()}
➕ Added: ₹${addAmount.toLocaleString()}
⚠️ New Due: ₹${newDue.toLocaleString()}
💵 Total Fees: ₹${newTotal.toLocaleString()}`;
  } catch (e) {
    return `❌ Error: ${e.message}`;
  }
}

async function recordFeePayment(parts) {
  const prn = parts[0];
  const amount = parts[1];
  
  if (!prn || !amount) return '❌ Format: PAY <PRN>|<amount>\nExample: PAY 9876543210|25000';
  try {
    const { data: resident, error: fe } = await supabase
      .from('Hostel new')
      .select('*')
      .ilike('"PRN/Mobile  Number"', `%${prn.trim()}%`)
      .single();

    if (fe || !resident) return `❌ Resident not found: ${prn}`;

    const currentDue = Number(resident["Due amount"]) || 0;
    const paymentAmount = Number(amount);
    const newDue = Math.max(0, currentDue - paymentAmount);
    const paidDate = new Date().toLocaleDateString('en-GB');

    const { error: ue } = await supabase
      .from('Hostel new')
      .update({ 
        "Due amount": newDue,
        "Fees Paid Date": paidDate
      })
      .ilike('"PRN/Mobile  Number"', `%${prn.trim()}%`);

    if (ue) return `❌ Payment failed: ${ue.message}`;

    return `✅ *PAYMENT RECORDED*
━━━━━━━━━━━━━━━━━━━━
👤 ${resident["Resident Name"]}
💰 Paid: ₹${paymentAmount.toLocaleString()}
⚠️ Remaining Due: ₹${newDue.toLocaleString()}
📅 Paid on: ${paidDate}

${newDue === 0 ? '🎉 All fees cleared!' : `💡 Still due: ₹${newDue.toLocaleString()}`}`;
  } catch (e) {
    return `❌ Error: ${e.message}`;
  }
}

async function getDueResidents() {
  try {
    const { data, error } = await supabase
      .from('Hostel new')
      .select('"Resident Name", "PRN/Mobile  Number", "Due amount", "Fees Due Date(DD-MM-YY)", Course, Room')
      .gt('"Due amount"', 0)
      .order('"Due amount"', { ascending: false });

    if (error) return `❌ DB Error: ${error.message}`;
    if (!data || data.length === 0) return '✅ No due payments! All fees cleared.';

    let msg = `⚠️ *DUE PAYMENTS* (${data.length})\n━━━━━━━━━━━━━━━━━━━━\n\n`;
    let totalDue = 0;
    
    const displayData = data.slice(0, 20);
    for (let i = 0; i < displayData.length; i++) {
      const r = displayData[i];
      const due = Number(r["Due amount"]) || 0;
      totalDue += due;
      msg += `${i + 1}. *${r["Resident Name"]}*\n`;
      msg += `   📱 ${r["PRN/Mobile  Number"]}\n`;
      msg += `   💰 Due: ₹${due.toLocaleString()}\n`;
      msg += `   📅 Date: ${r["Fees Due Date(DD-MM-YY)"] || 'N/A'}\n\n`;
    }
    
    msg += `━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `💰 Total Due: ₹${totalDue.toLocaleString()}`;
    
    if (data.length > 20) msg += `\n_...${data.length - 20} more students have dues._`;
    return msg;
  } catch (e) {
    return `❌ Error: ${e.message}`;
  }
}

// ─── CRUD ──────────────────────────────────────────────

async function addResident(parts) {
  if (!parts || parts.length < 4) {
    return `❌ Format: ADD name|PRN|course|room\nExample: ADD John|9876543210|BAMS|26\n\nOptional: |batch|totalAmount|dueAmount|dueDate|sharing`;
  }
  
  const name = parts[0]?.trim();
  const prn = parts[1]?.trim();
  const course = parts[2]?.trim();
  const room = parts[3]?.trim();
  const batch = parts[4]?.trim();
  const totalAmount = parts[5]?.trim();
  const dueAmount = parts[6]?.trim();
  const dueDate = parts[7]?.trim();
  const sharing = parts[8]?.trim();
  
  if (!name || !prn || !course || !room) {
    return `❌ Missing required fields. Format: ADD name|PRN|course|room`;
  }
  
  try {
    // Check if PRN exists
    const { data: existing } = await supabase
      .from('Hostel new')
      .select('"PRN/Mobile  Number"')
      .ilike('"PRN/Mobile  Number"', `%${prn}%`)
      .maybeSingle();
      
    if (existing) return `❌ PRN *${prn}* already exists.`;

    const total = totalAmount ? parseFloat(totalAmount) : 0;
    const due = dueAmount ? parseFloat(dueAmount) : total;

    const { error } = await supabase.from('Hostel new').insert({
      "PRN/Mobile  Number": prn,
      "Resident Name": name,
      "Course": course,
      "Room": room ? parseInt(room) : null,
      "Batch": batch || new Date().getFullYear().toString(),
      "Total Amount": total,
      "Due amount": due,
      "Fees Due Date(DD-MM-YY)": dueDate || null,
      "Sharing": sharing ? parseInt(sharing) : 4,
      "Admission Date": new Date().toLocaleDateString('en-GB')
    });

    if (error) return `❌ Add failed: ${error.message}`;

    return `✅ *RESIDENT ADDED*
━━━━━━━━━━━━━━━━━━━━
👤 ${name}
📱 ${prn}
📚 ${course} | Room ${room}
💰 Total: ₹${total.toLocaleString()}
⚠️ Due: ₹${due.toLocaleString()}`;
  } catch (e) {
    return `❌ Error: ${e.message}`;
  }
}

async function deleteResident(prn) {
  if (!prn) return '❌ Format: DEL <PRN>';
  try {
    const { data: r } = await supabase
      .from('Hostel new')
      .select('"Resident Name"')
      .ilike('"PRN/Mobile  Number"', `%${prn}%`)
      .single();

    const { error } = await supabase
      .from('Hostel new')
      .delete()
      .ilike('"PRN/Mobile  Number"', `%${prn}%`);
      
    if (error) return `❌ Delete failed: ${error.message}`;

    const residentName = r ? r["Resident Name"] : 'Unknown';
    return `✅ *DELETED*\n👤 ${residentName}\n📱 ${prn}`;
  } catch (e) {
    return `❌ Error: ${e.message}`;
  }
}

async function moveResidentRoom(parts) {
  const prn = parts[0];
  const newRoom = parts[1];
  
  if (!prn || !newRoom) return '❌ Format: MOVE <PRN>|<newRoom>\nExample: MOVE 9876543210|30';
  try {
    const { data: r, error: fe } = await supabase
      .from('Hostel new')
      .select('"Resident Name", Room')
      .ilike('"PRN/Mobile  Number"', `%${prn}%`)
      .single();

    if (fe || !r) return `❌ Resident not found: ${prn}`;

    const { error: ue } = await supabase
      .from('Hostel new')
      .update({ Room: parseInt(newRoom) })
      .ilike('"PRN/Mobile  Number"', `%${prn}%`);

    if (ue) return `❌ Move failed: ${ue.message}`;

    return `✅ *ROOM CHANGED*\n👤 ${r["Resident Name"]}\n🚪 ${r.Room} → ${newRoom}`;
  } catch (e) {
    return `❌ Error: ${e.message}`;
  }
}

// ─── STATISTICS ────────────────────────────────────────

async function getHostelStatistics() {
  try {
    const { data, error } = await supabase.from('Hostel new').select('*');
    if (error) return `❌ DB Error: ${error.message}`;
    if (!data || data.length === 0) return '📭 No data.';

    const rooms = new Map();
    let totalFees = 0;
    let totalDue = 0;
    
    for (const r of data) {
      totalFees += Number(r["Total Amount"]) || 0;
      totalDue += Number(r["Due amount"]) || 0;
      const roomNum = r.Room;
      if (!rooms.has(roomNum)) {
        rooms.set(roomNum, { count: 0, sharing: r.Sharing });
      }
      rooms.get(roomNum).count++;
    }

    let full = 0, vacant = 0;
    for (const d of rooms.values()) {
      if (d.count >= d.sharing) {
        full++;
      } else {
        vacant++;
      }
    }

    const totalPaid = totalFees - totalDue;
    const collectionRate = totalFees > 0 ? (totalPaid / totalFees) * 100 : 0;

    const uniqueCourses = new Set();
    const uniqueBatches = new Set();
    for (const r of data) {
      if (r.Course) uniqueCourses.add(r.Course);
      if (r.Batch) uniqueBatches.add(r.Batch);
    }

    return `📊 *HOSTEL STATISTICS*
━━━━━━━━━━━━━━━━━━━━
👥 Residents: *${data.length}*
🚪 Rooms: *${rooms.size}*  (🔴 ${full} full | 🟢 ${vacant} vacant)
📚 Courses: *${uniqueCourses.size}*
🎓 Batches: *${uniqueBatches.size}*

💰 Total Fees: ₹${totalFees.toLocaleString()}
✅ Total Paid: ₹${totalPaid.toLocaleString()}
⚠️ Total Due: ₹${totalDue.toLocaleString()}
📈 Collection Rate: ${collectionRate.toFixed(1)}%

📊 Avg per Student: ₹${Math.round(totalFees / data.length).toLocaleString()}`;
  } catch (e) {
    return `❌ Error: ${e.message}`;
  }
}