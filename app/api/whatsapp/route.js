import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request) {
  try {
    const payload = await request.json();
    const eventData = payload.data;
    
    let senderNumber = null;
    let userMessage = null;
    
    if (eventData) {
      senderNumber = eventData.senderPhoneNumber;
      userMessage = eventData.content?.text?.trim();
    }
    
    console.log(`📱 Sender: ${senderNumber}`);
    console.log(`💬 Message: ${userMessage}`);
    
    if (!senderNumber) {
      return NextResponse.json({ success: true });
    }
    
    let cleanNumber = senderNumber.toString();
    if (cleanNumber.startsWith('91')) {
      cleanNumber = cleanNumber.substring(2);
    }
    
    const isAdmin = (cleanNumber === '9480072737');
    
    // Parse command
    const parts = userMessage?.split(' ') || [];
    const command = parts[0]?.toUpperCase();
    const args = parts.slice(1);
    
    let replyMessage = '';
    
    // ============================================
    // 1. HELP COMMAND
    // ============================================
    if (command === 'HELP') {
      replyMessage = getHelpMessage(isAdmin);
    }
    
    // ============================================
    // 2. STUDENT COMMANDS
    // ============================================
    else if (command === 'LIST') {
      replyMessage = await getStudentList();
    }
    else if (command === 'COUNT') {
      replyMessage = await getStudentCount();
    }
    else if (command === 'SEARCH') {
      const query = args.join(' ');
      replyMessage = await searchStudent(query);
    }
    else if (command === 'BRANCH') {
      const branch = args.join(' ');
      replyMessage = await getStudentsByBranch(branch);
    }
    
    // ============================================
    // 3. FEES COMMANDS
    // ============================================
    else if (command === 'FEE') {
      if (args[0] === 'DUE') {
        replyMessage = await getDueFeesStudents();
      } else if (args[0] === 'SUMMARY') {
        replyMessage = await getFeesSummary();
      } else {
        const usn = args[0];
        replyMessage = await getStudentFee(usn);
      }
    }
    
    // ============================================
    // 4. ATTENDANCE COMMANDS
    // ============================================
    else if (command === 'ATTEND') {
      const usn = args[0];
      replyMessage = await getStudentAttendance(usn);
    }
    else if (command === 'TODAY') {
      replyMessage = await getTodayAttendance();
    }
    else if (command === 'LOW') {
      replyMessage = await getLowAttendance();
    }
    
    // ============================================
    // 5. BUS COMMANDS
    // ============================================
    else if (command === 'BUS') {
      if (args[0] === 'LIST') {
        replyMessage = await getBusList();
      } else if (args[0] === 'LOCATION') {
        const busNumber = args[1];
        replyMessage = await getBusLocation(busNumber);
      } else if (args[0] === 'STOPS') {
        const busNumber = args[1];
        replyMessage = await getBusStops(busNumber);
      } else {
        const busNumber = args[0];
        replyMessage = await getBusDetails(busNumber);
      }
    }
    
    // ============================================
    // 6. ROUTES COMMANDS
    // ============================================
    else if (command === 'ROUTES') {
      replyMessage = await getAllRoutes();
    }
    else if (command === 'ROUTE') {
      const routeName = args.join(' ');
      replyMessage = await getRouteDetails(routeName);
    }
    
    // ============================================
    // 7. COMPLAINTS COMMANDS
    // ============================================
    else if (command === 'COMPLAINT') {
      const complaintText = args.join(' ');
      if (args.length < 2) {
        replyMessage = "❌ Usage: COMPLAINT <title> | <description>\nExample: COMPLAINT Bus late | Bus is coming 30 mins late";
      } else {
        replyMessage = await registerComplaint(cleanNumber, complaintText);
      }
    }
    else if (command === 'MY') {
      if (args[0]?.toUpperCase() === 'COMPLAINTS') {
        const usn = args[1];
        replyMessage = await getMyComplaints(usn || cleanNumber);
      }
    }
    
    // ============================================
    // 8. NOTICES COMMANDS
    // ============================================
    else if (command === 'NOTICES') {
      replyMessage = await getNotices();
    }
    else if (command === 'ANNOUNCEMENTS') {
      replyMessage = await getAnnouncements();
    }
    
    // ============================================
    // 9. DRIVERS COMMANDS
    // ============================================
    else if (command === 'DRIVERS') {
      replyMessage = await getDriversList();
    }
    else if (command === 'DRIVER') {
      const driverName = args.join(' ');
      replyMessage = await getDriverDetails(driverName);
    }
    
    // ============================================
    // 10. ADMIN ONLY COMMANDS
    // ============================================
    else if (isAdmin) {
      if (command === 'ADD') {
        if (args[0]?.toUpperCase() === 'STUDENT') {
          const studentData = args.slice(1).join(' ').split('|');
          replyMessage = await addStudent(studentData);
        }
      }
      else if (command === 'UPDATE') {
        if (args[0]?.toUpperCase() === 'FEES') {
          const usn = args[1];
          const amount = args[2];
          replyMessage = await updateStudentFees(usn, amount);
        }
      }
      else if (command === 'DELETE') {
        if (args[0]?.toUpperCase() === 'STUDENT') {
          const usn = args[1];
          replyMessage = await deleteStudent(usn);
        }
      }
      else if (command === 'BROADCAST') {
        const message = args.join(' ');
        replyMessage = await broadcastMessage(message);
      }
      else if (command === 'TEST') {
        replyMessage = "✅ Bot is working! Admin access confirmed.";
      }
      else {
        replyMessage = `❌ Unknown command: ${command}\n\nSend HELP to see all commands.`;
      }
    }
    else {
      replyMessage = `❌ Unknown command: ${command}\n\nSend HELP to see available commands.`;
    }
    
    // Send reply
    if (replyMessage) {
      await sendWhatsAppMessage(senderNumber, replyMessage);
    }
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error("🔥 Error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 200 });
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

async function sendWhatsAppMessage(to, message) {
  const apiKey = process.env.VIRALBOOSTUP_API_KEY;
  if (!apiKey) {
    console.log("❌ API Key missing");
    return;
  }
  
  try {
    const response = await fetch("https://app.viralboostup.in/api/v2/whatsapp-business/messages", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        to: to,
        phoneNoId: "595231930349201",
        type: "text",
        text: message
      })
    });
    
    const result = await response.json();
    console.log(`📬 API Response: ${response.status}`);
    return result;
  } catch (error) {
    console.error("Send error:", error);
  }
}

