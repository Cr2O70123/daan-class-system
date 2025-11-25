import { GoogleGenAI, Type } from "@google/genai";
import { Word } from "../types";
import { WORD_DATABASE } from "./mockData";

export const fetchAiWords = async (): Promise<Word[]> => {
  try {
    // Initialize inside the function to avoid top-level crashes if env is missing
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        console.warn("Gemini API Key is missing. Using offline mode.");
        return WORD_DATABASE;
    }

    // Initialize Gemini API lazily
    const ai = new GoogleGenAI({ apiKey });
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Generate 40 distinct English vocabulary words for a quiz game (Traditional Chinese - Taiwan Usage).
      
      Requirements:
      1. Provide strictly valid JSON.
      2. Distribution:
         - 10 words Level 3 (Basic Life/Academic)
         - 10 words Level 4 (Intermediate)
         - 10 words Level 5 (Advanced Academic)
         - 10 words Level 6 (Professional/Abstract)
      3. 'zh' must be Traditional Chinese (繁體中文).
      4. Words should be suitable for high school/college students.
      `,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              en: { type: Type.STRING },
              zh: { type: Type.STRING },
              level: { type: Type.INTEGER }
            },
            required: ['en', 'zh', 'level']
          }
        }
      }
    });

    if (response.text) {
        const rawData = JSON.parse(response.text);
        
        // Add IDs to the words
        const aiWords: Word[] = rawData.map((item: any) => ({
            id: Math.floor(Math.random() * 1000000) + 1000, // Random ID to avoid collisions
            en: item.en,
            zh: item.zh,
            level: item.level
        }));

        if (aiWords.length > 0) {
            return aiWords;
        }
    }
    
    // Return fallback if empty
    return WORD_DATABASE;
    
  } catch (error) {
    console.error("Gemini API Error (Falling back to static data):", error);
    return WORD_DATABASE;
  }
};