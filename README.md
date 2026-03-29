<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your app

This contains everything you need to run your app locally.

## Run Locally

**Prerequisites:**  Node.js

1. Install dependencies:
   `npm install`
2. Configure `.env` with:
   `VITE_SUPABASE_URL=...`
   `VITE_SUPABASE_ANON_KEY=...`
3. Configure Supabase Edge Function secrets:
   `supabase secrets set GEMINI_API_KEY=... MISTRAL_API_KEY=...`
4. Deploy the functions:
   `supabase functions deploy analyze-look`
5. Run the app:
   `npm run dev`
