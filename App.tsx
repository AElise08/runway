import React, { useState, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { User } from '@supabase/supabase-js';
import Header from './components/Header';
import VerdictBadge from './components/VerdictBadge';
import Auth from './components/Auth';
import { supabase } from './services/supabase';
import { analyzeLook } from './services/mistralService';
import { AnalysisContext, CritiqueResult, AppState, Profile } from './types';
import { RefreshCw, Quote, Sparkles, X, CameraOff, Clock, Download, Share2 } from 'lucide-react';

const MAX_EXPORT_DIMENSION = 3840;
const MAX_AI_DIMENSION = 800;
const CAMPAIGN_RELEASE_DATE = new Date('2026-05-01T00:00:00');

type VerdictRarity = 'common' | 'rare' | 'legendary';

interface CampaignState {
  isLive: boolean;
  daysLeft: number;
  countdownLabel: string;
  sublabel: string;
}

interface EditorialVerdictMeta {
  title: string;
  strapline: string;
  rarity: VerdictRarity;
  shareHook: string;
}

type ChallengeKey = 'none' | 'office' | 'date-night' | 'first-impression' | 'fashion-week';

interface ChallengeOption extends AnalysisContext {
  key: ChallengeKey;
  teaser: string;
  premiumAngle: string;
}

const CHALLENGE_OPTIONS: ChallengeOption[] = [
  {
    key: 'none',
    label: 'Julgamento Livre',
    frameLabel: 'Free Roast',
    promptContext: 'Faça uma análise editorial geral, sem assumir dress code específico.',
    teaser: 'Para quem quer só descobrir se o look merece humilhação pública.',
    premiumAngle: 'diagnóstico completo com correção editorial sob medida',
  },
  {
    key: 'office',
    label: 'Look de Trabalho',
    frameLabel: 'Office Trial',
    promptContext: 'Considere ambiente de trabalho, autoridade visual, elegância e competência percebida.',
    teaser: 'Testa se a produção transmite competência ou caos corporativo.',
    premiumAngle: 'ajustes para parecer mais cara, competente e polida no trabalho',
  },
  {
    key: 'date-night',
    label: 'Date Night',
    frameLabel: 'Date Night',
    promptContext: 'Considere atração, intenção, sensualidade controlada e coerência noturna.',
    teaser: 'Ideal para ver se o look seduz ou pede desculpas por existir.',
    premiumAngle: 'versões mais elegante, mais ousada e mais magnética para encontros',
  },
  {
    key: 'first-impression',
    label: 'Primeira Impressão',
    frameLabel: 'First Impression',
    promptContext: 'Considere impacto imediato, confiança, clareza de estilo e memorabilidade.',
    teaser: 'Mede se você chega como presença ou como ruído visual.',
    premiumAngle: 'um plano de imagem para causar impacto sem parecer forçada',
  },
  {
    key: 'fashion-week',
    label: 'Fashion Week',
    frameLabel: 'Fashion Week',
    promptContext: 'Considere repertório fashion, intenção editorial, ousadia e sofisticação visual.',
    teaser: 'Para descobrir se existe moda ali ou só figurino nervoso.',
    premiumAngle: 'substituições mais editoriais e ousadas sem perder sofisticação',
  },
];

const renderBoldText = (text: string) => {
  if (!text) return text;
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-bold text-white/90">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <strong key={i} className="font-bold text-white/90">{part.slice(1, -1)}</strong>;
    }
    return part;
  });
};

const getScaledDimensions = (width: number, height: number, maxDimension: number) => {
  if (width <= maxDimension && height <= maxDimension) {
    return { width, height };
  }

  const ratio = Math.min(maxDimension / width, maxDimension / height);
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
};

const createImageDataUrl = ({
  source,
  width,
  height,
  maxDimension,
  quality,
  mirror = false,
}: {
  source: CanvasImageSource;
  width: number;
  height: number;
  maxDimension: number;
  quality: number;
  mirror?: boolean;
}) => {
  const { width: targetWidth, height: targetHeight } = getScaledDimensions(width, height, maxDimension);
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Não foi possível preparar a imagem.');
  }

  if (mirror) {
    ctx.translate(targetWidth, 0);
    ctx.scale(-1, 1);
  }

  ctx.drawImage(source, 0, 0, targetWidth, targetHeight);
  return canvas.toDataURL('image/jpeg', quality);
};

const getCampaignState = (): CampaignState => {
  const now = new Date();
  const msLeft = CAMPAIGN_RELEASE_DATE.getTime() - now.getTime();
  const daysLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));

  if (msLeft <= 0) {
    return {
      isLive: true,
      daysLeft: 0,
      countdownLabel: 'ESTREIA EM CURSO',
      sublabel: 'Runway Season entrou ao vivo. Julgamentos em estado crítico.',
    };
  }

  return {
    isLive: false,
    daysLeft,
    countdownLabel: `FALTAM ${daysLeft} DIAS`,
    sublabel: 'Contagem regressiva para a estreia de 1 de maio de 2026.',
  };
};

const getEditorialVerdictMeta = (result: CritiqueResult): EditorialVerdictMeta => {
  if (result.verdict === 'The Nod') {
    if (result.rating >= 90) {
      return {
        title: 'Aprovada Com Severo Desgosto',
        strapline: 'raridade lendaria',
        rarity: 'legendary',
        shareHook: 'Miranda aprovou meu look com severo desgosto.',
      };
    }

    if (result.rating >= 75) {
      return {
        title: 'Sobreviveu a Reuniao',
        strapline: 'veredito raro',
        rarity: 'rare',
        shareHook: 'Sobrevivi a reuniao editorial da Runway.',
      };
    }

    return {
      title: 'Passou Por Um Fio De Seda',
      strapline: 'aprovacao tensa',
      rarity: 'common',
      shareHook: 'Passei por um fio de seda no comite da Runway.',
    };
  }

  if (result.rating <= 15) {
    return {
      title: 'Demitida Antes Do Cafe',
      strapline: 'veredito lendario',
      rarity: 'legendary',
      shareHook: 'Meu look foi demitido antes do cafe.',
    };
  }

  if (result.rating <= 30) {
    return {
      title: 'Ceruleo Sem Salvacao',
      strapline: 'veredito raro',
      rarity: 'rare',
      shareHook: 'Recebi um ceruleo sem salvacao da Miranda.',
    };
  }

  if (result.rating <= 45) {
    return {
      title: 'Demitida Da Runway',
      strapline: 'queda editorial',
      rarity: 'rare',
      shareHook: 'Meu look foi demitido da Runway.',
    };
  }

  return {
    title: 'Sob Revisao Hostil',
    strapline: 'observacao disciplinar',
    rarity: 'common',
    shareHook: 'Meu look entrou sob revisao hostil na Runway.',
  };
};

