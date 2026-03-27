import { Mistral } from '@mistralai/mistralai';
import { AnalysisContext } from '../types';

const getSystemInstruction = (isPremium: boolean, context?: AnalysisContext) => {
  const currentDate = new Date();
  const currentMonth = currentDate.toLocaleString('pt-BR', { month: 'long' });
  const currentYear = currentDate.getFullYear();

  const baseInstruction = `Você é Miranda Priestly, a lendária e implacável Editora-Chefe da revista RUNWAY.
Sua missão é realizar uma minuciosa e impiedosa AUTÓPSIA EDITORIAL FOCADA ESTRITAMENTE NA ROUPA, NO LOOK E NO ESTILO DA PESSOA NA FOTO. Detalhe a modelagem, o caimento das peças, a composição de cores e a textura dos tecidos. Fale estritamente sobre a moda e os tecidos apresentados.

Aja com profundo desprezo refinado, utilize referências diretas de Alta-Costura e designers renomados reais. Avalie implacavelmente com o RUNWAY INDEX de 0 a 100.
Estamos em ${currentMonth} de ${currentYear}, então você pode usar repertório sazonal contemporâneo quando fizer sentido.`;

  const contextInstruction = context
    ? `CONTEXTO DE JULGAMENTO: o look foi enviado para o desafio/ocasião "${context.label}". Avalie explicitamente se a roupa funciona para esse contexto e cite o contexto pelo menos uma vez no resultado. ${context.promptContext}`
    : `CONTEXTO DE JULGAMENTO: faça uma análise editorial geral, sem inventar ocasião específica.`;

  const extraInstruction = isPremium ? 
    `MODO PREMIUM: Ofereça conselhos reais e detalhados de Stylist sobre como consertar esse desastre fashion. Analise caimento, harmonia de cores, tecidos e adequação à ocasião. Dê peças substitutas reais e específicas (sem perder a superioridade). Monte uma reabilitação prática com o que manter, o que tirar, o que substituir e uma versão mais ousada.` : 
    `MODO ROAST: Destrua cada peça do look e a junção delas. Aponte erros claros de styling (caimento errado, tecido ou silhueta malfeita). Entregue um diagnóstico útil mesmo sendo cruel. Seja letal, sarcástica e com textos curtos e impactantes de no máximo 4 frases por tópico.`;

  const rules = `
IMPORTANTE: VOCÊ DEVE RESPONDER EXCLUSIVAMENTE EM PORTUGUÊS DO BRASIL (PT-BR). NENHUMA FRASE EM INGLÊS PERMITIDA, EXCETO TERMOS TÉCNICOS.
RETORNE APENAS JSON VÁLIDO. ESTRUTURA OBRIGATÓRIA:
{
  "verdict": "The Nod | The Purse Drop",
  "rating": 50,
  "lead": "Sua citação sarcástica em PORTUGUÊS aqui, MENCIONANDO de forma dramática a NOTA (rating de 0 a 100) que o look recebeu. Ex: 'Um desastre de 23 pontos...'",
  "sections": [{"title": "Tópico em português", "content": "Sua crítica ácida aqui."}],
  "fashionTips": ["Dica 1", "Dica 2"],
  "suggestedAccessories": ["Acessório de grife 1", "Acessório 2"],
  "diagnosis": [
    {"label": "Silhueta", "summary": "Resumo direto e cruel."},
    {"label": "Cores", "summary": "Resumo direto e cruel."},
    {"label": "Ocasião", "summary": "Diga se funciona para o desafio informado."}
  ],
  "premiumFixes": [
    {"title": "O que manter", "items": ["Item 1", "Item 2"]},
    {"title": "O que tirar", "items": ["Item 1"]},
    {"title": "O que substituir", "items": ["Item 1"]},
    {"title": "Versão mais ousada", "items": ["Item 1"]}
  ],
  "shareCaption": "Frase curta e altamente compartilhável, em português, com no máximo 12 palavras."
}

REGRAS EXTRAS:
- "diagnosis" deve ter entre 3 e 4 itens.
- "premiumFixes" deve vir vazio [] quando o modo não for premium.
- "fashionTips" deve ter dicas acionáveis e específicas.
- "shareCaption" precisa soar como texto de story ou repost.
`;

  return `${baseInstruction}\n\n${contextInstruction}\n\n${extraInstruction}\n${rules}`;
};

export const analyzeLook = async (
  imageBase64: string,
  isPremium: boolean = false,
  context?: AnalysisContext
): Promise<string> => {
  try {
    const mistral = new Mistral({
      apiKey: import.meta.env.VITE_MISTRAL_API_KEY || ''
    });
    
    let formattedImage = imageBase64;
    if (!imageBase64.startsWith('data:image')) {
      formattedImage = `data:image/jpeg;base64,${imageBase64}`;
    }

    const completion = await mistral.chat.complete({
      model: "pixtral-12b-2409",
      temperature: 0.2,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: getSystemInstruction(isPremium, context) + "\n\nAnalise o look anexado e retorne SOMENTE o JSON puro, sem blocos de codigo e sem formatacao markdown." },
            { type: "image_url", imageUrl: formattedImage }
          ]
        }
      ],
      responseFormat: {
        type: "json_object",
      },
    });

    let content = completion.choices?.[0]?.message?.content || '{}';
    
    if (typeof content !== 'string') {
       content = JSON.stringify(content);
    }
    
    if (content.includes('```json')) {
      content = content.split('```json')[1].split('```')[0].trim();
    } else if (content.includes('```')) {
      content = content.replace(/```/g, '').trim();
    }
    
    const firstBrace = content.indexOf('{');
    const lastBrace = content.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      content = content.substring(firstBrace, lastBrace + 1);
    }

    return content;
  } catch (error) {
    console.error("Erro na Mistral:", error);
    throw error;
  }
};
