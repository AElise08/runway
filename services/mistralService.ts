import { Mistral } from '@mistralai/mistralai';
import { AnalysisContext } from '../types';

export const analyzeLook = async (
  imageBase64: string,
  context?: AnalysisContext
): Promise<string> => {
  const apiKey = import.meta.env.VITE_MISTRAL_API_KEY;
  if (!apiKey) {
    throw new Error('Chave VITE_MISTRAL_API_KEY não configurada.');
  }

  const client = new Mistral({ apiKey });
  
  const systemPrompt = `Você é Miranda Priestly de O Diabo Veste Prada. 
Analise este look com severidade extrema, jargões de moda e zero empatia.
Responda EXCLUSIVAMENTE com o seguinte JSON valid:
{
  "verdict": "The Nod" ou "The Purse Drop",
  "rating": número de 0 a 100,
  "lead": "Frase de efeito seca",
  "shareCaption": "Legenda de instagram humilhante",
  "sections": [{"title": "Nome seco", "content": "Análise impiedosa"}],
  "fashionTips": ["Dica de correção 1"],
  "suggestedAccessories": ["Bolsa adequada, etc"]
}
Contexto do desafio: ${context?.promptContext || 'Julgamento Livre'}
`;

  try {
    const response = await client.chat.complete({
      model: "pixtral-12b-2409",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: systemPrompt },
            { type: "image_url", imageUrl: `data:image/jpeg;base64,${imageBase64}` }
          ]
        }
      ],
      responseFormat: { type: 'json_object' }
    });

    const result = response.choices?.[0]?.message?.content;
    if (!result || typeof result !== 'string') {
      throw new Error('Sem resposta válida do Mistral.');
    }
    return result;
  } catch (error) {
    console.error('Erro na análise da imagem (Mistral):', error);
    throw error;
  }
};
