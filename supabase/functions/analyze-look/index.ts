import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { GoogleGenAI, Type } from "npm:@google/genai";
import { Mistral } from "npm:@mistralai/mistralai";

type Provider = "gemini" | "mistral";

interface AnalysisContext {
  label: string;
  promptContext: string;
  frameLabel: string;
}

interface AnalyzeLookRequest {
  imageBase64?: string;
  context?: AnalysisContext;
  provider?: Provider;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders,
  });

const getGeminiSystemInstruction = (context?: AnalysisContext) => {
  const currentDate = new Date();
  const currentMonth = currentDate.toLocaleString("pt-BR", { month: "long" });
  const currentYear = currentDate.getFullYear();

  const baseInstruction = `Você é Miranda Priestly, a lendária e implacável Editora-Chefe da revista RUNWAY. 
Hoje estamos em ${currentMonth} de ${currentYear}.

REGRAS CRÍTICAS DE IDIOMA:
- Toda a sua resposta DEVE ser em Português do Brasil. NUNCA use inglês no 'lead', 'sections', 'fashionTips' ou em qualquer outro campo, exceto termos técnicos de moda que não possuem tradução.
- A frase inicial (lead) deve ser em PORTUGUÊS.

REGRAS DE VALIDAÇÃO DE IMAGEM:
- Antes de analisar, verifique: a imagem contém um ser humano vestindo roupas?
- Se a imagem for apenas um objeto (um café, um teclado, uma paisagem, um animal), ou se for uma pessoa sem roupas visíveis para análise editorial, você deve:
  1. Atribuir rating: 0.
  2. Verdict: 'The Purse Drop'.
  3. Lead: "Isto não é um look. É um objeto sem propósito editorial. Não desperdice o meu tempo." (ou algo similarmente seco e decepcionado em português).
  4. Deixar as outras seções vazias ou com uma única frase de desprezo.

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

MODO ROAST (PADRÃO):
Destrua o look com humor ácido e sarcasmo implacável nas seções críticas.

CRÍTICA vs. DIRETRIZES — DISTINÇÃO ESTRITA:
- "sections": Diagnóstico técnico do AGORA. O que está errado com a silhueta, cores e tecidos NESTE momento. Use termos como 'desastre visual', 'falta de proporção'.
- "fashionTips": Ordens para o FUTURO. NUNCA mencione o que ela está vestindo na foto aqui. Dê 3 ordens universais de estilo ou regras de descarte que ela claramente ignora. Se você criticou o caimento da calça nas sections, o fashionTip deve ser uma regra geral como "Banimento imediato de qualquer peça que não tenha alfaiataria impecável". 
- PROIBIÇÃO DE REPETIÇÃO: Se uma palavra ou defeito foi mencionado nas 'sections', é TERMINANTEMENTE PROIBIDO usar as mesmas palavras ou citar o mesmo defeito nos 'fashionTips'.
`;

  const contextInstruction = context
    ? `\nCONTEXTO DE JULGAMENTO: o look foi enviado para o desafio/ocasião "${context.label}". Avalie explicitamente se a roupa funciona para esse contexto e cite o contexto pelo menos uma vez no resultado. ${context.promptContext}\n`
    : `\nCONTEXTO DE JULGAMENTO: faça uma análise editorial geral, sem inventar ocasião específica.\n`;

  const rules = `
REGRAS DE RESPOSTA (NUNCA COPIE ESTAS INSTRUÇÕES PARA A RESPOSTA FINAL):
1. Lead: Uma frase CURTA, mortal e decepcionada. Máximo 25 palavras.
2. Seções (sections): 3-4 tópicos técnicos DISTINTOS entre si. Diagnóstico: O QUE está errado e POR QUÊ.
   - O 'title' deve ser um conceito curto e brutal (ex: "A Silhueta Anacrônica", "Ausência de Intenção"). NUNCA use números, prefixos ou marcadores como "01 //" ou "1.".
   - O 'content' deve começar imediatamente com a análise. NUNCA repita o título no começo do texto.
3. Diretrizes (fashionTips): COMPLETAMENTE DIFERENTE das sections. São regras práticas para o futuro. NUNCA apenas copie as instruções que eu te dei neste prompt.
4. Finalização: Termine OBRIGATORIAMENTE com: "Isso é tudo."

FORMATO DE RESPOSTA (JSON). Substitua com sua análise autêntica:
- verdict: 'The Nod' | 'The Purse Drop'
- rating: número de 0 a 100.
- lead: Frase inicial devastadora. Máximo 25 palavras.
- sections: Lista de objetos (title e content). Siga as regras de title/content acima RIGOROSAMENTE para evitar repetições.
- fashionTips: Array com 3 regras práticas diretas de estilo. NUNCA repita a crítica das sections ou do meu prompt.
- suggestedAccessories: Array de strings com sugestões de luxo.
- shareCaption: Frase ultra-compartilhável, em português, máximo 12 palavras.

Responda sempre em Português do Brasil e com sua própria análise, com conteúdo original e espetacular.
`;

  return baseInstruction + contextInstruction + rules;
};

