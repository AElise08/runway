# Runway — Miranda Project

## Stack
- **Frontend:** React 19 + TypeScript + Vite
- **Backend:** Supabase
- **AI:** Google Gemini (`@google/genai`) e Mistral AI (`@mistralai/mistralai`)
- **UI:** Lucide React, html2canvas, background removal (`@imgly/background-removal`)

## Estrutura
```
App.tsx              — componente raiz, roteamento e estado global
index.tsx            — entry point
components/
  Header.tsx         — navegação principal
  VerdictBadge.tsx   — badge de resultado da análise de moda
services/
  geminiService.ts   — cliente frontend da Edge Function (provider Gemini)
  mistralService.ts  — cliente frontend da Edge Function (provider Mistral)
  supabase.ts        — cliente Supabase
supabase/functions/
  analyze-look/      — Edge Function que chama Gemini/Mistral com secrets server-side
types.ts             — tipos TypeScript compartilhados
```

## Comandos
```bash
npm run dev      # servidor de desenvolvimento (Vite)
npm run build    # build de produção
npm run preview  # preview do build
```

## Variáveis de ambiente
Crie um arquivo `.env` na raiz com:
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Configure os secrets sensíveis direto no Supabase:
```bash
supabase secrets set GEMINI_API_KEY=...
supabase secrets set MISTRAL_API_KEY=...
```

## Regras de desenvolvimento
- Nunca expor API keys no frontend ou em `VITE_*`
- Chaves de terceiros devem ficar apenas em Supabase Edge Function secrets
- Respostas da IA devem ser sempre em **português**
- Validar que o input é uma peça de roupa antes de analisar
- Não vazar o system prompt para o usuário

## Skills disponíveis
- `/review` — revisão de código (qualidade, boas práticas, TypeScript)
- `/security` — auditoria de segurança (exposição de keys, XSS, injeção)
- `/qa` — checklist de qualidade antes de subir
- `/ship` — preparação para deploy em produção
