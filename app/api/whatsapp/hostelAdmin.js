import { supabase } from '../../lib/supabase';

export async function handleHostelAdminCommands(userMessage, cleanNumber) {
  const upper = userMessage?.toUpperCase().trim() || '';
  const lower = userMessage?.toLowerCase().trim() || '';

  console.log(`🏨 Hostel Admin: "${userMessage}"`);

  // Basic commands
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
  if (upper === 'P') return await getPendingFeesList();

  // Commands with arguments
  if (lower.startsWith('b ')) return await searchResident(userMessage.substring(2).trim());
  if (lower.startsWith('e ')) return await getRoomOccupants(userMessage.substring(2).trim());
  if (lower.startsWith('g ')) return await getResidentFeeDetails(userMessage.substring(2).trim());
  if (lower.startsWith('add ')) return await addResident(userMessage.substring(4).trim().split('|'));
  if (lower.startsWith('del ')) return await deleteResident(userMessage.substring(4).trim());

  return `❌ Command not recognized.\n\nType *MENU* for help.`;
}

// ─── MENU ──────────────────────────────────────────────

function getMenu() {
  return `🏨 *HOSTEL ADMIN PANEL*
━━━━━━━━━━━━━━━━━━━━

👥 *RESIDENTS*
 A → All residents list
 B → Search resident (B Suhani)
 C → Count by course
 ADD → Add resident (ADD name|PRN|course|room)
 DEL → Delete resident (DEL PRN)

🚪 *ROOMS*
 D → All rooms list
 E → Room details (E 26)
 F → Vacant rooms list

💰 *FEES*
 G → Check fee (G Suhani)
 I → Fee summary
 P → Pending fees list

📊 *STATS*
 N → Hostel statistics

━━━━━━━━━━━━━━━━━━━━
💡 Examples:
• ADD John|9876543210|BAMS|26
• DEL 9876543210
• B John
• G 9876543210`;
}

// ─── RESIDENTS ─────────────────────────────────────────

async function getResidentList() {
  try {
    const { data, error } = await supabase
      .from('Hostel new')
      .select('"Resident Name", Course, Room')
      .order('"Resident Name"');

    if (error) return `❌ Error: ${error.message}`;
    if (!data || data.length === 0) return '📭 No residents found.';

    let msg = `👥 *RESIDENT LIST* (Total: ${data.length})\n━━━━━━━━━━━━━━━━━━━━\n\n`;
    for (let i = 0; i < Math.min(data.length, 40); i++) {
      const r = data[i];
      msg += `${i + 1}. *${r["Resident Name"]}*\n`;
      msg += `   📚 ${r.Course} | Room ${r.Room}\n\n`;
    }
    if (data.length > 40) msg += `_...${data.length - 40} more residents._`;
    return msg;
  } catch (e) {
    return `❌ Error: ${e.message}`;
  }
}

