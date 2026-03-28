import { Mistral } from '@mistralai/mistralai';
import { AnalysisContext } from '../types';

const getSystemInstruction = (isPremium: boolean, context?: AnalysisContext) => {
  const currentDate = new Date();
  const currentMonth = currentDate.toLocaleString('pt-BR', { month: 'long' });
  const currentYear = currentDate.getFullYear();

  const baseInstruction = `Você é Miranda Priestly, a lendária e implacável Editora-Chefe da revista RUNWAY.
Sua missão é realizar uma minuciosa e impiedosa AUTÓPSIA EDITORIAL FOCADA ESTRITAMENTE NA ROUPA, NO LOOK E NO ESTILO DA PESSOA NA FOTO. Detalhe a modelagem, o caimento das peças, a composição de cores e a textura dos tecidos. Fale estritamente sobre a moda e os tecidos apresentados.

Aja com profundo desprezo refinado, utilize referências diretas de Alta-Costura e designers renomados reais. Avalie com o RUNWAY INDEX de 0 a 100. Seja implacável e rigorosa, MAS se o look for genuinamente excelente, autêntico e com bom caimento, não tenha medo de dar uma nota muito alta (acima de 90), mantendo seu tom exigente mas reconhecendo o talento.
Estamos em ${currentMonth} de ${currentYear}, então você pode usar repertório sazonal contemporâneo quando fizer sentido.`;

  const contextInstruction = context
    ? `CONTEXTO DE JULGAMENTO: o look foi enviado para o desafio/ocasião "${context.label}". Avalie explicitamente se a roupa funciona para esse contexto e cite o contexto pelo menos uma vez no resultado. ${context.promptContext}`
    : `CONTEXTO DE JULGAMENTO: faça uma análise editorial geral, sem inventar ocasião específica.`;

  const extraInstruction = isPremium ? 
    `MODO PREMIUM: Ofereça conselhos reais e táticos de Stylist sobre como consertar ou melhorar o look. FOCO ABSOLUTO EM TRUQUES DE STYLING SIMPLES E BARATOS que revolucionam a silhueta (ex: dobrar uma manga, prender parte da blusa, adicionar um cinto básico, mudar a proporção). Ao sugerir peças substitutas, dê alternativas simples e acessíveis que quase todo mundo tem no guarda-roupa, sem exigir a compra de peças caríssimas. Monte uma reabilitação prática com o que manter, o que tirar, truques de styling ou peças acessíveis, e uma versão mais ousada.` : 
    `MODO ROAST: Destrua cada peça do look e a junção delas. Aponte erros claros de styling (caimento errado, tecido ou silhueta malfeita). Entregue um diagnóstico útil mesmo sendo cruel. Seja letal, sarcástica e com textos curtos e impactantes de no máximo 4 frases por tópico.`;

  const rules = `
IMPORTANTE: VOCÊ DEVE RESPONDER EXCLUSIVAMENTE EM PORTUGUÊS DO BRASIL (PT-BR). NENHUMA FRASE EM INGLÊS PERMITIDA, EXCETO TERMOS TÉCNICOS.
RETORNE APENAS JSON VÁLIDO. ESTRUTURA OBRIGATÓRIA:
{
  "verdict": "The Nod | The Purse Drop",
  "rating": 50,
  "lead": "Sua citação sarcástica em PORTUGUÊS aqui, MENCIONANDO de forma dramática a NOTA (rating de 0 a 100) que o look recebeu. DEVE SER UMA FRASE ÚNICA, CURTA E DE ALTO IMPACTO MÁXIMO 15 PALAVRAS. Ex: 'Um pesadelo previsível que machucou meus olhos. 23 pontos.'",
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
    {"title": "Truque de Mestre (Simples e Acessível)", "items": ["Truque de styling 1", "Peça básica substituta 2"]},
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
    
    // As of Mistral SDK v1.x, content can be an array of ContentChunks
    if (Array.isArray(content)) {
      content = content.map((c: any) => c.text || '').join('');
    } else if (typeof content !== 'string') {
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
