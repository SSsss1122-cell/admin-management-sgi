import { supabase } from '@/lib/supabase';

// ============================================
// MAIN HOSTEL ADMIN HANDLER
// ============================================
export async function handleHostelAdminCommands(userMessage, cleanNumber) {
  const upperMsg = userMessage?.toUpperCase().trim() || '';
  const lowerMsg = userMessage?.toLowerCase().trim() || '';
  let replyMessage = '';
  
  console.log(`🏨 Hostel Admin received: "${userMessage}"`);
  
  // ============ MAIN MENU ============
  if (['HOSTEL ADMIN', 'HOSTEL', 'MENU', 'START', 'HELP', 'H'].includes(upperMsg)) {
    replyMessage = getHostelMainMenu();
  }
  
  // ============ RESIDENT MENU ============
  else if (['RESIDENTS', 'RESIDENT LIST', 'A'].includes(upperMsg)) {
    replyMessage = await getResidentList();
  }
  else if (['SEARCH', 'SEARCH RESIDENT', 'B'].includes(upperMsg)) {
    replyMessage = getSearchResidentFormat();
  }
  else if (['COUNT', 'RESIDENT COUNT', 'C'].includes(upperMsg)) {
    replyMessage = await getResidentCountWithCourse();
  }
  
  // ============ ROOM MENU ============
  else if (['ROOMS', 'ROOM LIST', 'D'].includes(upperMsg)) {
    replyMessage = await getRoomList();
  }
  else if (['ROOM DETAILS', 'E'].includes(upperMsg)) {
    replyMessage = getRoomDetailsFormat();
  }
  else if (['VACANT ROOMS', 'F'].includes(upperMsg)) {
    replyMessage = await getVacantRooms();
  }
  
  // ============ FEES MENU ============
  else if (['HOSTEL FEE', 'FEE CHECK', 'G'].includes(upperMsg)) {
    replyMessage = getHostelFeeFormat();
  }
  else if (['FEE DUE', 'DUE LIST', 'H'].includes(upperMsg)) {
    replyMessage = await getHostelDueFeesList();
  }
  else if (['FEE SUMMARY', 'I'].includes(upperMsg)) {
    replyMessage = await getHostelFeesSummary();
  }
  
  // ============ COURSE MENU ============
  else if (['COURSES', 'COURSE LIST', 'J'].includes(upperMsg)) {
    replyMessage = await getCourseWiseList();
  }
  else if (['BATCH', 'BATCH LIST', 'K'].includes(upperMsg)) {
    replyMessage = await getBatchWiseList();
  }
  
  // ============ ADMISSION MENU ============
  else if (['ADMISSIONS', 'L'].includes(upperMsg)) {
    replyMessage = await getRecentAdmissions();
  }
  else if (['EXPIRING SOON', 'M'].includes(upperMsg)) {
    replyMessage = await getFeesExpiringSoon();
  }
  
  // ============ OTHER ============
  else if (['EXPORT', 'EXPORT CSV', 'N'].includes(upperMsg)) {
    replyMessage = await exportHostelData();
  }
  else if (['STATS', 'STATISTICS', 'O'].includes(upperMsg)) {
    replyMessage = await getHostelStatistics();
  }
  else if (['SHORTCUT', 'SHORTCUTS', 'P'].includes(upperMsg)) {
    replyMessage = getHostelShortcutGuide();
  }
  else if (['EXIT', 'BACK', 'MAIN MENU', 'Q'].includes(upperMsg)) {
    replyMessage = `👋 *Exiting Hostel Admin Mode*\n\nType *MENU* to see main admin menu or *HOSTEL ADMIN* to return.`;
  }
  
  // ============ SEARCH WITH ARGS ============
  else if (lowerMsg.startsWith('search ') || lowerMsg.startsWith('b ')) {
    let query = lowerMsg;
    if (lowerMsg.startsWith('search ')) query = userMessage.replace(/^search\s/i, '');
    if (lowerMsg.startsWith('b ')) query = userMessage.replace(/^b\s/i, '');
    replyMessage = await searchResident(query);
  }
  else if (lowerMsg.startsWith('room ') || lowerMsg.startsWith('e ')) {
    let roomNo = lowerMsg;
    if (lowerMsg.startsWith('room ')) roomNo = userMessage.replace(/^room\s/i, '');
    if (lowerMsg.startsWith('e ')) roomNo = userMessage.replace(/^e\s/i, '');
    replyMessage = await getRoomOccupants(roomNo);
  }
  else if (lowerMsg.startsWith('fee ') || lowerMsg.startsWith('g ')) {
    let prn = lowerMsg;
    if (lowerMsg.startsWith('fee ')) prn = userMessage.replace(/^fee\s/i, '');
    if (lowerMsg.startsWith('g ')) prn = userMessage.replace(/^g\s/i, '');
    replyMessage = await getResidentFeeDetails(prn);
  }
  else if (lowerMsg.startsWith('course ') || lowerMsg.startsWith('j ')) {
    let courseName = lowerMsg;
    if (lowerMsg.startsWith('course ')) courseName = userMessage.replace(/^course\s/i, '');
    if (lowerMsg.startsWith('j ')) courseName = userMessage.replace(/^j\s/i, '');
    replyMessage = await getResidentsByCourse(courseName);
  }
  else if (lowerMsg.startsWith('batch ') || lowerMsg.startsWith('k ')) {
    let batchYear = lowerMsg;
    if (lowerMsg.startsWith('batch ')) batchYear = userMessage.replace(/^batch\s/i, '');
    if (lowerMsg.startsWith('k ')) batchYear = userMessage.replace(/^k\s/i, '');
    replyMessage = await getResidentsByBatch(batchYear);
  }
  else if (lowerMsg.startsWith('add ') || lowerMsg.startsWith('a ')) {
    let data = lowerMsg;
    if (lowerMsg.startsWith('add ')) data = userMessage.replace(/^add\s/i, '');
    if (lowerMsg.startsWith('a ')) data = userMessage.replace(/^a\s/i, '');
    const parts = data.split('|');
    replyMessage = await addResident(parts);
  }
  else if (lowerMsg.startsWith('update ') || lowerMsg.startsWith('h ')) {
    let parts = lowerMsg;
    if (lowerMsg.startsWith('update ')) parts = userMessage.replace(/^update\s/i, '');
    if (lowerMsg.startsWith('h ')) parts = userMessage.replace(/^h\s/i, '');
    const updateParts = parts.split('|');
    replyMessage = await updateResidentFee(updateParts[0], updateParts[1]);
  }
  else if (lowerMsg.startsWith('delete ') || lowerMsg.startsWith('c ')) {
    let prn = lowerMsg;
    if (lowerMsg.startsWith('delete ')) prn = userMessage.replace(/^delete\s/i, '');
    if (lowerMsg.startsWith('c ')) prn = userMessage.replace(/^c\s/i, '');
    replyMessage = await deleteResident(prn);
  }
  else if (lowerMsg.startsWith('move ') || lowerMsg.startsWith('f ')) {
    let parts = lowerMsg;
    if (lowerMsg.startsWith('move ')) parts = userMessage.replace(/^move\s/i, '');
    if (lowerMsg.startsWith('f ')) parts = userMessage.replace(/^f\s/i, '');
    const moveParts = parts.split('|');
    replyMessage = await moveResidentRoom(moveParts[0], moveParts[1]);
  }
  
  // ============ DEFAULT ============
  else if (userMessage && userMessage !== '') {
    replyMessage = `🏨 *HOSTEL ADMIN MODE*\n\n❌ Command not recognized.\n\nType *H* for menu or *Q* to exit.\n\n${getHostelMainMenu()}`;
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
 F 🔹 VACANT ROOMS            
─────────────────────────

  💰 *FEES MENU*              
─────────────────────────
 G 🔹 HOSTEL FEE CHECK        
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
 N 🔹 EXPORT CSV             
 O 🔹 STATISTICS             
 P 🔹 SHORTCUTS              
─────────────────────────

 Q 🔹 EXIT HOSTEL MODE

─────────────────────────

💡 *Quick Commands:* 
• A <name|prn|course|room> - Add resident
• B <prn/name> - Search
• C <prn> - Delete resident
• E <room_no> - Room details
• F <prn>|<new_room> - Move resident
• G <prn/name> - Check fee
• H <prn>|<amount> - Update fee
• J <course> - Course wise list
• K <year> - Batch wise list

📝 *Examples:*
• A John|9876543210|BAMS|26
• B 8857090461
• E 26
• G Dharati
• H 8857090461|50000

🏨 *Type any letter to execute command*`;
}

function getHostelShortcutGuide() {
  return `╔════════════════════════════╗
║   ⚡ *QUICK COMMANDS*    ║
╚════════════════════════════╝

🔹 *A* - ADD <name>|<prn>|<course>|<room>
🔹 *B* - SEARCH <prn or name>
🔹 *C* - DELETE <prn>
🔹 *D* - ROOM LIST
🔹 *E* - ROOM DETAILS <room_no>
🔹 *F* - MOVE <prn>|<new_room>
🔹 *G* - FEE CHECK <prn or name>
🔹 *H* - UPDATE <prn>|<amount>
🔹 *I* - FEE SUMMARY
🔹 *J* - COURSE WISE <course>
🔹 *K* - BATCH WISE <year>
🔹 *L* - RECENT ADMISSIONS
🔹 *M* - EXPIRING SOON
🔹 *N* - EXPORT CSV
🔹 *O* - STATISTICS
🔹 *P* - SHORTCUTS
🔹 *Q* - EXIT

📝 *Examples:*
A John|9876543210|BAMS|26
B 8857090461
E 26
G Dharati
H 8857090461|50000
F 8857090461|30`;
}

function getSearchResidentFormat() {
  return `🔍 *SEARCH RESIDENT*
Format: B <PRN or Name>
Example: B 8857090461 or B Dharati

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
• Room and sharing details`;
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
    
    const displayResidents = residents.slice(0, 30);
    displayResidents.forEach((r, i) => {
      message += `${i+1}. 👤 ${r["Resident Name"]}\n`;
      message += `   📚 ${r["Course"]} | 🚪 Room ${r["Room"]}\n\n`;
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
      .select('"Room", "Sharing"');
    
    if (error) {
      console.error('Room fetch error:', error);
      return '❌ *Database Error*';
    }
    
    if (!rooms || rooms.length === 0) {
      return '🚪 *No rooms found*';
    }
    
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

💡 To update: H ${r["PRN/Mobile  Number"]}|<amount>`;
    
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
    message += `💡 Use H to see pending list`;
    
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
      message += `   📚 ${r["Course"]} (${r["Batch"]})\n`;
      message += `   🚪 Room ${r["Room"]}\n\n`;
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
    return `❌ *Invalid Format*\n\nCorrect format:\nA <resident name>|<prn/mobile>|<course>|<room>\n\nExample:\nA John Doe|9876543210|BAMS|26\n\nOptional: A <name>|<prn>|<course>|<room>|<batch>|<amount>|<due_date>|<sharing>`;
  }
  
  const [name, prn, course, room, batch, amount, dueDate, sharing] = data;
  
  try {
    const { data: existing } = await supabase
      .from('hostel')
      .select('"PRN/Mobile  Number"')
      .eq('"PRN/Mobile  Number"', prn)
      .maybeSingle();
    
    if (existing) {
      return `❌ *Resident already exists*\n\nPRN: ${prn}\nUse H to update or C to delete.`;
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
    
    let message = `✅ *RESIDENT ADDED SUCCESSFULLY*
━━━━━━━━━━━━━━━━━━━━━━

👤 *Name:* ${name}
📱 *PRN:* ${prn}
📚 *Course:* ${course}
🚪 *Room:* ${room}
📅 *Batch:* ${batch || new Date().getFullYear()}`;
    
    if (amount) message += `\n💰 *Installment:* ₹${parseFloat(amount).toLocaleString()}`;
    if (dueDate) message += `\n📅 *Due Date:* ${dueDate}`;
    
    message += `\n\n💡 Use H ${prn}|<amount> to update fees`;
    
    return message;
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
📱 *PRN:* ${prn}

⚠️ This action cannot be undone.`;
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
      .select('"Resident Name", "Room"')
      .eq('"PRN/Mobile  Number"', prn)
      .single();
    
    if (fetchError || !resident) {
      return `❌ *Resident not found:* ${prn}`;
    }
    
    const oldRoom = resident["Room"];
    
    const { error: updateError } = await supabase
      .from('hostel')
      .update({ "Room": newRoom })
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

async function exportHostelData() {
  try {
    const { data: residents, error } = await supabase
      .from('hostel')
      .select('*')
      .order('"Resident Name"');
    
    if (error) {
      console.error('Export error:', error);
      return '❌ *Database Error*';
    }
    
    if (!residents || residents.length === 0) {
      return '📭 *No data to export*';
    }
    
    return `📊 *EXPORT READY*
━━━━━━━━━━━━━━━━━━━━━━

📋 *Total Records:* ${residents.length}

📁 *Data includes:*
• Resident Names
• PRN/Mobile Numbers
• Course & Batch
• Room & Sharing
• Fee Installments
• Due Dates
• Admission Dates

💡 *To get CSV file:* Contact system administrator to enable file export feature.

📊 *Quick Stats:*
• Total Residents: ${residents.length}
• Unique Rooms: ${new Set(residents.map(r => r["Room"])).size}
• Courses: ${new Set(residents.map(r => r["Course"])).size}`;
  } catch (error) {
    console.error('Exception in exportHostelData:', error);
    return `❌ *Error*: ${error.message}`;
  }
}

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
    const uniqueRooms = new Set(residents.map(r => r["Room"])).size;
    const uniqueCourses = new Set(residents.map(r => r["Course"])).size;
    const uniqueBatches = new Set(residents.map(r => r["Batch"])).size;
    
    let totalInstallments = 0;
    residents.forEach(r => {
      totalInstallments += Number(r["Install Ment Name(Amount)"]) || 0;
    });
    
    const roomMap = new Map();
    residents.forEach(r => {
      const room = r["Room"];
      if (!roomMap.has(room)) {
        roomMap.set(room, { count: 0, sharing: r["Sharing"] });
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
• Avg per Resident: ₹${Math.round(totalInstallments / totalResidents).toLocaleString()}

━━━━━━━━━━━━━━━━━━━━━━
📅 *ADMISSIONS*
• Latest: ${residents[0]?.["Admission Date"] || 'N/A'}
• Earliest: ${residents[residents.length - 1]?.["Admission Date"] || 'N/A'}`;
    
    return message;
  } catch (error) {
    console.error('Exception:', error);
    return `❌ *Error*: ${error.message}`;
  }
}