# Runway Lumes

Runway Lumes is a React/Vite fashion critique app inspired by the Runway/Miranda editorial persona. The user uploads or captures a look, picks a challenge context, receives a harsh Portuguese critique from an AI model, and can export/share a magazine-cover style result.

## Current Stack

- React 19 + TypeScript + Vite
- Tailwind-style utility classes through the loaded runtime CSS in `index.html`
- `lucide-react` for icons
- `html2canvas` for cover export/share images
- Google Gemini as the primary AI provider
- Mistral Pixtral as the fallback AI provider

## Important Files

- `App.tsx`: main experience, state machine, camera/upload flow, local daily limit, result rendering, export/share logic, and most UI copy.
- `services/geminiService.ts`: primary image analysis call using `gemini-2.5-flash`.
- `services/mistralService.ts`: fallback image analysis call using `pixtral-12b-2409`.
- `types.ts`: shared result/context types expected from the AI response.
- `components/Header.tsx`: top navigation/header.
- `components/VerdictBadge.tsx`: verdict pill styling.
- `public/`: visual assets used by the app.
- `vite.config.ts`: dev server config and env injection.

## Local Setup

```bash
npm install
npm run dev
```

The dev server is configured for port `3000` and host `0.0.0.0`.

For a production build:

```bash
npm run build
```

## Environment Variables

The current code reads these values through Vite's `define` config:

```env
GEMINI_API_KEY=your_gemini_key
MISTRAL_API_KEY=your_mistral_key
```

Important: this means the current frontend bundle can expose provider keys. For production, move AI calls behind a backend or Supabase Edge Function and keep secrets server-side. The older README mentioned Supabase Edge Functions, but there is no Supabase client/function code in this repo right now.

## Product Behavior

- There is no daily local usage limit; personal use is only constrained by provider API availability/quota.
- Campaign release date is currently `2026-05-01T00:00:00`; after that date the app treats the campaign as live.
- Challenge options are defined in `CHALLENGE_OPTIONS`: free roast, office, date night, first impression, and fashion week.
- Images are resized separately for display/export and AI analysis:
  - AI max dimension: `800`
  - display max dimension: `1920`
  - export max dimension: `3840`
- Gemini is tried first. If it fails, the app falls back to Mistral.
- The AI must return JSON matching `CritiqueResult`; `App.tsx` applies minimal fallbacks for missing fields.
- Export/share uses a hidden cover DOM node rendered through `html2canvas`.

## Maintenance Notes For Future Codex Work

- Keep Miranda's output in Portuguese unless the product direction changes.
- Preserve the JSON contract in both AI prompts when changing result rendering.
- If adding new required fields to `CritiqueResult`, update both provider prompts and the parse fallback in `processImage`.
- Avoid putting secrets directly in the frontend before shipping publicly.
- The repo intentionally ignores `node_modules`, `dist`, `.env*`, `.DS_Store`, and macOS `._*` metadata files.
- `npm run build` currently succeeds, with a Vite warning that the main JS chunk is slightly over 500 kB.

## Cleanup Done

- Removed stray macOS AppleDouble metadata files (`._*`) from the working tree.