const shouldPromptShare = (result: CritiqueResult, verdictMeta: EditorialVerdictMeta) => {
  return result.rating <= 35 || verdictMeta.rarity !== 'common' || result.lead.length <= 120;
};

const getChallengeOption = (key: ChallengeKey) => {
  return CHALLENGE_OPTIONS.find((option) => option.key === key) ?? CHALLENGE_OPTIONS[0];
};

const getDiagnosisItems = (result: CritiqueResult) => {
  if (result.diagnosis?.length) {
    return result.diagnosis.slice(0, 4);
  }

  const labels = ['Silhueta', 'Proporcao', 'Cores', 'Contexto'];
  return result.sections.slice(0, 4).map((section, index) => ({
    label: labels[index] ?? section.title,
    summary: section.content,
  }));
};

const getPremiumFixGroups = (result: CritiqueResult, isPremium: boolean) => {
  if (!isPremium) {
    return [];
  }

  if (result.premiumFixes?.length) {
    return result.premiumFixes;
  }

  if (!result.fashionTips?.length) {
    return [];
  }

  return [
    {
      title: 'Plano de Reabilitacao',
      items: result.fashionTips.slice(0, 4),
    },
  ];
};

const dataUrlToBlob = async (dataUrl: string) => {
  const response = await fetch(dataUrl);
  return response.blob();
};

