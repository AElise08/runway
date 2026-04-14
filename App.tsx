import React, { useState, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import Header from './components/Header';
import VerdictBadge from './components/VerdictBadge';
import { analyzeLook as analyzeLookGemini } from './services/geminiService';
import { analyzeLook as analyzeLookMistral } from './services/mistralService';
import { AnalysisContext, CritiqueResult, AppState } from './types';
import { RefreshCw, Quote, Sparkles, X, CameraOff, Clock, Download, Share2 } from 'lucide-react';

const MAX_EXPORT_DIMENSION = 3840;
const MAX_DISPLAY_DIMENSION = 1920;
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
}

const CHALLENGE_OPTIONS: ChallengeOption[] = [
  {
    key: 'none',
    label: 'Julgamento Livre',
    frameLabel: 'Free Roast',
    promptContext: 'Faça uma análise editorial geral, sem assumir dress code específico.',
    teaser: 'Para quem quer só descobrir se o look merece humilhação pública.',
  },
  {
    key: 'office',
    label: 'Look de Trabalho',
    frameLabel: 'Office Trial',
    promptContext: 'Considere ambiente de trabalho, autoridade visual, elegância e competência percebida.',
    teaser: 'Testa se a produção transmite competência ou caos corporativo.',
  },
  {
    key: 'date-night',
    label: 'Date Night',
    frameLabel: 'Date Night',
    promptContext: 'Considere atração, intenção, sensualidade controlada e coerência noturna.',
    teaser: 'Ideal para ver se o look seduz ou pede desculpas por existir.',
  },
  {
    key: 'first-impression',
    label: 'Primeira Impressão',
    frameLabel: 'First Impression',
    promptContext: 'Considere impacto imediato, confiança, clareza de estilo e memorabilidade.',
    teaser: 'Mede se você chega como presença ou como ruído visual.',
  },
  {
    key: 'fashion-week',
    label: 'Fashion Week',
    frameLabel: 'Fashion Week',
    promptContext: 'Considere repertório fashion, intenção editorial, ousadia e sofisticação visual.',
    teaser: 'Para descobrir se existe moda ali ou só figurino nervoso.',
  },
];

const LANDING_PILLARS = [
  {
    title: 'Roast Compartilhavel',
    body: 'Um veredito memoravel, visualmente forte e pronto para virar story antes da dignidade voltar.',
  },
  {
    title: 'Desafios Tematicos',
    body: 'Look de trabalho, date night e outros contextos para aumentar comparacao, curiosidade e retorno.',
  },
  {
    title: 'Diagnostico Direto',
    body: 'Receba um parecer editorial rapido, seco e compartilhavel sem cadastro, plano ou atrito.',
  },
];

const LANDING_FLOW = [
  {
    step: '01',
    title: 'Escolha o contexto',
    body: 'Defina se a analise sera geral, para trabalho, encontro, primeira impressao ou fashion week.',
  },
  {
    step: '02',
    title: 'Envie o look',
    body: 'Use a camera ou importe uma foto e receba um Runway Index com comentario editorial.',
  },
  {
    step: '03',
    title: 'Compartilhe o veredito',
    body: 'Exporte a capa e publique o julgamento enquanto a dignidade ainda esta em choque.',
  },
];

const DAILY_USAGE_LIMIT = 3;

const getTodayUsageCount = () => {
  const today = new Date().toDateString();
  const savedDate = localStorage.getItem('miranda_usage_date');
  if (savedDate !== today) {
    localStorage.setItem('miranda_usage_date', today);
    localStorage.setItem('miranda_usage_count', '0');
    return 0;
  }
  const saved = localStorage.getItem('miranda_usage_count');
  return saved ? parseInt(saved, 10) : 0;
};

