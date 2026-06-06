import { supabase } from '@/lib/supabase';

// ============================================
// MAIN HOSTEL ADMIN HANDLER
// ============================================

export async function handleHostelAdminCommands(userMessage, cleanNumber) {
  const upperMsg = userMessage?.toUpperCase().trim() || '';
  let replyMessage = '';
  
  // ============ MAIN MENU ============
  if (['HOSTEL ADMIN', 'HOSTEL', 'MENU', 'START', 'HELP'].includes(upperMsg)) {
    replyMessage = getHostelMainMenu();
  }
  
  // ============ RESIDENT MENU ============
  else if (['RESIDENTS', 'RESIDENT LIST', '1'].includes(upperMsg)) {
    replyMessage = await getResidentList();
  }
  else if (['SEARCH', 'SEARCH RESIDENT', '2'].includes(upperMsg)) {
    replyMessage = getSearchResidentFormat();
  }
  else if (['COUNT', 'RESIDENT COUNT', '3'].includes(upperMsg)) {
    replyMessage = await getResidentCountWithCourse();
  }
  
  // ============ ROOM MENU ============
  else if (['ROOMS', 'ROOM LIST', '4'].includes(upperMsg)) {
    replyMessage = await getRoomList();
  }
  else if (['ROOM DETAILS', '5'].includes(upperMsg)) {
    replyMessage = getRoomDetailsFormat();
  }
  else if (['VACANT ROOMS', '6'].includes(upperMsg)) {
    replyMessage = await getVacantRooms();
  }
  
  // ============ FEES MENU ============
  else if (['HOSTEL FEE', 'FEE CHECK', '7'].includes(upperMsg)) {
    replyMessage = getHostelFeeFormat();
  }
  else if (['FEE DUE', '8', 'DUE LIST'].includes(upperMsg)) {
    replyMessage = await getHostelDueFeesList();
  }
  else if (['FEE SUMMARY', '9'].includes(upperMsg)) {
    replyMessage = await getHostelFeesSummary();
  }
  
  // ============ COURSE MENU ============
  else if (['COURSES', 'COURSE LIST', '10'].includes(upperMsg)) {
    replyMessage = await getCourseWiseList();
  }
  else if (['BATCH', 'BATCH LIST', '11'].includes(upperMsg)) {
    replyMessage = await getBatchWiseList();
  }
  
  // ============ ADMISSION MENU ============
  else if (['ADMISSIONS', '12'].includes(upperMsg)) {
    replyMessage = await getRecentAdmissions();
  }
  else if (['EXPIRING SOON', '13'].includes(upperMsg)) {
    replyMessage = await getFeesExpiringSoon();
  }
  
  // ============ OTHER ============
  else if (['EXPORT', 'EXPORT CSV', '14'].includes(upperMsg)) {
    replyMessage = await exportHostelData();
  }
  else if (['STATS', 'STATISTICS', '15'].includes(upperMsg)) {
    replyMessage = await getHostelStatistics();
  }
  else if (['SHORTCUT', 'SHORTCUTS'].includes(upperMsg)) {
    replyMessage = getHostelShortcutGuide();
  }
  
  // ============ SEARCH WITH ARGS ============
  else if (userMessage?.match(/^search\s/i)) {
    const query = userMessage.replace(/^search\s/i, '');
    replyMessage = await searchResident(query);
  }
  else if (userMessage?.match(/^room\s/i)) {
    const roomNo = userMessage.replace(/^room\s/i, '');
    replyMessage = await getRoomOccupants(roomNo);
  }
  else if (userMessage?.match(/^fee\s/i)) {
    const prn = userMessage.replace(/^fee\s/i, '');
    replyMessage = await getResidentFeeDetails(prn);
  }
  else if (userMessage?.match(/^course\s/i)) {
    const courseName = userMessage.replace(/^course\s/i, '');
    replyMessage = await getResidentsByCourse(courseName);
  }
  else if (userMessage?.match(/^batch\s/i)) {
    const batchYear = userMessage.replace(/^batch\s/i, '');
    replyMessage = await getResidentsByBatch(batchYear);
  }
  else if (userMessage?.match(/^add\s/i)) {
    const data = userMessage.replace(/^add\s/i, '').split('|');
    replyMessage = await addResident(data);
  }
  else if (userMessage?.match(/^update\s/i)) {
    const parts = userMessage.replace(/^update\s/i, '').split('|');
    replyMessage = await updateResidentFee(parts[0], parts[1]);
  }
  else if (userMessage?.match(/^delete\s/i)) {
    const prn = userMessage.replace(/^delete\s/i, '');
    replyMessage = await deleteResident(prn);
  }
  else if (userMessage?.match(/^move\s/i)) {
    const parts = userMessage.replace(/^move\s/i, '').split('|');
    replyMessage = await moveResidentRoom(parts[0], parts[1]);
  }
  
  // ============ DEFAULT ============
  else if (userMessage && userMessage !== '') {
    replyMessage = `🏨 *WELCOME HOSTEL ADMIN*\n\n${getHostelMainMenu()}`;
  }
  
  return replyMessage;
}