const App: React.FC = () => {
  const [state, setState] = useState<AppState | 'camera'>('idle');
  const [image, setImage] = useState<string | null>(null);
  const [result, setResult] = useState<CritiqueResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  
  // Auth & Profile State
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [selectedChallengeKey, setSelectedChallengeKey] = useState<ChallengeKey>('none');
  const [activeChallengeKey, setActiveChallengeKey] = useState<ChallengeKey>('none');

  const [usageCount, setUsageCount] = useState<number>(() => {
    const saved = localStorage.getItem('miranda_usage_count');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [isExporting, setIsExporting] = useState(false);

  // Setup Auth Listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setShowAuth(false);
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (data) setProfile(data);
  };

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  // Limit check
  const isPremium = profile?.is_premium || false;
  const maxUses = isPremium ? 20 : 3;
  const isBlocked = !isPremium && usageCount >= maxUses;
  const campaignState = getCampaignState();
  const editorialVerdict = result ? getEditorialVerdictMeta(result) : null;
  const showSharePrompt = result && editorialVerdict ? shouldPromptShare(result, editorialVerdict) : false;
  const selectedChallenge = getChallengeOption(selectedChallengeKey);
  const activeChallenge = getChallengeOption(activeChallengeKey);
  const remainingUses = isPremium ? Math.max(0, maxUses - (profile?.daily_looks || 0)) : Math.max(0, maxUses - usageCount);
  const diagnosisItems = result ? getDiagnosisItems(result) : [];
  const premiumFixGroups = result ? getPremiumFixGroups(result, isPremium) : [];

  const startCamera = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user', 
          width: { ideal: 1920 }, 
          height: { ideal: 1080 } 
        }, 
        audio: false 
      });
      streamRef.current = stream;
      setState('camera');
      setIsCameraReady(false);
    } catch (err) {
      console.error(err);
      setError("Acesso negado. Miranda não tolera falhas técnicas ou amadorismo.");
    }
  };

  useEffect(() => {
    if (state === 'camera' && videoRef.current && streamRef.current) {
      const video = videoRef.current;
      video.srcObject = streamRef.current;
      
      const handleCanPlay = () => {
        video.play().then(() => {
          setIsCameraReady(true);
        }).catch(e => console.error("Error playing video:", e));
      };

      video.addEventListener('loadedmetadata', handleCanPlay);
      return () => {
        video.removeEventListener('loadedmetadata', handleCanPlay);
      };
    }
  }, [state]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraReady(false);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video && canvas && video.readyState >= 2) {
      const width = video.videoWidth;
      const height = video.videoHeight;

      if (width === 0 || height === 0) {
        setError("Sinal de vídeo inválido. Tente novamente.");
        return;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        ctx.translate(width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, width, height);

        // Alta qualidade para tela e exportação, separada da versão comprimida da IA.
        const hqDataUrl = createImageDataUrl({
          source: canvas,
          width,
          height,
          maxDimension: MAX_EXPORT_DIMENSION,
          quality: 0.95,
        });
        setImage(hqDataUrl);

        // Compressão apenas para a IA, preservando proporção original.
        const apiDataUrl = createImageDataUrl({
          source: canvas,
          width,
          height,
          maxDimension: MAX_AI_DIMENSION,
          quality: 0.6,
        });
        const base64String = apiDataUrl.replace(/^data:image\/\w+;base64,/, "");
        stopCamera();
        processImage(base64String, selectedChallenge);
      }
    } else {
      setError("Câmera não está pronta. Aguarde um momento.");
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError("Isso não é uma imagem. Não teste a paciência de Miranda.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        const img = new Image();
        img.onload = () => {
          // Alta qualidade para interface/exportação e compressão separada para IA.
          const hqDataUrl = createImageDataUrl({
            source: img,
            width: img.width,
            height: img.height,
            maxDimension: MAX_EXPORT_DIMENSION,
            quality: 1.0,
          });
          setImage(hqDataUrl);

          const apiDataUrl = createImageDataUrl({
            source: img,
            width: img.width,
            height: img.height,
            maxDimension: MAX_AI_DIMENSION,
            quality: 0.6,
          });
          const base64String = apiDataUrl.replace(/^data:image\/\w+;base64,/, "");
          processImage(base64String, selectedChallenge);
        };
        img.src = dataUrl;
      }
    };
    reader.onerror = () => {
      setError("Erro ao ler a imagem da galeria. Tente novamente ou desista.");
    };
    reader.readAsDataURL(file);
  };

  const processImage = async (base64: string, challengeContext: ChallengeOption) => {
    setState('analyzing');
    setError(null);
    setActiveChallengeKey(challengeContext.key);

    try {
      const jsonStr = await analyzeLook(base64, isPremium, challengeContext);
      const parsed: CritiqueResult = JSON.parse(jsonStr);
      setResult(parsed);
      
      const newCount = usageCount + 1;
      setUsageCount(newCount);
      localStorage.setItem('miranda_usage_count', newCount.toString());
      
      if (user && profile) {
         await supabase.from('profiles').update({ daily_looks: profile.daily_looks + 1 }).eq('id', user.id);
         setProfile({...profile, daily_looks: profile.daily_looks + 1});
      }
      
      setState('result');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error("Analysis Error:", err);
      const errorMsg = err?.message || err?.toString() || "";
      if (errorMsg.includes("429") || errorMsg.includes("quota") || errorMsg.includes("Too Many Requests")) {
        setError("Miranda está em uma reunião com Donatella. Ela não tem tempo para você agora. Isso ocorre pelo altíssimo volume de acessos na IA. Tente novamente em 20 segundos.");
      } else if (errorMsg.includes("401") || errorMsg.includes("key") || errorMsg.toLowerCase().includes("unauthorized")) {
        setError("Erro técnico: Chave da Mistral inválida ou não configurada no Vercel. Demitam a TI.");
      } else if (errorMsg.includes("413") || errorMsg.toLowerCase().includes("too large") || errorMsg.includes("size")) {
        setError("A foto enviada é grande demais até para o ego da Miranda. Reduza a qualidade.");
      } else {
        setError("Erro técnico catastrófico. Claramente alguém na TI será demitido. Detalhe: " + errorMsg.substring(0, 50));
      }
      setState('idle');
    }
  };

  const reset = () => {
    stopCamera();
    setState('idle');
    setImage(null);
    setResult(null);
    setError(null);
  };

  const createExportDataUrl = async () => {
    if (!exportRef.current) return null;
    const canvas = await html2canvas(exportRef.current, {
      useCORS: true,
      backgroundColor: '#1A1A1A',
      scale: 2,
      width: 1080,
      height: 1620,
      windowWidth: 1080,
      windowHeight: 1620,
      scrollX: 0,
      scrollY: 0,
      x: 0,
      y: 0
    } as any);
    return canvas.toDataURL('image/png');
  };

  const exportVerdict = async () => {
    try {
      setIsExporting(true);
      const dataUrl = await createExportDataUrl();
      if (!dataUrl) return;
      const link = document.createElement('a');
      link.download = 'project-miranda-cover.png';
      link.href = dataUrl;
      link.click();
    } catch (e) {
      console.error(e);
      setError("O assistente fotográfico falhou ao exportar a capa.");
    } finally {
      setIsExporting(false);
    }
  };

  const shareVerdict = async () => {
    if (!result || !editorialVerdict) return;

    try {
      setIsExporting(true);
      const dataUrl = await createExportDataUrl();
      if (!dataUrl) return;

      const shareText = result.shareCaption
        ? `${result.shareCaption} ${activeChallenge.label !== 'Julgamento Livre' ? `Desafio: ${activeChallenge.label}. ` : ''}Runway Index: ${result.rating}%.`
        : `${editorialVerdict.shareHook} ${activeChallenge.label !== 'Julgamento Livre' ? `Desafio: ${activeChallenge.label}. ` : ''}Runway Index: ${result.rating}%.`;
      const blob = await dataUrlToBlob(dataUrl);
      const file = new File([blob], 'runway-season.png', { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'Runway Season',
          text: shareText,
          files: [file],
        });
        return;
      }

      const link = document.createElement('a');
      link.download = 'runway-season-share.png';
      link.href = dataUrl;
      link.click();
      setError('A capa foi baixada. Poste nos Stories, Reels, TikTok ou Status.');
    } catch (e) {
      console.error(e);
      setError('Nao foi possivel compartilhar agora. A capa pode ser exportada manualmente.');
    } finally {
      setIsExporting(false);
    }
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-white selection:text-black transition-colors duration-1000 relative w-full">
      <Header user={user} setShowAuth={setShowAuth} />
      
      {showAuth && !user && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-sm">
            <button 
              onClick={() => setShowAuth(false)}
              className="absolute -top-12 right-0 text-white/50 hover:text-white"
            >
              <X size={24} />
            </button>
            <Auth />
          </div>
        </div>
      )}

      <main className="w-full">
        {state === 'idle' && (
          <div className="max-w-6xl mx-auto px-6 py-12 md:py-24 flex flex-col items-center text-center space-y-12 md:space-y-16 animate-in fade-in duration-1000">
            <div className="w-full max-w-4xl mx-auto space-y-6">
              <div className="inline-flex flex-wrap items-center justify-center gap-3 px-4 py-3 border border-[#D32F2F]/40 bg-[#240303]/70 text-[#FFD8D8] uppercase tracking-[0.35em] text-[9px] md:text-[10px] font-black shadow-[0_0_60px_rgba(211,47,47,0.14)]">
                <span>Runway Season</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#D32F2F]"></span>
                <span>{campaignState.countdownLabel}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#D32F2F]"></span>
                <span>1 de maio de 2026</span>
              </div>
              <p className="text-[10px] md:text-[11px] uppercase tracking-[0.35em] text-[#FFB0B0]/70 font-bold">
                {campaignState.sublabel}
              </p>
            </div>

            <div className="space-y-6 md:space-y-8">
              <h2 className="text-4xl md:text-6xl lg:text-7xl font-serif italic text-white/95 tracking-tighter leading-tight md:leading-none max-w-5xl mx-auto break-words px-4">
                Envie seu look. Receba o veredito que destruiria sua autoestima em uma redacao da Runway.
              </h2>
              <p className="text-white/50 max-w-3xl mx-auto leading-relaxed text-[10px] md:text-[12px] uppercase tracking-[0.35em] md:tracking-[0.5em] font-light px-4">
                Roast editorial brutal, Runway Index compartilhavel e, no premium, a correcao real do look para voce voltar melhor vestida e menos humilhada.
              </p>
            </div>

            {isBlocked ? (
              <div className="max-w-2xl mx-auto p-8 md:p-12 bg-[#160707] border border-[#D32F2F]/30 text-center space-y-8 animate-in mt-12 shadow-[0_0_120px_rgba(211,47,47,0.12)]">
                <div className="space-y-4">
                  <span className="inline-flex items-center gap-2 px-4 py-2 border border-[#D32F2F]/40 bg-[#2A0505] text-[#FFD6D6] uppercase tracking-[0.35em] text-[9px] font-black">
                    Runway Season Premium
                  </span>
                  <h3 className="text-3xl md:text-4xl font-serif italic text-white/90">O roast gratis acabou. A correcao premium comeca aqui.</h3>
                </div>
                <p className="text-sm font-light leading-relaxed text-white/70 max-w-xl mx-auto">
                  O plano pago deixa de apenas humilhar: ele explica o que manter, o que tirar, o que substituir e como reconstruir o look com mais elegancia, versao acessivel e opcao mais ousada.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                  <div className="border border-white/10 bg-black/20 p-4">
                    <p className="text-[10px] uppercase tracking-[0.35em] text-[#FFB0B0] font-black mb-2">Premium Corrige</p>
                    <p className="text-sm text-white/70 leading-relaxed">Diagnostico real de silhueta, cor, tecido e contexto.</p>
                  </div>
                  <div className="border border-white/10 bg-black/20 p-4">
                    <p className="text-[10px] uppercase tracking-[0.35em] text-[#FFB0B0] font-black mb-2">Mais Volume</p>
                    <p className="text-sm text-white/70 leading-relaxed">20 analises por dia para testar variacoes sem depender da sorte.</p>
                  </div>
                  <div className="border border-white/10 bg-black/20 p-4">
                    <p className="text-[10px] uppercase tracking-[0.35em] text-[#FFB0B0] font-black mb-2">Mais Compartilhavel</p>
                    <p className="text-sm text-white/70 leading-relaxed">Cards prontos para story com cara de capa e branding discreto.</p>
                  </div>
                </div>
                <p className="text-[10px] uppercase tracking-[0.35em] text-white/35 font-bold">
                  Gratis: roast e urgencia. Premium: recuperacao de reputacao.
                </p>
                <a 
                  href="https://pay.kiwify.com.br/xxxxx" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block px-12 py-5 bg-[#D32F2F] text-white font-black uppercase tracking-[0.4em] text-[10px] transition-all hover:bg-[#B32626] w-full mb-4 text-center"
                >
                  Desbloquear Correcao Premium
                </a>
                <p className="text-[9px] uppercase tracking-[0.2em] font-bold text-white/40 italic">
                  Use o mesmo email da compra para liberar o acesso editorial.
                </p>
                <button onClick={() => { localStorage.setItem('miranda_usage_count', '0'); window.location.reload(); }} className="px-4 py-2 border border-white/10 text-white/40 hover:text-white text-[9px] uppercase tracking-[0.5em] transition-all font-black mt-2 inline-block">Resetar Limite (Dev)</button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-6 w-full">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-5xl">
                  <div className="border border-white/10 bg-white/[0.02] p-5 md:p-6 text-left">
                    <p className="text-[10px] uppercase tracking-[0.4em] text-[#FFB0B0] font-black mb-3">Roast Editorial</p>
                    <p className="text-sm text-white/65 leading-relaxed">Receba um veredito cruel, visualmente forte e pronto para print.</p>
                  </div>
                  <div className="border border-white/10 bg-white/[0.02] p-5 md:p-6 text-left">
                    <p className="text-[10px] uppercase tracking-[0.4em] text-[#FFB0B0] font-black mb-3">Runway Season</p>
                    <p className="text-sm text-white/65 leading-relaxed">Temporada especial de lancamento com countdown, selo e acabamento de campanha.</p>
                  </div>
                  <div className="border border-white/10 bg-white/[0.02] p-5 md:p-6 text-left">
                    <p className="text-[10px] uppercase tracking-[0.4em] text-[#FFB0B0] font-black mb-3">Premium Corrige</p>
                    <p className="text-sm text-white/65 leading-relaxed">Nao apenas humilha: mostra como salvar o look com intencao e criterio.</p>
                  </div>
                </div>

                <div className="w-full max-w-5xl space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 text-left">
                    <p className="text-[10px] uppercase tracking-[0.4em] text-white/35 font-black">Escolha o desafio</p>
                    <p className="text-[10px] uppercase tracking-[0.28em] text-[#FFB0B0]/70 font-bold">
                      Premium entrega: {selectedChallenge.premiumAngle}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    {CHALLENGE_OPTIONS.map((challenge) => (
                      <button
                        key={challenge.key}
                        onClick={() => setSelectedChallengeKey(challenge.key)}
                        className={`text-left p-4 border transition-all ${selectedChallenge.key === challenge.key ? 'border-[#D32F2F] bg-[#240303]/70 shadow-[0_0_40px_rgba(211,47,47,0.12)]' : 'border-white/10 bg-white/[0.02] hover:border-white/25'}`}
                      >
                        <p className="text-[10px] uppercase tracking-[0.3em] font-black text-[#FFD6D6]">{challenge.label}</p>
                        <p className="mt-3 text-xs text-white/50 leading-relaxed">{challenge.teaser}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4 w-full md:max-w-[680px] justify-center">
                  <button 
                    onClick={startCamera}
                    className="group relative px-6 md:px-12 py-6 md:py-10 bg-[#D32F2F] text-white font-black uppercase tracking-[0.2em] md:tracking-[0.4em] text-[10px] md:text-[11px] transition-all hover:bg-[#B32626] active:scale-95 shadow-[0_0_80px_rgba(211,47,47,0.18)] w-full text-center leading-relaxed"
                  >
                    Ser Julgada Agora
                  </button>
                  <label 
                    className="cursor-pointer group relative px-6 md:px-12 py-6 md:py-10 bg-transparent border border-white text-white font-black uppercase tracking-[0.2em] md:tracking-[0.4em] text-[10px] md:text-[11px] transition-all hover:bg-white/10 active:scale-95 shadow-[0_0_80px_rgba(255,255,255,0.05)] w-full text-center leading-relaxed flex items-center justify-center gap-2 m-0"
                  >
                    Importar E Enfrentar Miranda
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleFileUpload} 
                      className="hidden" 
                    />
                  </label>
                </div>
                <span className="text-[9px] md:text-[10px] text-white/40 uppercase tracking-[0.3em] font-bold text-center px-4">
                  {isPremium ? `${remainingUses} Analises Premium Restantes Hoje` : `${remainingUses} Avaliacoes Gratuitas Restantes`}
                </span>
              </div>
            )}

            {error && (
              <div className="max-w-md mx-auto p-6 md:p-12 bg-red-950/5 border border-red-500/10 text-red-300 text-xs text-center font-serif italic rounded-sm flex flex-col items-center gap-6 md:gap-8 animate-in shake duration-500">
                {error.includes("reunião") ? <Clock className="text-red-500/20" size={48} /> : <CameraOff className="text-red-500/20" size={48} />}
                <p className="tracking-[0.2em] md:tracking-[0.4em] leading-loose uppercase text-[9px] md:text-[10px] font-black text-red-400/60">{error}</p>
                <button onClick={() => setError(null)} className="px-8 md:px-12 py-3 md:py-4 border border-white/10 text-white/40 hover:text-white text-[8px] md:text-[9px] uppercase tracking-[0.3em] md:tracking-[0.5em] transition-all font-black">Dispensar</button>
              </div>
            )}

            <div className="pt-16 md:pt-24 grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-10 border-t border-white/5 w-full text-left">
              <div className="space-y-4 md:space-y-6">
                <span className="text-[10px] font-black uppercase tracking-[0.5em] text-white/20">Campanha</span>
                <h4 className="font-serif text-2xl md:text-3xl italic">Look feito para virar story</h4>
                <p className="text-xs text-white/40 leading-relaxed font-light">Cada analise precisa parecer um meme premium, nao um print tecnico. O objetivo e postar antes da dignidade voltar.</p>
              </div>
              <div className="space-y-4 md:space-y-6 md:border-l md:border-white/5 md:pl-10 pt-8 md:pt-0 border-t border-white/5 md:border-t-0">
                <span className="text-[10px] font-black uppercase tracking-[0.5em] text-white/20">Resultado</span>
                <h4 className="font-serif text-2xl md:text-3xl italic">Veredito colecionavel</h4>
                <p className="text-xs text-white/40 leading-relaxed font-light">Aprovada com severo desgosto, demitida antes do cafe, ceruleo sem salvacao. O resultado agora tem personalidade memoravel.</p>
              </div>
              <div className="space-y-4 md:space-y-6 md:border-l md:border-white/5 md:pl-10 pt-8 md:pt-0 border-t border-white/5 md:border-t-0">
                <span className="text-[10px] font-black uppercase tracking-[0.5em] text-white/20">Premium</span>
                <h4 className="font-serif text-3xl italic">Humilhar e corrigir</h4>
                <p className="text-xs text-white/40 leading-relaxed font-light">A versao paga vende melhora concreta do look, nao apenas mais tentativas de ser aprovada pela propria sorte.</p>
              </div>
            </div>
          </div>
        )}

        {state === 'camera' && (
          <div className="max-w-4xl mx-auto px-4 py-8 md:px-6 md:py-8 lg:py-6 flex flex-col items-center space-y-6 animate-in zoom-in-95 duration-500">
            <div className="relative w-full max-w-sm md:max-w-[380px] aspect-[3/4] bg-neutral-900 overflow-hidden border border-white/10 shadow-[0_0_150px_rgba(255,255,255,0.05)] rounded-sm group">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted
                className={`w-full h-full object-cover transition-opacity duration-1000 ${isCameraReady ? 'opacity-100' : 'opacity-0'} scale-x-[-1]`} 
              />
              
              {!isCameraReady && (
                <div className="absolute inset-0 flex flex-col items-center justify-center space-y-6 bg-black">
                   <div className="w-10 h-10 border-[0.5px] border-white/10 border-t-white rounded-full animate-spin"></div>
                   <span className="text-[10px] uppercase tracking-[0.6em] text-white/20 font-black">Sincronizando Lente Editorial...</span>
                </div>
              )}

              <div className="absolute inset-0 border-[20px] md:border-[60px] border-black/40 pointer-events-none group-hover:border-black/20 transition-all duration-1000"></div>

              <div className="absolute top-4 left-4 md:top-8 md:left-8 flex flex-col gap-2">
                <div className="border border-[#D32F2F]/40 bg-[#240303]/70 px-3 py-2 uppercase tracking-[0.35em] text-[8px] font-black text-[#FFD6D6]">
                  Runway Season
                </div>
                <div className="border border-white/10 bg-black/50 px-3 py-2 uppercase tracking-[0.32em] text-[8px] font-black text-white/70">
                  {selectedChallenge.label}
                </div>
              </div>
              
              <div className="absolute top-4 right-4 md:top-10 md:right-10">
                <button onClick={reset} className="p-4 bg-black/40 backdrop-blur-3xl rounded-full hover:bg-white hover:text-black transition-all border border-white/5">
                  <X size={24} />
                </button>
              </div>
              
              <div className="absolute bottom-8 md:bottom-16 left-0 right-0 flex justify-center">
                <button 
                  onClick={capturePhoto}
                  disabled={!isCameraReady}
                  className={`w-28 h-28 rounded-full border border-white/40 flex items-center justify-center bg-transparent group/btn active:scale-90 transition-all ${!isCameraReady ? 'opacity-20 pointer-events-none grayscale' : 'opacity-100 scale-100'}`}
                >
                  <div className="w-24 h-24 rounded-full bg-white/5 group-hover/btn:bg-white/20 transition-colors border border-white/5 flex items-center justify-center">
                    <div className="w-5 h-5 bg-white rounded-full shadow-[0_0_30px_rgba(255,255,255,0.8)]" />
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {state === 'analyzing' && (
          <div className="max-w-4xl mx-auto px-6 py-20 md:py-40 flex flex-col items-center justify-center space-y-16 md:space-y-24">
            <div className="relative w-40 h-40 md:w-56 md:h-56">
              <div className="absolute inset-0 border-[0.5px] border-white/5 rounded-full scale-125"></div>
              <div className="absolute inset-0 border-t-[0.5px] border-white rounded-full animate-spin duration-[4000ms]"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles className="text-white/10 animate-pulse" size={64} />
              </div>
            </div>
            <div className="text-center space-y-6 md:space-y-10 max-w-md">
              <h3 className="text-4xl md:text-6xl font-serif italic text-white/80 tracking-tighter animate-pulse">"Explique-me..."</h3>
              <p className="text-white/20 text-[8px] md:text-[10px] uppercase tracking-[0.4em] md:tracking-[0.8em] font-black leading-loose px-4">
                Miranda está verificando se você tem o direito de respirar o mesmo ar que a Runway.
              </p>
            </div>
          </div>
        )}

        {state === 'result' && result && image && (
          <div className="animate-in fade-in slide-in-from-bottom-20 duration-1000">
            <div className="relative w-full h-[75vh] md:h-[80vh] lg:h-[85vh] bg-[#0a0a0a] border-b border-white/10 overflow-hidden flex flex-col justify-end">
              <img 
                src={image} 
                alt="Editorial Shot" 
                className="w-full h-full object-cover absolute inset-0 grayscale-[0.05] contrast-[1.1]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent z-10 pointer-events-none"></div>
              
              {/* Floating Result Info */}
              <div className="absolute bottom-8 md:bottom-20 lg:bottom-24 left-4 md:left-12 lg:left-24 right-4 md:right-8 flex flex-col items-start space-y-4 md:space-y-6 lg:space-y-8 z-20">
                <div className="border border-[#D32F2F]/45 bg-[#240303]/75 px-4 py-2 uppercase tracking-[0.35em] text-[8px] md:text-[9px] font-black text-[#FFD8D8]">
                  {campaignState.isLive ? 'Runway Season Ao Vivo' : `Runway Season · ${campaignState.countdownLabel}`}
                </div>
                <div className="flex flex-wrap items-center gap-4 md:gap-6">
                  <VerdictBadge verdict={result.verdict} />
                  <div className="flex items-baseline gap-2 bg-white/10 backdrop-blur-xl border border-white/20 px-4 md:px-6 py-1 md:py-2 rounded-full">
                    <span className="text-[8px] md:text-[10px] uppercase tracking-[0.3em] font-black text-white/50">Runway Index</span>
                    <span className="text-xl md:text-2xl font-serif italic font-bold text-white">{result.rating}</span>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <p className="text-[10px] md:text-[12px] uppercase tracking-[0.45em] text-[#FFB0B0] font-black">
                    {editorialVerdict?.strapline}
                  </p>
                  <h2 className="text-4xl md:text-[5.5rem] lg:text-[7rem] font-serif italic tracking-tighter text-white leading-[0.85] md:leading-[0.8] max-w-full break-words">
                    {editorialVerdict?.title}
                  </h2>
                </div>
                <div className="flex flex-wrap items-center gap-3 md:gap-6 text-[8px] md:text-[11px] uppercase tracking-[0.3em] md:tracking-[0.6em] text-white/40 font-black">
                  <span>{activeChallenge.frameLabel}</span>
                  <span className="w-1 md:w-1.5 h-1 md:h-1.5 bg-white/20 rounded-full hidden md:block"></span>
                  <span>Editorial Roast</span>
                  <span className="w-1 md:w-1.5 h-1 md:h-1.5 bg-white/20 rounded-full hidden md:block"></span>
                  <span>Share Cut</span>
                </div>
              </div>

              {/* Huge Score Background Decoration */}
              <div className="absolute -right-20 top-1/2 -translate-y-1/2 rotate-90 hidden lg:block select-none pointer-events-none">
                <span className="text-[12rem] font-serif italic text-white/[0.03] tracking-tighter">SCORE {result.rating}</span>
              </div>
            </div>

            <div className="w-full md:max-w-7xl xl:max-w-[90rem] mx-auto px-4 md:px-8 lg:px-12 xl:px-24 py-16 md:py-24 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 xl:gap-24 pb-40">
              <div className="lg:col-span-8 space-y-12 md:space-y-16 lg:space-y-20 min-w-0">
                <div className="relative pb-12 md:pb-16 border-b border-white/5">
                  <Quote size={80} className="absolute -top-6 md:-top-12 -left-6 md:-left-12 text-white/[0.03] fill-white/[0.03]" />
                  <p className="text-3xl md:text-6xl font-serif italic leading-[1.4] md:leading-[1.3] text-white/90 selection:bg-white selection:text-black">
                    {renderBoldText(result.lead)}
                  </p>
                </div>

                {showSharePrompt && (
                  <div className="border border-[#D32F2F]/30 bg-[linear-gradient(135deg,rgba(211,47,47,0.18),rgba(20,5,5,0.95))] px-6 md:px-8 py-6 md:py-7 rounded-[1.75rem]">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                      <div className="space-y-3">
                        <p className="text-[10px] uppercase tracking-[0.35em] text-[#FFB0B0] font-black">Gatilho de Compartilhamento</p>
                        <h4 className="text-2xl md:text-3xl font-serif italic text-white">Isso esta humilhante o suficiente para virar story.</h4>
                        <p className="text-sm md:text-base text-white/65 leading-relaxed">
                          {result.shareCaption || editorialVerdict?.shareHook}
                        </p>
                      </div>
                      <button
                        onClick={shareVerdict}
                        disabled={isExporting}
                        className="inline-flex items-center justify-center gap-3 px-6 py-4 bg-white text-black font-black uppercase tracking-[0.28em] text-[10px] transition-all hover:bg-neutral-200 rounded-full"
                      >
                        {isExporting ? 'Processando..' : <><Share2 size={14} /> Publicar Agora</>}
                      </button>
                    </div>
                  </div>
                )}

                <div className="border border-[#D32F2F]/20 bg-[#130505] px-6 md:px-8 py-5 md:py-6">
                  <div className="flex flex-wrap items-center gap-3 md:gap-4 text-[9px] md:text-[10px] uppercase tracking-[0.35em] font-black text-[#FFB0B0]">
                    <span>Runway Season</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#D32F2F]"></span>
                    <span>{editorialVerdict?.title}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#D32F2F]"></span>
                    <span>{campaignState.isLive ? 'janela cultural ativa' : campaignState.countdownLabel.toLowerCase()}</span>
                  </div>
                  <p className="mt-4 text-sm md:text-base text-white/60 leading-relaxed">
                    Resultado preparado para compartilhar durante a temporada. Quando o veredito fica raro ou humilhante o suficiente, a Runway quer que isso vire story.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {diagnosisItems.map((item, index) => (
                    <div key={`${item.label}-${index}`} className="border border-white/8 bg-white/[0.02] p-5 md:p-6">
                      <p className="text-[10px] uppercase tracking-[0.35em] text-[#FFB0B0] font-black mb-3">{item.label}</p>
                      <p className="text-sm md:text-base text-white/65 leading-relaxed">{renderBoldText(item.summary)}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-16 md:space-y-24">
                  {result.sections.map((section, idx) => (
                    <div key={idx} className="space-y-6 md:space-y-8 group">
                      <div className="flex items-center gap-4">
                        <span className="text-[10px] md:text-xs uppercase tracking-[0.4em] md:tracking-[0.8em] text-white/20 font-black">0{idx + 1} // {renderBoldText(section.title)}</span>
                        <div className="flex-1 h-[0.5px] bg-white/5 group-hover:bg-white/10 transition-colors"></div>
                      </div>
                      <h3 className="text-2xl md:text-3xl lg:text-4xl font-serif italic text-white/80 break-words">{renderBoldText(section.title)}</h3>
                      <p className="text-lg md:text-xl lg:text-2xl font-light leading-relaxed text-white/60 selection:bg-white selection:text-black break-words">
                        {renderBoldText(section.content)}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="pt-16 md:pt-24 border-t border-white/5 space-y-12 md:space-y-16">
                  <h4 className="text-[11px] md:text-[14px] uppercase tracking-[0.4em] md:tracking-[0.8em] text-white/20 font-black">Diretrizes Corretivas</h4>
                  <ul className="space-y-8 md:space-y-12">
                    {result.fashionTips.map((tip, i) => (
                      <li key={i} className="flex items-start gap-12 group">
                        <span className="text-5xl font-serif italic text-white/5 group-hover:text-white/20 transition-all">0{i+1}</span>
                        <div className="pt-2">
                          <span className="text-white/70 text-lg md:text-2xl font-light leading-relaxed group-hover:text-white transition-colors block">{renderBoldText(tip)}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                {!isPremium && (
                  <div className="pt-16 md:pt-24 border-t border-white/5">
                    <div className="border border-[#D32F2F]/30 bg-[#120404] p-6 md:p-8 rounded-[1.75rem] space-y-6">
                      <div className="space-y-3">
                        <p className="text-[10px] uppercase tracking-[0.35em] text-[#FFB0B0] font-black">Upsell de Transformacao</p>
                        <h4 className="text-2xl md:text-4xl font-serif italic text-white">O roast ja te deu o trauma. O premium entrega a reabilitacao.</h4>
                        <p className="text-white/65 leading-relaxed max-w-3xl">
                          Para o desafio <strong className="text-white font-semibold">{activeChallenge.label}</strong>, o upgrade libera {activeChallenge.premiumAngle}, alem de mais analises por dia e um plano mais concreto para manter, tirar e substituir.
                        </p>
                      </div>
                      <div className="grid gap-4 md:grid-cols-3">
                        <div className="border border-white/10 bg-black/20 p-5 rounded-[1.25rem]">
                          <p className="text-[10px] uppercase tracking-[0.3em] text-white/35 font-black">Manter</p>
                          <p className="mt-3 text-sm text-white/70 leading-relaxed">O que ainda funciona e vale salvar no look.</p>
                        </div>
                        <div className="border border-white/10 bg-black/20 p-5 rounded-[1.25rem]">
                          <p className="text-[10px] uppercase tracking-[0.3em] text-white/35 font-black">Substituir</p>
                          <p className="mt-3 text-sm text-white/70 leading-relaxed">Peças, tecidos e proporcoes que pedem demissao imediata.</p>
                        </div>
                        <div className="border border-white/10 bg-black/20 p-5 rounded-[1.25rem]">
                          <p className="text-[10px] uppercase tracking-[0.3em] text-white/35 font-black">Evoluir</p>
                          <p className="mt-3 text-sm text-white/70 leading-relaxed">Versoes mais elegantes, mais acessiveis ou mais ousadas do mesmo look.</p>
                        </div>
                      </div>
                      <a
                        href="https://pay.kiwify.com.br/xxxxx"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-3 px-6 py-4 bg-[#D32F2F] text-white font-black uppercase tracking-[0.28em] text-[10px] transition-all hover:bg-[#B32626] rounded-full"
                      >
                        Desbloquear Correcao Premium <ArrowRight size={14} />
                      </a>
                    </div>
                  </div>
                )}

                {premiumFixGroups.length > 0 && (
                  <div className="pt-16 md:pt-24 border-t border-white/5 space-y-10 md:space-y-12">
                    <h4 className="text-[11px] md:text-[14px] uppercase tracking-[0.4em] md:tracking-[0.8em] text-white/20 font-black">Plano Premium de Reabilitacao</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
                      {premiumFixGroups.map((group, index) => (
                        <div key={`${group.title}-${index}`} className="border border-[#D32F2F]/18 bg-[#140505] p-5 md:p-6 space-y-4">
                          <p className="text-[10px] uppercase tracking-[0.35em] text-[#FFB0B0] font-black">{group.title}</p>
                          <div className="space-y-3">
                            {group.items.map((item, itemIndex) => (
                              <p key={`${group.title}-${itemIndex}`} className="text-sm md:text-base text-white/70 leading-relaxed">
                                {renderBoldText(item)}
                              </p>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="lg:col-span-4 space-y-12 md:space-y-20">
                <div className="p-6 md:p-8 lg:p-10 bg-white/[0.02] border border-white/5 space-y-8 md:space-y-12 md:sticky md:top-40 min-w-0">
                  
                  {/* Rating Visual Bar */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-end">
                      <h4 className="text-[10px] uppercase tracking-[0.4em] text-white/30 font-black">Editorial Viability</h4>
                      <span className="text-2xl font-serif italic text-white">{result.rating}%</span>
                    </div>
                    <div className="h-1 w-full bg-white/5 overflow-hidden">
                      <div 
                        className="h-full bg-white transition-all duration-[2000ms] ease-out" 
                        style={{ width: `${result.rating}%` }} 
                      />
                    </div>
                  </div>

                  <div className="space-y-10">
                    <h4 className="text-[10px] xl:text-[12px] uppercase tracking-[0.3em] xl:tracking-[0.5em] text-white/30 font-black border-b border-white/10 pb-4 break-words">Aquisições Mandatórias</h4>
                    <div className="flex flex-col gap-8">
                      {result.suggestedAccessories.map((item, i) => (
                        <div key={i} className="group flex flex-col gap-2">
                          <span className="text-[10px] uppercase tracking-[0.3em] text-white/20 block font-bold">Essencial 0{i+1}</span>
                          <span className="text-xl md:text-2xl font-serif italic text-white/40 group-hover:text-white transition-all">{renderBoldText(item)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-12 border-t border-white/5 space-y-8">
                    <h4 className="text-[10px] xl:text-[12px] uppercase tracking-[0.3em] xl:tracking-[0.5em] text-white/30 font-black break-words">Status de Publicação</h4>
                    <div className="flex items-center gap-4 xl:gap-6">
                       <div className={`w-6 h-6 rounded-full ${editorialVerdict?.rarity === 'legendary' ? 'bg-[#FF4D4D] shadow-[0_0_22px_rgba(255,77,77,0.45)]' : 'bg-[#D32F2F] shadow-[0_0_20px_rgba(211,47,47,0.35)]'}`} />
                       <span className="text-xs md:text-sm uppercase tracking-[0.35em] font-black text-white/80">{editorialVerdict?.title}</span>
                    </div>
                    <p className="text-[11px] text-white/20 italic leading-loose uppercase tracking-[0.2em]">
                      Decidido por Miranda Priestly. Incontestável. "Isso é tudo."
                    </p>
                  </div>

                  <div className="flex flex-col gap-4 w-full mt-10">
                    {showSharePrompt && (
                      <button 
                        onClick={shareVerdict}
                        disabled={isExporting}
                        className="w-full py-6 bg-[#D32F2F] text-white hover:bg-[#B32626] transition-all uppercase text-[8px] xl:text-[10px] tracking-[0.2em] xl:tracking-[0.4em] font-black group flex items-center justify-center gap-3 shadow-[0_0_50px_rgba(211,47,47,0.18)]"
                      >
                        {isExporting ? 'Processando..' : <><Share2 size={14} /> Publicar Vergonha Editorial</>}
                      </button>
                    )}
                    <button 
                      onClick={exportVerdict}
                      disabled={isExporting}
                      className="w-full py-6 bg-transparent border border-white text-white hover:bg-white hover:text-black transition-all uppercase text-[8px] xl:text-[10px] tracking-[0.2em] xl:tracking-[0.4em] font-black group flex items-center justify-center gap-3"
                    >
                      {isExporting ? 'Processando..' : <><Download size={14} /> Exportar Capa</>}
                    </button>
                    <button 
                      onClick={reset}
                      className="w-full py-6 bg-white text-black hover:bg-neutral-200 transition-all uppercase text-[8px] xl:text-[10px] tracking-[0.2em] xl:tracking-[0.4em] font-black group shadow-[0_0_40px_rgba(255,255,255,0.05)] flex items-center justify-center gap-3"
                    >
                      <RefreshCw size={14} className="group-hover:rotate-180 transition-transform duration-1000" /> Nova Audiência
                    </button>
                    {showSharePrompt && (
                      <p className="text-[10px] uppercase tracking-[0.28em] text-[#FFB0B0]/70 leading-relaxed text-center">
                        Isso esta humilhante o suficiente para virar story.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <canvas ref={canvasRef} className="hidden" />

      {/* Export Template - Hidden from view */}
      {result && image && (
        <div style={{ position: 'absolute', top: 0, left: '-9999px', width: '1080px', height: '1620px', pointerEvents: 'none' }}>
          <div ref={exportRef} className="w-[1080px] h-[1620px] relative flex flex-col overflow-hidden font-sans text-white bg-[#1A1A1A]">

            {/* Background Image / Photography */}
            <div className="absolute inset-0 z-0">
              <img 
                src={image} 
                crossOrigin="anonymous" 
                className="w-full h-full object-cover" 
                alt="Background" 
              />
              {/* Rich saturated contrast mapping - Vogue meets street culture */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-[#1A1A1A] z-10"></div>
              {/* Added subtle texture/grain overlay */}
              <div className="absolute inset-0 opacity-10 mix-blend-overlay z-[11]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")' }}></div>
            </div>

            {/* Masthead: "RUNWAY" */}
            <div className="absolute top-12 left-0 right-0 z-20 flex justify-center w-full px-12">
              <h1 className="text-[10rem] font-serif tracking-tighter leading-none text-white drop-shadow-2xl mix-blend-difference opacity-90 uppercase" style={{ fontFamily: 'Didot, "Times New Roman", Times, serif' }}>
                RUNWAY
              </h1>
            </div>

            {/* Additional Magazine Headers */}
            <div className="absolute top-[280px] left-16 z-20 flex flex-col items-start uppercase">
               <span className="text-white/80 tracking-[0.6em] text-sm font-bold border-b border-[#D32F2F] pb-2 mb-2">Issue No. 4</span>
               <span className="text-white/60 tracking-[0.4em] text-xs">The Critical Edition</span>
            </div>

            <div className="absolute top-[276px] right-16 z-20">
              <div className="border border-[#D32F2F]/50 bg-[#240303]/80 px-5 py-3 uppercase tracking-[0.35em] text-[10px] font-black text-[#FFD8D8]">
                {campaignState.isLive ? 'Runway Season Live' : `Runway Season · ${campaignState.countdownLabel}`}
              </div>
              <p className="mt-3 text-right text-[10px] uppercase tracking-[0.35em] text-white/55 font-black">
                {activeChallenge.label}
              </p>
            </div>

            {/* Primary Headlines & Asymmetrical Grid */}
            <div className="absolute top-[380px] left-16 z-30 max-w-[500px]">
              <div className="space-y-3">
                <p className="text-[#FFB0B0] text-sm font-black uppercase tracking-[0.45em]">
                  {editorialVerdict?.strapline}
                </p>
                <p className="text-white text-4xl font-bold uppercase tracking-[0.18em] mix-blend-difference leading-tight">
                  {editorialVerdict?.title}
                </p>
                <div className="w-16 h-1 bg-[#D32F2F] mt-2 mb-2"></div>
                <p className="text-white/90 text-sm uppercase tracking-widest font-medium">Share cut for Stories, Reels and Status.</p>
              </div>
            </div>

            {/* Score Element - Selo Miranda */}
            <div className="absolute top-[400px] right-16 z-30">
              <div className="w-56 h-56 rounded-full bg-[#8B0000]/88 backdrop-blur-sm flex flex-col justify-center items-center shadow-[0_0_60px_rgba(139,0,0,0.45)] border-[3px] border-[#FFD6D6]/90 p-2 relative overflow-hidden group">
                <div className="absolute inset-2 rounded-full border border-[#FFD6D6]/45 dashed outline-dashed outline-1 outline-[#FFD6D6]/30"></div>
                <div className="z-10 flex flex-col items-center">
                  <p className="text-white/90 text-[11px] font-bold uppercase tracking-[0.4em] mb-1 text-center">
                    SELO MIRANDA<br/>DE AVALIAÇÃO
                  </p>
                  <p className="text-white text-7xl font-serif italic font-black leading-none my-2 drop-shadow-lg">{result.rating}%</p>
                  <div className="flex gap-1 items-center justify-center">
                    <span className="w-2 h-2 rounded-full bg-[#D32F2F]"></span>
                    <span className="w-2 h-2 rounded-full bg-[#D32F2F]"></span>
                    <span className="w-2 h-2 rounded-full bg-[#D32F2F]"></span>
                  </div>
                </div>
              </div>
            </div>

            {/* Critical Commentary Box */}
            <div className="absolute bottom-[280px] left-16 right-16 z-30 bg-[#1A1A1A]/80 backdrop-blur-md border-l-8 border-[#D32F2F] p-8 shadow-2xl">
               <h3 className="text-white text-[28px] font-serif italic leading-[1.5] text-left opacity-95">
                 &ldquo;{result.lead}&rdquo;
               </h3>
            </div>

            {/* Section Labels & Secondary Info */}
            <div className="absolute bottom-[80px] left-16 z-30 max-w-[700px] flex gap-4 items-stretch">
               <div className="w-2 bg-[#D32F2F] flex-shrink-0 mt-1"></div>
               <div className="py-1">
                  <h4 className="text-white text-xl font-bold uppercase tracking-[0.2em] mb-1 shadow-black drop-shadow-md">{result.sections[0]?.title}</h4>
                  <p className="text-white/80 text-sm leading-relaxed" style={{ display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{result.sections[0]?.content}</p>
               </div>
            </div>

            <div className="absolute bottom-[84px] right-16 z-30 text-right max-w-[250px]">
              <p className="text-[10px] uppercase tracking-[0.35em] text-[#FFB0B0] font-black">Runway App</p>
              <p className="mt-2 text-white/75 text-sm leading-relaxed">
                {result.shareCaption || `Miranda me deu ${result.rating}% e um ${editorialVerdict?.title.toLowerCase()}.`}
              </p>
            </div>

            {/* Bottom Elements: Barcode */}
            <div className="absolute bottom-12 right-16 z-40 flex flex-col items-end gap-2">
              <p className="text-white/40 text-[10px] uppercase font-bold tracking-[0.3em]">RUNWAY INFO</p>
              <div className="bg-white p-3 shadow-xl">
                <div className="flex flex-col items-center">
                  <div className="w-40 h-12 flex gap-[2px] items-end justify-between px-1">
                     {[...Array(35)].map((_,i) => <div key={i} className="bg-black h-full" style={{width: Math.random() * 3 + 1 + 'px'}}></div>)}
                  </div>
                  <div className="w-full flex justify-between text-[10px] font-mono tracking-widest pt-1 font-bold text-black mt-1 border-t border-black/20">
                    <span>ISSN 8921</span>
                    <span>MIRANDA</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <footer className="mt-40 py-24 px-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-16 opacity-10 hover:opacity-100 transition-all duration-1000">
        <div className="text-[10px] uppercase tracking-[1em] font-light">
          &copy; {new Date().getFullYear()} Runway International Group
        </div>
        <div className="flex gap-20 text-[10px] uppercase tracking-[0.6em] font-black">
          <a href="#" className="hover:text-white transition-colors">Paris</a>
          <a href="#" className="hover:text-white transition-colors">Milan</a>
          <a href="#" className="hover:text-white transition-colors">New York</a>
          <a href="#" className="hover:text-white transition-colors">London</a>
        </div>
      </footer>
    </div>
  );
};

export default App;