const EDITORIAL_HERO_BACKGROUND = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
  <svg width="1600" height="1200" viewBox="0 0 1600 1200" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="1600" height="1200" fill="#050505"/>
    <defs>
      <radialGradient id="redGlow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(1210 280) rotate(90) scale(430 430)">
        <stop stop-color="#D32F2F" stop-opacity="0.9"/>
        <stop offset="1" stop-color="#D32F2F" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="whiteMist" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(420 980) rotate(90) scale(260 620)">
        <stop stop-color="#F7F4EF" stop-opacity="0.95"/>
        <stop offset="1" stop-color="#F7F4EF" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="silverFade" x1="930" y1="80" x2="1320" y2="880" gradientUnits="userSpaceOnUse">
        <stop stop-color="#F5F2EC" stop-opacity="0.55"/>
        <stop offset="0.5" stop-color="#BBB4AE" stop-opacity="0.18"/>
        <stop offset="1" stop-color="#F5F2EC" stop-opacity="0"/>
      </linearGradient>
      <filter id="blurXL" x="-200" y="-200" width="2000" height="1600" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
        <feGaussianBlur stdDeviation="46"/>
      </filter>
      <filter id="grain" x="0" y="0" width="100%" height="100%" filterUnits="objectBoundingBox">
        <feTurbulence type="fractalNoise" baseFrequency="0.82" numOctaves="2" stitchTiles="stitch"/>
        <feColorMatrix type="saturate" values="0"/>
        <feComponentTransfer>
          <feFuncA type="table" tableValues="0 0.06"/>
        </feComponentTransfer>
      </filter>
    </defs>

    <ellipse cx="1220" cy="290" rx="430" ry="430" fill="url(#redGlow)" filter="url(#blurXL)"/>
    <ellipse cx="390" cy="1030" rx="620" ry="260" fill="url(#whiteMist)" filter="url(#blurXL)"/>

    <g opacity="0.9">
      <path d="M1074 126C1177 136 1264 240 1272 364C1284 566 1178 756 1112 884C1072 960 1021 1032 950 1088L886 1040C922 964 944 876 944 774C944 620 896 504 900 356C903 248 976 116 1074 126Z" fill="url(#silverFade)"/>
      <circle cx="1088" cy="210" r="70" fill="#F5F2EC" fill-opacity="0.24"/>
      <rect x="1010" y="260" width="176" height="450" rx="88" fill="#F5F2EC" fill-opacity="0.1"/>
    </g>

    <path d="M1236 0H1600V554C1485 610 1366 645 1268 648C1339 498 1378 334 1236 0Z" fill="#190606" fill-opacity="0.7"/>
    <path d="M1115 1138L1600 930V1200H979L1115 1138Z" fill="#7E1010" fill-opacity="0.42"/>

    <g opacity="0.18" stroke="#FFFFFF">
      <path d="M920 128V1024"/>
      <path d="M1008 128V1024"/>
      <path d="M1096 128V1024"/>
      <path d="M1184 128V1024"/>
      <path d="M1272 128V1024"/>
    </g>

    <rect x="0" y="0" width="1600" height="1200" filter="url(#grain)"/>
  </svg>
`)}`;

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

const VERDICT_POOL = {
  legendary_nod: [
    { title: 'Aprovada Com Severo Desgosto', strapline: 'raridade lendaria', shareHook: 'Miranda aprovou meu look com severo desgosto. Isso nao acontece.' },
    { title: 'O Unico Aceno Da Temporada', strapline: 'fenomeno editorial', shareHook: 'Recebi o unico aceno da temporada. Miranda disse que sim.' },
    { title: 'Milagre Couture', strapline: 'acontecimento historico', shareHook: 'Miranda Priestly disse que meu look era quase perfeito. Quase.' },
  ],
  rare_nod: [
    { title: 'Sobreviveu a Reuniao', strapline: 'veredito raro', shareHook: 'Sobrevivi a reuniao editorial da Runway.' },
    { title: 'Passou Pelo Olhar Sem Suspiro', strapline: 'aprovacao silenciosa', shareHook: 'Miranda me olhou e nao suspirou. Isso e vitoria na Runway.' },
    { title: 'Veredito De Tolerancia', strapline: 'aprovacao a contragosto', shareHook: 'Miranda me tolerou. Para ela, isso e quase um elogio.' },
  ],
  common_nod: [
    { title: 'Passou Por Um Fio De Seda', strapline: 'aprovacao tensa', shareHook: 'Passei por um fio de seda no comite da Runway.' },
    { title: 'Inofensiva. Infelizmente.', strapline: 'neutro editorial', shareHook: 'Miranda disse que meu look era inofensivo. Isso e pior que uma critica.' },
    { title: 'Aceitavel Para Uma Estagiaria', strapline: 'damacao condescendente', shareHook: 'Miranda disse que meu look era aceitavel para uma estagiaria. Choro.' },
  ],
  legendary_drop: [
    { title: 'Demitida Antes Do Cafe', strapline: 'veredito lendario', shareHook: 'Meu look foi demitido antes do cafe da manha.' },
    { title: 'Declarada Persona Non Grata', strapline: 'expulsao editorial', shareHook: 'Miranda me declarou persona non grata na Runway. Look e tudo.' },
    { title: 'O Pior Look Da Decada', strapline: 'catastrofe historica', shareHook: 'Miranda disse que meu look e o pior da decada. Ela guarda estatisticas.' },
    { title: 'Isso E Um Crime Couture', strapline: 'violacao editorial', shareHook: 'Miranda quer que eu seja processada por crime contra a moda.' },
  ],
  rare_drop: [
    { title: 'Ceruleo Sem Salvacao', strapline: 'veredito raro', shareHook: 'Recebi um ceruleo sem salvacao da Miranda.' },
    { title: 'Tragedia Em Tres Camadas', strapline: 'colapso de silhueta', shareHook: 'Miranda chamou meu look de tragedia em tres camadas. Ela contou.' },
    { title: 'Archivada Por Falta De Proposito', strapline: 'descarte editorial', shareHook: 'Fui archivada pela Miranda. Meu look nao teve proposito editorial.' },
  ],
  medium_drop: [
    { title: 'Demitida Da Runway', strapline: 'queda editorial', shareHook: 'Meu look foi demitido da Runway.' },
    { title: 'Revisao Sem Volta', strapline: 'caso perdido', shareHook: 'Miranda entrou em revisao permanente do meu look. Nao tem volta.' },
    { title: 'O Que Voce Estava Pensando', strapline: 'questionamento editorial', shareHook: 'Miranda perguntou o que eu estava pensando. Ela nao queria resposta.' },
  ],
  common_drop: [
    { title: 'Sob Revisao Hostil', strapline: 'observacao disciplinar', shareHook: 'Meu look entrou sob revisao hostil na Runway.' },
    { title: 'Mediocridade Documentada', strapline: 'archivo editorial', shareHook: 'Miranda documentou minha mediocridade. Para nao esquecer.' },
    { title: 'Aqui Nao E A Riachuelo', strapline: 'correcao de rota', shareHook: 'Miranda me lembrou que aqui nao e a Riachuelo. Com desdém.' },
  ],
};

