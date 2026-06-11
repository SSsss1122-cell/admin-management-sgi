import axios from 'axios';

const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v21.0';
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

export async function sendWhatsAppTemplate(to, templateName, parameters, languageCode = 'en_US') {
  try {
    const url = `${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`;
    
    const body = {
      messaging_product: 'whatsapp',
      to: to,
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: languageCode
        },
        components: [
          {
            type: 'body',
            parameters: parameters.map(param => ({
              type: 'text',
              text: param
            }))
          }
        ]
      }
    };
    
    const response = await axios.post(url, body, {
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`✅ WhatsApp template sent to ${to}`);
    return response.data;
    
  } catch (error) {
    console.error('❌ Error sending WhatsApp template:', error.response?.data || error.message);
    throw error;
  }
}

export async function sendFeesOverdueReminder(to, studentName, dueAmount, dueDate, daysOverdue) {
  const templateName = 'fees_due';
  
  const parameters = [
    studentName,
    dueAmount.toString(),
    dueDate,
    daysOverdue.toString()
  ];
  
  return await sendWhatsAppTemplate(to, templateName, parameters);
}