function getHelpMessage(isAdmin) {
  let help = "🤖 *SGI BUS BOT* - Complete Guide\n\n";
  help += "*📚 STUDENT COMMANDS*\n";
  help += "• LIST - All students\n";
  help += "• COUNT - Total students\n";
  help += "• SEARCH <USN/Name> - Find student\n";
  help += "• BRANCH <name> - Students by branch\n\n";
  
  help += "*💰 FEES COMMANDS*\n";
  help += "• FEE <USN> - Check fee status\n";
  help += "• FEE DUE - Pending fees list\n";
  help += "• FEE SUMMARY - Collection stats\n\n";
  
  help += "*📊 ATTENDANCE COMMANDS*\n";
  help += "• ATTEND <USN> - Attendance %\n";
  help += "• TODAY - Today's attendance\n";
  help += "• LOW - Below 75% attendance\n\n";
  
  help += "*🚌 BUS COMMANDS*\n";
  help += "• BUS LIST - All buses\n";
  help += "• BUS <number> - Bus details\n";
  help += "• BUS LOCATION <number>\n";
  help += "• BUS STOPS <number>\n\n";
  
  help += "*🗺️ ROUTES COMMANDS*\n";
  help += "• ROUTES - All routes\n";
  help += "• ROUTE <name> - Route details\n\n";
  
  help += "*📢 OTHER COMMANDS*\n";
  help += "• COMPLAINT <title> | <desc>\n";
  help += "• MY COMPLAINTS <USN>\n";
  help += "• NOTICES - Latest notices\n";
  help += "• DRIVERS - All drivers\n";
  help += "• DRIVER <name>\n\n";
  
  if (isAdmin) {
    help += "*👑 ADMIN COMMANDS*\n";
    help += "• ADD STUDENT <name>|<usn>|<branch>|<phone>\n";
    help += "• UPDATE FEES <usn>|<amount>\n";
    help += "• DELETE STUDENT <usn>\n";
    help += "• BROADCAST <message>\n";
  }
  
  help += "\n📞 *Contact Admin for issues*";
  return help;
}

