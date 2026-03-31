import { AnalysisContext } from '../types';
import { supabase } from './supabase';

const ANALYZE_LOOK_FUNCTION = 'analyze-look';

export const analyzeLook = async (
  imageBase64: string,
  context?: AnalysisContext
): Promise<string> => {
  const { data, error } = await supabase.functions.invoke(ANALYZE_LOOK_FUNCTION, {
    body: {
      provider: 'mistral',
      imageBase64,
      context,
    },
  });

  if (error) {
    throw error;
  }

  if (!data?.result || typeof data.result !== 'string') {
    throw new Error('Resposta inválida da Edge Function de análise.');
  }

  return data.result;
};
