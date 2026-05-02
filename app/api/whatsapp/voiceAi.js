    // app/api/whatsapp/voiceAi.js

import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '@/lib/supabase';

// Import all functions from your existing admin.js
import {
    getStudentList,
    getStudentCountWithBranch,
    searchStudent,
    getStudentFeeDetails,
    getCompleteDueFeesList,
    getFeesSummary,
    getBusList,
    getBusStops,
    getBusDetails,
    getNotices,
    getDriversList,
    registerComplaint,
    getMainMenu
} from './admin.js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// ============================================
// MAIN VOICE HANDLER - CALL THIS FUNCTION
// ============================================

export async function handleVoiceCommand(userMessage, fromNumber, isVoice = false, mediaUrl = null) {
    
    let userCommand = userMessage;
    
    // Agar voice message hai toh pehle transcribe karo
    if (isVoice && mediaUrl) {
        const transcribed = await voiceToText(mediaUrl);
        if (!transcribed) {
            return "❌ Voice samajh nahi aaya. Please clearly bole ya text type karein.";
        }
        userCommand = transcribed;
    }
    
    console.log("User said:", userCommand);
    
    // AI se samjho user kya chahta hai aur call karo correct function
    const response = await understandAndExecute(userCommand, fromNumber);
    
    return response;
}

// ============================================
// AI: SAMJHO AUR EXECUTE KARO
// ============================================

async function understandAndExecute(command, fromNumber) {
    
    const prompt = `
You are SGI College WhatsApp Bot. User said: "${command}"

Based on what user wants, you need to decide which function to call.
Available functions with their purposes:

1. getMainMenu() - when user asks for HELP, MENU, START, or doesn't know commands
2. getStudentList() - when user wants list of ALL students
3. getStudentCountWithBranch() - when user wants count of students by branch
4. searchStudent(X) - when user wants to find a specific student. Extract name/usn as X
5. getStudentFeeDetails(X) - when user wants fee of SPECIFIC student. Extract USN/name/phone as X
6. getFeesSummary() - when user wants TOTAL fees summary (all students)
7. getCompleteDueFeesList() - when user wants LIST of students with pending fees
8. getBusList() - when user wants list of all buses
9. getBusStops(X) - when user wants stops of specific bus. Extract bus number as X
10. getBusDetails(X) - when user wants details of specific bus. Extract bus number as X
11. getNotices() - when user wants latest notices/announcements
12. getDriversList() - when user wants list of drivers
13. registerComplaint(fromNumber, X) - when user wants to register complaint. Extract complaint text as X. Format: title|description

Return ONLY a JSON object with:
{
    "functionName": "name of function to call",
    "params": ["parameter1", "parameter2"]
}

If unclear what user wants, use getMainMenu().
`;

    try {
        const result = await model.generateContent(prompt);
        const aiResponse = result.response.text();
        
        // Parse JSON from AI response
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            return getMainMenu();
        }
        
        const decision = JSON.parse(jsonMatch[0]);
        const functionName = decision.functionName;
        const params = decision.params || [];
        
        console.log("AI Decision:", functionName, params);
        
        // Call the actual function based on AI decision
        switch (functionName) {
            case 'getMainMenu':
                return getMainMenu();
                
            case 'getStudentList':
                return await getStudentList();
                
            case 'getStudentCountWithBranch':
                return await getStudentCountWithBranch();
                
            case 'searchStudent':
                return await searchStudent(params[0]);
                
            case 'getStudentFeeDetails':
                return await getStudentFeeDetails(params[0]);
                
            case 'getFeesSummary':
                return await getFeesSummary();
                
            case 'getCompleteDueFeesList':
                return await getCompleteDueFeesList();
                
            case 'getBusList':
                return await getBusList();
                
            case 'getBusStops':
                return await getBusStops(params[0]);
                
            case 'getBusDetails':
                return await getBusDetails(params[0]);
                
            case 'getNotices':
                return await getNotices();
                
            case 'getDriversList':
                return await getDriversList();
                
            case 'registerComplaint':
                return await registerComplaint(fromNumber, params[0]);
                
            default:
                return getMainMenu();
        }
        
    } catch (error) {
        console.error("AI Error:", error);
        return getMainMenu();
    }
}

// ============================================
// VOICE TO TEXT (AssemblyAI - Optional)
// ============================================

async function voiceToText(mediaUrl) {
    // Agar AssemblyAI API key hai toh use karo
    // Nahi toh simulate karo
    
    console.log("Voice note received:", mediaUrl);
    
    // TODO: Add AssemblyAI or Google Speech-to-Text here
    // For now, return null (will fallback to text)
    
    return null;
}