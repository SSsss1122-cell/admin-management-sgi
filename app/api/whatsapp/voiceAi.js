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

// ✅ FIXED: Use correct model name
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });  // ← Changed from gemini-1.5-flash

// ============================================
// MAIN VOICE HANDLER
// ============================================

export async function handleVoiceCommand(userMessage, fromNumber, isVoice = false, mediaUrl = null, isAdmin = true) {
    
    let userCommand = userMessage;
    
    if (isVoice && mediaUrl) {
        const transcribed = await voiceToText(mediaUrl);
        if (!transcribed) {
            return "❌ Voice samajh nahi aaya. Please clearly bole ya text type karein.\n\nType *MENU* for commands.";
        }
        userCommand = transcribed;
        console.log("🎤 Transcribed voice:", userCommand);
    }
    
    if (!userCommand || userCommand.trim() === '') {
        return isAdmin ? getMainMenu() : getStudentMenu();
    }
    
    console.log("User said:", userCommand);
    
    // Try to understand and execute
    const response = await understandAndExecute(userCommand, fromNumber, isAdmin);
    
    return response;
}

// ============================================
// UNDERSTAND AND EXECUTE
// ============================================

async function understandAndExecute(command, fromNumber, isAdmin) {
    
    const prompt = `
You are SGI College WhatsApp Bot. User said: "${command}"

User is ${isAdmin ? 'ADMIN' : 'STUDENT'}.

Based on what user wants, decide which function to call.

Return ONLY a JSON object:
{"function": "FUNCTION_NAME", "params": ["param1", "param2"]}

Available functions for ${isAdmin ? 'ADMIN' : 'STUDENT'}:

${isAdmin ? `
- getFeesSummary() - for total fees report
- getCompleteDueFeesList() - for pending fees list
- getStudentList() - for all students
- getStudentCountWithBranch() - for branch wise count
- getBusList() - for all buses
- getBusDetails(number) - for specific bus
- getBusStops(number) - for bus stops
- getNotices() - for announcements
- getDriversList() - for drivers
- getStudentFeeDetails(query) - for specific student fees
- searchStudent(query) - to find student
- getMainMenu() - for help/menu
` : `
- getStudentFeeStatus(phone) - for my fees. Use phone: ${fromNumber}
- getStudentComplaintStatus(phone) - for complaint status. Use phone: ${fromNumber}
- registerStudentComplaint(phone, complaint) - for new complaint
- getBusList() - for buses
- getNotices() - for notices
- getStudentMenu() - for help
`}

If user asks for "fee summary", "total fees", "collection" → getFeesSummary
If user asks for "due list", "pending fees" → getCompleteDueFeesList
If user asks for "my fees", "meri fees" → getStudentFeeStatus with phone
If user asks for "bus list" → getBusList
If unclear → getMainMenu or getStudentMenu
`;

    try {
        const result = await model.generateContent(prompt);
        const aiResponse = result.response.text();
        
        console.log("🤖 AI Response:", aiResponse);
        
        // Extract JSON
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            return isAdmin ? getMainMenu() : getStudentMenu();
        }
        
        const decision = JSON.parse(jsonMatch[0]);
        const functionName = decision.function;
        const params = decision.params || [];
        
        console.log("📞 Calling:", functionName, params);
        
        // Execute based on function name
        switch (functionName) {
            case 'getFeesSummary':
                return await getFeesSummary();
            case 'getCompleteDueFeesList':
                return await getCompleteDueFeesList();
            case 'getStudentList':
                return await getStudentList();
            case 'getStudentCountWithBranch':
                return await getStudentCountWithBranch();
            case 'getBusList':
                return await getBusList();
            case 'getBusDetails':
                return await getBusDetails(params[0]);
            case 'getBusStops':
                return await getBusStops(params[0]);
            case 'getNotices':
                return await getNotices();
            case 'getDriversList':
                return await getDriversList();
            case 'getStudentFeeDetails':
                return await getStudentFeeDetails(params[0]);
            case 'searchStudent':
                return await searchStudent(params[0]);
            case 'getStudentFeeStatus':
                return await getStudentFeeStatus(fromNumber);
            case 'getStudentComplaintStatus':
                return await getStudentComplaintStatus(fromNumber);
            case 'registerStudentComplaint':
                return await registerStudentComplaint(fromNumber, params[0]);
            case 'getMainMenu':
                return getMainMenu();
            case 'getStudentMenu':
                return getStudentMenu();
            default:
                return isAdmin ? getMainMenu() : getStudentMenu();
        }
        
    } catch (error) {
        console.error("AI Error:", error);
        // Fallback: Try direct keyword matching
        return await fallbackCommandHandler(command, fromNumber, isAdmin);
    }
}

// ============================================
// FALLBACK HANDLER (When AI fails)
// ============================================

async function fallbackCommandHandler(command, fromNumber, isAdmin) {
    const lower = command.toLowerCase();
    
    // Fee Summary
    if (lower.includes('fee summary') || lower.includes('total fees') || lower.includes('collection')) {
        return await getFeesSummary();
    }
    
    // Due List
    if (lower.includes('due list') || lower.includes('pending fees') || lower.includes('due fees')) {
        return await getCompleteDueFeesList();
    }
    
    // My Fees
    if (lower.includes('my fees') || lower.includes('meri fees') || lower.includes('my due')) {
        if (!isAdmin) {
            return await getStudentFeeStatus(fromNumber);
        }
        return await getFeesSummary();
    }
    
    // Student List
    if (lower.includes('student list') || lower.includes('all students')) {
        return await getStudentList();
    }
    
    // Bus List
    if (lower.includes('bus list') || lower.includes('all buses')) {
        return await getBusList();
    }
    
    // Notices
    if (lower.includes('notices') || lower.includes('announcements')) {
        return await getNotices();
    }
    
    // Help
    if (lower.includes('help') || lower.includes('menu')) {
        return isAdmin ? getMainMenu() : getStudentMenu();
    }
    
    // Default
    return isAdmin ? getMainMenu() : getStudentMenu();
}

// ============================================
// VOICE TO TEXT (Placeholder)
// ============================================

async function voiceToText(mediaUrl) {
    console.log("🎤 Voice to text for:", mediaUrl);
    // Add AssemblyAI or Google Speech-to-Text here
    return null;
}