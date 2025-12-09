import { GoogleGenAI } from "@google/genai";

// Initialize the client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || 'YOUR_API_KEY_HERE' });

export const generateTripAdvice = async (origin: string, destination: string, lang: 'pt' | 'en'): Promise<string> => {
  try {
    const model = 'gemini-2.5-flash';
    const langInstruction = lang === 'pt' ? 'Answer in Portuguese (Angola variant).' : 'Answer in English.';
    const prompt = `Provide a very short, helpful safety tip or road fact for a traveler going from ${origin} to ${destination} in Angola. Mention road conditions or stops if relevant. Keep it under 25 words. Tone: Friendly local (kamba). ${langInstruction}`;
    
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });

    return response.text || (lang === 'pt' ? "Boa viagem! Cuidado na estrada." : "Safe travels! Check the road.");
  } catch (error) {
    console.error("Gemini API Error:", error);
    return lang === 'pt' ? "Aproveite a viagem! Conduza com segurança." : "Enjoy your trip! Remember to drive safely.";
  }
};

export const chatWithBot = async (userMessage: string, lang: 'pt' | 'en'): Promise<string> => {
   try {
    const model = 'gemini-2.5-flash';
    const langInstruction = lang === 'pt' ? 'Answer in Portuguese (Angola variant). Use slang like "mambo", "bwe", "kamba" moderately.' : 'Answer in English.';
    const prompt = `You are the AI assistant for KOMBO, an Angolan super app for travel, shipping (agita), and services. Answer this user query briefly (under 40 words): ${userMessage}. ${langInstruction}`;
    
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });

    return response.text || (lang === 'pt' ? "Posso ajudar a encontrar uma boleia ou serviço. O que precisas?" : "I can help you find a trip or a service. What do you need?");
  } catch (error) {
    console.error("Gemini Chat Error:", error);
    return lang === 'pt' ? "Estou com problemas de conexão. Tenta mais tarde." : "I'm having trouble connecting right now. Please try again later.";
  }
}