// ============================================
// MENU FUNCTIONS
// ============================================

function getHostelMainMenu() {
  return `
╔════════════════════════════╗
║   🏨 *HOSTEL ADMIN PANEL*    ║
╚════════════════════════════╝

  👥 *RESIDENT MENU*          
─────────────────────────
 1️⃣  RESIDENT LIST           
 2️⃣  SEARCH RESIDENT          
 3️⃣  RESIDENT COUNT (Course)  
─────────────────────────

  🚪 *ROOM MENU*              
─────────────────────────
 4️⃣  ROOM LIST               
 5️⃣  ROOM DETAILS            
 6️⃣  VACANT ROOMS            
─────────────────────────

  💰 *FEES MENU*              
─────────────────────────
 7️⃣  HOSTEL FEE CHECK        
 8️⃣  FEE DUE LIST            
 9️⃣  FEE SUMMARY             
─────────────────────────

  📚 *COURSE & BATCH*         
─────────────────────────
 🔟  COURSE WISE LIST         
 1️⃣1️⃣  BATCH WISE LIST         
─────────────────────────

  📅 *ADMISSIONS*             
─────────────────────────
 1️⃣2️⃣  RECENT ADMISSIONS      
 1️⃣3️⃣  FEES EXPIRING SOON     
─────────────────────────

  📊 *UTILITIES*              
─────────────────────────
 1️⃣4️⃣  EXPORT CSV             
 1️⃣5️⃣  STATISTICS             
─────────────────────────

💡 *Quick Commands:* 
• SEARCH <PRN/Name>
• ROOM <room_no>
• FEE <PRN/Name>
• COURSE <course>
• BATCH <year>
• ADD <name>|<prn>|<course>|<room>
• UPDATE <prn>|<amount>
• MOVE <prn>|<new_room>

⚡ *Shortcuts:* SHORTCUTS

👑 *Hostel Admin:* ${process.env.HOSTEL_ADMIN_NUMBER || '9480072737'}`;
}
function getHostelMainMenu() {
  return `
╔════════════════════════════╗
║   🏨 *HOSTEL ADMIN PANEL*    ║
╚════════════════════════════╝

  👥 *RESIDENT MENU*          
─────────────────────────
 1️⃣  RESIDENT LIST           
 2️⃣  SEARCH RESIDENT          
 3️⃣  RESIDENT COUNT (Course)  
─────────────────────────

  🚪 *ROOM MENU*              
─────────────────────────
 4️⃣  ROOM LIST               
 5️⃣  ROOM DETAILS            
 6️⃣  VACANT ROOMS            
─────────────────────────

  💰 *FEES MENU*              
─────────────────────────
 7️⃣  HOSTEL FEE CHECK        
 8️⃣  FEE DUE LIST            
 9️⃣  FEE SUMMARY             
─────────────────────────

  📚 *COURSE & BATCH*         
─────────────────────────
 🔟  COURSE WISE LIST         
 1️⃣1️⃣  BATCH WISE LIST         
─────────────────────────

  📅 *ADMISSIONS*             
─────────────────────────
 1️⃣2️⃣  RECENT ADMISSIONS      
 1️⃣3️⃣  FEES EXPIRING SOON     
─────────────────────────

  📊 *UTILITIES*              
─────────────────────────
 1️⃣4️⃣  EXPORT CSV             
 1️⃣5️⃣  STATISTICS             
─────────────────────────

💡 *Quick Commands:* 
• SEARCH <PRN/Name>
• ROOM <room_no>
• FEE <PRN/Name>
• COURSE <course>
• BATCH <year>

🔙 *Type EXIT or BACK to return to main admin menu*

👑 *Hostel Admin Mode Active*`;
}
// ============================================
// RESIDENT FUNCTIONS
// ============================================

