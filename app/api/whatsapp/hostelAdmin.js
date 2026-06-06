import { supabase } from '@/lib/supabase';

// ============================================
// MAIN HOSTEL ADMIN HANDLER
// ============================================

export async function handleHostelAdminCommands(userMessage, cleanNumber) {
  const upperMsg = userMessage?.toUpperCase().trim() || '';
  const lowerMsg = userMessage?.toLowerCase().trim() || '';
  let replyMessage = '';
  
  console.log(`🏨 Hostel Admin received: "${userMessage}"`);
  
  // ============ HELP / MAIN MENU ============
  if (['HOSTEL', 'MENU', 'START', 'HELP', 'H'].includes(upperMsg)) {
    replyMessage = getHostelMainMenu();
  }
  
  // ============ RESIDENT MENU ============
  else if (upperMsg === 'A' || upperMsg === 'RESIDENT LIST' || upperMsg === 'RESIDENTS') {
    replyMessage = await getResidentList();
  }
  else if (upperMsg === 'B' || upperMsg === 'SEARCH' || upperMsg === 'SEARCH RESIDENT') {
    replyMessage = getSearchResidentFormat();
  }
  else if (upperMsg === 'C' || upperMsg === 'COUNT' || upperMsg === 'RESIDENT COUNT') {
    replyMessage = await getResidentCountWithCourse();
  }
  
  // ============ ROOM MENU ============
  else if (upperMsg === 'D' || upperMsg === 'ROOMS' || upperMsg === 'ROOM LIST') {
    replyMessage = await getRoomList();
  }
  else if (upperMsg === 'E' || upperMsg === 'ROOM DETAILS') {
    replyMessage = getRoomDetailsFormat();
  }
  else if (upperMsg === 'F' || upperMsg === 'VACANT ROOMS') {
    replyMessage = await getVacantRooms();
  }
  
  // ============ FEES MENU ============
  else if (upperMsg === 'G' || upperMsg === 'HOSTEL FEE' || upperMsg === 'FEE CHECK') {
    replyMessage = getHostelFeeFormat();
  }
  else if (upperMsg === 'H' || upperMsg === 'FEE DUE' || upperMsg === 'DUE LIST') {
    replyMessage = await getHostelDueFeesList();
  }
  else if (upperMsg === 'I' || upperMsg === 'FEE SUMMARY') {
    replyMessage = await getHostelFeesSummary();
  }
  
  // ============ COURSE & BATCH MENU ============
  else if (upperMsg === 'J' || upperMsg === 'COURSES' || upperMsg === 'COURSE LIST') {
    replyMessage = await getCourseWiseList();
  }
  else if (upperMsg === 'K' || upperMsg === 'BATCH' || upperMsg === 'BATCH LIST') {
    replyMessage = await getBatchWiseList();
  }
  
  // ============ ADMISSION MENU ============
  else if (upperMsg === 'L' || upperMsg === 'ADMISSIONS') {
    replyMessage = await getRecentAdmissions();
  }
  else if (upperMsg === 'M' || upperMsg === 'EXPIRING SOON') {
    replyMessage = await getFeesExpiringSoon();
  }
  
  // ============ UTILITIES ============
  else if (upperMsg === 'N' || upperMsg === 'STATS' || upperMsg === 'STATISTICS') {
    replyMessage = await getHostelStatistics();
  }
  else if (upperMsg === 'O' || upperMsg === 'SHORTCUT' || upperMsg === 'SHORTCUTS') {
    replyMessage = getHostelShortcutGuide();
  }
  
  // ============ COMMANDS WITH ARGUMENTS ============
  // SEARCH - B command with argument
  else if (lowerMsg.startsWith('b ')) {
    const query = userMessage.substring(2).trim();
    replyMessage = await searchResident(query);
  }
  // ROOM DETAILS - E command with argument
  else if (lowerMsg.startsWith('e ')) {
    const roomNo = userMessage.substring(2).trim();
    replyMessage = await getRoomOccupants(roomNo);
  }
  // FEE CHECK - G command with argument
  else if (lowerMsg.startsWith('g ')) {
    const query = userMessage.substring(2).trim();
    replyMessage = await getResidentFeeDetails(query);
  }
  // COURSE WISE - J command with argument
  else if (lowerMsg.startsWith('j ')) {
    const courseName = userMessage.substring(2).trim();
    replyMessage = await getResidentsByCourse(courseName);
  }
  // BATCH WISE - K command with argument
  else if (lowerMsg.startsWith('k ')) {
    const batchYear = userMessage.substring(2).trim();
    replyMessage = await getResidentsByBatch(batchYear);
  }
  // ADD RESIDENT - A command with arguments
  else if (lowerMsg.startsWith('a ')) {
    const data = userMessage.substring(2).trim().split('|');
    replyMessage = await addResident(data);
  }
  // DELETE RESIDENT - C command with argument
  else if (lowerMsg.startsWith('c ')) {
    const prn = userMessage.substring(2).trim();
    replyMessage = await deleteResident(prn);
  }
  // MOVE RESIDENT - F command with arguments
  else if (lowerMsg.startsWith('f ')) {
    const parts = userMessage.substring(2).trim().split('|');
    replyMessage = await moveResidentRoom(parts[0], parts[1]);
  }
  // UPDATE FEE - H command with arguments
  else if (lowerMsg.startsWith('h ')) {
    const parts = userMessage.substring(2).trim().split('|');
    replyMessage = await updateResidentFee(parts[0], parts[1]);
  }
  
  // ============ DEFAULT ============
  else {
    replyMessage = `❌ *Command not recognized*\n\nType *H* for help menu or *MENU* for main menu.\n\n${getHostelMainMenu()}`;
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
 A 🔹 RESIDENT LIST           
 B 🔹 SEARCH RESIDENT          
 C 🔹 RESIDENT COUNT          
─────────────────────────

  🚪 *ROOM MENU*              
─────────────────────────
 D 🔹 ROOM LIST               
 E 🔹 ROOM DETAILS            
 F 🔹 VACANT ROOMS / MOVE     
─────────────────────────

  💰 *FEES MENU*              
─────────────────────────
 G 🔹 FEE CHECK              
 H 🔹 FEE DUE LIST            
 I 🔹 FEE SUMMARY             
─────────────────────────

  📚 *COURSE & BATCH*         
─────────────────────────
 J 🔹 COURSE WISE LIST         
 K 🔹 BATCH WISE LIST         
─────────────────────────

  📅 *ADMISSIONS*             
─────────────────────────
 L 🔹 RECENT ADMISSIONS      
 M 🔹 FEES EXPIRING SOON     
─────────────────────────

  📊 *UTILITIES*              
─────────────────────────
 N 🔹 STATISTICS             
 O 🔹 SHORTCUTS              
─────────────────────────

💡 *Quick Commands:* 
• A Name|PRN|Course|Room - Add
• B Name/PRN - Search
• C PRN - Delete
• E RoomNo - Room details
• F PRN|NewRoom - Move
• G Name/PRN - Fee check
• H PRN|Amount - Update fee
• J Course - Course list
• K Year - Batch list

📝 *Examples:*
• A John|9876543210|BAMS|26
• B Suhani
• E 26
• G Suhani
• H 8857090461|50000

🏨 *Type H for help*`;
}

function getHostelShortcutGuide() {
  return `
╔════════════════════════════╗
║   ⚡ *QUICK COMMANDS*        ║
╚════════════════════════════╝

🔹 A - ADD <name>|<prn>|<course>|<room>
🔹 B - SEARCH <prn or name>
🔹 C - DELETE <prn>
🔹 D - ROOM LIST
🔹 E - ROOM DETAILS <room_no>
🔹 F - MOVE <prn>|<new_room>
🔹 G - FEE CHECK <prn or name>
🔹 H - UPDATE <prn>|<amount>
🔹 I - FEE SUMMARY
🔹 J - COURSE WISE <course>
🔹 K - BATCH WISE <year>
🔹 L - RECENT ADMISSIONS
🔹 M - EXPIRING SOON
🔹 N - STATISTICS
🔹 O - SHORTCUTS

📝 *Examples:*
B Suhani
G Dharati
E 26
J BAMS
K 2023`;
}

function getSearchResidentFormat() {
  return `🔍 *SEARCH RESIDENT*
Format: B <PRN or Name>
Example: B 8857090461 or B Suhani

You can search by:
- PRN/Mobile Number
- Resident name
- Course name
- Room number`;
}

function getRoomDetailsFormat() {
  return `🚪 *ROOM DETAILS*
Format: E <room_number>
Example: E 26

Shows:
• Current occupants
• Room sharing capacity
• Occupancy status
• Resident details`;
}

function getHostelFeeFormat() {
  return `💰 *HOSTEL FEE CHECK*
Format: G <PRN or Name>
Example: G 8857090461 or G Dharati

Shows:
• Installment amount
• Due date
• Payment status
• Room and sharing details

To update fee: H <PRN>|<amount>`;
}

// ============================================
// RESIDENT FUNCTIONS
// ============================================

async function getResidentList() {
  try {
    console.log('📋 Fetching resident list...');
    
    const { data: residents, error } = await supabase
      .from('hostel')
      .select('"Resident Name", Course, Room')
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
    
    const displayResidents = residents.slice(0, 30);
    displayResidents.forEach((r, i) => {
      message += `${i+1}. 👤 ${r["Resident Name"]}\n`;
      message += `   📚 ${r.Course} | 🚪 Room ${r.Room}\n\n`;
    });
    
    if (residents.length > 30) {
      message += `📊 *Showing 30 of ${residents.length} residents*\n`;
      message += `💡 Use B to search for specific resident`;
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
      .select('Course');
    
    if (error) {
      console.error('Count fetch error:', error);
      return '❌ *Database Error*';
    }
    
    if (!residents || residents.length === 0) {
      return '📭 *No residents found*';
    }
    
    const courseCount = {};
    residents.forEach(r => {
      const course = r.Course || 'Unknown';
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
    // Use separate queries instead of OR for columns with spaces
    let allResidents = [];
    
    // Search by PRN/Mobile Number (bigint)
    if (!isNaN(query) && query.length > 0) {
      const { data: byPrn, error: prnError } = await supabase
        .from('hostel')
        .select('*')
        .eq('"PRN/Mobile  Number"', parseInt(query));
      
      if (!prnError && byPrn && byPrn.length > 0) {
        allResidents = [...allResidents, ...byPrn];
      }
    }
    
    // Search by Resident Name (if no results yet or partial match)
    if (allResidents.length === 0) {
      const { data: byName, error: nameError } = await supabase
        .from('hostel')
        .select('*')
        .ilike('"Resident Name"', `%${query}%`);
      
      if (!nameError && byName && byName.length > 0) {
        allResidents = [...allResidents, ...byName];
      }
    }
    
    // Search by Course
    if (allResidents.length === 0) {
      const { data: byCourse, error: courseError } = await supabase
        .from('hostel')
        .select('*')
        .ilike('Course', `%${query}%`);
      
      if (!courseError && byCourse && byCourse.length > 0) {
        allResidents = [...allResidents, ...byCourse];
      }
    }
    
    // Search by Room
    if (allResidents.length === 0) {
      const { data: byRoom, error: roomError } = await supabase
        .from('hostel')
        .select('*')
        .ilike('Room', `%${query}%`);
      
      if (!roomError && byRoom && byRoom.length > 0) {
        allResidents = [...allResidents, ...byRoom];
      }
    }
    
    if (allResidents.length === 0) {
      return `❌ *No resident found for:* ${query}`;
    }
    
    let message = `🔍 *SEARCH RESULTS* (${allResidents.length})\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    for (const r of allResidents) {
      message += `👤 *${r["Resident Name"]}*\n`;
      message += `📱 PRN: ${r["PRN/Mobile  Number"] || 'N/A'}\n`;
      message += `📚 Course: ${r.Course || 'N/A'}\n`;
      message += `📅 Batch: ${r.Batch || 'N/A'}\n`;
      message += `🚪 Room: ${r.Room || 'N/A'} (${r.Sharing || 'N/A'}-sharing)\n`;
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
      .select('Room, Sharing');
    
    if (error) {
      console.error('Room fetch error:', error);
      return '❌ *Database Error*';
    }
    
    if (!rooms || rooms.length === 0) {
      return '🚪 *No rooms found*';
    }
    
    const roomMap = new Map();
    rooms.forEach(r => {
      const roomNo = r.Room;
      if (!roomMap.has(roomNo)) {
        roomMap.set(roomNo, { 
          room: roomNo, 
          sharing: r.Sharing, 
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
    message += `• E <room_no> - View occupants\n`;
    message += `• F - View vacant rooms`;
    
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
      .eq('Room', roomNo);
    
    if (error) {
      console.error('Room occupants error:', error);
      return '❌ *Database Error*';
    }
    
    if (!occupants || occupants.length === 0) {
      return `🚪 *Room ${roomNo} is currently vacant*`;
    }
    
    const sharing = occupants[0].Sharing || 'N/A';
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
      message += `   📚 ${r.Course} (${r.Batch})\n`;
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
      .select('Room, Sharing');
    
    if (error) {
      console.error('Vacant rooms error:', error);
      return '❌ *Database Error*';
    }
    
    const roomMap = new Map();
    rooms.forEach(r => {
      const roomNo = r.Room;
      if (!roomMap.has(roomNo)) {
        roomMap.set(roomNo, { count: 0, sharing: r.Sharing });
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
    
    message += `\n💡 Use F <prn>|<new_room> to change room assignment`;
    
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
    let resident = null;
    
    // Search by PRN (if numeric)
    if (!isNaN(searchQuery) && searchQuery.length > 0) {
      const { data: byPrn, error: prnError } = await supabase
        .from('hostel')
        .select('*')
        .eq('"PRN/Mobile  Number"', parseInt(searchQuery))
        .maybeSingle();
      
      if (!prnError && byPrn) {
        resident = byPrn;
      }
    }
    
    // Search by Name
    if (!resident) {
      const { data: byName, error: nameError } = await supabase
        .from('hostel')
        .select('*')
        .ilike('"Resident Name"', `%${searchQuery}%`)
        .maybeSingle();
      
      if (!nameError && byName) {
        resident = byName;
      }
    }
    
    if (!resident) {
      return `❌ *No resident found for:* ${searchQuery}\n\nTry using exact PRN or full name.`;
    }
    
    let message = `💰 *HOSTEL FEE DETAILS*
━━━━━━━━━━━━━━━━━━━━━━

👤 *Resident:* ${resident["Resident Name"]}
📱 *PRN:* ${resident["PRN/Mobile  Number"]}
📚 *Course:* ${resident.Course} (${resident.Batch})
🚪 *Room:* ${resident.Room} (${resident.Sharing}-sharing)
📅 *Admission:* ${resident["Admission Date"]}

💵 *Installment Amount:* ₹${(resident["Install Ment Name(Amount)"] || 0).toLocaleString()}
📅 *Due Date:* ${resident["Fees Due Date(DD-MM-YY)"] || 'N/A'}

💡 To update: H ${resident["PRN/Mobile  Number"]}|<amount>`;
    
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
    
    let message = `⚠️ *HOSTEL FEE DUE LIST* (${residents.length})\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    residents.slice(0, 15).forEach((r, i) => {
      message += `${i+1}. *${r["Resident Name"]}*\n`;
      message += `   📅 Due: ${r["Fees Due Date(DD-MM-YY)"]}\n`;
      message += `   💰 Amount: ₹${(r["Install Ment Name(Amount)"] || 0).toLocaleString()}\n`;
      message += `   🚪 Room ${r.Room}\n\n`;
    });
    
    if (residents.length > 15) {
      message += `📊 *+${residents.length - 15} more due entries*`;
    }
    
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
      .select('"Install Ment Name(Amount)", Course, Batch');
    
    if (error) {
      console.error('Summary error:', error);
      return '❌ *Database Error*';
    }
    
    if (!residents || residents.length === 0) {
      return '📭 *No residents found*';
    }
    
    let totalInstallments = 0;
    const courseStats = {};
    
    residents.forEach(r => {
      const amount = Number(r["Install Ment Name(Amount)"]) || 0;
      totalInstallments += amount;
      
      const course = r.Course || 'Unknown';
      if (!courseStats[course]) {
        courseStats[course] = { total: 0, count: 0 };
      }
      courseStats[course].total += amount;
      courseStats[course].count++;
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
      message += `   🚪 Room ${r.Room}\n\n`;
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
      .select('Course, "Resident Name", Room')
      .order('Course');
    
    if (error) {
      console.error('Course list error:', error);
      return '❌ *Database Error*';
    }
    
    const courseMap = new Map();
    residents.forEach(r => {
      const course = r.Course || 'Unknown';
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
        message += `   👤 ${s["Resident Name"]} - Room ${s.Room}\n`;
      });
      if (students.length > 5) {
        message += `   📊 +${students.length - 5} more\n`;
      }
      message += `\n`;
    }
    
    message += `💡 Use J <course_name> for complete list`;
    
    return message;
  } catch (error) {
    console.error('Exception:', error);
    return `❌ *Error*: ${error.message}`;
  }
}

async function getResidentsByCourse(courseName) {
  if (!courseName || courseName.trim() === '') {
    return `❌ *Please specify a course*\n\nExample: J BAMS`;
  }
  
  try {
    const { data: residents, error } = await supabase
      .from('hostel')
      .select('*')
      .ilike('Course', `%${courseName}%`)
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
      message += `   🚪 Room ${r.Room} (${r.Sharing}-sharing)\n`;
      message += `   📅 Batch ${r.Batch}\n\n`;
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
      .select('Batch, "Resident Name", Course')
      .order('Batch', { ascending: false });
    
    if (error) {
      console.error('Batch list error:', error);
      return '❌ *Database Error*';
    }
    
    const batchMap = new Map();
    residents.forEach(r => {
      const batch = r.Batch || 'Unknown';
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
        message += `   👤 ${s["Resident Name"]} (${s.Course})\n`;
      });
      if (students.length > 5) {
        message += `   📊 +${students.length - 5} more\n`;
      }
      message += `\n`;
    }
    
    message += `💡 Use K <year> for complete list`;
    
    return message;
  } catch (error) {
    console.error('Exception:', error);
    return `❌ *Error*: ${error.message}`;
  }
}

async function getResidentsByBatch(batchYear) {
  if (!batchYear || batchYear.trim() === '') {
    return `❌ *Please specify a batch year*\n\nExample: K 2023`;
  }
  
  try {
    const { data: residents, error } = await supabase
      .from('hostel')
      .select('*')
      .eq('Batch', parseInt(batchYear))
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
      message += `   📚 ${r.Course}\n`;
      message += `   🚪 Room ${r.Room}\n\n`;
    });
    
    return message;
  } catch (error) {
    console.error('Exception:', error);
    return `❌ *Error*: ${error.message}`;
  }
}

// ============================================
// ADMISSION FUNCTIONS
// ============================================

async function getRecentAdmissions() {
  try {
    const { data: residents, error } = await supabase
      .from('hostel')
      .select('*')
      .order('"Admission Date"', { ascending: false })
      .limit(20);
    
    if (error) {
      console.error('Recent admissions error:', error);
      return '❌ *Database Error*';
    }
    
    if (!residents || residents.length === 0) {
      return '📅 *No admissions found*';
    }
    
    let message = `📅 *RECENT ADMISSIONS* (Last 20)\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    residents.forEach((r, i) => {
      message += `${i+1}. *${r["Resident Name"]}*\n`;
      message += `   📅 Admission: ${r["Admission Date"]}\n`;
      message += `   📚 ${r.Course} (${r.Batch})\n`;
      message += `   🚪 Room ${r.Room}\n\n`;
    });
    
    return message;
  } catch (error) {
    console.error('Exception:', error);
    return `❌ *Error*: ${error.message}`;
  }
}

// ============================================
// CRUD OPERATIONS
// ============================================

async function addResident(data) {
  if (!data || data.length < 4) {
    return `❌ *Invalid Format*\n\nCorrect format:\nA <resident name>|<prn/mobile>|<course>|<room>\n\nExample:\nA John Doe|9876543210|BAMS|26`;
  }
  
  const [name, prn, course, room, batch, amount, dueDate, sharing] = data;
  
  try {
    const { data: existing } = await supabase
      .from('hostel')
      .select('"PRN/Mobile  Number"')
      .eq('"PRN/Mobile  Number"', prn)
      .maybeSingle();
    
    if (existing) {
      return `❌ *Resident already exists*\n\nPRN: ${prn}`;
    }
    
    const insertData = {
      "PRN/Mobile  Number": prn?.trim(),
      "Resident Name": name?.trim(),
      "Course": course?.trim(),
      "Room": room?.trim(),
      "Batch": batch ? parseInt(batch) : new Date().getFullYear(),
      "Install Ment Name(Amount)": amount ? parseFloat(amount) : 0,
      "Fees Due Date(DD-MM-YY)": dueDate || null,
      "Sharing": sharing ? parseInt(sharing) : 4,
      "Admission Date": new Date().toLocaleDateString('en-GB')
    };
    
    const { error } = await supabase
      .from('hostel')
      .insert(insertData);
    
    if (error) {
      console.error('Add resident error:', error);
      return `❌ *Failed to add resident*\n\nError: ${error.message}`;
    }
    
    return `✅ *RESIDENT ADDED SUCCESSFULLY*
━━━━━━━━━━━━━━━━━━━━━━

👤 *Name:* ${name}
📱 *PRN:* ${prn}
📚 *Course:* ${course}
🚪 *Room:* ${room}
📅 *Batch:* ${batch || new Date().getFullYear()}`;
  } catch (error) {
    console.error('Exception in addResident:', error);
    return `❌ *Error*: ${error.message}`;
  }
}

async function updateResidentFee(prn, amount) {
  if (!prn || !amount) {
    return `❌ *Invalid Format*\n\nCorrect format:\nH <prn>|<amount>\n\nExample:\nH 8857090461|50000`;
  }
  
  try {
    const { data: resident, error: fetchError } = await supabase
      .from('hostel')
      .select('*')
      .eq('"PRN/Mobile  Number"', prn)
      .single();
    
    if (fetchError || !resident) {
      return `❌ *Resident not found:* ${prn}`;
    }
    
    const currentAmount = Number(resident["Install Ment Name(Amount)"]) || 0;
    const newAmount = currentAmount + Number(amount);
    
    const { error: updateError } = await supabase
      .from('hostel')
      .update({
        "Install Ment Name(Amount)": newAmount
      })
      .eq('"PRN/Mobile  Number"', prn);
    
    if (updateError) {
      console.error('Update error:', updateError);
      return `❌ *Failed to update fees*\n\nError: ${updateError.message}`;
    }
    
    return `✅ *FEES UPDATED SUCCESSFULLY*
━━━━━━━━━━━━━━━━━━━━━━

👤 *Resident:* ${resident["Resident Name"]}
📱 *PRN:* ${prn}

💰 *Previous Installment:* ₹${currentAmount.toLocaleString()}
💵 *Amount Added:* ₹${Number(amount).toLocaleString()}
✅ *New Installment Amount:* ₹${newAmount.toLocaleString()}`;
  } catch (error) {
    console.error('Exception in updateResidentFee:', error);
    return `❌ *Error*: ${error.message}`;
  }
}

async function deleteResident(prn) {
  if (!prn || prn.trim() === '') {
    return `❌ *Invalid Format*\n\nCorrect format:\nC <prn>\n\nExample:\nC 8857090461`;
  }
  
  try {
    const { data: resident } = await supabase
      .from('hostel')
      .select('"Resident Name"')
      .eq('"PRN/Mobile  Number"', prn)
      .single();
    
    const { error } = await supabase
      .from('hostel')
      .delete()
      .eq('"PRN/Mobile  Number"', prn);
    
    if (error) {
      console.error('Delete error:', error);
      return `❌ *Failed to delete resident*\n\nError: ${error.message}`;
    }
    
    return `✅ *RESIDENT DELETED*
━━━━━━━━━━━━━━━━━━━━━━

👤 *Name:* ${resident?.["Resident Name"] || 'Unknown'}
📱 *PRN:* ${prn}`;
  } catch (error) {
    console.error('Exception in deleteResident:', error);
    return `❌ *Error*: ${error.message}`;
  }
}

async function moveResidentRoom(prn, newRoom) {
  if (!prn || !newRoom) {
    return `❌ *Invalid Format*\n\nCorrect format:\nF <prn>|<new_room>\n\nExample:\nF 8857090461|30`;
  }
  
  try {
    const { data: resident, error: fetchError } = await supabase
      .from('hostel')
      .select('"Resident Name", Room')
      .eq('"PRN/Mobile  Number"', prn)
      .single();
    
    if (fetchError || !resident) {
      return `❌ *Resident not found:* ${prn}`;
    }
    
    const oldRoom = resident.Room;
    
    const { error: updateError } = await supabase
      .from('hostel')
      .update({ Room: newRoom })
      .eq('"PRN/Mobile  Number"', prn);
    
    if (updateError) {
      console.error('Move error:', updateError);
      return `❌ *Failed to move resident*\n\nError: ${updateError.message}`;
    }
    
    return `✅ *ROOM CHANGED SUCCESSFULLY*
━━━━━━━━━━━━━━━━━━━━━━

👤 *Resident:* ${resident["Resident Name"]}
📱 *PRN:* ${prn}
🚪 *Old Room:* ${oldRoom}
🚪 *New Room:* ${newRoom}`;
  } catch (error) {
    console.error('Exception in moveResidentRoom:', error);
    return `❌ *Error*: ${error.message}`;
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

async function getHostelStatistics() {
  try {
    const { data: residents, error } = await supabase
      .from('hostel')
      .select('*');
    
    if (error) {
      console.error('Statistics error:', error);
      return '❌ *Database Error*';
    }
    
    if (!residents || residents.length === 0) {
      return '📭 *No data available*';
    }
    
    const totalResidents = residents.length;
    const uniqueRooms = new Set(residents.map(r => r.Room)).size;
    const uniqueCourses = new Set(residents.map(r => r.Course)).size;
    const uniqueBatches = new Set(residents.map(r => r.Batch)).size;
    
    let totalInstallments = 0;
    residents.forEach(r => {
      totalInstallments += Number(r["Install Ment Name(Amount)"]) || 0;
    });
    
    const roomMap = new Map();
    residents.forEach(r => {
      const room = r.Room;
      if (!roomMap.has(room)) {
        roomMap.set(room, { count: 0, sharing: r.Sharing });
      }
      roomMap.get(room).count++;
    });
    
    let fullRooms = 0;
    let availableRooms = 0;
    for (const [_, data] of roomMap.entries()) {
      if (data.count === data.sharing) {
        fullRooms++;
      } else {
        availableRooms++;
      }
    }
    
    let message = `📊 *HOSTEL STATISTICS*
━━━━━━━━━━━━━━━━━━━━━━

👥 *Residents:* ${totalResidents}
🚪 *Rooms:* ${uniqueRooms}
📚 *Courses:* ${uniqueCourses}
🎓 *Batches:* ${uniqueBatches}

━━━━━━━━━━━━━━━━━━━━━━
🚪 *ROOM OCCUPANCY*
• 🟢 Full Rooms: ${fullRooms}
• 🟡 Available Rooms: ${availableRooms}
• 📊 Avg per Room: ${(totalResidents / uniqueRooms).toFixed(1)}

━━━━━━━━━━━━━━━━━━━━━━
💰 *FINANCIALS*
• Total Installments: ₹${totalInstallments.toLocaleString()}
• Avg per Resident: ₹${Math.round(totalInstallments / totalResidents).toLocaleString()}`;
    
    return message;
  } catch (error) {
    console.error('Exception:', error);
    return `❌ *Error*: ${error.message}`;
  }
}