// ============================================
// STUDENT FUNCTIONS
// ============================================

async function getStudentList() {
  const { data: students, error } = await supabase
    .from('students')
    .select('full_name, usn, branch')
    .order('full_name');
  
  if (error) return '❌ Database error';
  if (!students || students.length === 0) return '📭 No students found';
  
  let message = `📋 *STUDENT LIST* (${students.length})\n\n`;
  students.forEach((s, i) => {
    message += `${i+1}. *${s.full_name}*\n`;
    message += `   USN: ${s.usn}\n`;
    message += `   Branch: ${s.branch || 'N/A'}\n\n`;
  });
  return message;
}

async function getStudentCount() {
  const { count, error } = await supabase
    .from('students')
    .select('*', { count: 'exact', head: true });
  
  if (error) return '❌ Database error';
  return `📊 *Total Students*: ${count}`;
}

async function searchStudent(query) {
  if (!query) return '❌ Usage: SEARCH <USN or Name>';
  
  const { data: students, error } = await supabase
    .from('students')
    .select('*')
    .or(`usn.ilike.%${query}%, full_name.ilike.%${query}%`);
  
  if (error) return '❌ Database error';
  if (!students || students.length === 0) return `❌ No student found for: ${query}`;
  
  if (students.length > 5) {
    let message = `🔍 *Found ${students.length} students*\n\n`;
    students.slice(0, 10).forEach(s => {
      message += `• ${s.full_name} (${s.usn})\n`;
    });
    message += `\nSend SEARCH <full USN> for details`;
    return message;
  }
  
  let message = '';
  for (const s of students) {
    message += `👤 *${s.full_name}*\n`;
    message += `📋 USN: ${s.usn}\n`;
    message += `📚 Branch: ${s.branch || 'N/A'}\n`;
    message += `📞 Phone: ${s.phone || s.phone_number || 'N/A'}\n`;
    message += `📧 Email: ${s.email || 'N/A'}\n`;
    message += `🎓 Class: ${s.class || s.semester || 'N/A'}\n`;
    message += `💰 Fees Due: ${s.fees_due ? 'Yes' : 'No'}\n`;
    message += `💵 Due Amount: ₹${s.due_amount || 0}\n`;
    message += `✅ Paid: ₹${s.paid_amount || 0}\n`;
    message += `━━━━━━━━━━━━━━━\n\n`;
  }
  return message;
}

async function getStudentsByBranch(branch) {
  if (!branch) return '❌ Usage: BRANCH <branch name>';
  
  const { data: students, error } = await supabase
    .from('students')
    .select('full_name, usn')
    .ilike('branch', `%${branch}%`);
  
  if (error) return '❌ Database error';
  if (!students || students.length === 0) return `❌ No students in ${branch} branch`;
  
  let message = `📚 *${branch.toUpperCase()} BRANCH* (${students.length})\n\n`;
  students.forEach((s, i) => {
    message += `${i+1}. ${s.full_name} (${s.usn})\n`;
  });
  return message;
}

// ============================================
// FEES FUNCTIONS
// ============================================

