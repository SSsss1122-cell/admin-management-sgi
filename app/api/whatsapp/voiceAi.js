// app/api/whatsapp/voiceAi.js

import { GoogleGenerativeAI } from '@google/generative-ai';

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
    registerComplaint,
    createAnnouncement,
    getPendingAnnouncements,
    addStudent,
    updateStudentFees,
    deleteStudent,
    broadcastMessage,
    debugDatabase
} from './admin.js';

// Import student functions
import {
    getStudentMenu,
    getStudentFeeStatus,
    getStudentComplaintStatus,
    registerStudentComplaint
} from './student.js';

// ✅ CORRECT MODEL NAME - Use this
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

// ============================================
// MAIN VOICE HANDLER
// ============================================

export async function handleVoiceCommand(userMessage, fromNumber, isVoice = false, mediaUrl = null, isAdmin = true) {
    
    let userCommand = userMessage;
    
    if (isVoice && mediaUrl) {
        const transcribed = await voiceToText(mediaUrl);
        if (!transcribed) {
            return "❌ Voice samajh nahi aaya. Please clearly bole ya text type karein.";
        }
        userCommand = transcribed;
    }
    
    if (!userCommand || userCommand.trim() === '') {
        return isAdmin ? getMainMenu() : getStudentMenu();
    }
    
    console.log("User said:", userCommand);
    
    // FAST KEYWORD MATCHING (No AI delay)
    const fastResponse = await fastKeywordMatch(userCommand, fromNumber, isAdmin);
    if (fastResponse) {
        console.log("⚡ Quick response from keywords");
        return fastResponse;
    }
    
    // Default menu
    return isAdmin ? getMainMenu() : getStudentMenu();
}

// ============================================
// FAST KEYWORD MATCHING
// ============================================

async function fastKeywordMatch(command, fromNumber, isAdmin) {
    const lower = command.toLowerCase();
    
    // Fee Summary
    if (lower.includes('fee summary') || lower.includes('fees summary') || 
        lower.includes('total fees') || lower.includes('collection') ||
        lower.includes('fees collected') || lower.includes('summary do')) {
        return await getFeesSummary();
    }
    
    // My Fees
    if (lower.includes('my fees') || lower.includes('meri fees') || 
        lower.includes('my due') || lower.includes('muje na fees')) {
        if (isAdmin) {
            return await getFeesSummary();
        }
        return await getStudentFeeStatus(fromNumber);
    }
    
    // Due List
    if (lower.includes('due list') || lower.includes('pending fees') || 
        lower.includes('due fees') || lower.includes('baki fees')) {
        return await getCompleteDueFeesList();
    }
    
    // Student List
    if (lower.includes('student list') || lower.includes('all students') || 
        lower.includes('sab students')) {
        return await getStudentList();
    }
    
    // Bus List
    if (lower.includes('bus list') || lower.includes('all buses') || 
        lower.includes('sari buses')) {
        return await getBusList();
    }
    
    // Notices
    if (lower.includes('notices') || lower.includes('announcements') || 
        lower.includes('latest notices')) {
        return await getNotices();
    }
    
    // Help Menu
    if (lower.includes('help') || lower.includes('menu') || 
        lower.includes('start') || lower.includes('bus')) {
        return isAdmin ? getMainMenu() : getStudentMenu();
    }
    
    // Specific Bus
    const busMatch = lower.match(/bus (\d+)/);
    if (busMatch) {
        return await getBusDetails(busMatch[1]);
    }
    
    return null;
}

// ============================================
// VOICE TO TEXT (Placeholder)
// ============================================

async function voiceToText(mediaUrl) {
    console.log("🎤 Voice to text for:", mediaUrl);
    return null;
}