async function getResidentList() {
  try {
    console.log('📋 Fetching resident list...');
    
    const { data: residents, error } = await supabase
      .from('hostel')
      .select('"Resident Name", "Course", "Room"')
      .order('"Resident Name"', { ascending: true });
    
    if (error) {
      console.error('Resident fetch error:', error);
      return `❌ *Database Error*: ${error.message}`;
    }
    
    if (!residents || residents.length === 0) {
      return '📭 *No residents found in hostel database*';
    }
    
    let message = `🏨 *RESIDENT LIST* (${residents.length})\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    // Show first 30 residents to avoid message length limit
    const displayResidents = residents.slice(0, 30);
    displayResidents.forEach((r, i) => {
      message += `${i+1}. 👤 ${r["Resident Name"]}\n`;
      message += `   📚 ${r["Course"]} | 🚪 Room ${r["Room"]}\n\n`;
    });
    
    if (residents.length > 30) {
      message += `📊 *Showing 30 of ${residents.length} residents*\n`;
      message += `💡 Use SEARCH to find specific resident`;
    }
    
    return message;
  } catch (error) {
    console.error('Exception in getResidentList:', error);
    return `❌ *Error*: ${error.message}`;
  }
}

async function getResidentCountWithCourse() {
  try {
    const { data: residents, error } = await supabase
      .from('hostel')
      .select('"Course"');
    
    if (error) {
      console.error('Count fetch error:', error);
      return '❌ *Database Error*';
    }
    
    if (!residents || residents.length === 0) {
      return '📭 *No residents found*';
    }
    
    const courseCount = {};
    residents.forEach(r => {
      const course = r["Course"] || 'Unknown';
      courseCount[course] = (courseCount[course] || 0) + 1;
    });
    
    let message = `📊 *RESIDENT COUNT BY COURSE*\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    for (const [course, count] of Object.entries(courseCount).sort()) {
      message += `• ${course}: ${count} residents\n`;
    }
    
    message += `\n🏨 *TOTAL: ${residents.length} residents*`;
    
    return message;
  } catch (error) {
    console.error('Exception in getResidentCountWithCourse:', error);
    return `❌ *Error*: ${error.message}`;
  }
}

async function searchResident(query) {
  if (!query || query.trim() === '') {
    return getSearchResidentFormat();
  }
  
  try {
    const { data: residents, error } = await supabase
      .from('hostel')
      .select('*')
      .or(`"PRN/Mobile  Number"::text.ilike.%${query}%, "Resident Name".ilike.%${query}%, "Course".ilike.%${query}%, "Room".ilike.%${query}%`);
    
    if (error) {
      console.error('Search error:', error);
      return '❌ *Database Error*';
    }
    
    if (!residents || residents.length === 0) {
      return `❌ *No resident found for:* ${query}`;
    }
    
    let message = `🔍 *SEARCH RESULTS* (${residents.length})\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    for (const r of residents) {
      message += `👤 *${r["Resident Name"]}*\n`;
      message += `📱 PRN: ${r["PRN/Mobile  Number"] || 'N/A'}\n`;
      message += `📚 Course: ${r["Course"] || 'N/A'}\n`;
      message += `📅 Batch: ${r["Batch"] || 'N/A'}\n`;
      message += `🚪 Room: ${r["Room"] || 'N/A'} (${r["Sharing"] || 'N/A'}-sharing)\n`;
      message += `💰 Installment: ₹${(r["Install Ment Name(Amount)"] || 0).toLocaleString()}\n`;
      message += `📅 Due Date: ${r["Fees Due Date(DD-MM-YY)"] || 'N/A'}\n`;
      message += `📅 Admission: ${r["Admission Date"] || 'N/A'}\n\n`;
    }
    
    return message;
  } catch (error) {
    console.error('Exception in searchResident:', error);
    return `❌ *Error*: ${error.message}`;
  }
}

// ============================================
// ROOM FUNCTIONS
// ============================================

async function getRoomList() {
  try {
    const { data: rooms, error } = await supabase
      .from('hostel')
      .select('"Room", "Sharing", count:"Resident Name"')
      .order('"Room"');
    
    if (error) {
      console.error('Room fetch error:', error);
      return '❌ *Database Error*';
    }
    
    if (!rooms || rooms.length === 0) {
      return '🚪 *No rooms found*';
    }
    
    // Group by room
    const roomMap = new Map();
    rooms.forEach(r => {
      const roomNo = r["Room"];
      if (!roomMap.has(roomNo)) {
        roomMap.set(roomNo, { 
          room: roomNo, 
          sharing: r["Sharing"], 
          count: 0 
        });
      }
      roomMap.get(roomNo).count++;
    });
    
    const uniqueRooms = Array.from(roomMap.values()).sort((a, b) => {
      return parseInt(a.room) - parseInt(b.room);
    });
    
    let message = `🚪 *ROOM LIST* (${uniqueRooms.length} rooms)\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    uniqueRooms.forEach((r, i) => {
      const occupancy = `${r.count}/${r.sharing}`;
      const status = r.count === r.sharing ? '🟢 FULL' : '🟡 AVAILABLE';
      message += `${i+1}. Room *${r.room}* - ${occupancy} ${status}\n`;
    });
    
    message += `\n💡 *Commands:*\n`;
    message += `• ROOM <room_no> - View occupants\n`;
    message += `• VACANT ROOMS - View available rooms`;
    
    return message;
  } catch (error) {
    console.error('Exception in getRoomList:', error);
    return `❌ *Error*: ${error.message}`;
  }
}

