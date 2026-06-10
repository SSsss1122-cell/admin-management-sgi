import { supabase } from '@/lib/supabase';

export async function handleHostelAdminCommands(userMessage, cleanNumber) {
  const upper = userMessage?.toUpperCase().trim() || '';
  const lower = userMessage?.toLowerCase().trim() || '';

  console.log(`🏨 Hostel Admin: "${userMessage}"`);

  // Single-letter commands (NO 'H' here - reserved for fee update)
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
  if (lower.startsWith('h ')) return await updateResidentFee(...userMessage.substring(2).trim().split('|'));
  if (lower.startsWith('add ')) return await addResident(userMessage.substring(4).trim().split('|'));
  if (lower.startsWith('del ')) return await deleteResident(userMessage.substring(4).trim());
  if (lower.startsWith('move ')) return await moveResidentRoom(...userMessage.substring(5).trim().split('|'));

  return `❓ Command samajh nahi aaya.\n\nType *MENU* for help.`;
}

// ─── MENU ──────────────────────────────────────────────

function getMenu() {
  return `🏨 *HOSTEL ADMIN*
━━━━━━━━━━━━━━━━━━━━

👥 *RESIDENTS*
 A → Resident list
 B → Search  (B Suhani)
 C → Count by course

🚪 *ROOMS*
 D → Room list
 E → Room details  (E 26)
 F → Vacant rooms

💰 *FEES*
 G → Fee check  (G Suhani)
 H → Update fee  (H PRN|amount)
 I → Fee summary

📊 *OTHER*
 N → Statistics

➕ ADD → ADD name|PRN|course|room
🗑 DEL → DEL PRN
🔄 MOVE → MOVE PRN|newRoom`;
}

// ─── RESIDENTS ─────────────────────────────────────────

async function getResidentList() {
  try {
    const { data, error } = await supabase
      .from('hostel')
      .select('"Resident Name", Course, Room')
      .order('"Resident Name"');

    if (error) return `❌ DB Error: ${error.message}`;
    if (!data?.length) return '📭 No residents found.';

    let msg = `👥 *RESIDENT LIST* (${data.length})\n━━━━━━━━━━━━━━━━━━━━\n\n`;
    data.slice(0, 30).forEach((r, i) => {
      msg += `${i + 1}. *${r["Resident Name"]}*\n   ${r.Course} | Room ${r.Room}\n\n`;
    });
    if (data.length > 30) msg += `_...${data.length - 30} more. Use B to search._`;
    return msg;
  } catch (e) {
    return `❌ Error: ${e.message}`;
  }
}

async function getResidentCountWithCourse() {
  try {
    const { data, error } = await supabase.from('hostel').select('Course');
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

    if (!isNaN(query)) {
      const { data } = await supabase.from('hostel').select('*').eq('"PRN/Mobile  Number"', parseInt(query));
      if (data?.length) results = data;
    }

    if (!results.length) {
      const { data } = await supabase.from('hostel').select('*').ilike('"Resident Name"', `%${query}%`);
      if (data?.length) results = data;
    }

    if (!results.length) return `❌ No resident found for: *${query}*`;

    let msg = `🔍 *SEARCH: "${query}"* (${results.length})\n━━━━━━━━━━━━━━━━━━━━\n\n`;
    for (const r of results) {
      msg += `👤 *${r["Resident Name"]}*\n`;
      msg += `📱 PRN: ${r["PRN/Mobile  Number"] || 'N/A'}\n`;
      msg += `📚 ${r.Course || 'N/A'} | Batch ${r.Batch || 'N/A'}\n`;
      msg += `🚪 Room ${r.Room || 'N/A'} (${r.Sharing || 'N/A'}-sharing)\n`;
      msg += `💰 ₹${(r["Install Ment Name(Amount)"] || 0).toLocaleString()} | Due: ${r["Fees Due Date(DD-MM-YY)"] || 'N/A'}\n\n`;
    }
    return msg;
  } catch (e) {
    return `❌ Error: ${e.message}`;
  }
}

// ─── ROOMS ─────────────────────────────────────────────

async function getRoomList() {
  try {
    const { data, error } = await supabase.from('hostel').select('Room, Sharing');
    if (error) return `❌ DB Error: ${error.message}`;
    if (!data?.length) return '🚪 No rooms found.';

    const map = new Map();
    data.forEach(r => {
      if (!map.has(r.Room)) map.set(r.Room, { sharing: r.Sharing, count: 0 });
      map.get(r.Room).count++;
    });

    const rooms = [...map.entries()].sort((a, b) => parseInt(a[0]) - parseInt(b[0]));
    let msg = `🚪 *ROOMS* (${rooms.length})\n━━━━━━━━━━━━━━━━━━━━\n\n`;
    rooms.forEach(([room, d]) => {
      const full = d.count >= d.sharing;
      msg += `${full ? '🔴' : '🟢'} Room *${room}* — ${d.count}/${d.sharing}\n`;
    });
    msg += `\n💡 E <room_no> for details`;
    return msg;
  } catch (e) {
    return `❌ Error: ${e.message}`;
  }
}

