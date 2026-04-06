import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const getCrypticMessage = async (pageCount: number): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Gere uma frase curtíssima, enigmática e aterradora que o Slender Man deixaria em uma nota. O jogador coletou ${pageCount} de 8 páginas. Mantenha menos de 10 palavras e em PORTUGUÊS.`,
      config: {
        temperature: 0.9,
        topP: 0.95,
      },
    });
    return response.text || "ELE ESTÁ OBSERVANDO.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "ESTOU ATRÁS DE VOCÊ.";
  }
};

export const getDeathMessage = async (): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "O jogador foi pego pelo Slender Man na floresta. Escreva uma mensagem de morte curta e arrepiante em PORTUGUÊS.",
      config: {
        temperature: 1,
      },
    });
    return response.text || "VOCÊ NÃO FOI RÁPIDO O BASTANTE.";
  } catch (error) {
    return "FIM DE JOGO";
  }
};