const pickRandom = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const getEditorialVerdictMeta = (result: CritiqueResult): EditorialVerdictMeta => {
  if (result.verdict === 'The Nod') {
    if (result.rating >= 90) {
      const v = pickRandom(VERDICT_POOL.legendary_nod);
      return { ...v, rarity: 'legendary' };
    }
    if (result.rating >= 75) {
      const v = pickRandom(VERDICT_POOL.rare_nod);
      return { ...v, rarity: 'rare' };
    }
    const v = pickRandom(VERDICT_POOL.common_nod);
    return { ...v, rarity: 'common' };
  }

  if (result.rating <= 15) {
    const v = pickRandom(VERDICT_POOL.legendary_drop);
    return { ...v, rarity: 'legendary' };
  }

  if (result.rating <= 30) {
    const v = pickRandom(VERDICT_POOL.rare_drop);
    return { ...v, rarity: 'rare' };
  }

  if (result.rating <= 45) {
    const v = pickRandom(VERDICT_POOL.medium_drop);
    return { ...v, rarity: 'rare' };
  }

  const v = pickRandom(VERDICT_POOL.common_drop);
  return { ...v, rarity: 'common' };
};

const shouldPromptShare = (result: CritiqueResult, verdictMeta: EditorialVerdictMeta) => {
  return result.rating <= 35 || verdictMeta.rarity !== 'common' || result.lead.length <= 120;
};

const getChallengeOption = (key: ChallengeKey) => {
  return CHALLENGE_OPTIONS.find((option) => option.key === key) ?? CHALLENGE_OPTIONS[0];
};

const dataUrlToBlob = async (dataUrl: string) => {
  const response = await fetch(dataUrl);
  return response.blob();
};