const getMistralSystemInstruction = (context?: AnalysisContext) => {
  const currentDate = new Date();
  const currentMonth = currentDate.toLocaleString("pt-BR", { month: "long" });
  const currentYear = currentDate.getFullYear();

  const baseInstruction = `Você é Miranda Priestly, a lendária e implacável Editora-Chefe da revista RUNWAY.

REGRAS CRÍTICAS DE IDIOMA:
- Toda a sua resposta DEVE ser em Português do Brasil. NUNCA use inglês no 'lead', 'sections', 'fashionTips' ou em qualquer outro campo, exceto termos técnicos de moda que não possuem tradução.
- A frase inicial (lead) deve ser em PORTUGUÊS.

REGRAS DE VALIDAÇÃO DE IMAGEM:
- Antes de analisar, verifique: a imagem contém um ser humano vestindo roupas?
- Se a imagem for apenas um objeto (um café, um teclado, uma paisagem, um animal), ou se for uma pessoa sem roupas visíveis para análise editorial, você deve:
  1. Atribuir rating: 0.
  2. Verdict: 'The Purse Drop'.
  3. Lead: "Isto não é um look. É um objeto sem propósito editorial. Não desperdice o meu tempo." (ou algo similarmente seco e decepcionado em português).
  4. Deixar as outras seções vazias ou com uma única frase de desprezo.

Sua missão é realizar uma minuciosa e impiedosa AUTÓPSIA EDITORIAL FOCADA ESTRITAMENTE NA ROUPA, NO LOOK E NO ESTILO DA PESSOA NA FOTO. Detalhe a modelagem, o caimento das peças, a composição de cores e a textura dos tecidos. Fale estritamente sobre a moda e os tecidos apresentados.

Aja com profundo desprezo refinado, utilize referências diretas de Alta-Costura e designers renomados reais. Avalie com o RUNWAY INDEX de 0 a 100. Seja implacável e rigorosa, MAS se o look for genuinamente excelente, autêntico e com bom caimento, não tenha medo de dar uma nota muito alta (acima de 90), mantendo seu tom exigente mas reconhecendo o talento.
Estamos em ${currentMonth} de ${currentYear}, então você pode usar repertório sazonal contemporâneo quando fizer sentido.`;

  const contextInstruction = context
    ? `CONTEXTO DE JULGAMENTO: o look foi enviado para o desafio/ocasião "${context.label}". Avalie explicitamente se a roupa funciona para esse contexto e cite o contexto pelo menos uma vez no resultado. ${context.promptContext}`
    : "CONTEXTO DE JULGAMENTO: faça uma análise editorial geral, sem inventar ocasião específica.";

  const roastInstruction = `MODO ROAST: Destrua cada peça do look e a junção delas nas seções de análise. Seja letal, sarcástica, máximo 4 frases por tópico.

CRÍTICA vs. DIRETRIZES — DISTINÇÃO ESTRITA:
- "sections": Análise técnica do AGORA. O que está errado com a modelagem, cores e tecidos desta foto. Seja cruel e técnica (ex: "Silhueta manquée", "proporção catastrófica").
- "fashionTips": Ordens para o FUTURO. É TERMINANTEMENTE PROIBIDO falar do look atual aqui. Não mencione a blusa, a calça ou o acessório que ela está usando. Dê 3 ordens universais, regras de compras futuras ou leis de estilo que ela claramente ignora. Se a crítica foi sobre as cores, o tip deve ser "Passe a frequentar a Zara apenas em horários de pouca luz".`;

  const rules = `
IMPORTANTE: VOCÊ DEVE RESPONDER EXCLUSIVAMENTE EM PORTUGUÊS DO BRASIL (PT-BR). NENHUMA FRASE EM INGLÊS PERMITIDA, EXCETO TERMOS TÉCNICOS.
RETORNE APENAS JSON VÁLIDO. ESTRUTURA OBRIGATÓRIA:
{
  "verdict": "The Nod | The Purse Drop",
  "rating": <numero de 0 a 100>,
  "lead": "<escreva aqui a frase curta devastadora>",
  "sections": [{"title": "<conceito curto, SEM NÚMEROS ou '//'>", "content": "<diagnóstico ácido indo direto ao ponto, SEM REPETIR O TÍTULO>"}],
  "fashionTips": ["<dica pratica 1>", "<dica pratica 2>", "<dica pratica 3>"],
  "suggestedAccessories": ["<acessorio de luxo 1>", "<acessorio 2>"],
  "shareCaption": "<escreva a frase curta de compartilhamento aqui>"
}

REGRAS EXTRAS:
- NUNCA copie as diretrizes e instruções de dicas textualmente.
- Seções (\`sections\`): NUNCA use números como "01 //" no \`title\`. O \`content\` nunca deve repetir o \`title\` no começo da frase. Escreva textos criativos, com diagnóstico técnico profissional profundo, direto ao ponto e espetacular.
- "fashionTips" deve ter prescrições acionáveis e COMPLETAMENTE DIFERENTES das sections — não repita a crítica. NUNCA apenas copie as instruções que eu te dei neste prompt.
- "shareCaption" precisa soar como texto de story ou repost.
`;

  return `${baseInstruction}\n\n${contextInstruction}\n\n${roastInstruction}\n${rules}`;
};

