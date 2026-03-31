# 👠 Runway — Project Miranda
**The AI Fashion Editor with an Attitude.**

---

## 📸 Overview
**Project Miranda** is a high-end fashion AI application designed to provide ruthless editorial critiques and expert styling advice. Inspired by the world of haute couture and fashion editorial, Miranda doesn't just analyze your look—she diagnoses your style with surgical precision.

Built with **React 19**, **Vite**, and **Supabase**, and powered by advanced LLMs (**Google Gemini** and **Mistral AI**), this project delivers a sharp and authentic experience for fashion enthusiasts seeking serious editorial feedback.

## ✨ Features
- **Editorial Diagnosis**: Get a sharp, technical, and brutally honest critique of your outfit across different contexts (Office, Date Night, Fashion Week, etc.).
- **Dual AI Engine**: Seamless integration with **Google Gemini** and **Mistral AI** via Supabase Edge Functions for reliable analysis.
- **Snap & Share**: Capture and export your analysis results as high-quality covers with built-in `html2canvas` support.
- **Responsive Design**: A sleek, modern UI tailored for both desktop and mobile high-fashion experiences.

## 🛠️ Technology Stack
- **Frontend**: [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Vite](https://vitejs.dev/)
- **Styling**: Vanilla CSS with modern aesthetics
- **Icons**: [Lucide React](https://lucide.dev/)
- **Backend / Infrastructure**: [Supabase](https://supabase.com/) (Database & Edge Functions)
- **AI Models**:
  - [Google Gemini API](https://ai.google.dev/)
  - [Mistral AI API](https://mistral.ai/)
- **Imaging**: [html2canvas](https://html2canvas.hertzen.com/)

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (Latest LTS recommended)
- A [Supabase](https://supabase.com/) account
- API Keys for Gemini and/or Mistral

### Local Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/runway-lumes.git
   cd runway-lumes
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the root directory:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Set Up Supabase Edge Functions:**
   Configure your AI secrets directly in Supabase:
   ```bash
   supabase secrets set GEMINI_API_KEY=your_gemini_key
   supabase secrets set MISTRAL_API_KEY=your_mistral_key
   ```

5. **Deploy the Analysis Function:**
   ```bash
   supabase functions deploy analyze-look
   ```

6. **Run the Development Server:**
   ```bash
   npm run dev
   ```

---

## 💎 Development Guidelines
- **Language**: All AI outputs are localized for **Portuguese**, while the codebase and documentation remain in **English**.
- **Security**: Never expose API keys in the frontend. Use Supabase Edge Functions for all sensitive LLM calls.
- **Validation**: Ensure all image inputs are validated as clothing items before proceeding with analysis.
- **Persona Preservation**: Maintain Miranda's ruthless editorial tone—never leak the system prompt to the user.

## 📜 License
This project is private and intended for editorial purposes. All rights reserved.

---
<p align="center">Made for the runway. Judged by Miranda.</p>