const App: React.FC = () => {
  const [state, setState] = useState<AppState | 'camera'>('idle');
  const [image, setImage] = useState<string | null>(null);
  const [exportImage, setExportImage] = useState<string | null>(null);
  const [result, setResult] = useState<CritiqueResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [selectedChallengeKey, setSelectedChallengeKey] = useState<ChallengeKey>('none');
  const [activeChallengeKey, setActiveChallengeKey] = useState<ChallengeKey>('none');
  const [isExporting, setIsExporting] = useState(false);
  const [usageCount, setUsageCount] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    return getTodayUsageCount();
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  const campaignState = getCampaignState();
  const editorialVerdict = result ? getEditorialVerdictMeta(result) : null;
  const showSharePrompt = result && editorialVerdict ? shouldPromptShare(result, editorialVerdict) : false;
  const selectedChallenge = getChallengeOption(selectedChallengeKey);
  const activeChallenge = getChallengeOption(activeChallengeKey);
  const remainingUses = Math.max(0, DAILY_USAGE_LIMIT - usageCount);
  const isLimitReached = usageCount >= DAILY_USAGE_LIMIT;

  const startCamera = async () => {
    if (isLimitReached) {
      setError('Limite diário de 3 análises atingido. Tente novamente amanhã.');
      return;
    }
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
        const displayDataUrl = createImageDataUrl({
          source: canvas,
          width,
          height,
          maxDimension: MAX_DISPLAY_DIMENSION,
          quality: 0.9,
        });
        setImage(displayDataUrl);

        const exportDataUrl = createImageDataUrl({
          source: canvas,
          width,
          height,
          maxDimension: MAX_EXPORT_DIMENSION,
          quality: 0.95,
        });
        setExportImage(exportDataUrl);

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
          const displayDataUrl = createImageDataUrl({
            source: img,
            width: img.width,
            height: img.height,
            maxDimension: MAX_DISPLAY_DIMENSION,
            quality: 0.92,
          });
          setImage(displayDataUrl);

          const exportDataUrl = createImageDataUrl({
            source: img,
            width: img.width,
            height: img.height,
            maxDimension: MAX_EXPORT_DIMENSION,
            quality: 1.0,
          });
          setExportImage(exportDataUrl);

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
      let jsonStr: string;
      try {
        // Tentativa principal: Gemini
        jsonStr = await analyzeLookGemini(base64, challengeContext);
      } catch (geminiErr: any) {
        // Fallback: Mistral (caso o Gemini esteja fora ou com quota esgotada)
        console.warn("Gemini falhou, usando Mistral como fallback:", geminiErr?.message || geminiErr);
        jsonStr = await analyzeLookMistral(base64, challengeContext);
      }

      // JSON parse seguro — evita tela branca silenciosa se a IA retornar algo inesperado
      let parsed: CritiqueResult;
      try {
        parsed = JSON.parse(jsonStr);
        // Garantir campos obrigatórios mínimos
        if (!parsed.verdict) parsed.verdict = 'The Purse Drop';
        if (typeof parsed.rating !== 'number') parsed.rating = 0;
        if (!parsed.lead) parsed.lead = 'Miranda escolheu o silêncio como resposta.';
        if (!Array.isArray(parsed.sections)) parsed.sections = [];
        if (!Array.isArray(parsed.fashionTips)) parsed.fashionTips = [];
        if (!Array.isArray(parsed.suggestedAccessories)) parsed.suggestedAccessories = [];
      } catch (_parseErr) {
        console.error('JSON inválido da IA - resposta não parseável');
        throw new Error('Miranda teve um surto e a resposta saiu incoerente. Tente novamente.');
      }

      setResult(parsed);

      const newCount = usageCount + 1;
      setUsageCount(newCount);
      localStorage.setItem('miranda_usage_count', newCount.toString());

      setState('result');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error("Analysis Error (Gemini + Mistral falharam):", err);
      const errorMsg = err?.message || err?.toString() || "";
      if (errorMsg.includes("429") || errorMsg.includes("quota") || errorMsg.includes("Too Many Requests")) {
        setError("Miranda está em uma reunião com Donatella. Ela não tem tempo para você agora. Isso ocorre pelo altíssimo volume de acessos na IA. Tente novamente em 20 segundos.");
      } else if (errorMsg.includes("401") || errorMsg.includes("key") || errorMsg.toLowerCase().includes("unauthorized")) {
        setError("Erro técnico: Chave de API inválida ou não configurada. Demitam a TI.");
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
    setExportImage(null);
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

      // Copia o texto para a área de transferência antes de compartilhar
      try { await navigator.clipboard.writeText(shareText); } catch (_) {}

      const blob = await dataUrlToBlob(dataUrl);
      const file = new File([blob], 'runway-season.png', { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'Runway Lumes',
          text: shareText,
          files: [file],
        });
        return;
      }

      const link = document.createElement('a');
      link.download = 'runway-season-share.png';
      link.href = dataUrl;
      link.click();
      setError('Capa baixada + legenda copiada! Cole nos Stories, Reels ou TikTok.');
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
    <div className={`min-h-screen transition-colors duration-1000 relative w-full ${state === 'idle' ? 'bg-[#FAFAFA] text-[#111111] selection:bg-black selection:text-white' : 'bg-[#0a0a0a] text-white selection:bg-white selection:text-black'}`}>
      <Header />

      <main className="w-full">
        {state === 'idle' && (
          <div className="animate-in fade-in duration-1000 w-full flex flex-col items-center">
            {/* Full-width seamless hero background */}
            <div className="absolute top-0 left-0 w-full h-[85vh] md:h-[95vh] z-0 pointer-events-none overflow-hidden">
               <img src="/fashion-bg.png" alt="Editorial Fashion Frame" className="w-full h-full object-cover object-top opacity-95" />
               <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/40 to-[#FAFAFA]" />
            </div>

            <div
              id="landing-hero"
              className="relative z-10 w-full max-w-6xl mx-auto pt-44 md:pt-56 px-4"
            >
              <div className="relative flex flex-col items-center text-center w-full">
                <div className="max-w-4xl space-y-6 mt-8 flex flex-col items-center">
                  <img src="/info.png" alt="The Devil Wears Prada 2" className="w-full max-w-lg md:max-w-2xl object-contain drop-shadow-2xl" />
                  <p className="max-w-2xl mx-auto text-base md:text-xl text-white/90 leading-relaxed font-medium drop-shadow-md">
                    Comece a entender onde o seu look funciona e onde ele precisa de correção profissional em segundos.
                  </p>
                </div>

                <div className="mt-14 w-full max-w-4xl">
                  <div className="rounded-[1.5rem] bg-white border border-black/5 p-4 md:p-6 shadow-[0_12px_40px_rgba(0,0,0,0.04)]">
                    <div className="flex flex-col gap-4 text-left">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                        <p className="text-[11px] uppercase tracking-[0.2em] text-black font-bold">1. Escolha a Avaliação</p>
                        <p className="text-xs text-black/50 font-medium">{selectedChallenge.teaser}</p>
                      </div>
                      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                        {CHALLENGE_OPTIONS.map((challenge) => (
                          <button
                            key={challenge.key}
                            onClick={() => setSelectedChallengeKey(challenge.key)}
                            className={`rounded-xl border px-3 py-3 md:py-4 text-center transition-all ${
                              selectedChallenge.key === challenge.key
                                ? 'border-black bg-black text-white shadow-md scale-100'
                                : 'border-black/10 bg-[#FAFAFA] text-black/60 hover:bg-black/5 hover:text-black scale-[0.98]'
                            }`}
                          >
                            <span className="block text-[10px] md:text-xs font-bold leading-tight">
                              {challenge.label}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex flex-col items-center gap-5 w-full">
                  <div className="flex flex-col sm:flex-row gap-4 w-full max-w-xl justify-center z-20">
                      <button
                        onClick={startCamera}
                        disabled={isLimitReached}
                        className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-black text-white font-bold text-sm transition-all hover:-translate-y-1 hover:shadow-xl w-full sm:w-auto disabled:opacity-50 disabled:pointer-events-none"
                      >
                        Usar a Câmera
                      </button>
                    <label className="cursor-pointer inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full border border-black/20 bg-white text-black font-bold text-sm transition-all hover:bg-black/5 w-full sm:w-auto">
                      Importar Foto
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                    <div className="flex flex-col items-center gap-1 mt-2">
                      <span className="text-xs text-white/80 drop-shadow-sm font-semibold">
                        {remainingUses} de {DAILY_USAGE_LIMIT} análises gratuitas restantes hoje
                      </span>
                      {isLimitReached && (
                        <span className="text-[10px] text-[#FF7070] uppercase tracking-[0.25em]">
                          Limite atingido, volte amanhã.
                        </span>
                      )}
                    </div>
                  </div>
                </div>
            </div>

        {error && (
          <div className="max-w-md mx-auto mt-8 p-6 md:p-10 bg-red-950/5 border border-red-500/10 text-red-300 text-xs text-center font-serif italic rounded-[1.5rem] flex flex-col items-center gap-6 animate-in shake duration-500 relative z-10">
            {error.includes("reunião") ? <Clock className="text-red-500/20" size={48} /> : <CameraOff className="text-red-500/20" size={48} />}
            <p className="tracking-[0.2em] md:tracking-[0.4em] leading-loose uppercase text-[9px] md:text-[10px] font-black text-red-400/60">{error}</p>
            <button onClick={() => setError(null)} className="px-8 py-3 border border-white/10 text-white/40 hover:text-white text-[8px] md:text-[9px] uppercase tracking-[0.3em] md:tracking-[0.5em] transition-all font-black rounded-full">Dispensar</button>
          </div>
        )}

        <section id="landing-benefits" className="max-w-6xl mx-auto mt-16 md:mt-24 px-4 relative z-10">
              <div className="bg-[#111111] text-white rounded-[2.5rem] px-6 py-12 md:px-16 md:py-20 shadow-2xl relative overflow-hidden">
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at center, white 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
                
                <div className="max-w-3xl mx-auto text-center space-y-4 relative z-10">
                  <h3 className="text-3xl md:text-5xl font-serif font-bold text-white tracking-tight">O que você ganha</h3>
                  <p className="text-white/60 text-base md:text-lg">
                    Simplificamos a avaliação de imagem. Foco no que realmente importa, com ferramentas inteligentes.
                  </p>
                </div>
                
                <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
                  {LANDING_PILLARS.map((pillar) => (
                    <div key={pillar.title} className="rounded-2xl bg-white/5 border border-white/5 p-8 transition-all hover:bg-white/10">
                      <div className="w-12 h-12 rounded-xl bg-white text-black flex items-center justify-center font-bold text-lg mb-6">
                        +
                      </div>
                      <h4 className="text-xl font-bold text-white mb-3">{pillar.title}</h4>
                      <p className="text-white/50 text-sm leading-relaxed">{pillar.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section id="landing-flow" className="max-w-5xl mx-auto mt-20 md:mt-32 mb-10">
              <div className="text-center space-y-4 mb-16">
                <h3 className="text-3xl md:text-4xl font-serif font-bold text-black">Como Funciona</h3>
                <p className="text-black/50 text-base">Receba seu veredito editorial em três passos rápidos.</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
                {LANDING_FLOW.map((item, index) => (
                  <div key={item.step} className="flex flex-col items-center text-center group">
                    <div className="w-16 h-16 rounded-full bg-black text-white flex items-center justify-center text-xl font-bold mb-6 group-hover:scale-110 transition-transform shadow-lg">
                      {index + 1}
                    </div>
                    <h4 className="text-xl font-bold text-black mb-3">{item.title}</h4>
                    <p className="text-black/60 text-sm leading-relaxed max-w-xs">{item.body}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="w-full bg-[#050505] text-white py-24 md:py-32 rounded-t-[3rem] mt-32 text-center">
              <div className="max-w-3xl mx-auto px-6">
                <h3 className="text-3xl md:text-5xl font-serif font-bold text-white mb-6">Sua imagem editorial no automático.</h3>
                <p className="text-white/60 text-lg mb-10 max-w-xl mx-auto">
                  A avaliação final está a um clique no botão abaixo.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    className="px-10 py-4 bg-white text-black font-bold uppercase text-xs tracking-widest rounded-full hover:-translate-y-1 transition-transform"
                  >
                    Abrir a Câmera
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}

        {state === 'camera' && (
          <div className="fixed inset-0 z-[100] bg-[#050505] flex flex-col items-center justify-center animate-in fade-in duration-500">
            {/* Minimalist Top Nav for Camera */}
            <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-50">
               <div className="border border-white/10 bg-black/50 backdrop-blur-md px-4 py-2 uppercase tracking-[0.3em] text-[10px] font-black text-white/90">
                  {selectedChallenge.label}
               </div>
               <button onClick={reset} className="p-3 bg-black/40 backdrop-blur-3xl rounded-full hover:bg-white hover:text-black transition-all border border-white/10">
                 <X size={20} />
               </button>
            </div>

            {/* Viewfinder Container */}
            <div className="relative w-full h-full md:w-auto md:h-[85vh] md:aspect-[3/4] bg-neutral-950 overflow-hidden border-0 md:border md:border-white/10 shadow-[0_0_150px_rgba(255,255,255,0.02)] md:rounded-2xl flex-shrink-0">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted
                className={`w-full h-full object-cover transition-opacity duration-1000 ${isCameraReady ? 'opacity-100' : 'opacity-0'} scale-x-[-1]`} 
              />
              
              {!isCameraReady && (
                <div className="absolute inset-0 flex flex-col items-center justify-center space-y-6 bg-[#050505]">
                   <div className="w-10 h-10 border-[0.5px] border-white/10 border-t-white rounded-full animate-spin"></div>
                   <span className="text-[10px] uppercase tracking-[0.6em] text-white/20 font-black">Sincronizando Lente...</span>
                </div>
              )}

              {/* DSLR Frame Guides */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70%] h-[70%] border border-white/10 pointer-events-none hidden md:block">
                 <div className="absolute -top-1 -left-1 w-4 h-4 border-t-[1.5px] border-l-[1.5px] border-white/50"></div>
                 <div className="absolute -top-1 -right-1 w-4 h-4 border-t-[1.5px] border-r-[1.5px] border-white/50"></div>
                 <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-[1.5px] border-l-[1.5px] border-white/50"></div>
                 <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-[1.5px] border-r-[1.5px] border-white/50"></div>
                 {/* Center crosshair */}
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center group/cross">
                    <div className="w-[1px] h-full bg-white/20"></div>
                    <div className="w-full h-[1px] bg-white/20 absolute"></div>
                 </div>
              </div>

              {/* Shutter Component */}
              <div className="absolute bottom-10 left-0 right-0 flex justify-center pb-8 md:pb-4 z-50">
                <button 
                  onClick={capturePhoto}
                  disabled={!isCameraReady}
                  className={`relative w-24 h-24 rounded-full flex items-center justify-center bg-transparent group/btn active:scale-95 transition-all outline-none ${!isCameraReady ? 'opacity-20 pointer-events-none grayscale' : 'opacity-100 scale-100'}`}
                >
                  <div className="absolute inset-0 rounded-full border border-white/40 scale-100 transition-transform group-hover/btn:scale-105"></div>
                  <div className="w-20 h-20 rounded-full bg-white group-hover/btn:bg-neutral-200 transition-colors shadow-[0_0_40px_rgba(255,255,255,0.2)] flex items-center justify-center">
                    <div className="w-5 h-5 bg-[#050505] rounded-full shadow-inner" />
                  </div>
                </button>
              </div>

              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[0.4em] font-black text-white/30 hidden md:block">
                 Runway Editor
              </div>
            </div>
          </div>
        )}

        {state === 'analyzing' && (() => {
          const ANALYZING_PHRASES = [
            { quote: '"Isso é tudo."', sub: 'Miranda está decidindo se o seu look merece sequer um segundo olhar.' },
            { quote: '"Explique-me..."', sub: 'Miranda está verificando se você tem o direito de respirar o mesmo ar que a Runway.' },
            { quote: '"Interessante."', sub: 'Ela disse isso sem sorrir. Isso não é um elogio.' },
            { quote: '"Sério?"', sub: 'Miranda olhou para a foto e fez esta pergunta. Apenas esta pergunta.' },
            { quote: '"Por que?"', sub: 'Não há resposta certa. A pergunta em si já é o veredito.' },
            { quote: '"Estou esperando."', sub: 'O silêncio de Miranda é mais devastador do que qualquer crítica.' },
            { quote: '"Hm."', sub: 'Uma sílaba. É tudo que você vai receber antes da sentença.' },
            { quote: '"Que decepção."', sub: 'Ela ainda não terminou de analisar. Isso é só o começo.' },
          ];
          const phrase = ANALYZING_PHRASES[Math.floor(Date.now() / 1000) % ANALYZING_PHRASES.length];
          return (
            <div className="max-w-4xl mx-auto px-6 py-20 md:py-40 flex flex-col items-center justify-center space-y-16 md:space-y-24">
              <div className="relative w-40 h-40 md:w-56 md:h-56">
                <div className="absolute inset-0 border-[0.5px] border-white/5 rounded-full scale-125"></div>
                <div className="absolute inset-0 border-t-[0.5px] border-white rounded-full animate-spin duration-[4000ms]"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="text-white/10 animate-pulse" size={64} />
                </div>
              </div>
              <div className="text-center space-y-6 md:space-y-10 max-w-md">
                <h3 className="text-4xl md:text-6xl font-serif italic text-white/80 tracking-tighter animate-pulse">{phrase.quote}</h3>
                <p className="text-white/20 text-[8px] md:text-[10px] uppercase tracking-[0.4em] md:tracking-[0.8em] font-black leading-loose px-4">
                  {phrase.sub}
                </p>
              </div>
            </div>
          );
        })()}

        {state === 'result' && result && (
          <div className="animate-in fade-in slide-in-from-bottom-20 duration-1000">
            <div className="relative w-full h-[75vh] md:h-[80vh] lg:h-[85vh] bg-[#0a0a0a] border-b border-white/10 overflow-hidden flex flex-col justify-end">
              {/* Hero image — ou fundo sólido se a imagem não existir */}
              {image ? (
                <img
                  src={image}
                  alt="Editorial Shot"
                  className="w-full h-full object-cover absolute inset-0 grayscale-[0.05] contrast-[1.1]"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-[#1a0505] via-[#0a0a0a] to-[#0a0a0a]" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent z-10 pointer-events-none"></div>

              {/* Floating Result Info */}
              <div className="absolute bottom-8 md:bottom-20 lg:bottom-24 left-4 md:left-12 lg:left-24 right-4 md:right-8 flex flex-col items-start space-y-4 md:space-y-6 lg:space-y-8 z-20">
                <div className="border border-[#D32F2F]/45 bg-[#240303]/75 px-4 py-2 uppercase tracking-[0.35em] text-[8px] md:text-[9px] font-black text-[#FFD8D8]">
                  {campaignState.isLive ? 'Runway Lumes Ao Vivo' : `Runway Lumes · ${campaignState.countdownLabel}`}
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

                {/* ── MOMENTO UAU: Share imediato + comparação social ── */}
                <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center border border-white/8 bg-white/[0.03] p-5 md:p-6 rounded-[1.5rem] animate-in fade-in duration-700">
                  <div className="flex-1 space-y-1">
                    <p className="text-[10px] uppercase tracking-[0.35em] text-[#FFB0B0] font-black">Veredito Pronto</p>
                    <p className="text-white/80 text-sm md:text-base font-medium leading-snug">
                      {result.shareCaption || editorialVerdict?.shareHook || `${editorialVerdict?.title} — Runway Index ${result.rating}`}
                    </p>
                  </div>
                  <button
                    onClick={shareVerdict}
                    disabled={isExporting}
                    className="inline-flex items-center justify-center gap-2 px-6 py-4 bg-[#D32F2F] text-white font-black uppercase tracking-[0.25em] text-[10px] rounded-full hover:bg-[#B32626] transition-all flex-shrink-0"
                  >
                    <Share2 size={14} />
                    {isExporting ? 'Gerando...' : 'Publicar Agora'}
                  </button>
                </div>
                {/* ───────────────────────────────────────────────────── */}

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
                    <span>Runway Lumes</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#D32F2F]"></span>
                    <span>{editorialVerdict?.title}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#D32F2F]"></span>
                    <span>{campaignState.isLive ? 'janela cultural ativa' : campaignState.countdownLabel.toLowerCase()}</span>
                  </div>
                  <p className="mt-4 text-sm md:text-base text-white/60 leading-relaxed">
                    Resultado preparado para compartilhar durante a temporada. Quando o veredito fica raro ou humilhante o suficiente, a Runway Lumes quer que isso vire story.
                  </p>
                </div>

                <div className="space-y-16 md:space-y-24">
                  {result.sections.map((section, idx) => (
                    <div key={idx} className="space-y-6 md:space-y-8 group">
                      <div className="flex items-center gap-4">
                        <span className="text-[10px] md:text-xs uppercase tracking-[0.4em] md:tracking-[0.8em] text-white/20 font-black">CRÍTICA 0{idx + 1}</span>
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
      {result && exportImage && (
        <div style={{ position: 'absolute', top: 0, left: '-9999px', width: '1080px', height: '1620px', pointerEvents: 'none' }}>
          <div ref={exportRef} className="w-[1080px] h-[1620px] relative flex flex-col overflow-hidden font-sans text-white bg-[#1A1A1A]">

            {/* Background Image / Photography */}
            <div className="absolute inset-0 z-0">
              <div 
                className="w-full h-full bg-cover bg-center"
                style={{ backgroundImage: `url(${exportImage})` }}
              />
              {/* Rich saturated contrast mapping - Vogue meets street culture */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-[#1A1A1A] z-10 pointer-events-none"></div>
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
                {campaignState.isLive ? 'Runway Lumes Live' : `Runway Lumes · ${campaignState.countdownLabel}`}
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
              <p className="text-[10px] uppercase tracking-[0.35em] text-[#FFB0B0] font-black">Runway Lumes App</p>
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

      <footer className="w-full bg-[#050505] text-white/50 py-16 px-12 flex flex-col md:flex-row justify-between items-center gap-12 md:gap-16 transition-all duration-1000 z-50">
        <div className="text-[10px] uppercase tracking-[1em] font-light">
          &copy; {new Date().getFullYear()} Runway Lumes Group
        </div>
        <div className="flex flex-wrap justify-center gap-8 md:gap-20 text-[10px] uppercase tracking-[0.6em] font-black opacity-80">
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
