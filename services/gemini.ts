import { GoogleGenAI } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

const getAI = () => {
  if (aiInstance) return aiInstance;
  
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("GEMINI_API_KEY is not defined. AI features will use fallbacks.");
    return null;
  }
  
  try {
    aiInstance = new GoogleGenAI({ apiKey });
    return aiInstance;
  } catch (error) {
    console.error("Failed to initialize GoogleGenAI:", error);
    return null;
  }
};

export const getCrypticMessage = async (pageCount: number): Promise<string> => {
  const ai = getAI();
  if (!ai) return "ELE ESTÁ OBSERVANDO.";

  try {
    const model = (ai as any).getGenerativeModel({ model: "gemini-1.5-flash" });
    const response = await model.generateContent(`Gere uma frase curtíssima, enigmática e aterradora que o Slender Man deixaria em uma nota. O jogador coletou ${pageCount} de 8 páginas. Mantenha menos de 10 palavras e em PORTUGUÊS.`);
    return response.response.text() || "ELE ESTÁ OBSERVANDO.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "ESTOU ATRÁS DE VOCÊ.";
  }
};

export const getDeathMessage = async (): Promise<string> => {
  const ai = getAI();
  if (!ai) return "VOCÊ NÃO FOI RÁPIDO O BASTANTE.";

  try {
    const model = (ai as any).getGenerativeModel({ model: "gemini-1.5-flash" });
    const response = await model.generateContent("O jogador foi pego pelo Slender Man na floresta. Escreva uma mensagem de morte curta e arrepiante em PORTUGUÊS.");
    return response.response.text() || "VOCÊ NÃO FOI RÁPIDO O BASTANTE.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "FIM DE JOGO";
  }
};