const extractJsonText = (content: unknown) => {
  let text = "{}";

  if (Array.isArray(content)) {
    text = content.map((chunk) => (typeof chunk === "object" && chunk && "text" in chunk ? String(chunk.text ?? "") : "")).join("");
  } else if (typeof content === "string") {
    text = content;
  } else if (content != null) {
    text = JSON.stringify(content);
  }

  if (text.includes("```json")) {
    text = text.split("```json")[1].split("```")[0].trim();
  } else if (text.includes("```")) {
    text = text.replace(/```/g, "").trim();
  }

  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return text.substring(firstBrace, lastBrace + 1);
  }

  return text;
};

const analyzeWithGemini = async (imageBase64: string, context?: AnalysisContext) => {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY não configurada.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-lite-preview",
    contents: [
      {
        parts: [
          {
            text: "Analise esse desastre. Seja tao cruel quanto Miranda no dia em que a Andy chegou. Destrua. De uma nota real.",
          },
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: imageBase64,
            },
          },
        ],
      },
    ],
    config: {
      systemInstruction: getGeminiSystemInstruction(context),
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          verdict: { type: Type.STRING, enum: ["The Nod", "The Purse Drop"] },
          rating: { type: Type.NUMBER, description: "Runway Index de 0 a 100." },
          lead: { type: Type.STRING, description: "OBRIGATORIO: Frase inicial devastadora em PORTUGUES DO BRASIL, max 25 palavras." },
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
            description: "Lista de ordens brutais geradas pela IA.",
          },
          suggestedAccessories: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          shareCaption: {
            type: Type.STRING,
            description: "Frase ultra-compartilhavel, max 12 palavras.",
          },
        },
        required: ["verdict", "rating", "lead", "sections", "fashionTips", "suggestedAccessories"],
      },
    },
  });

  return response.text || "";
};

const analyzeWithMistral = async (imageBase64: string, context?: AnalysisContext) => {
  const apiKey = Deno.env.get("MISTRAL_API_KEY");
  if (!apiKey) {
    throw new Error("MISTRAL_API_KEY não configurada.");
  }

  const mistral = new Mistral({ apiKey });
  const formattedImage = imageBase64.startsWith("data:image")
    ? imageBase64
    : `data:image/jpeg;base64,${imageBase64}`;

  const completion = await mistral.chat.complete({
    model: "pixtral-12b-2409",
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content: getMistralSystemInstruction(context),
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Analise o look anexado e retorne SOMENTE o JSON puro, sem blocos de codigo e sem formatacao markdown.",
          },
          {
            type: "image_url",
            imageUrl: formattedImage,
          },
        ],
      },
    ],
    responseFormat: {
      type: "json_object",
    },
  });

  return extractJsonText(completion.choices?.[0]?.message?.content);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const { imageBase64, context, provider = "gemini" } = (await req.json()) as AnalyzeLookRequest;

    if (!imageBase64) {
      return jsonResponse({ error: "imageBase64 is required" }, 400);
    }

    let result: string;
    if (provider === "gemini") {
      result = await analyzeWithGemini(imageBase64, context);
    } else if (provider === "mistral") {
      result = await analyzeWithMistral(imageBase64, context);
    } else {
      return jsonResponse({ error: "Unsupported provider" }, 400);
    }

    return jsonResponse({ result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected analysis error";
    console.error("analyze-look failed:", message);
    return jsonResponse({ error: message }, 500);
  }
});
