import { supabase } from '@/lib/supabase';

const TABLE = '"Hostel new"';

export async function handleHostelAdminCommands(userMessage, cleanNumber) {
  const upper = userMessage?.toUpperCase().trim() || '';
  const lower = userMessage?.toLowerCase().trim() || '';

  console.log(`🏨 Hostel Admin: "${userMessage}"`);

  // Menu / Help
  if (['HOSTEL', 'MENU', 'START', 'HELP'].includes(upper)) return getMenu();

  // Single-letter view commands
  if (upper === 'A') return await getResidentList();
  if (upper === 'B') return '🔍 Format: B <name or PRN>\nExample: B Suhani';
  if (upper === 'C') return await getResidentCountWithCourse();
  if (upper === 'D') return await getRoomList();
  if (upper === 'E') return '🚪 Format: E <room_no>\nExample: E 26';
  if (upper === 'F') return await getVacantRooms();
  if (upper === 'G') return '💰 Format: G <name or PRN>\nExample: G Suhani';
  if (upper === 'I') return await getFeeSummary();
  if (upper === 'N') return await getStatistics();

  // Commands with arguments
  if (lower.startsWith('b ')) return await searchResident(userMessage.substring(2).trim());
  if (lower.startsWith('e ')) return await getRoomOccupants(userMessage.substring(2).trim());
  if (lower.startsWith('g ')) return await getResidentFeeDetails(userMessage.substring(2).trim());
  if (lower.startsWith('h ')) {
    const [prn, amount, paidDate] = userMessage.substring(2).trim().split('|');
    return await updateResidentFee(prn, amount, paidDate);
  }
  if (lower.startsWith('add ')) return await addResident(userMessage.substring(4).trim().split('|'));
  if (lower.startsWith('del ')) return await deleteResident(userMessage.substring(4).trim());
  if (lower.startsWith('move ')) return await moveResidentRoom(...userMessage.substring(5).trim().split('|'));

  return `❓ Command samajh nahi aaya.\nType *MENU* for help.`;
}

// ─── MENU ──────────────────────────────────────────────

function getMenu() {
  return `🏨 *HOSTEL ADMIN*
━━━━━━━━━━━━━━━━━━━━

👥 *RESIDENTS*
 A → Resident list
 B → Search  _(B Suhani)_
 C → Count by course

🚪 *ROOMS*
 D → Room list
 E → Room details  _(E 26)_
 F → Vacant rooms

💰 *FEES*
 G → Fee details  _(G Suhani)_
 H → Pay / Update  _(H PRN|amount|date)_
 I → Fee summary

📊 N → Statistics

━━━━━━━━━━━━━━━━━━━━
➕ *ADD* name|PRN|course|room|batch|total|sharing
🗑 *DEL* PRN
🔄 *MOVE* PRN|newRoom`;
}

// ─── RESIDENTS ─────────────────────────────────────────

async function getResidentList() {
  try {
    const { data, error } = await supabase
      .from('Hostel new')
      .select('"Resident Name", "Course", "Room", "Due amount"')
      .order('"Resident Name"');

    if (error) return `❌ DB Error: ${error.message}`;
    if (!data?.length) return '📭 No residents found.';

    let msg = `👥 *RESIDENT LIST* (${data.length})\n━━━━━━━━━━━━━━━━━━━━\n\n`;
    data.slice(0, 30).forEach((r, i) => {
      const due = r["Due amount"] > 0 ? ` ⚠️ Due: ₹${r["Due amount"].toLocaleString()}` : '';
      msg += `${i + 1}. *${r["Resident Name"]}*\n   ${r.Course} | Room ${r.Room}${due}\n\n`;
    });
    if (data.length > 30) msg += `_...${data.length - 30} more. Use B to search._`;
    return msg;
  } catch (e) {
    return `❌ Error: ${e.message}`;
  }
}

