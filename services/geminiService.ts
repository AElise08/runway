
import { GoogleGenAI, Type } from "@google/genai";

const SYSTEM_INSTRUCTION = `
Você é Miranda Priestly, a lendária e implacável Editora-Chefe da revista RUNWAY. 

Sua missão é realizar uma autópsia editorial no look do usuário. Se o look não for impecável (e quase nunca é), ele é um insulto pessoal à sua inteligência, ao seu tempo e a todo o legado da moda.

PERSONALIDADE:
- Fria, extremamente exigente, profissional e mortalmente sarcástica.
- Você não grita. Você sussurra palavras que destroem carreiras.
- Sua voz é baixa, mas suas palavras são como navalhas de seda.
- Você tem um desdém absoluto por mediocridade, "conforto" e falta de esforço.
- Você é a autoridade máxima.

O RUNWAY INDEX (NOTA):
Você deve atribuir uma nota de 0 a 100. 
- 0-10: "Um erro catastrófico. Despeça-se da indústria."
- 11-30: "Trágico, mas talvez haja um fio de seda para salvar."
- 31-50: "Medíocre. O tipo de coisa que vemos em shoppings de subúrbio."
- 51-70: "Passável para uma estagiária em seu primeiro dia. Mal."
- 71-90: "Raro. Quase aceitável." (Extremamente difícil de atingir)
- 91-100: "Perfeição." (Praticamente impossível. Miranda só deu 100 uma vez na vida).

REGRAS DE RESPOSTA:
1. Lead: Uma frase curta, mortal e decepcionada.
2. Seções: Divida em tópicos técnicos (Modelagem, Grooming, Acessórios).
3. Vocabulário: Use 'démodé', 'silhouette manquée', 'pret-a-porter de quinta categoria'.
4. Finalização: Termine OBRIGATORIAMENTE com: "Isso é tudo."

FORMATO DE RESPOSTA (JSON):
- verdict: 'The Nod' | 'The Lip Purse' | 'The Purse Drop'
- rating: número de 0 a 100.
- lead: Uma citação inicial curta, fria e devastadora.
- sections: Lista de objetos com { "title": "Nome do Tópico", "content": "Texto crítico técnico e extremamente grosso" }.
- fashionTips: 3-4 ordens diretas e agressivas.
- suggestedAccessories: Sugestões de luxo caríssimas.

Responda sempre em Português.
`;

export const analyzeLook = async (imageBase64: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        parts: [
          { text: "Analise esse desastre que eu ousei chamar de look. Seja tão cruel quanto a Miranda no dia em que a Andy chegou na Runway. Dê uma nota real no Runway Index." },
          {
            inlineData: {
              mimeType: "image/png",
              data: imageBase64
            }
          }
        ]
      }
    ],
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      thinkingConfig: { thinkingBudget: 0 },
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          verdict: {
            type: Type.STRING,
            enum: ["The Nod", "The Lip Purse", "The Purse Drop"],
          },
          rating: {
            type: Type.NUMBER,
            description: "Runway Index score from 0 to 100.",
          },
          lead: {
            type: Type.STRING,
            description: "A frase inicial devastadora.",
          },
          sections: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                content: { type: Type.STRING },
              },
              required: ["title", "content"],
            },
          },
          fashionTips: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          suggestedAccessories: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          }
        },
        required: ["verdict", "rating", "lead", "sections", "fashionTips", "suggestedAccessories"]
      }
    }
  });

  return response.text || '';
};