async function getRoomOccupants(roomNo) {
  if (!roomNo || roomNo.trim() === '') {
    return getRoomDetailsFormat();
  }
  
  try {
    const { data: occupants, error } = await supabase
      .from('hostel')
      .select('*')
      .eq('"Room"', roomNo);
    
    if (error) {
      console.error('Room occupants error:', error);
      return '❌ *Database Error*';
    }
    
    if (!occupants || occupants.length === 0) {
      return `🚪 *Room ${roomNo} is currently vacant*`;
    }
    
    const sharing = occupants[0]["Sharing"] || 'N/A';
    const available = sharing - occupants.length;
    
    let message = `🚪 *ROOM ${roomNo} DETAILS*\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    message += `📊 *Capacity:* ${sharing}-sharing\n`;
    message += `👥 *Current Occupants:* ${occupants.length}/${sharing}\n`;
    message += `🟢 *Vacancy:* ${available} ${available === 1 ? 'seat' : 'seats'}\n\n`;
    message += `👤 *RESIDENTS:*\n`;
    
    occupants.forEach((r, i) => {
      message += `\n${i+1}. *${r["Resident Name"]}*\n`;
      message += `   📱 PRN: ${r["PRN/Mobile  Number"]}\n`;
      message += `   📚 ${r["Course"]} (${r["Batch"]})\n`;
      message += `   💰 Installment: ₹${(r["Install Ment Name(Amount)"] || 0).toLocaleString()}\n`;
      message += `   📅 Due: ${r["Fees Due Date(DD-MM-YY)"] || 'N/A'}\n`;
    });
    
    return message;
  } catch (error) {
    console.error('Exception in getRoomOccupants:', error);
    return `❌ *Error*: ${error.message}`;
  }
}

async function getVacantRooms() {
  try {
    const { data: rooms, error } = await supabase
      .from('hostel')
      .select('"Room", "Sharing"');
    
    if (error) {
      console.error('Vacant rooms error:', error);
      return '❌ *Database Error*';
    }
    
    const roomMap = new Map();
    rooms.forEach(r => {
      const roomNo = r["Room"];
      if (!roomMap.has(roomNo)) {
        roomMap.set(roomNo, { count: 0, sharing: r["Sharing"] });
      }
      roomMap.get(roomNo).count++;
    });
    
    const vacantRooms = [];
    for (const [room, data] of roomMap.entries()) {
      if (data.count < data.sharing) {
        vacantRooms.push({
          room: room,
          vacant: data.sharing - data.count,
          sharing: data.sharing
        });
      }
    }
    
    if (vacantRooms.length === 0) {
      return '🏨 *No vacant rooms available*\n\nAll rooms are fully occupied.';
    }
    
    let message = `🟢 *VACANT ROOMS* (${vacantRooms.length})\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    vacantRooms.forEach((r, i) => {
      message += `${i+1}. Room *${r.room}* - ${r.vacant}/${r.sharing} seats vacant\n`;
    });
    
    message += `\n💡 Use MOVE <prn>|<new_room> to change room assignment`;
    
    return message;
  } catch (error) {
    console.error('Exception in getVacantRooms:', error);
    return `❌ *Error*: ${error.message}`;
  }
}

