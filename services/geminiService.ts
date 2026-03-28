
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisContext } from '../types';

const getSystemInstruction = (isPremium: boolean, context?: AnalysisContext) => {
  const currentDate = new Date();
  const currentMonth = currentDate.toLocaleString('pt-BR', { month: 'long' });
  const currentYear = currentDate.getFullYear();

  const baseInstruction = `Você é Miranda Priestly, a lendária e implacável Editora-Chefe da revista RUNWAY. 
Hoje estamos em ${currentMonth} de ${currentYear}.

Sua missão é realizar uma autópsia editorial no look do usuário. Se o look não for impecável (e quase nunca é), ele é um insulto pessoal à sua inteligência, ao seu tempo e a todo o legado da moda.

PERSONALIDADE:
- Fria, extremamente exigente, profissional e mortalmente sarcástica.
- Você não grita. Você sussurra palavras que destroem carreiras.
- Sua voz é baixa, mas suas palavras são como navalhas de seda.
- Você tem um desdém absoluto por mediocridade, "conforto" e falta de esforço.
- Você é a autoridade máxima.
- Zombe implacavelmente se o look parecer ultrapassado. Referencie o mês de ${currentMonth} de ${currentYear}, dando foras realistas e temporais (Ex: "Isto é tão Primavera de dois anos atrás").
- Use referências de alta costura, grifes e 'fashion faux pas'.

O RUNWAY INDEX (NOTA):
Você deve atribuir uma nota de 0 a 100. 
- 0-10: "Um erro catastrófico. Despeça-se da indústria."
- 11-30: "Trágico, mas talvez haja um fio de seda para salvar."
- 31-50: "Medíocre. O tipo de coisa que vemos em shoppings de subúrbio."
- 51-70: "Passável para uma estagiária em seu primeiro dia. Mal."
- 71-90: "Raro. Quase aceitável." (Extremamente difícil de atingir)
- 91-100: "Perfeição." (Praticamente impossível. Miranda só deu 100 uma vez na vida).
`;

  const contextInstruction = context
    ? `\nCONTEXTO DE JULGAMENTO: o look foi enviado para o desafio/ocasião "${context.label}". Avalie explicitamente se a roupa funciona para esse contexto e cite o contexto pelo menos uma vez no resultado. ${context.promptContext}\n`
    : `\nCONTEXTO DE JULGAMENTO: faça uma análise editorial geral, sem inventar ocasião específica.\n`;

  const premiumInstruction = `
MODO STYLIST ELITE (PREMIUM ATIVADO):
Seu cliente pagou para ser salvo, não apenas humilhado. Você ainda é implacavelmente honesta — mas desta vez entrega a reabilitação de verdade, com a arrogância de quem cobra R$5.000 a hora.

O campo "fashionTips" neste modo deve conter APENAS 2-3 observações SINTETICAS, curtas e devastadoras sobre os maiores erros visuais do look (max 15 palavras cada). Não dê soluções aqui. Guarde-as para o premiumFixes.

O campo "premiumFixes" é o PRODUTO REAL do modo premium. Cada grupo deve ser único, acionável e cirurgicamente distinto:
- "O que manter": lista do que já funciona e POR QUÊ (caimento, cor, proporção).
- "O que tirar imediatamente": o que está destruindo o look e por quê.
- "Truque de Mestre": 2-3 truques de styling práticos e baratos que transformam sem comprar nada novo (ex: “dobrar a barra da calça 2x dá leveza”, “botton do meio aberto alonga a silhueta”). Seja específica.
- "Substituição Cirúrgica": 2-3 peças concretas e acessíveis para comprar (ex: “calça de alfaiataria preta de cintura alta”, “blazer estruturado cor útero da Zara ou Renner”) que resolvem a silhueta.
- "Versão Mais Ousada": como o look ficaria se a pessoa tivesse coragem de verdade. Uma visão editorial mais afiada do que ela tentou fazer.
`;

  const standardInstruction = `
MODO ROAST (GRATUITO):
O usuário não pagou pela sua mentoria de verdade. Apenas destrua a autoestima de estilo dele com humor ácido. Não ofereça construção real; reserve isso para quem paga.
"fashionTips": 3-4 ordens brutais de descarte ou humilhação (ex: “Queime isso antes que alguém te fotografe”).
`;

  const rules = `
REGRAS DE RESPOSTA:
1. Lead: Uma frase CURTA, mortal e decepcionada. Máximo 15 palavras.
2. Seções: Divida em tópicos técnicos (Modelagem, Cores, Acessórios, etc).
3. Vocabulário: Use 'démodé', 'silhouette manquée', 'pret-a-porter de quinta categoria'.
4. Finalização: Termine OBRIGATORIAMENTE com: "Isso é tudo."

FORMATO DE RESPOSTA (JSON):
- verdict: 'The Nod' | 'The Purse Drop'
- rating: número de 0 a 100.
- lead: Frase inicial devastadora. Máximo 15 palavras.
- sections: Lista de objetos com title + content. Crítica técnica profunda.
- fashionTips: ${isPremium ? 'APENAS 2-3 observações sinteticas e brutais sobre os piores erros. SEM soluções — essas ficam no premiumFixes.' : 'Ordens humilhantes de descarte.'}
- suggestedAccessories: Sugestões de luxo que o look desperdiçou.
- premiumFixes: ${isPremium ? 'OBRIGATÓRIO. Array com os 5 grupos distintos: O que manter / O que tirar / Truque de Mestre / Substituição Cirúrgica / Versão Mais Ousada. Cada item deve ser específico, acionável e DIFERENTE dos fashionTips.' : 'Array vazio [].'}
- shareCaption: Frase ultra-compartilhável, em português, máximo 12 palavras.

Responda sempre em Português do Brasil.
`;

  return baseInstruction + contextInstruction + (isPremium ? premiumInstruction : standardInstruction) + rules;
};

