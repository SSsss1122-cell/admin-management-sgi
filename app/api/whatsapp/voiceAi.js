// app/api/whatsapp/voiceAi.js

import Groq from 'groq-sdk';
import { 
    getFeesSummary, getCompleteDueFeesList, getStudentList, 
    getStudentCountWithBranch, getBusList, getBusDetails, 
    getBusStops, getNotices, getDriversList, getStudentFeeDetails,
    searchStudent, getMainMenu, registerComplaint, addStudent,
    updateStudentFees, deleteStudent, broadcastMessage
} from './admin.js';
import { getStudentMenu, getStudentFeeStatus, getStudentComplaintStatus, registerStudentComplaint } from './student.js';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ============================================
// MAIN HANDLER
// ============================================

export async function handleVoiceCommand(userMessage, fromNumber, isVoice = false, mediaUrl = null, isAdmin = true) {
    
    let userCommand = userMessage;
    
    if (isVoice && mediaUrl) {
        console.log("🎤 Voice note received...");
        userCommand = await voiceToTextGroq(mediaUrl);
        if (!userCommand) {
            return "❌ Voice samajh nahi aaya. Please type your command.";
        }
    }
    
    if (!userCommand || userCommand.trim() === '') {
        return isAdmin ? getMainMenu() : getStudentMenu();
    }
    
    console.log("📝 User Command:", userCommand);
    console.log("🤖 AI is thinking...");
    
    // AI will THINK and decide what to do
    const response = await aiThinkAndReturn(userCommand, fromNumber, isAdmin);
    
    return response;
}

// ============================================
// AI THINKS AND RETURNS THE RESPONSE
// ============================================

async function aiThinkAndReturn(userCommand, fromNumber, isAdmin) {
    
    const prompt = `You are an AI assistant for Shetty Homoeopathic Medical College WhatsApp Bot.

USER SAID: "${userCommand}"

YOUR JOB: Understand what the user wants and return ONLY a JSON object with the correct function to call.

AVAILABLE FUNCTIONS:

${isAdmin ? `
1. getFeesSummary() - For: "total fees", "fee summary", "fees collected", "kitna fee", "collection report", "fees report", "all fees"
2. getCompleteDueFeesList() - For: "due list", "pending fees", "jisne fees nahi di", "baki fees", "due students", "fees pending"
3. getStudentCountWithBranch() - For: "student count", "total students", "kitne students", "branch wise count", "students per branch"
4. getStudentList() - For: "student list", "all students", "sab students"
5. getBusList() - For: "bus list", "all buses", "sari buses"
6. getBusDetails(busNumber) - For: "bus 101", "bus number 101 details", "101 bus"
7. getBusStops(busNumber) - For: "bus 101 stops", "bus stops of 101", "kahan rukti hai bus 101"
8. getNotices() - For: "notices", "announcements", "latest news"
9. getDriversList() - For: "drivers", "driver list", "bus drivers"
10. searchStudent(query) - For: "search student", "find rahul", "dhundho student"
11. getStudentFeeDetails(query) - For: "fees of student usn 123", "kitna dena hai student ko"
12. addStudent(name|usn|branch|phone) - For: "add student"
13. updateStudentFees(usn|amount) - For: "update fees", "fees update"
14. deleteStudent(usn) - For: "delete student"
15. broadcastMessage(message) - For: "broadcast", "send message to all"
` : `
1. getStudentFeeStatus() - For: "my fees", "meri fees", "my due", "mera baki", "how much I owe"
2. getStudentComplaintStatus() - For: "my complaints", "complaint status", "meri shikayat"
3. registerStudentComplaint(title|description) - For: "complaint", "shikayat", "problem"
4. getBusList() - For: "bus list", "buses"
5. getNotices() - For: "notices"
6. getStudentMenu() - For: "help", "menu", "commands", "what can I do"
`}

RULES:
1. Analyze the user's command carefully
2. Choose the MOST APPROPRIATE function
3. Extract any numbers or names from the command
4. Return ONLY valid JSON, no other text

EXAMPLES:
User: "Mujhe fee summary batao" → {"function": "getFeesSummary", "params": []}
User: "Bus number 101 ke stops batao" → {"function": "getBusStops", "params": ["101"]}
User: "Rahul naam ke student ko search karo" → {"function": "searchStudent", "params": ["Rahul"]}
User: "kitne students hai" → {"function": "getStudentCountWithBranch", "params": []}
User: "jisne fees nahi di list" → {"function": "getCompleteDueFeesList", "params": []}

IMPORTANT: Return ONLY the JSON. No explanation, no extra words.

YOUR RESPONSE:`;

    try {
        const startTime = Date.now();
        
        const completion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: "You are an AI that returns ONLY JSON. Never add extra text." },
                { role: "user", content: prompt }
            ],
            model: "llama-3.3-70b-versatile",  // Most intelligent model
            temperature: 0.1,
            max_tokens: 200
        });
        
        const aiResponse = completion.choices[0]?.message?.content || "";
        console.log("🤖 AI Raw Response:", aiResponse);
        
        // Extract JSON from response
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.log("❌ No JSON found, using fallback");
            return await fallbackHandler(userCommand, fromNumber, isAdmin);
        }
        
        const parsed = JSON.parse(jsonMatch[0]);
        const functionName = parsed.function;
        const params = parsed.params || [];
        
        const endTime = Date.now();
        console.log(`✅ AI decided: ${functionName} (${endTime - startTime}ms)`);
        console.log(`📦 Params:`, params);
        
        // Execute the function
        const result = await executeFunction(functionName, params, fromNumber, userCommand);
        return result;
        
    } catch (error) {
        console.error("AI Error:", error);
        return await fallbackHandler(userCommand, fromNumber, isAdmin);
    }
}

