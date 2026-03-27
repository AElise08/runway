
export interface EditorialSection {
  title: string;
  content: string;
}

export interface CritiqueResult {
  verdict: 'The Nod' | 'The Lip Purse' | 'The Purse Drop';
  rating: number; // 0 to 100
  lead: string;
  sections: EditorialSection[];
  fashionTips: string[];
  suggestedAccessories: string[];
}

export type AppState = 'idle' | 'uploading' | 'analyzing' | 'result';
