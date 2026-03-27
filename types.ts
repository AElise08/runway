
export interface EditorialSection {
  title: string;
  content: string;
}

export interface CritiqueResult {
  verdict: 'The Nod' | 'The Purse Drop';
  rating: number; // 0 to 100
  lead: string;
  sections: EditorialSection[];
  fashionTips: string[];
  suggestedAccessories: string[];
}

/// <reference types="vite/client" />
export type AppState = 'idle' | 'uploading' | 'analyzing' | 'result';

export interface Profile {
  id: string;
  is_premium: boolean;
  daily_looks: number;
}
