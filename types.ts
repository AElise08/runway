
export interface EditorialSection {
  title: string;
  content: string;
}


export interface PremiumFixGroup {
  title: string;
  items: string[];
}

export interface AnalysisContext {
  label: string;
  promptContext: string;
  frameLabel: string;
}

export interface CritiqueResult {
  verdict: 'The Nod' | 'The Purse Drop';
  rating: number; // 0 to 100
  lead: string;
  sections: EditorialSection[];
  fashionTips: string[];
  suggestedAccessories: string[];
  premiumFixes?: PremiumFixGroup[];
  shareCaption?: string;
}

/// <reference types="vite/client" />
export type AppState = 'idle' | 'uploading' | 'analyzing' | 'result';