// ============================================
// FEES FUNCTIONS
// ============================================

async function getResidentFeeDetails(searchQuery) {
  if (!searchQuery || searchQuery.trim() === '') {
    return getHostelFeeFormat();
  }
  
  try {
    const { data: residents, error } = await supabase
      .from('hostel')
      .select('*')
      .or(`"PRN/Mobile  Number"::text.ilike.%${searchQuery}%, "Resident Name".ilike.%${searchQuery}%`);
    
    if (error) {
      console.error('Fee search error:', error);
      return '❌ *Database Error*';
    }
    
    if (!residents || residents.length === 0) {
      return `❌ *No resident found for:* ${searchQuery}`;
    }
    
    if (residents.length > 1) {
      let message = `🔍 *MULTIPLE RESIDENTS FOUND* (${residents.length})\n`;
      message += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      message += `Please use exact PRN:\n\n`;
      
      residents.slice(0, 5).forEach((r, i) => {
        message += `${i+1}. 👤 *${r["Resident Name"]}*\n`;
        message += `   📱 PRN: ${r["PRN/Mobile  Number"]}\n`;
        message += `   🚪 Room ${r["Room"]}\n\n`;
      });
      
      return message;
    }
    
    const r = residents[0];
    const dueDate = new Date(r["Fees Due Date(DD-MM-YY)"]);
    const today = new Date();
    const isOverdue = dueDate < today;
    
    let message = `💰 *HOSTEL FEE DETAILS*
━━━━━━━━━━━━━━━━━━━━━━

👤 *Resident:* ${r["Resident Name"]}
📱 *PRN:* ${r["PRN/Mobile  Number"]}
📚 *Course:* ${r["Course"]} (${r["Batch"]})
🚪 *Room:* ${r["Room"]} (${r["Sharing"]}-sharing)
📅 *Admission:* ${r["Admission Date"]}

💵 *Installment Amount:* ₹${(r["Install Ment Name(Amount)"] || 0).toLocaleString()}
📅 *Due Date:* ${r["Fees Due Date(DD-MM-YY)"]}
⚠️ *Status:* ${isOverdue ? '🔴 OVERDUE' : '🟡 PENDING'}

💡 To update: UPDATE ${r["PRN/Mobile  Number"]}|<amount>`;
    
    return message;
  } catch (error) {
    console.error('Exception in getResidentFeeDetails:', error);
    return `❌ *Error*: ${error.message}`;
  }
}