async function getRoomOccupants(roomNo) {
  if (!roomNo) return '🚪 Format: E <room_no>  Example: E 26';
  try {
    const { data, error } = await supabase.from('hostel').select('*').eq('Room', roomNo);
    if (error) return `❌ DB Error: ${error.message}`;
    if (!data?.length) return `🚪 Room *${roomNo}* is vacant.`;

    const sharing = data[0].Sharing || '?';
    let msg = `🚪 *ROOM ${roomNo}* — ${data.length}/${sharing} occupied\n━━━━━━━━━━━━━━━━━━━━\n\n`;
    data.forEach((r, i) => {
      msg += `${i + 1}. *${r["Resident Name"]}*\n`;
      msg += `   📱 ${r["PRN/Mobile  Number"]}\n`;
      msg += `   📚 ${r.Course} (${r.Batch})\n`;
      msg += `   💰 ₹${(r["Install Ment Name(Amount)"] || 0).toLocaleString()} | Due: ${r["Fees Due Date(DD-MM-YY)"] || 'N/A'}\n\n`;
    });
    return msg;
  } catch (e) {
    return `❌ Error: ${e.message}`;
  }
}

async function getVacantRooms() {
  try {
    const { data, error } = await supabase.from('hostel').select('Room, Sharing');
    if (error) return `❌ DB Error: ${error.message}`;

    const map = new Map();
    data.forEach(r => {
      if (!map.has(r.Room)) map.set(r.Room, { sharing: r.Sharing, count: 0 });
      map.get(r.Room).count++;
    });

    const vacant = [...map.entries()]
      .filter(([_, d]) => d.count < d.sharing)
      .sort((a, b) => parseInt(a[0]) - parseInt(b[0]));

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

    if (!isNaN(query)) {
      const { data } = await supabase.from('hostel').select('*').eq('"PRN/Mobile  Number"', parseInt(query)).maybeSingle();
      if (data) resident = data;
    }
    if (!resident) {
      const { data } = await supabase.from('hostel').select('*').ilike('"Resident Name"', `%${query}%`).maybeSingle();
      if (data) resident = data;
    }

    if (!resident) return `❌ No resident found: *${query}*`;

    return `💰 *FEE DETAILS*
━━━━━━━━━━━━━━━━━━━━
👤 ${resident["Resident Name"]}
📱 PRN: ${resident["PRN/Mobile  Number"]}
📚 ${resident.Course} | Batch ${resident.Batch}
🚪 Room ${resident.Room} (${resident.Sharing}-sharing)

💵 Installment: ₹${(resident["Install Ment Name(Amount)"] || 0).toLocaleString()}
📅 Due Date: ${resident["Fees Due Date(DD-MM-YY)"] || 'N/A'}
📅 Admission: ${resident["Admission Date"] || 'N/A'}

💡 Update: H ${resident["PRN/Mobile  Number"]}|<amount>`;
  } catch (e) {
    return `❌ Error: ${e.message}`;
  }
}