async function getStudentFee(usn) {
  if (!usn) return '❌ Usage: FEE <USN>';
  
  const { data: student, error } = await supabase
    .from('students')
    .select('full_name, usn, total_fees, paid_amount, due_amount, fees_due, last_payment_date')
    .eq('usn', usn)
    .single();
  
  if (error) return `❌ Student not found: ${usn}`;
  
  let message = `💰 *FEE DETAILS*\n\n`;
  message += `👤 Name: ${student.full_name}\n`;
  message += `📋 USN: ${student.usn}\n`;
  message += `━━━━━━━━━━━━━━━\n`;
  message += `💰 Total Fees: ₹${student.total_fees || 0}\n`;
  message += `✅ Paid Amount: ₹${student.paid_amount || 0}\n`;
  message += `⚠️ Due Amount: ₹${student.due_amount || 0}\n`;
  message += `📊 Status: ${student.fees_due ? '🔴 PENDING' : '🟢 PAID'}\n`;
  if (student.last_payment_date) {
    message += `📅 Last Payment: ${student.last_payment_date}\n`;
  }
  return message;
}

async function getDueFeesStudents() {
  const { data: students, error } = await supabase
    .from('students')
    .select('full_name, usn, due_amount')
    .eq('fees_due', true)
    .gt('due_amount', 0);
  
  if (error) return '❌ Database error';
  if (!students || students.length === 0) return '✅ No pending fees! All students paid.';
  
  let message = `⚠️ *PENDING FEES STUDENTS* (${students.length})\n\n`;
  let totalDue = 0;
  students.forEach((s, i) => {
    message += `${i+1}. ${s.full_name}\n`;
    message += `   USN: ${s.usn}\n`;
    message += `   Due: ₹${s.due_amount}\n\n`;
    totalDue += s.due_amount;
  });
  message += `━━━━━━━━━━━━━━━\n`;
  message += `💰 Total Due: ₹${totalDue}`;
  return message;
}

async function getFeesSummary() {
  const { data: students, error } = await supabase
    .from('students')
    .select('total_fees, paid_amount, due_amount');
  
  if (error) return '❌ Database error';
  
  let totalFees = 0, totalPaid = 0, totalDue = 0;
  students.forEach(s => {
    totalFees += Number(s.total_fees) || 0;
    totalPaid += Number(s.paid_amount) || 0;
    totalDue += Number(s.due_amount) || 0;
  });
  
  let message = `📊 *FEES SUMMARY*\n\n`;
  message += `💰 Total Fees: ₹${totalFees}\n`;
  message += `✅ Total Collected: ₹${totalPaid}\n`;
  message += `⚠️ Total Due: ₹${totalDue}\n`;
  message += `━━━━━━━━━━━━━━━\n`;
  message += `📈 Collection Rate: ${((totalPaid/totalFees)*100).toFixed(1)}%\n`;
  message += `👥 Total Students: ${students.length}`;
  return message;
}

// ============================================
// ATTENDANCE FUNCTIONS
// ============================================

