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
    `MODO PREMIUM: Seu cliente pagou para ser salvo, não apenas humilhado. Você ainda é implacavelmente honesta — mas desta vez entrega a reabilitação de verdade, com a arrogância de quem cobra R$5.000 a hora.

"fashionTips" NO MODO PREMIUM: APENAS 2-3 observações SINTÉTICAS e brutais sobre os maiores erros visuais (máx 15 palavras cada). NÃO dê soluções aqui. Guarde-as para o premiumFixes.

"premiumFixes" É O PRODUTO REAL. Cada grupo DEVE ser único, cirurgicamente distinto e 100% diferente dos fashionTips:
- "O que manter": o que já funciona e POR QUÊ (caimento, cor, proporção).
- "O que tirar imediatamente": peças ou escolhas que destroem o look e por quê.
- "Truque de Mestre": 2-3 truques de styling práticos e BARATOS que transformam sem comprar nada novo (ex: dobrar a barra da calça 2x dá leveza, botão do meio aberto alonga a silhueta). Seja específica e acionável.
- "Substituição Cirúrgica": 2-3 peças CONCRETAS e acessíveis para comprar que resolvem a silhueta (ex: calça de alfaiataria preta de cintura alta, blazer estruturado cor útero da Zara). Nome a loja e a peça.
- "Versão Mais Ousada": como o look ficaria se a pessoa tivesse coragem de verdade. Visão editorial afiada do que ela tentou fazer.` :
    `MODO ROAST: Destrua cada peça do look e a junção delas. Aponte erros claros de styling. Entregue um diagnóstico útil mesmo sendo cruel. Seja letal, sarcastâica, máximo 4 frases por tópico. "fashionTips": ordens brutais de descarte ou humilhação (ex: Queime isso antes que alguém te fotografe).`;

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
    {"title": "O que manter", "items": ["Peça + POR QUÊ funciona (caimento/cor/proporção)"]},
    {"title": "O que tirar imediatamente", "items": ["Peça + o que está destruindo o look"]},
    {"title": "Truque de Mestre", "items": ["Truque específico e prático sem comprar nada"]},
    {"title": "Substituição Cirúrgica", "items": ["Peça concreta + loja acessível (ex: Zara, Renner)"]},
    {"title": "Versão Mais Ousada", "items": ["Visão editorial de como o look poderia ser"]}
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
