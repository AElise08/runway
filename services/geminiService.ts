import { GoogleGenAI } from '@google/genai';
import { AnalysisContext } from '../types';

export const analyzeLook = async (
  imageBase64: string,
  context?: AnalysisContext
): Promise<string> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Chave VITE_GEMINI_API_KEY não configurada.');
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const systemPrompt = `Você é Miranda Priestly do filme O Diabo Veste Prada.
Sua tarefa é analisar o look fornecido na imagem de forma curta, direta, severa e fashionista.
Seja cruelmente sincera, usando ironia e jargão de alta moda.
Devolva uma resposta em JSON com a estrutura exata:
{
  "verdict": "The Nod" (se for aceitável) ou "The Purse Drop" (se for horrível),
  "rating": número de 0 a 100,
  "lead": "Uma frase de efeito matadora",
  "coverHeadline": "Manchete de capa de revista, 4 a 8 palavras, impactante e cruel. Ex: Demitida Antes Do Café, Milagre Couture Inesperado",
  "coverSubline": "Frase secundária curta, máximo 12 palavras. Complementa a manchete. Ex: O look que fez Miranda suspirar de decepção",
  "shareCaption": "Uma frase curta para story no instagram, bem humilhante",
  "sections": [{"title": "O Desastre", "content": "Descrição"}],
  "fashionTips": ["Dica 1 cruel", "Dica 2 seca"],
  "suggestedAccessories": ["Acessório 1 salva-vidas"]
}
Contexto do desafio: ${context?.promptContext || 'Julgamento Livre'}
`;

  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
            { role: 'user', parts: [
              { text: systemPrompt },
              { inlineData: { data: imageBase64, mimeType: 'image/jpeg' } }
            ]}
        ],
        config: {
            responseMimeType: 'application/json'
        }
    });

    if (!response.text) {
      throw new Error('Sem resposta do Gemini.');
    }
    return response.text;
  } catch (error) {
    console.error('Erro na análise da imagem (Gemini):', error);
    throw error;
  }
};