async function getResidentCountWithCourse() {
  try {
    const { data, error } = await supabase
      .from('Hostel new')
      .select('"Course"');

    if (error) return `❌ DB Error: ${error.message}`;
    if (!data?.length) return '📭 No residents found.';

    const counts = {};
    data.forEach(r => {
      const c = r.Course || 'Unknown';
      counts[c] = (counts[c] || 0) + 1;
    });

    let msg = `📊 *RESIDENTS BY COURSE*\n━━━━━━━━━━━━━━━━━━━━\n\n`;
    for (const [course, count] of Object.entries(counts).sort()) {
      msg += `• ${course}: *${count}*\n`;
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
    const { data: byPrn } = await supabase
      .from('Hostel new')
      .select('*')
      .ilike('"PRN/Mobile  Number"', `%${query}%`);
    if (byPrn?.length) results = byPrn;

    // Search by Name
    if (!results.length) {
      const { data: byName } = await supabase
        .from('Hostel new')
        .select('*')
        .ilike('"Resident Name"', `%${query}%`);
      if (byName?.length) results = byName;
    }

    if (!results.length) return `❌ No resident found: *${query}*`;

    let msg = `🔍 *"${query}"* (${results.length})\n━━━━━━━━━━━━━━━━━━━━\n\n`;
    for (const r of results) {
      const dueAmt = r["Due amount"] || 0;
      const dueFlag = dueAmt > 0 ? `⚠️ Due: ₹${dueAmt.toLocaleString()}` : '✅ Clear';
      msg += `👤 *${r["Resident Name"]}*\n`;
      msg += `📱 PRN: ${r["PRN/Mobile  Number"] || 'N/A'}\n`;
      msg += `📚 ${r.Course || 'N/A'} | Batch ${r.Batch || 'N/A'}\n`;
      msg += `🚪 Room ${r.Room || 'N/A'} (${r.Sharing || 'N/A'}-sharing)\n`;
      msg += `💰 Total: ₹${(r["Total Amount"] || 0).toLocaleString()} | ${dueFlag}\n`;
      msg += `📅 Due Date: ${r["Fees Due Date(DD-MM-YY)"] || 'N/A'}\n`;
      msg += `📅 Paid: ${r["Fees Paid Date"] || 'N/A'}\n\n`;
    }
    return msg;
  } catch (e) {
    return `❌ Error: ${e.message}`;
  }
}

// ─── ROOMS ─────────────────────────────────────────────

async function getRoomList() {
  try {
    const { data, error } = await supabase
      .from('Hostel new')
      .select('"Room", "Sharing"');

    if (error) return `❌ DB Error: ${error.message}`;
    if (!data?.length) return '🚪 No rooms found.';

    const map = new Map();
    data.forEach(r => {
      if (!map.has(r.Room)) map.set(r.Room, { sharing: r.Sharing, count: 0 });
      map.get(r.Room).count++;
    });

    const rooms = [...map.entries()].sort((a, b) => a[0] - b[0]);
    let msg = `🚪 *ROOMS* (${rooms.length})\n━━━━━━━━━━━━━━━━━━━━\n\n`;
    rooms.forEach(([room, d]) => {
      const full = d.count >= d.sharing;
      msg += `${full ? '🔴' : '🟢'} Room *${room}* — ${d.count}/${d.sharing}\n`;
    });
    msg += `\n💡 E <room_no> for occupant details`;
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
      .eq('"Room"', parseInt(roomNo));

    if (error) return `❌ DB Error: ${error.message}`;
    if (!data?.length) return `🚪 Room *${roomNo}* is vacant.`;

    const sharing = data[0].Sharing || '?';
    let msg = `🚪 *ROOM ${roomNo}* — ${data.length}/${sharing} occupied\n━━━━━━━━━━━━━━━━━━━━\n\n`;
    data.forEach((r, i) => {
      const dueAmt = r["Due amount"] || 0;
      msg += `${i + 1}. *${r["Resident Name"]}*\n`;
      msg += `   📱 ${r["PRN/Mobile  Number"]}\n`;
      msg += `   📚 ${r.Course} (${r.Batch})\n`;
      msg += `   💰 Total: ₹${(r["Total Amount"] || 0).toLocaleString()}\n`;
      msg += `   ${dueAmt > 0 ? `⚠️ Due: ₹${dueAmt.toLocaleString()} | 📅 ${r["Fees Due Date(DD-MM-YY)"] || 'N/A'}` : '✅ Fees Clear'}\n\n`;
    });
    return msg;
  } catch (e) {
    return `❌ Error: ${e.message}`;
  }
}

async function getVacantRooms() {
  try {
    const { data, error } = await supabase
      .from('Hostel new')
      .select('"Room", "Sharing"');

    if (error) return `❌ DB Error: ${error.message}`;

    const map = new Map();
    data.forEach(r => {
      if (!map.has(r.Room)) map.set(r.Room, { sharing: r.Sharing, count: 0 });
      map.get(r.Room).count++;
    });

    const vacant = [...map.entries()]
      .filter(([_, d]) => d.count < d.sharing)
      .sort((a, b) => a[0] - b[0]);

    if (!vacant.length) return '🏨 All rooms are full.';

    let msg = `🟢 *VACANT ROOMS* (${vacant.length})\n━━━━━━━━━━━━━━━━━━━━\n\n`;
    vacant.forEach(([room, d]) => {
      msg += `Room *${room}* — ${d.sharing - d.count} seat(s) free\n`;
    });
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

    const { data: byPrn } = await supabase
      .from('Hostel new')
      .select('*')
      .ilike('"PRN/Mobile  Number"', `%${query}%`)
      .maybeSingle();
    if (byPrn) resident = byPrn;

    if (!resident) {
      const { data: byName } = await supabase
        .from('Hostel new')
        .select('*')
        .ilike('"Resident Name"', `%${query}%`)
        .maybeSingle();
      if (byName) resident = byName;
    }

    if (!resident) return `❌ No resident found: *${query}*`;

    const dueAmt = resident["Due amount"] || 0;
    const totalAmt = resident["Total Amount"] || 0;
    const paidAmt = totalAmt - dueAmt;

    return `💰 *FEE DETAILS*
━━━━━━━━━━━━━━━━━━━━
👤 ${resident["Resident Name"]}
📱 PRN: ${resident["PRN/Mobile  Number"]}
📚 ${resident.Course} | Batch ${resident.Batch}
🚪 Room ${resident.Room} (${resident.Sharing}-sharing)
📅 Admission: ${resident["Admission Date"] || 'N/A'}

💵 Total Fees: ₹${totalAmt.toLocaleString()}
✅ Paid: ₹${paidAmt.toLocaleString()}
${dueAmt > 0 ? `⚠️ Due: ₹${dueAmt.toLocaleString()}` : '✅ No dues'}
📅 Due Date: ${resident["Fees Due Date(DD-MM-YY)"] || 'N/A'}
📅 Last Paid: ${resident["Fees Paid Date"] || 'N/A'}
📋 Next: ${resident["Upcomming Fee Structure"] || 'N/A'}

💡 Pay: H ${resident["PRN/Mobile  Number"]}|amount|DD-MM-YY`;
  } catch (e) {
    return `❌ Error: ${e.message}`;
  }
}

async function getFeeSummary() {
  try {
    const { data, error } = await supabase
      .from('Hostel new')
      .select('"Total Amount", "Due amount", "Course"');

    if (error) return `❌ DB Error: ${error.message}`;
    if (!data?.length) return '📭 No data.';

    let totalAmt = 0, totalDue = 0;
    const stats = {};

    data.forEach(r => {
      const amt = Number(r["Total Amount"]) || 0;
      const due = Number(r["Due amount"]) || 0;
      totalAmt += amt;
      totalDue += due;
      const c = r.Course || 'Unknown';
      if (!stats[c]) stats[c] = { total: 0, due: 0, count: 0 };
      stats[c].total += amt;
      stats[c].due += due;
      stats[c].count++;
    });

    let msg = `📊 *FEE SUMMARY*\n━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `Residents: *${data.length}*\n`;
    msg += `💰 Total: ₹${totalAmt.toLocaleString()}\n`;
    msg += `✅ Collected: ₹${(totalAmt - totalDue).toLocaleString()}\n`;
    msg += `⚠️ Pending: ₹${totalDue.toLocaleString()}\n\n`;

    for (const [course, s] of Object.entries(stats).sort()) {
      msg += `📚 *${course}* (${s.count})\n`;
      msg += `   Total ₹${s.total.toLocaleString()} | Due ₹${s.due.toLocaleString()}\n\n`;
    }
    return msg;
  } catch (e) {
    return `❌ Error: ${e.message}`;
  }
}

async function updateResidentFee(prn, amount, paidDate) {
  if (!prn || !amount) {
    return `❌ Format: H <PRN>|<amount>|<paid_date>\nExample: H 9876543210|25000|15-06-25`;
  }
  try {
    const { data: r, error: fe } = await supabase
      .from('Hostel new')
      .select('*')
      .ilike('"PRN/Mobile  Number"', prn.trim())
      .single();

    if (fe || !r) return `❌ Resident not found: ${prn}`;

    const prevDue = Number(r["Due amount"]) || 0;
    const paying  = Number(amount);

    if (paying > prevDue) return `❌ Amount ₹${paying.toLocaleString()} exceeds due ₹${prevDue.toLocaleString()}`;

    const newDue = prevDue - paying;
    const updateData = {
      "Due amount": newDue,
      "Fees Paid Date": paidDate || new Date().toLocaleDateString('en-GB')
    };

    // If fully paid, clear due date
    if (newDue === 0) updateData["Fees Due Date(DD-MM-YY)"] = null;

    const { error: ue } = await supabase
      .from('Hostel new')
      .update(updateData)
      .ilike('"PRN/Mobile  Number"', prn.trim());

    if (ue) return `❌ Update failed: ${ue.message}`;

    return `✅ *PAYMENT RECORDED*
━━━━━━━━━━━━━━━━━━━━
👤 ${r["Resident Name"]}
📱 PRN: ${prn}
📅 Paid Date: ${updateData["Fees Paid Date"]}

💵 Amount Paid: ₹${paying.toLocaleString()}
⚠️ Previous Due: ₹${prevDue.toLocaleString()}
${newDue > 0 ? `📌 Remaining Due: ₹${newDue.toLocaleString()}` : '✅ All dues cleared!'}`;
  } catch (e) {
    return `❌ Error: ${e.message}`;
  }
}

// ─── CRUD ──────────────────────────────────────────────

async function addResident(parts) {
  if (!parts || parts.length < 4) {
    return `❌ Format: ADD name|PRN|course|room|batch|totalAmt|sharing\nExample: ADD Suhani|9876543210|BAMS|26|2023|120000|4`;
  }
  const [name, prn, course, room, batch, totalAmt, sharing] = parts.map(p => p?.trim());
  try {
    const { data: existing } = await supabase
      .from('Hostel new')
      .select('"PRN/Mobile  Number"')
      .ilike('"PRN/Mobile  Number"', prn)
      .maybeSingle();

    if (existing) return `❌ PRN *${prn}* already exists.`;

    const { error } = await supabase.from('Hostel new').insert({
      "PRN/Mobile  Number": prn,
      "Resident Name": name,
      "Course": course,
      "Room": parseInt(room),
      "Batch": batch || String(new Date().getFullYear()),
      "Total Amount": totalAmt ? parseInt(totalAmt) : 0,
      "Due amount": totalAmt ? parseInt(totalAmt) : 0,
      "Sharing": sharing ? parseInt(sharing) : 4,
      "Admission Date": new Date().toLocaleDateString('en-GB')
    });

    if (error) return `❌ Add failed: ${error.message}`;

    return `✅ *RESIDENT ADDED*
👤 ${name} | 📱 ${prn}
📚 ${course} | Room ${room} | Batch ${batch || new Date().getFullYear()}
💰 Total Fees: ₹${parseInt(totalAmt || 0).toLocaleString()}`;
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
      .ilike('"PRN/Mobile  Number"', prn)
      .single();

    const { error } = await supabase
      .from('Hostel new')
      .delete()
      .ilike('"PRN/Mobile  Number"', prn);

    if (error) return `❌ Delete failed: ${error.message}`;

    return `✅ *DELETED*\n👤 ${r?.["Resident Name"] || 'Unknown'} | 📱 ${prn}`;
  } catch (e) {
    return `❌ Error: ${e.message}`;
  }
}

async function moveResidentRoom(prn, newRoom) {
  if (!prn || !newRoom) return '❌ Format: MOVE <PRN>|<newRoom>\nExample: MOVE 9876543210|30';
  try {
    const { data: r, error: fe } = await supabase
      .from('Hostel new')
      .select('"Resident Name", "Room"')
      .ilike('"PRN/Mobile  Number"', prn)
      .single();

    if (fe || !r) return `❌ Resident not found: ${prn}`;

    const { error: ue } = await supabase
      .from('Hostel new')
      .update({ "Room": parseInt(newRoom) })
      .ilike('"PRN/Mobile  Number"', prn);

    if (ue) return `❌ Move failed: ${ue.message}`;

    return `✅ *ROOM CHANGED*\n👤 ${r["Resident Name"]}\n🚪 Room ${r.Room} → ${newRoom}`;
  } catch (e) {
    return `❌ Error: ${e.message}`;
  }
}

// ─── STATISTICS ────────────────────────────────────────

async function getStatistics() {
  try {
    const { data, error } = await supabase.from('Hostel new').select('*');
    if (error) return `❌ DB Error: ${error.message}`;
    if (!data?.length) return '📭 No data.';

    const rooms = new Map();
    let totalAmt = 0, totalDue = 0;

    data.forEach(r => {
      totalAmt += Number(r["Total Amount"]) || 0;
      totalDue += Number(r["Due amount"]) || 0;
      if (!rooms.has(r.Room)) rooms.set(r.Room, { count: 0, sharing: r.Sharing });
      rooms.get(r.Room).count++;
    });

    let full = 0, vacant = 0;
    for (const d of rooms.values()) {
      d.count >= d.sharing ? full++ : vacant++;
    }

    const defaulters = data.filter(r => (r["Due amount"] || 0) > 0).length;

    return `📊 *STATISTICS*
━━━━━━━━━━━━━━━━━━━━
👥 Residents: *${data.length}*
🚪 Rooms: *${rooms.size}*  (🔴 ${full} full | 🟢 ${vacant} vacant)
📚 Courses: *${new Set(data.map(r => r.Course)).size}*
🎓 Batches: *${new Set(data.map(r => r.Batch)).size}*

💰 Total Fees: ₹${totalAmt.toLocaleString()}
✅ Collected: ₹${(totalAmt - totalDue).toLocaleString()}
⚠️ Pending: ₹${totalDue.toLocaleString()}
🚨 Defaulters: *${defaulters}* residents`;
  } catch (e) {
    return `❌ Error: ${e.message}`;
  }
}