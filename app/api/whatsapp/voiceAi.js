// app/api/whatsapp/voiceAi.js

// Import all functions from admin.js
import {
    getMainMenu,
    getStudentList,
    getStudentCountWithBranch,
    searchStudent,
    getStudentFeeDetails,
    getFeesSummary,
    getCompleteDueFeesList,
    getBusList,
    getBusStops,
    getBusDetails,
    getNotices,
    getDriversList,
    registerComplaint
} from './admin.js';

// Import student functions
import {
    getStudentMenu,
    getStudentFeeStatus,
    getStudentComplaintStatus,
    registerStudentComplaint
} from './student.js';

// ============================================
// MAIN VOICE HANDLER - NO AI, ONLY KEYWORDS
// ============================================

export async function handleVoiceCommand(userMessage, fromNumber, isVoice = false, mediaUrl = null, isAdmin = true) {
    
    let userCommand = userMessage;
    
    if (isVoice && mediaUrl) {
        // Voice to text will be added later
        console.log("🎤 Voice message received, but voice-to-text not configured yet");
        return "🎤 Voice command received! Please type your command or send as text.\n\nType *MENU* for available commands.";
    }
    
    if (!userCommand || userCommand.trim() === '') {
        return isAdmin ? getMainMenu() : getStudentMenu();
    }
    
    console.log("User said:", userCommand);
    
    // Process with keyword matching only
    const response = await keywordMatch(userCommand, fromNumber, isAdmin);
    
    return response;
}

// ============================================
// KEYWORD MATCHING ONLY (NO AI)
// ============================================

async function keywordMatch(command, fromNumber, isAdmin) {
    const lower = command.toLowerCase();
    
    console.log("🔍 Matching keywords for:", lower);
    
    // Fee Summary
    if (lower.includes('fee summary') || lower.includes('fees summary') || 
        lower.includes('total fees') || lower.includes('collection') ||
        lower.includes('fees collected') || lower.includes('summary do') ||
        lower.includes('kitna fee') || lower.includes('fee report')) {
        console.log("✅ Matched: Fee Summary");
        return await getFeesSummary();
    }
    
    // Student Count
    if (lower.includes('count of all students') || lower.includes('student count') || 
        lower.includes('total students') || lower.includes('kitne students') ||
        lower.includes('branch wise count') || lower.includes('count students')) {
        console.log("✅ Matched: Student Count");
        return await getStudentCountWithBranch();
    }
    
    // My Fees
    if (lower.includes('my fees') || lower.includes('meri fees') || 
        lower.includes('my due') || lower.includes('meri due') ||
        lower.includes('my fee status') || lower.includes('muje na fees')) {
        console.log("✅ Matched: My Fees");
        if (isAdmin) {
            return await getFeesSummary();
        }
        return await getStudentFeeStatus(fromNumber);
    }
    
    // Due List
    if (lower.includes('due list') || lower.includes('pending fees') || 
        lower.includes('pending list') || lower.includes('due fees') ||
        lower.includes('baki fees') || lower.includes('jitne baki')) {
        console.log("✅ Matched: Due List");
        return await getCompleteDueFeesList();
    }
    
    // Student List
    if (lower.includes('student list') || lower.includes('all students') || 
        lower.includes('sab students') || lower.includes('student list do')) {
        console.log("✅ Matched: Student List");
        return await getStudentList();
    }
    
    // Bus List
    if (lower.includes('bus list') || lower.includes('all buses') || 
        lower.includes('sari buses') || lower.includes('bus list do') ||
        lower.includes('buses')) {
        console.log("✅ Matched: Bus List");
        return await getBusList();
    }
    
    // Specific Bus Details
    const busMatch = lower.match(/bus (\d+)/);
    if (busMatch) {
        console.log("✅ Matched: Bus Details for", busMatch[1]);
        return await getBusDetails(busMatch[1]);
    }
    
    // Bus Stops
    if (lower.includes('bus stops') || lower.includes('stops')) {
        const busStopMatch = lower.match(/(\d+)/);
        if (busStopMatch) {
            console.log("✅ Matched: Bus Stops for", busStopMatch[1]);
            return await getBusStops(busStopMatch[1]);
        }
        return "🚏 Please specify bus number.\nExample: STOPS 101";
    }
    
    // Notices
    if (lower.includes('notices') || lower.includes('announcements') || 
        lower.includes('latest notices') || lower.includes('kya naya hai')) {
        console.log("✅ Matched: Notices");
        return await getNotices();
    }
    
    // Drivers List
    if (lower.includes('drivers') || lower.includes('driver list') || 
        lower.includes('sab drivers') || lower.includes('bus drivers')) {
        console.log("✅ Matched: Drivers List");
        return await getDriversList();
    }
    
    // Search Student
    if (lower.includes('search') || lower.includes('find student') || 
        lower.includes('dhundho') || lower.includes('search student')) {
        const searchQuery = command.replace(/search|find student|dhundho|search student/gi, '').trim();
        if (searchQuery && searchQuery.length > 2) {
            console.log("✅ Matched: Search Student for", searchQuery);
            return await searchStudent(searchQuery);
        }
        return getSearchFormat();
    }
    
    // Fee Check for specific student
    if (lower.match(/fee\s+\w/)) {
        const feeQuery = command.replace(/fee/gi, '').trim();
        if (feeQuery && feeQuery.length > 2) {
            console.log("✅ Matched: Fee Check for", feeQuery);
            return await getStudentFeeDetails(feeQuery);
        }
    }
    
    // Complaint
    if (lower.includes('complaint') && (lower.includes('|') || lower.includes('against'))) {
        console.log("✅ Matched: Register Complaint");
        const complaintText = command.replace(/complaint/gi, '').trim();
        return await registerComplaint(fromNumber, complaintText);
    }
    
    // Help Menu
    if (lower.includes('help') || lower.includes('menu') || 
        lower.includes('start') || lower.includes('bus') ||
        lower === 'menu' || lower === 'help') {
        console.log("✅ Matched: Menu");
        return isAdmin ? getMainMenu() : getStudentMenu();
    }
    
    // Default - Show Menu
    console.log("❌ No keyword matched, showing menu");
    return isAdmin ? getMainMenu() : getStudentMenu();
}

// ============================================
// HELPER FUNCTION
// ============================================

function getSearchFormat() {
    return `🔍 *SEARCH STUDENT*
Format: SEARCH <USN or Name>
Example: SEARCH 3TS25CS004

You can search by:
- USN (full or partial)
- Student name (full or partial)`;
}

// ============================================
// VOICE TO TEXT (Will add later)
// ============================================

async function voiceToText(mediaUrl) {
    console.log("🎤 Voice to text for:", mediaUrl);
    return null;
}