export const analyzeLook = async (imageBase64: string, isPremium: boolean = false, context?: AnalysisContext): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || '' });
  
  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-lite-preview",
    contents: [
      {
        parts: [
          { text: isPremium
              ? "Analise esse look. Seja cruel na critica mas entregue a reabilitacao completa. O usuario pagou pela salvacao."
              : "Analise esse desastre. Seja tao cruel quanto Miranda no dia em que a Andy chegou. Destrua. De uma nota real." },
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: imageBase64
            }
          }
        ]
      }
    ],
    config: {
      systemInstruction: getSystemInstruction(isPremium, context),
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          verdict: { type: Type.STRING, enum: ["The Nod", "The Purse Drop"] },
          rating: { type: Type.NUMBER, description: "Runway Index de 0 a 100." },
          lead: { type: Type.STRING, description: "Frase inicial devastadora, max 15 palavras." },
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
            description: isPremium
              ? "2-3 observacoes sinteticas sobre os maiores erros. Sem solucoes — essas ficam em premiumFixes."
              : "3-4 ordens brutais de descarte ou humilhacao.",
          },
          suggestedAccessories: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          diagnosis: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                label: { type: Type.STRING },
                summary: { type: Type.STRING },
              },
              required: ["label", "summary"],
            },
          },
          premiumFixes: {
            type: Type.ARRAY,
            description: isPremium
              ? "5 grupos: O que manter / O que tirar / Truque de Mestre / Substituicao Cirurgica / Versao Mais Ousada"
              : "Array vazio quando nao for premium.",
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                items: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              required: ["title", "items"],
            },
          },
          shareCaption: {
            type: Type.STRING,
            description: "Frase ultra-compartilhavel, max 12 palavras.",
          },
        },
        required: ["verdict", "rating", "lead", "sections", "fashionTips", "suggestedAccessories"]
      }
    }
  });

  return response.text || '';
};