async function getStudentAttendance(usn) {
  if (!usn) return '❌ Usage: ATTEND <USN>';
  
  // First get student id from usn
  const { data: student, error: studentError } = await supabase
    .from('students')
    .select('id, full_name')
    .eq('usn', usn)
    .single();
  
  if (studentError) return `❌ Student not found: ${usn}`;
  
  const { data: attendance, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('student_id', student.id);
  
  if (error) return '❌ Database error';
  
  const totalDays = attendance?.length || 0;
  const presentDays = attendance?.filter(a => a.status === 'Present').length || 0;
  const percentage = totalDays > 0 ? ((presentDays / totalDays) * 100).toFixed(1) : 0;
  
  let message = `📊 *ATTENDANCE REPORT*\n\n`;
  message += `👤 Name: ${student.full_name}\n`;
  message += `📋 USN: ${usn}\n`;
  message += `━━━━━━━━━━━━━━━\n`;
  message += `📅 Total Days: ${totalDays}\n`;
  message += `✅ Present: ${presentDays}\n`;
  message += `❌ Absent: ${totalDays - presentDays}\n`;
  message += `📈 Percentage: ${percentage}%\n`;
  
  if (percentage < 75) {
    message += `\n⚠️ *LOW ATTENDANCE!* Need ${Math.ceil((75 * totalDays / 100) - presentDays)} more days.`;
  }
  return message;
}

async function getTodayAttendance() {
  const today = new Date().toISOString().split('T')[0];
  
  const { data: attendance, error } = await supabase
    .from('attendance')
    .select('student_id, status')
    .eq('trip_date', today);
  
  if (error) return '❌ Database error';
  
  const present = attendance?.filter(a => a.status === 'Present').length || 0;
  const total = attendance?.length || 0;
  
  return `📅 *TODAY'S ATTENDANCE* (${today})\n\n✅ Present: ${present}\n❌ Absent: ${total - present}\n📊 Total: ${total}`;
}

async function getLowAttendance() {
  // Complex query - get all students with attendance <75%
  const { data: students, error } = await supabase
    .from('students')
    .select('id, full_name, usn');
  
  if (error) return '❌ Database error';
  
  let lowAttendanceList = [];
  
  for (const student of students) {
    const { data: attendance } = await supabase
      .from('attendance')
      .select('status')
      .eq('student_id', student.id);
    
    const totalDays = attendance?.length || 0;
    const presentDays = attendance?.filter(a => a.status === 'Present').length || 0;
    const percentage = totalDays > 0 ? (presentDays / totalDays) * 100 : 100;
    
    if (percentage < 75 && totalDays > 0) {
      lowAttendanceList.push({ ...student, percentage: percentage.toFixed(1) });
    }
  }
  
  if (lowAttendanceList.length === 0) return '✅ No students with low attendance!';
  
  let message = `⚠️ *LOW ATTENDANCE STUDENTS* (<75%)\n\n`;
  lowAttendanceList.slice(0, 20).forEach((s, i) => {
    message += `${i+1}. ${s.full_name}\n`;
    message += `   USN: ${s.usn} | ${s.percentage}%\n\n`;
  });
  return message;
}

// ============================================
// BUS FUNCTIONS
// ============================================

async function getBusList() {
  const { data: buses, error } = await supabase
    .from('buses')
    .select('id, bus_number, route_name, is_active');
  
  if (error) return '❌ Database error';
  if (!buses || buses.length === 0) return '🚌 No buses found';
  
  let message = `🚌 *BUS LIST* (${buses.length})\n\n`;
  buses.forEach((b, i) => {
    message += `${i+1}. *${b.bus_number}*\n`;
    message += `   Route: ${b.route_name || 'N/A'}\n`;
    message += `   Status: ${b.is_active ? '🟢 Active' : '🔴 Inactive'}\n\n`;
  });
  return message;
}

async function getBusDetails(busNumber) {
  if (!busNumber) return '❌ Usage: BUS <bus_number>';
  
  const { data: bus, error } = await supabase
    .from('buses')
    .select('*')
    .eq('bus_number', busNumber)
    .single();
  
  if (error) return `❌ Bus not found: ${busNumber}`;
  
  let message = `🚌 *BUS DETAILS*\n\n`;
  message += `🔢 Number: ${bus.bus_number}\n`;
  message += `🗺️ Route: ${bus.route_name || 'N/A'}\n`;
  message += `📊 Status: ${bus.is_active ? '🟢 Active' : '🔴 Inactive'}\n`;
  message += `━━━━━━━━━━━━━━━\n`;
  message += `📅 PUC Expiry: ${bus.puc_expiry || 'N/A'}\n`;
  message += `🛡️ Insurance: ${bus.insurance_expiry || 'N/A'}\n`;
  message += `🔧 Fitness: ${bus.fitness_expiry || 'N/A'}\n`;
  message += `⏱️ Next Service: ${bus.next_service_due || 'N/A'}\n`;
  message += `📏 Current KM: ${bus.current_km || 'N/A'}\n`;
  if (bus.remarks) message += `📝 Remarks: ${bus.remarks}\n`;
  return message;
}

async function getBusLocation(busNumber) {
  const { data: bus, error } = await supabase
    .from('buses')
    .select('id')
    .eq('bus_number', busNumber)
    .single();
  
  if (error) return `❌ Bus not found: ${busNumber}`;
  
  const { data: location, error: locError } = await supabase
    .from('bus_locations')
    .select('latitude, longitude, speed, last_updated, driver_name')
    .eq('bus_id', bus.id)
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();
  
  if (locError || !location) return `📍 Live location not available for ${busNumber}`;
  
  let message = `📍 *BUS LOCATION*\n\n`;
  message += `🚌 Bus: ${busNumber}\n`;
  message += `🗺️ Lat: ${location.latitude}\n`;
  message += `🗺️ Lng: ${location.longitude}\n`;
  message += `💨 Speed: ${location.speed || 0} km/h\n`;
  if (location.driver_name) message += `👨‍✈️ Driver: ${location.driver_name}\n`;
  message += `🕐 Updated: ${new Date(location.last_updated).toLocaleTimeString()}\n`;
  message += `\n🔗 Maps: https://maps.google.com/?q=${location.latitude},${location.longitude}`;
  return message;
}

async function getBusStops(busNumber) {
  const { data: bus, error } = await supabase
    .from('buses')
    .select('id')
    .eq('bus_number', busNumber)
    .single();
  
  if (error) return `❌ Bus not found: ${busNumber}`;
  
  const { data: stops, error: stopsError } = await supabase
    .from('bus_stops')
    .select('stop_name, sequence, estimated_time, is_major')
    .eq('bus_id', bus.id)
    .order('sequence');
  
  if (stopsError || !stops || stops.length === 0) return `No stops found for ${busNumber}`;
  
  let message = `🚏 *BUS STOPS* - ${busNumber}\n\n`;
  stops.forEach(s => {
    message += `${s.sequence}. ${s.stop_name}`;
    if (s.is_major) message += ` ⭐`;
    if (s.estimated_time) message += ` (${s.estimated_time} min)`;
    message += `\n`;
  });
  return message;
}

// ============================================
// ROUTES FUNCTIONS
// ============================================

async function getAllRoutes() {
  const { data: routes, error } = await supabase
    .from('routes')
    .select('id, route_name, start_point, end_point, distance_km');
  
  if (error) return '❌ Database error';
  if (!routes || routes.length === 0) return '🗺️ No routes found';
  
  let message = `🗺️ *ALL ROUTES* (${routes.length})\n\n`;
  routes.forEach((r, i) => {
    message += `${i+1}. *${r.route_name}*\n`;
    message += `   ${r.start_point} → ${r.end_point}\n`;
    if (r.distance_km) message += `   📏 ${r.distance_km} km\n\n`;
  });
  return message;
}

async function getRouteDetails(routeName) {
  if (!routeName) return '❌ Usage: ROUTE <route_name>';
  
  const { data: route, error } = await supabase
    .from('routes')
    .select('*')
    .ilike('route_name', `%${routeName}%`)
    .single();
  
  if (error) return `❌ Route not found: ${routeName}`;
  
  const { data: stops, error: stopsError } = await supabase
    .from('route_stops')
    .select('stop_name, sequence, estimated_time, is_major')
    .eq('route_id', route.id)
    .order('sequence');
  
  let message = `🗺️ *ROUTE DETAILS*\n\n`;
  message += `📍 Name: ${route.route_name}\n`;
  message += `🚩 Start: ${route.start_point}\n`;
  message += `🏁 End: ${route.end_point}\n`;
  if (route.distance_km) message += `📏 Distance: ${route.distance_km} km\n`;
  if (route.estimated_duration) message += `⏱️ Duration: ${route.estimated_duration} min\n\n`;
  
  if (stops && stops.length > 0) {
    message += `🚏 *STOPS* (${stops.length})\n`;
    stops.slice(0, 15).forEach(s => {
      message += `${s.sequence}. ${s.stop_name}`;
      if (s.is_major) message += ` ⭐`;
      message += `\n`;
    });
  }
  return message;
}

// ============================================
// COMPLAINTS FUNCTIONS
// ============================================

async function registerComplaint(phoneNumber, complaintText) {
  const parts = complaintText.split('|');
  const title = parts[0]?.trim();
  const description = parts[1]?.trim();
  
  if (!title || !description) {
    return '❌ Format: COMPLAINT <title> | <description>';
  }
  
  // Find student by phone
  const { data: student, error } = await supabase
    .from('students')
    .select('id')
    .eq('phone_number', phoneNumber)
    .single();
  
  if (error) return '❌ Student not found. Please register your phone number first.';
  
  const { data, error: insertError } = await supabase
    .from('complaints')
    .insert({
      student_id: student.id,
      title: title,
      description: description,
      status: 'pending'
    })
    .select();
  
  if (insertError) return '❌ Failed to register complaint';
  
  return `✅ Complaint registered!\n\n📌 Title: ${title}\n📝 Description: ${description}\n🆔 ID: ${data[0].id}\n📊 Status: Pending\n\nWe will resolve it soon.`;
}

async function getMyComplaints(usn) {
  const { data: student, error } = await supabase
    .from('students')
    .select('id')
    .eq('usn', usn)
    .single();
  
  if (error) return `❌ Student not found: ${usn}`;
  
  const { data: complaints, error: compError } = await supabase
    .from('complaints')
    .select('*')
    .eq('student_id', student.id)
    .order('created_at', { ascending: false });
  
  if (compError) return '❌ Database error';
  if (!complaints || complaints.length === 0) return '📭 No complaints found';
  
  let message = `📋 *MY COMPLAINTS* (${complaints.length})\n\n`;
  complaints.slice(0, 10).forEach(c => {
    message += `🆔 ${c.id.slice(0, 8)}...\n`;
    message += `📌 ${c.title}\n`;
    message += `📊 Status: ${c.status}\n`;
    message += `📅 ${new Date(c.created_at).toLocaleDateString()}\n`;
    message += `━━━━━━━━━━━━━━━\n`;
  });
  return message;
}

// ============================================
// NOTICES & ANNOUNCEMENTS FUNCTIONS
// ============================================

async function getNotices() {
  const { data: notices, error } = await supabase
    .from('notices')
    .select('title, description, created_at, pdf_url')
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (error) return '❌ Database error';
  if (!notices || notices.length === 0) return '📢 No notices available';
  
  let message = `📢 *LATEST NOTICES* (${notices.length})\n\n`;
  notices.forEach((n, i) => {
    message += `${i+1}. *${n.title}*\n`;
    if (n.description) message += `   ${n.description.substring(0, 60)}...\n`;
    message += `   📅 ${new Date(n.created_at).toLocaleDateString()}\n`;
    if (n.pdf_url) message += `   📎 PDF available\n`;
    message += `\n`;
  });
  return message;
}

async function getAnnouncements() {
  const { data: announcements, error } = await supabase
    .from('announcements')
    .select('title, message, created_at')
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (error) return '❌ Database error';
  if (!announcements || announcements.length === 0) return '📢 No announcements';
  
  let message = `📢 *ANNOUNCEMENTS*\n\n`;
  announcements.forEach(a => {
    message += `📌 *${a.title}*\n`;
    message += `${a.message}\n`;
    message += `📅 ${new Date(a.created_at).toLocaleDateString()}\n`;
    message += `━━━━━━━━━━━━━━━\n`;
  });
  return message;
}

// ============================================
// DRIVERS FUNCTIONS
// ============================================

async function getDriversList() {
  const { data: drivers, error } = await supabase
    .from('drivers_new')
    .select('id, name, contact, driver_code');
  
  if (error) return '❌ Database error';
  if (!drivers || drivers.length === 0) return '👨‍✈️ No drivers found';
  
  let message = `👨‍✈️ *DRIVERS LIST* (${drivers.length})\n\n`;
  drivers.forEach((d, i) => {
    message += `${i+1}. *${d.name}*\n`;
    message += `   Code: ${d.driver_code || 'N/A'}\n`;
    message += `   📞 ${d.contact || 'N/A'}\n\n`;
  });
  return message;
}

async function getDriverDetails(driverName) {
  if (!driverName) return '❌ Usage: DRIVER <name>';
  
  const { data: driver, error } = await supabase
    .from('drivers_new')
    .select('*')
    .ilike('name', `%${driverName}%`)
    .single();
  
  if (error) return `❌ Driver not found: ${driverName}`;
  
  let message = `👨‍✈️ *DRIVER DETAILS*\n\n`;
  message += `Name: ${driver.name}\n`;
  message += `Code: ${driver.driver_code || 'N/A'}\n`;
  message += `📞 Contact: ${driver.contact || 'N/A'}\n`;
  message += `📜 License: ${driver.license_no || 'N/A'}\n`;
  message += `📍 Address: ${driver.address || 'N/A'}\n`;
  return message;
}

// ============================================
// ADMIN FUNCTIONS
// ============================================

async function addStudent(data) {
  if (!data || data.length < 4) {
    return '❌ Usage: ADD STUDENT <name>|<usn>|<branch>|<phone>';
  }
  
  const [name, usn, branch, phone] = data;
  
  const { error } = await supabase
    .from('students')
    .insert({
      full_name: name,
      usn: usn,
      branch: branch,
      phone_number: phone,
      total_fees: 0,
      paid_amount: 0,
      due_amount: 0,
      fees_due: false
    });
  
  if (error) return `❌ Failed to add student: ${error.message}`;
  return `✅ Student added successfully!\n👤 Name: ${name}\n📋 USN: ${usn}\n📚 Branch: ${branch}`;
}

async function updateStudentFees(usn, amount) {
  if (!usn || !amount) return '❌ Usage: UPDATE FEES <usn>|<amount>';
  
  const { data: student, error: findError } = await supabase
    .from('students')
    .select('paid_amount, due_amount, total_fees')
    .eq('usn', usn)
    .single();
  
  if (findError) return `❌ Student not found: ${usn}`;
  
  const newPaid = (student.paid_amount || 0) + Number(amount);
  const newDue = (student.total_fees || 0) - newPaid;
  const feesDue = newDue > 0;
  
  const { error } = await supabase
    .from('students')
    .update({
      paid_amount: newPaid,
      due_amount: newDue,
      fees_due: feesDue,
      last_payment_date: new Date().toISOString().split('T')[0]
    })
    .eq('usn', usn);
  
  if (error) return `❌ Failed to update fees: ${error.message}`;
  
  return `✅ Fees updated!\n📋 USN: ${usn}\n✅ Paid: ₹${newPaid}\n⚠️ Due: ₹${newDue}\n📊 Status: ${feesDue ? 'Pending' : 'Paid'}`;
}

async function deleteStudent(usn) {
  if (!usn) return '❌ Usage: DELETE STUDENT <usn>';
  
  const { error } = await supabase
    .from('students')
    .delete()
    .eq('usn', usn);
  
  if (error) return `❌ Failed to delete: ${error.message}`;
  return `✅ Student deleted successfully: ${usn}`;
}

async function broadcastMessage(message) {
  if (!message) return '❌ Usage: BROADCAST <message>';
  
  const { data: students, error } = await supabase
    .from('students')
    .select('phone_number');
  
  if (error) return '❌ Failed to fetch students';
  
  let sent = 0;
  for (const student of students) {
    if (student.phone_number) {
      await sendWhatsAppMessage(`91${student.phone_number}`, `📢 *BROADCAST*\n\n${message}`);
      sent++;
      await new Promise(resolve => setTimeout(resolve, 100)); // Rate limit
    }
  }
  
  return `✅ Broadcast sent to ${sent} students!`;
}