async function getHostelDueFeesList() {
  try {
    console.log('🔍 Fetching due fees list...');
    
    const { data: residents, error } = await supabase
      .from('hostel')
      .select('*')
      .not('"Fees Due Date(DD-MM-YY)"', 'is', null)
      .order('"Fees Due Date(DD-MM-YY)"', { ascending: true });
    
    if (error) {
      console.error('Due fees error:', error);
      return `❌ *Database Error*: ${error.message}`;
    }
    
    if (!residents || residents.length === 0) {
      return `✅ *No pending fees*\n\nAll residents have paid their fees.`;
    }
    
    const today = new Date();
    const overdue = [];
    const upcoming = [];
    
    residents.forEach(r => {
      const dueDate = new Date(r["Fees Due Date(DD-MM-YY)"]);
      if (dueDate < today) {
        overdue.push(r);
      } else {
        upcoming.push(r);
      }
    });
    
    let message = `⚠️ *HOSTEL FEE DUE LIST*\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    if (overdue.length > 0) {
      message += `🔴 *OVERDUE* (${overdue.length})\n`;
      overdue.slice(0, 10).forEach((r, i) => {
        message += `${i+1}. ${r["Resident Name"]} - Room ${r["Room"]}\n`;
        message += `   📅 Due: ${r["Fees Due Date(DD-MM-YY)"]}\n`;
        message += `   💰 Amount: ₹${(r["Install Ment Name(Amount)"] || 0).toLocaleString()}\n\n`;
      });
    }
    
    if (upcoming.length > 0) {
      message += `🟡 *UPCOMING* (${upcoming.length})\n`;
      upcoming.slice(0, 10).forEach((r, i) => {
        message += `${i+1}. ${r["Resident Name"]} - Room ${r["Room"]}\n`;
        message += `   📅 Due: ${r["Fees Due Date(DD-MM-YY)"]}\n\n`;
      });
    }
    
    message += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `📊 *Total Due: ${overdue.length + upcoming.length} residents*\n`;
    message += `🔴 Overdue: ${overdue.length} | 🟡 Upcoming: ${upcoming.length}`;
    
    return message;
  } catch (error) {
    console.error('Exception:', error);
    return `❌ *Error*: ${error.message}`;
  }
}

async function getHostelFeesSummary() {
  try {
    const { data: residents, error } = await supabase
      .from('hostel')
      .select('"Install Ment Name(Amount)", "Course", "Batch"');
    
    if (error) {
      console.error('Summary error:', error);
      return '❌ *Database Error*';
    }
    
    if (!residents || residents.length === 0) {
      return '📭 *No residents found*';
    }
    
    let totalInstallments = 0;
    const courseStats = {};
    const batchStats = {};
    
    residents.forEach(r => {
      const amount = Number(r["Install Ment Name(Amount)"]) || 0;
      totalInstallments += amount;
      
      const course = r["Course"] || 'Unknown';
      if (!courseStats[course]) {
        courseStats[course] = { total: 0, count: 0 };
      }
      courseStats[course].total += amount;
      courseStats[course].count++;
      
      const batch = r["Batch"] || 'Unknown';
      if (!batchStats[batch]) {
        batchStats[batch] = { total: 0, count: 0 };
      }
      batchStats[batch].total += amount;
      batchStats[batch].count++;
    });
    
    let message = `📊 *HOSTEL FEE SUMMARY*
━━━━━━━━━━━━━━━━━━━━━━

👥 *Total Residents:* ${residents.length}
💰 *Total Installments:* ₹${totalInstallments.toLocaleString()}
📊 *Average per Resident:* ₹${Math.round(totalInstallments / residents.length).toLocaleString()}

━━━━━━━━━━━━━━━━━━━━━━
📚 *COURSE WISE*\n`;

    for (const [course, stats] of Object.entries(courseStats).sort()) {
      message += `\n• *${course}* (${stats.count} residents)\n`;
      message += `  💰 Total: ₹${stats.total.toLocaleString()}\n`;
      message += `  📊 Avg: ₹${Math.round(stats.total / stats.count).toLocaleString()}`;
    }
    
    message += `\n\n━━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `💡 Use FEE DUE to see pending list`;
    
    return message;
  } catch (error) {
    console.error('Exception:', error);
    return `❌ *Error*: ${error.message}`;
  }
}

async function getFeesExpiringSoon() {
  try {
    const { data: residents, error } = await supabase
      .from('hostel')
      .select('*')
      .not('"Fees Due Date(DD-MM-YY)"', 'is', null)
      .order('"Fees Due Date(DD-MM-YY)"', { ascending: true })
      .limit(20);
    
    if (error) {
      console.error('Expiring soon error:', error);
      return '❌ *Database Error*';
    }
    
    if (!residents || residents.length === 0) {
      return '📅 *No upcoming fee due dates found*';
    }
    
    let message = `📅 *FEES EXPIRING SOON*\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    residents.forEach((r, i) => {
      message += `${i+1}. *${r["Resident Name"]}*\n`;
      message += `   📅 Due: ${r["Fees Due Date(DD-MM-YY)"]}\n`;
      message += `   💰 Amount: ₹${(r["Install Ment Name(Amount)"] || 0).toLocaleString()}\n`;
      message += `   🚪 Room ${r["Room"]}\n\n`;
    });
    
    return message;
  } catch (error) {
    console.error('Exception:', error);
    return `❌ *Error*: ${error.message}`;
  }
}

// ============================================
// COURSE & BATCH FUNCTIONS
// ============================================

async function getCourseWiseList() {
  try {
    const { data: residents, error } = await supabase
      .from('hostel')
      .select('"Course", "Resident Name", "Room"')
      .order('"Course"');
    
    if (error) {
      console.error('Course list error:', error);
      return '❌ *Database Error*';
    }
    
    const courseMap = new Map();
    residents.forEach(r => {
      const course = r["Course"] || 'Unknown';
      if (!courseMap.has(course)) {
        courseMap.set(course, []);
      }
      courseMap.get(course).push(r);
    });
    
    let message = `📚 *COURSE WISE RESIDENTS*\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    for (const [course, students] of courseMap.entries()) {
      message += `📖 *${course}* (${students.length})\n`;
      students.slice(0, 5).forEach(s => {
        message += `   👤 ${s["Resident Name"]} - Room ${s["Room"]}\n`;
      });
      if (students.length > 5) {
        message += `   📊 +${students.length - 5} more\n`;
      }
      message += `\n`;
    }
    
    message += `💡 Use COURSE <course_name> for complete list`;
    
    return message;
  } catch (error) {
    console.error('Exception:', error);
    return `❌ *Error*: ${error.message}`;
  }
}