// ============================================
// EXECUTE FUNCTION BASED ON AI DECISION
// ============================================

async function executeFunction(functionName, params, fromNumber, originalCommand) {
    console.log(`⚡ Executing: ${functionName}(${params.join(', ')})`);
    
    try {
        switch(functionName) {
            // Admin Functions
            case 'getFeesSummary':
                return await getFeesSummary();
            
            case 'getCompleteDueFeesList':
                return await getCompleteDueFeesList();
            
            case 'getStudentCountWithBranch':
                return await getStudentCountWithBranch();
            
            case 'getStudentList':
                return await getStudentList();
            
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
            
            case 'searchStudent':
                return await searchStudent(params[0]);
            
            case 'getStudentFeeDetails':
                return await getStudentFeeDetails(params[0]);
            
            case 'addStudent':
                return await addStudent(params[0]?.split('|'));
            
            case 'updateStudentFees':
                const [usn, amount] = (params[0] || '').split('|');
                return await updateStudentFees(usn, amount);
            
            case 'deleteStudent':
                return await deleteStudent(params[0]);
            
            case 'broadcastMessage':
                return await broadcastMessage(params[0]);
            
            // Student Functions
            case 'getStudentFeeStatus':
                return await getStudentFeeStatus(fromNumber);
            
            case 'getStudentComplaintStatus':
                return await getStudentComplaintStatus(fromNumber);
            
            case 'registerStudentComplaint':
                return await registerStudentComplaint(fromNumber, params[0]);
            
            case 'getStudentMenu':
                return getStudentMenu();
            
            case 'getMainMenu':
                return getMainMenu();
            
            default:
                console.log(`⚠️ Unknown function: ${functionName}`);
                return getMainMenu();
        }
    } catch (error) {
        console.error(`Error executing ${functionName}:`, error);
        return "❌ Error processing your request. Please try again.";
    }
}

// ============================================
// FALLBACK HANDLER
// ============================================

async function fallbackHandler(command, fromNumber, isAdmin) {
    console.log("🔄 Using fallback handler");
    const lower = command.toLowerCase();
    
    // Smart keyword matching for common patterns
    if (lower.includes('fee') && (lower.includes('summary') || lower.includes('total'))) 
        return await getFeesSummary();
    
    if (lower.includes('due') || (lower.includes('pending') && lower.includes('fee'))) 
        return await getCompleteDueFeesList();
    
    if ((lower.includes('count') || lower.includes('kitne')) && lower.includes('student')) 
        return await getStudentCountWithBranch();
    
    if (lower.includes('bus') && lower.match(/\d{3}/)) {
        const busNum = lower.match(/\d{3}/)[0];
        if (lower.includes('stop')) return await getBusStops(busNum);
        return await getBusDetails(busNum);
    }
    
    if (lower.includes('my') && lower.includes('fee')) {
        if (isAdmin) return await getFeesSummary();
        return await getStudentFeeStatus(fromNumber);
    }
    
    return isAdmin ? getMainMenu() : getStudentMenu();
}

// ============================================
// VOICE TO TEXT with Groq Whisper
// ============================================

async function voiceToTextGroq(mediaUrl) {
    try {
        console.log("🎤 Downloading voice from WhatsApp...");
        const audioBuffer = await downloadWhatsAppAudio(mediaUrl);
        
        console.log("🎤 Converting voice to text with Groq Whisper...");
        // Convert to proper format for Groq
        const blob = new Blob([audioBuffer], { type: 'audio/mp4' });
        
        const transcription = await groq.audio.transcriptions.create({
            file: blob,
            model: "whisper-large-v3",
            language: "hi",
            response_format: "text"
        });
        
        console.log("✅ Transcription:", transcription);
        return transcription;
        
    } catch (error) {
        console.error("Voice to text error:", error);
        return null;
    }
}

async function downloadWhatsAppAudio(mediaId) {
    // Implementation depends on your WhatsApp provider
    // For ViralBoostUp:
    const apiKey = process.env.VIRALBOOSTUP_API_KEY;
    const response = await fetch(`https://app.viralboostup.in/api/v2/whatsapp-business/media/${mediaId}`, {
        headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
}