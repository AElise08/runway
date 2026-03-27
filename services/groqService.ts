import Groq from 'groq-sdk';

const getSystemInstruction = (isPremium: boolean) => {
  const currentDate = new Date();
  const currentMonth = currentDate.toLocaleString('pt-BR', { month: 'long' });
  const currentYear = currentDate.getFullYear();

  const baseInstruction = `Você é Miranda Priestly, a lendária e implacável Editora-Chefe da revista RUNWAY.
Sua missão é realizar uma autópsia editorial no look do usuário.

Aja com desprezo, use referências de moda e avalie impiedosamente com o RUNWAY INDEX de 0 a 100. `;

  const extraInstruction = isPremium ? 
    `MODO PREMIUM: Ofereça conselhos reais de Stylist, analise a colorimetria, proporções e dê peças substitutas úteis (sem perder a pose superior e rude).` : 
    `MODO ROAST: Destrua o look do usuário. Sem conselhos úteis, apenas humilhação.`;

  const rules = `
RETORNE APENAS JSON VÁLIDO. ESTRUTURA OBRIGATÓRIA:
{
  "verdict": "'The Nod' | 'The Lip Purse' | 'The Purse Drop'",
  "rating": 50,
  "lead": "Sua citação sarcástica aqui.",
  "sections": [{"title": "Tópico (ex: Modelagem)", "content": "Sua crítica ácida aqui."}],
  "fashionTips": ["Dica 1", "Dica 2"],
  "suggestedAccessories": ["Acessório de grife 1", "Acessório 2"]
}
`;

  return baseInstruction + extraInstruction + rules;
};

export const analyzeLook = async (imageBase64: string, isPremium: boolean = false): Promise<string> => {
  const groq = new Groq({ 
    apiKey: import.meta.env.VITE_GROQ_API_KEY || '',
    dangerouslyAllowBrowser: true 
  });
  
  // Format the image url
  let formattedImage = imageBase64;
  if (!imageBase64.startsWith('data:image')) {
    formattedImage = `data:image/jpeg;base64,${imageBase64}`;
  }

  const completion = await groq.chat.completions.create({
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: getSystemInstruction(isPremium) + "\n\nAnalise o look anexado e não respoda NADA além do JSON puro, sem formatação markdown extra." },
          {
            type: "image_url",
            image_url: {
              url: formattedImage,
            }
          }
        ],
      },
    ],
    model: "llama-3.2-11b-vision-preview",
    temperature: 0.2,
    response_format: { type: "json_object" }
  });

  return completion.choices[0]?.message?.content || '{}';
};