async function getResidentCountWithCourse() {
  try {
    const { data, error } = await supabase.from('Hostel new').select('Course');
    if (error) return `❌ Error: ${error.message}`;
    if (!data || data.length === 0) return '📭 No residents found.';

    const counts = {};
    for (const r of data) {
      const c = r.Course || 'Unknown';
      counts[c] = (counts[c] || 0) + 1;
    }

    let msg = `📊 *RESIDENTS BY COURSE*\n━━━━━━━━━━━━━━━━━━━━\n\n`;
    const sorted = Object.keys(counts).sort();
    for (const course of sorted) {
      msg += `• ${course}: *${counts[course]}*\n`;
    }
    msg += `\n🏨 *Total: ${data.length}*`;
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

    // Search by name
    if (results.length === 0) {
      const { data: nameData } = await supabase
        .from('Hostel new')
        .select('*')
        .ilike('"Resident Name"', `%${query}%`);
      if (nameData && nameData.length > 0) results = nameData;
    }

    if (results.length === 0) return `❌ No resident found for: *${query}*`;

    let msg = `🔍 *SEARCH RESULTS* (${results.length})\n━━━━━━━━━━━━━━━━━━━━\n\n`;
    for (const r of results) {
      msg += `👤 *${r["Resident Name"]}*\n`;
      msg += `📱 PRN: ${r["PRN/Mobile  Number"] || 'N/A'}\n`;
      msg += `📚 Course: ${r.Course || 'N/A'}\n`;
      msg += `📅 Batch: ${r.Batch || 'N/A'}\n`;
      msg += `🚪 Room: ${r.Room || 'N/A'} (${r.Sharing || 'N/A'}-sharing)\n`;
      msg += `💰 Total Fees: ₹${(r["Total Amount"] || 0).toLocaleString()}\n`;
      msg += `💵 Due Amount: ₹${(r["Due amount"] || 0).toLocaleString()}\n`;
      msg += `📅 Due Date: ${r["Fees Due Date(DD-MM-YY)"] || 'N/A'}\n`;
      msg += `📅 Admission: ${r["Admission Date"] || 'N/A'}\n\n`;
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
    if (error) return `❌ Error: ${error.message}`;

    const roomMap = new Map();
    for (const r of data) {
      const room = r.Room;
      if (!roomMap.has(room)) {
        roomMap.set(room, { sharing: r.Sharing, count: 0 });
      }
      roomMap.get(room).count++;
    }

    const rooms = Array.from(roomMap.entries()).sort((a, b) => Number(a[0]) - Number(b[0]));
    let msg = `🚪 *ROOMS LIST* (Total: ${rooms.length})\n━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    for (const [room, d] of rooms) {
      const status = d.count >= d.sharing ? '🔴 FULL' : '🟢 VACANT';
      msg += `Room *${room}* — ${d.count}/${d.sharing} ${status}\n`;
    }
    msg += `\n💡 Type E <room_no> for details`;
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
    
    if (error) return `❌ Error: ${error.message}`;
    if (!data || data.length === 0) return `🚪 Room *${roomNo}* is VACANT.`;

    const sharing = data[0].Sharing || '?';
    let msg = `🚪 *ROOM ${roomNo}* — ${data.length}/${sharing} occupied\n━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    for (let i = 0; i < data.length; i++) {
      const r = data[i];
      msg += `${i + 1}. *${r["Resident Name"]}*\n`;
      msg += `   📱 PRN: ${r["PRN/Mobile  Number"]}\n`;
      msg += `   📚 ${r.Course} (${r.Batch})\n`;
      msg += `   💰 Due: ₹${(r["Due amount"] || 0).toLocaleString()}\n\n`;
    }
    return msg;
  } catch (e) {
    return `❌ Error: ${e.message}`;
  }
}

async function getVacantRooms() {
  try {
    const { data, error } = await supabase.from('Hostel new').select('Room, Sharing');
    if (error) return `❌ Error: ${error.message}`;

    const roomMap = new Map();
    for (const r of data) {
      const room = r.Room;
      if (!roomMap.has(room)) {
        roomMap.set(room, { sharing: r.Sharing, count: 0 });
      }
      roomMap.get(room).count++;
    }

    const vacant = Array.from(roomMap.entries())
      .filter(([_, d]) => d.count < d.sharing)
      .sort((a, b) => Number(a[0]) - Number(b[0]));

    if (vacant.length === 0) return '🏨 All rooms are FULL.';

    let msg = `🟢 *VACANT ROOMS* (${vacant.length})\n━━━━━━━━━━━━━━━━━━━━\n\n`;
    for (const [room, d] of vacant) {
      const free = d.sharing - d.count;
      msg += `Room *${room}* — ${free} seat(s) available (${d.count}/${d.sharing})\n`;
    }
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

    const total = resident["Total Amount"] || 0;
    const due = resident["Due amount"] || 0;
    const paid = total - due;

    return `💰 *FEE DETAILS*
━━━━━━━━━━━━━━━━━━━━
👤 ${resident["Resident Name"]}
📱 PRN: ${resident["PRN/Mobile  Number"]}
📚 ${resident.Course} | Batch ${resident.Batch}
🚪 Room ${resident.Room}

💵 Total Fees: ₹${total.toLocaleString()}
✅ Paid: ₹${paid.toLocaleString()}
⚠️ Due: ₹${due.toLocaleString()}
📅 Due Date: ${resident["Fees Due Date(DD-MM-YY)"] || 'N/A'}`;
  } catch (e) {
    return `❌ Error: ${e.message}`;
  }
}

async function getHostelFeesSummary() {
  try {
    const { data, error } = await supabase.from('Hostel new').select('"Total Amount", "Due amount", Course');
    if (error) return `❌ Error: ${error.message}`;
    if (!data || data.length === 0) return '📭 No data available.';

    let totalFees = 0;
    let totalDue = 0;
    const courseStats = {};
    
    for (const r of data) {
      const fees = Number(r["Total Amount"]) || 0;
      const due = Number(r["Due amount"]) || 0;
      totalFees += fees;
      totalDue += due;
      
      const course = r.Course || 'Unknown';
      if (!courseStats[course]) {
        courseStats[course] = { total: 0, due: 0, count: 0 };
      }
      courseStats[course].total += fees;
      courseStats[course].due += due;
      courseStats[course].count++;
    }

    const totalPaid = totalFees - totalDue;
    const collectionRate = totalFees > 0 ? (totalPaid / totalFees) * 100 : 0;

    let msg = `📊 *FEE SUMMARY*
━━━━━━━━━━━━━━━━━━━━
💰 Total Fees: ₹${totalFees.toLocaleString()}
✅ Total Paid: ₹${totalPaid.toLocaleString()}
⚠️ Total Due: ₹${totalDue.toLocaleString()}
📈 Collection: ${collectionRate.toFixed(1)}%
👥 Total Students: ${data.length}

📚 *COURSE BREAKDOWN*
━━━━━━━━━━━━━━━━━━━━\n`;

    const sorted = Object.keys(courseStats).sort();
    for (const course of sorted) {
      const s = courseStats[course];
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

async function getPendingFeesList() {
  try {
    const { data, error } = await supabase
      .from('Hostel new')
      .select('"Resident Name", "PRN/Mobile  Number", "Due amount", "Fees Due Date(DD-MM-YY)", Course, Room')
      .gt('"Due amount"', 0)
      .order('"Due amount"', { ascending: false });

    if (error) return `❌ Error: ${error.message}`;
    if (!data || data.length === 0) return '✅ No pending fees! All students have cleared their dues.';

    let msg = `⚠️ *PENDING FEES LIST* (${data.length} students)\n━━━━━━━━━━━━━━━━━━━━\n\n`;
    let totalDue = 0;
    
    for (let i = 0; i < Math.min(data.length, 30); i++) {
      const r = data[i];
      const due = Number(r["Due amount"]) || 0;
      totalDue += due;
      msg += `${i + 1}. *${r["Resident Name"]}*\n`;
      msg += `   📱 ${r["PRN/Mobile  Number"]}\n`;
      msg += `   📚 ${r.Course} | Room ${r.Room}\n`;
      msg += `   💰 Due: ₹${due.toLocaleString()}\n`;
      msg += `   📅 Date: ${r["Fees Due Date(DD-MM-YY)"] || 'N/A'}\n\n`;
    }
    
    msg += `━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `💰 *Total Due: ₹${totalDue.toLocaleString()}*`;
    
    if (data.length > 30) msg += `\n_...${data.length - 30} more students have dues._`;
    return msg;
  } catch (e) {
    return `❌ Error: ${e.message}`;
  }
}

// ─── STATISTICS ────────────────────────────────────────

async function getHostelStatistics() {
  try {
    const { data, error } = await supabase.from('Hostel new').select('*');
    if (error) return `❌ Error: ${error.message}`;
    if (!data || data.length === 0) return '📭 No data available.';

    // Room stats
    const rooms = new Map();
    let totalFees = 0;
    let totalDue = 0;
    
    for (const r of data) {
      totalFees += Number(r["Total Amount"]) || 0;
      totalDue += Number(r["Due amount"]) || 0;
      const room = r.Room;
      if (!rooms.has(room)) {
        rooms.set(room, { count: 0, sharing: r.Sharing || 4 });
      }
      rooms.get(room).count++;
    }

    let fullRooms = 0;
    let vacantRooms = 0;
    for (const d of rooms.values()) {
      if (d.count >= d.sharing) fullRooms++;
      else vacantRooms++;
    }

    const totalPaid = totalFees - totalDue;
    const collectionRate = totalFees > 0 ? (totalPaid / totalFees) * 100 : 0;
    const occupancyRate = (data.length / (rooms.size * 4)) * 100;

    // Course and batch stats
    const uniqueCourses = new Set();
    const uniqueBatches = new Set();
    for (const r of data) {
      if (r.Course) uniqueCourses.add(r.Course);
      if (r.Batch) uniqueBatches.add(r.Batch);
    }

    return `📊 *HOSTEL STATISTICS*
━━━━━━━━━━━━━━━━━━━━
👥 *Residents:* ${data.length}
🚪 *Rooms:* ${rooms.size}
🔴 Full Rooms: ${fullRooms}
🟢 Vacant Rooms: ${vacantRooms}
📈 Occupancy Rate: ${occupancyRate.toFixed(1)}%

📚 *Courses:* ${uniqueCourses.size}
🎓 *Batches:* ${uniqueBatches.size}

💰 *FINANCIALS*
Total Fees: ₹${totalFees.toLocaleString()}
Total Paid: ₹${totalPaid.toLocaleString()}
Total Due: ₹${totalDue.toLocaleString()}
Collection Rate: ${collectionRate.toFixed(1)}%

📊 Avg per Student: ₹${Math.round(totalFees / data.length).toLocaleString()}`;
  } catch (e) {
    return `❌ Error: ${e.message}`;
  }
}

// ─── ADD RESIDENT ─────────────────────────────────────

async function addResident(parts) {
  if (!parts || parts.length < 4) {
    return `❌ Format: ADD name|PRN|course|room\nExample: ADD John|9876543210|BAMS|26`;
  }
  
  const name = parts[0]?.trim();
  const prn = parts[1]?.trim();
  const course = parts[2]?.trim();
  const room = parts[3]?.trim();
  const batch = parts[4]?.trim();
  const totalAmount = parts[5]?.trim();
  const dueAmount = parts[6]?.trim();
  const sharing = parts[7]?.trim();
  
  if (!name || !prn || !course || !room) {
    return `❌ Missing required fields. Format: ADD name|PRN|course|room`;
  }
  
  try {
    // Check if PRN exists
    const { data: existing } = await supabase
      .from('Hostel new')
      .select('"PRN/Mobile  Number"')
      .eq('"PRN/Mobile  Number"', prn)
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
      "Sharing": sharing ? parseInt(sharing) : 4,
      "Admission Date": new Date().toLocaleDateString('en-GB')
    });

    if (error) return `❌ Add failed: ${error.message}`;

    return `✅ *RESIDENT ADDED SUCCESSFULLY*
━━━━━━━━━━━━━━━━━━━━
👤 Name: ${name}
📱 PRN: ${prn}
📚 Course: ${course}
🚪 Room: ${room}
💰 Total Fees: ₹${total.toLocaleString()}
⚠️ Due: ₹${due.toLocaleString()}`;
  } catch (e) {
    return `❌ Error: ${e.message}`;
  }
}

// ─── DELETE RESIDENT ─────────────────────────────────

async function deleteResident(prn) {
  if (!prn) return '❌ Format: DEL <PRN>';
  try {
    const { data: r } = await supabase
      .from('Hostel new')
      .select('"Resident Name"')
      .eq('"PRN/Mobile  Number"', prn)
      .single();

    const { error } = await supabase
      .from('Hostel new')
      .delete()
      .eq('"PRN/Mobile  Number"', prn);
      
    if (error) return `❌ Delete failed: ${error.message}`;

    const name = r ? r["Resident Name"] : 'Unknown';
    return `✅ *RESIDENT DELETED*\n👤 ${name}\n📱 ${prn}`;
  } catch (e) {
    return `❌ Error: ${e.message}`;
  }
}