async function getResidentsByCourse(courseName) {
  if (!courseName || courseName.trim() === '') {
    return `❌ *Please specify a course*\n\nExample: COURSE BAMS`;
  }
  
  try {
    const { data: residents, error } = await supabase
      .from('hostel')
      .select('*')
      .ilike('"Course"', `%${courseName}%`)
      .order('"Resident Name"');
    
    if (error) {
      console.error('Course residents error:', error);
      return '❌ *Database Error*';
    }
    
    if (!residents || residents.length === 0) {
      return `❌ *No residents found for course:* ${courseName}`;
    }
    
    let message = `📚 *${courseName.toUpperCase()} STUDENTS* (${residents.length})\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    residents.forEach((r, i) => {
      message += `${i+1}. ${r["Resident Name"]}\n`;
      message += `   📱 ${r["PRN/Mobile  Number"]}\n`;
      message += `   🚪 Room ${r["Room"]} (${r["Sharing"]}-sharing)\n`;
      message += `   📅 Batch ${r["Batch"]}\n\n`;
    });
    
    return message;
  } catch (error) {
    console.error('Exception:', error);
    return `❌ *Error*: ${error.message}`;
  }
}

async function getBatchWiseList() {
  try {
    const { data: residents, error } = await supabase
      .from('hostel')
      .select('"Batch", "Resident Name", "Course"')
      .order('"Batch"', { ascending: false });
    
    if (error) {
      console.error('Batch list error:', error);
      return '❌ *Database Error*';
    }
    
    const batchMap = new Map();
    residents.forEach(r => {
      const batch = r["Batch"] || 'Unknown';
      if (!batchMap.has(batch)) {
        batchMap.set(batch, []);
      }
      batchMap.get(batch).push(r);
    });
    
    let message = `📅 *BATCH WISE RESIDENTS*\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    const sortedBatches = Array.from(batchMap.keys()).sort((a, b) => {
      if (a === 'Unknown') return 1;
      if (b === 'Unknown') return -1;
      return b - a;
    });
    
    for (const batch of sortedBatches) {
      const students = batchMap.get(batch);
      message += `🎓 *Batch ${batch}* (${students.length})\n`;
      students.slice(0, 5).forEach(s => {
        message += `   👤 ${s["Resident Name"]} (${s["Course"]})\n`;
      });
      if (students.length > 5) {
        message += `   📊 +${students.length - 5} more\n`;
      }
      message += `\n`;
    }
    
    message += `💡 Use BATCH <year> for complete list`;
    
    return message;
  } catch (error) {
    console.error('Exception:', error);
    return `❌ *Error*: ${error.message}`;
  }
}

async function getResidentsByBatch(batchYear) {
  if (!batchYear || batchYear.trim() === '') {
    return `❌ *Please specify a batch year*\n\nExample: BATCH 2023`;
  }
  
  try {
    const { data: residents, error } = await supabase
      .from('hostel')
      .select('*')
      .eq('"Batch"', parseInt(batchYear))
      .order('"Resident Name"');
    
    if (error) {
      console.error('Batch residents error:', error);
      return '❌ *Database Error*';
    }
    
    if (!residents || residents.length === 0) {
      return `❌ *No residents found for batch:* ${batchYear}`;
    }
    
    let message = `🎓 *BATCH ${batchYear} STUDENTS* (${residents.length})\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    residents.forEach((r, i) => {
      message += `${i+1}. ${r["Resident Name"]}\n`;
      message += `   📚 ${r["Course"]}\n`;
      message += `   🚪 Room ${r["Room"]}\n\n`;
    });
    
    return message;
  } catch (error) {
    console.error('Exception:', error);
    return `❌ *Error*: ${error.message}`;
  }
}

// =