async function getHostelFeesSummary() {
  try {
    const { data, error } = await supabase.from('hostel').select('"Install Ment Name(Amount)", Course');
    if (error) return `❌ DB Error: ${error.message}`;
    if (!data?.length) return '📭 No data.';

    let total = 0;
    const stats = {};
    data.forEach(r => {
      const amt = Number(r["Install Ment Name(Amount)"]) || 0;
      total += amt;
      const c = r.Course || 'Unknown';
      if (!stats[c]) stats[c] = { total: 0, count: 0 };
      stats[c].total += amt;
      stats[c].count++;
    });

    let msg = `📊 *FEE SUMMARY*\n━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `Total: ₹${total.toLocaleString()} | Residents: ${data.length}\n\n`;
    for (const [course, s] of Object.entries(stats).sort()) {
      msg += `📚 *${course}* (${s.count})\n   ₹${s.total.toLocaleString()} | Avg ₹${Math.round(s.total / s.count).toLocaleString()}\n\n`;
    }
    return msg;
  } catch (e) {
    return `❌ Error: ${e.message}`;
  }
}

async function updateResidentFee(prn, amount) {
  if (!prn || !amount) return '❌ Format: H <PRN>|<amount>\nExample: H 8857090461|50000';
  try {
    const { data: resident, error: fe } = await supabase
      .from('hostel').select('*').eq('"PRN/Mobile  Number"', prn.trim()).single();

    if (fe || !resident) return `❌ Resident not found: ${prn}`;

    const prev = Number(resident["Install Ment Name(Amount)"]) || 0;
    const updated = prev + Number(amount);

    const { error: ue } = await supabase
      .from('hostel')
      .update({ "Install Ment Name(Amount)": updated })
      .eq('"PRN/Mobile  Number"', prn.trim());

    if (ue) return `❌ Update failed: ${ue.message}`;

    return `✅ *FEE UPDATED*
━━━━━━━━━━━━━━━━━━━━
👤 ${resident["Resident Name"]}
💰 Previous: ₹${prev.toLocaleString()}
➕ Added: ₹${Number(amount).toLocaleString()}
✅ New Total: ₹${updated.toLocaleString()}`;
  } catch (e) {
    return `❌ Error: ${e.message}`;
  }
}

// ─── CRUD ──────────────────────────────────────────────

async function addResident(parts) {
  if (!parts || parts.length < 4) {
    return `❌ Format: ADD name|PRN|course|room\nExample: ADD John|9876543210|BAMS|26`;
  }
  const [name, prn, course, room, batch, amount, dueDate, sharing] = parts.map(p => p?.trim());
  try {
    const { data: existing } = await supabase.from('hostel').select('"PRN/Mobile  Number"')
      .eq('"PRN/Mobile  Number"', prn).maybeSingle();
    if (existing) return `❌ PRN *${prn}* already exists.`;

    const { error } = await supabase.from('hostel').insert({
      "PRN/Mobile  Number": prn,
      "Resident Name": name,
      "Course": course,
      "Room": room,
      "Batch": batch ? parseInt(batch) : new Date().getFullYear(),
      "Install Ment Name(Amount)": amount ? parseFloat(amount) : 0,
      "Fees Due Date(DD-MM-YY)": dueDate || null,
      "Sharing": sharing ? parseInt(sharing) : 4,
      "Admission Date": new Date().toLocaleDateString('en-GB')
    });

    if (error) return `❌ Add failed: ${error.message}`;

    return `✅ *RESIDENT ADDED*\n👤 ${name}\n📱 ${prn}\n📚 ${course} | Room ${room}`;
  } catch (e) {
    return `❌ Error: ${e.message}`;
  }
}

async function deleteResident(prn) {
  if (!prn) return '❌ Format: DEL <PRN>';
  try {
    const { data: r } = await supabase.from('hostel').select('"Resident Name"')
      .eq('"PRN/Mobile  Number"', prn).single();

    const { error } = await supabase.from('hostel').delete().eq('"PRN/Mobile  Number"', prn);
    if (error) return `❌ Delete failed: ${error.message}`;

    return `✅ *DELETED*\n👤 ${r?.["Resident Name"] || 'Unknown'}\n📱 ${prn}`;
  } catch (e) {
    return `❌ Error: ${e.message}`;
  }
}

async function moveResidentRoom(prn, newRoom) {
  if (!prn || !newRoom) return '❌ Format: MOVE <PRN>|<newRoom>\nExample: MOVE 8857090461|30';
  try {
    const { data: r, error: fe } = await supabase.from('hostel')
      .select('"Resident Name", Room').eq('"PRN/Mobile  Number"', prn).single();

    if (fe || !r) return `❌ Resident not found: ${prn}`;

    const { error: ue } = await supabase.from('hostel')
      .update({ Room: newRoom.trim() }).eq('"PRN/Mobile  Number"', prn);

    if (ue) return `❌ Move failed: ${ue.message}`;

    return `✅ *ROOM CHANGED*\n👤 ${r["Resident Name"]}\n🚪 ${r.Room} → ${newRoom}`;
  } catch (e) {
    return `❌ Error: ${e.message}`;
  }
}

// ─── STATISTICS ────────────────────────────────────────

async function getHostelStatistics() {
  try {
    const { data, error } = await supabase.from('hostel').select('*');
    if (error) return `❌ DB Error: ${error.message}`;
    if (!data?.length) return '📭 No data.';

    const rooms = new Map();
    let total = 0;
    data.forEach(r => {
      total += Number(r["Install Ment Name(Amount)"]) || 0;
      if (!rooms.has(r.Room)) rooms.set(r.Room, { count: 0, sharing: r.Sharing });
      rooms.get(r.Room).count++;
    });

    let full = 0, vacant = 0;
    for (const d of rooms.values()) {
      d.count >= d.sharing ? full++ : vacant++;
    }

    return `📊 *STATISTICS*
━━━━━━━━━━━━━━━━━━━━
👥 Residents: *${data.length}*
🚪 Rooms: *${rooms.size}*  (🔴 ${full} full | 🟢 ${vacant} vacant)
📚 Courses: *${new Set(data.map(r => r.Course)).size}*
🎓 Batches: *${new Set(data.map(r => r.Batch)).size}*

💰 Total Installments: ₹${total.toLocaleString()}
📊 Avg per Resident: ₹${Math.round(total / data.length).toLocaleString()}`;
  } catch (e) {
    return `❌ Error: ${e.message}`;
  }
}