// ============================================
// FIXED STUDENT LIST FUNCTION
// ============================================

async function getStudentList() {
  // First, check if table exists and has data
  const { data: students, error, count } = await supabase
    .from('students')
    .select('*', { count: 'exact' })  // Get all columns to debug
    .order('full_name');
  
  if (error) {
    console.error('Student fetch error:', error);
    return `❌ *Database Error*: ${error.message}`;
  }
  
  if (!students || students.length === 0) {
    // Check if table is empty
    const { count: totalCount } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true });
    
    if (totalCount === 0) {
      return '📭 *No students found in database*\n\nUse: ADD <name>|<usn>|<branch>|<phone>';
    }
    return '📭 *No students found*';
  }
  
  let message = `📋 *STUDENT LIST* (${students.length})\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  
  students.forEach((s, i) => {
    message += `${i+1}. 👤 *${s.full_name || 'N/A'}*\n`;
    message += `   📋 USN: ${s.usn || 'N/A'}\n`;
    message += `   📚 Branch: ${s.branch || 'N/A'}\n`;
    if (s.phone_number) message += `   📞 Phone: ${s.phone_number}\n`;
    message += `   💰 Fees: ₹${s.paid_amount || 0}/₹${s.total_fees || 0}\n`;
    message += `\n`;
    
    // Prevent message from being too long (WhatsApp limit ~65k chars)
    if (message.length > 60000 && i < students.length - 1) {
      message += `\n_...${students.length - i - 1} more students_\n`;
      break;
    }
  });
  
  return message;
}

// ============================================
// FIXED BUS STOPS FUNCTION (WITH MORNING/EVENING SEPARATION)
// ============================================

async function getBusStops(busNumber) {
  if (!busNumber) return getBusStopsFormat();
  
  // Get bus ID
  const { data: bus, error: busError } = await supabase
    .from('buses')
    .select('id, bus_number')
    .eq('bus_number', busNumber)
    .single();
  
  if (busError || !bus) {
    return `❌ *Bus not found:* ${busNumber}\n\nAvailable buses:\n${await getBusList()}`;
  }
  
  // Get ALL stops (no limit)
  const { data: allStops, error: stopsError } = await supabase
    .from('bus_stops')
    .select('stop_name, sequence, estimated_time, is_major, trip_type, time')
    .eq('bus_id', bus.id)
    .order('sequence');
  
  if (stopsError) {
    console.error('Stops fetch error:', stopsError);
    return '❌ *Error fetching bus stops*';
  }
  
  if (!allStops || allStops.length === 0) {
    return `🚏 *No stops found for bus* ${busNumber}`;
  }
  
  // Separate morning and evening stops
  const morningStops = allStops.filter(stop => 
    stop.trip_type === 'morning' || stop.trip_type === 'to_college' || !stop.trip_type
  );
  const eveningStops = allStops.filter(stop => 
    stop.trip_type === 'evening' || stop.trip_type === 'from_college'
  );
  
  let message = `🚏 *BUS STOPS - ${busNumber}*\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  
  // Morning Stops Section
  if (morningStops.length > 0) {
    message += `🌅 *MORNING ROUTE (To College)*\n`;
    morningStops.forEach(stop => {
      message += `${stop.sequence}. ${stop.stop_name}`;
      if (stop.is_major) message += ` ⭐`;
      if (stop.time) message += ` - ${stop.time}`;
      message += `\n`;
    });
    message += `\n`;
  }
  
  // Evening Stops Section
  if (eveningStops.length > 0) {
    message += `🌙 *EVENING ROUTE (From College)*\n`;
    eveningStops.forEach(stop => {
      message += `${stop.sequence}. ${stop.stop_name}`;
      if (stop.is_major) message += ` ⭐`;
      if (stop.time) message += ` - ${stop.time}`;
      message += `\n`;
    });
    message += `\n`;
  }
  
  // If no trip_type in database, show all but note this
  if (morningStops.length > 0 && eveningStops.length === 0) {
    message += `\n⚠️ *Note:* Only one route available\n`;
  }
  
  message += `\n📊 *Total Stops:* ${allStops.length}\n`;
  message += `🌅 Morning: ${morningStops.length} | 🌙 Evening: ${eveningStops.length}`;
  
  return message;
}

// ============================================
// FIXED BUS LIST FUNCTION (SHOW ALL)
// ============================================

async function getBusList() {
  // Remove limit to show all buses
  const { data: buses, error } = await supabase
    .from('buses')
    .select('bus_number, route_name, is_active')
    .order('bus_number');
  
  if (error) {
    console.error('Bus fetch error:', error);
    return '❌ *Database Error*';
  }
  
  if (!buses || buses.length === 0) {
    return '🚌 *No buses found*';
  }
  
  let message = `🚌 *BUS LIST* (${buses.length} buses)\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  
  buses.forEach((b, i) => {
    message += `${i+1}. Bus *${b.bus_number}*`;
    if (b.route_name) message += ` - ${b.route_name}`;
    message += ` ${b.is_active ? '🟢' : '🔴'}\n`;
  });
  
  message += `\n💡 *Commands:*\n`;
  message += `• STOPS <bus_number> - View all stops\n`;
  message += `• DETAILS <bus_number> - Bus details`;
  
  return message;
}

// ============================================
// ADD DEBUG FUNCTION TO CHECK DATABASE SCHEMA
// ============================================

async function debugDatabase() {
  // Check students table structure
  const { data: columns, error: colError } = await supabase
    .from('students')
    .select('*')
    .limit(1);
  
  if (colError) {
    return `❌ *Table Error*: ${colError.message}\n\nMake sure 'students' table exists with columns: usn, full_name, branch, phone_number, paid_amount, total_fees, due_amount, fees_due`;
  }
  
  if (columns && columns.length > 0) {
    const availableColumns = Object.keys(columns[0]).join(', ');
    return `✅ *Database Connected*\n\n📊 Students Table Columns:\n${availableColumns}\n\n📝 Total Students: ${await getStudentCount()}`;
  }
  
  return `⚠️ *Students table exists but has no data*\n\nUse: ADD <name>|<usn>|<branch>|<phone> to add students`;
}

async function getStudentCount() {
  const { count, error } = await supabase
    .from('students')
    .select('*', { count: 'exact', head: true });
  
  if (error) return 0;
  return count || 0;
}