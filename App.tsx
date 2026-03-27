import React, { useState, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { User } from '@supabase/supabase-js';
import Header from './components/Header';
import VerdictBadge from './components/VerdictBadge';
import Auth from './components/Auth';
import { supabase } from './services/supabase';
import { analyzeLook } from './services/mistralService';
import { CritiqueResult, AppState, Profile } from './types';
import { RefreshCw, Quote, Sparkles, X, ChevronDown, CameraOff, Clock, Download } from 'lucide-react';

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

      let targetWidth = width;
      let targetHeight = height;
      const MAX_DIMENSION = 800;

      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
        targetWidth = width * ratio;
        targetHeight = height * ratio;
      }

      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.translate(targetWidth, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        setImage(dataUrl);
        
        const base64String = dataUrl.replace(/^data:image\/\w+;base64,/, "");
        stopCamera();
        processImage(base64String);
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
          let width = img.width;
          let height = img.height;
          const MAX_DIMENSION = 800;

          if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
            const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
            width = width * ratio;
            height = height * ratio;
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
            setImage(compressedDataUrl);
            const base64String = compressedDataUrl.replace(/^data:image\/\w+;base64,/, "");
            processImage(base64String);
          }
        };
        img.src = dataUrl;
      }
    };
    reader.onerror = () => {
      setError("Erro ao ler a imagem da galeria. Tente novamente ou desista.");
    };
    reader.readAsDataURL(file);
  };

  const processImage = async (base64: string) => {
    setState('analyzing');
    setError(null);

    try {
      const jsonStr = await analyzeLook(base64, isPremium);
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

  const exportVerdict = async () => {
    if (!exportRef.current) return;
    try {
      setIsExporting(true);
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
      const dataUrl = canvas.toDataURL('image/png');
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
          <div className="max-w-5xl mx-auto px-6 py-12 md:py-24 flex flex-col items-center text-center space-y-12 md:space-y-16 animate-in fade-in duration-1000">
            <div className="space-y-6 md:space-y-8">
              <h2 className="text-4xl md:text-6xl lg:text-7xl font-serif italic text-white/90 tracking-tighter leading-tight md:leading-none max-w-4xl mx-auto break-words px-4">"Florais?<br /> Para a primavera?<br /> Inovador."</h2>
              <p className="text-white/40 max-w-lg mx-auto leading-relaxed text-[10px] md:text-[12px] uppercase tracking-[0.4em] md:tracking-[0.6em] font-light px-4">
                A Edição de Setembro exige perfeição. Mostre-me sua melhor composição ou retire-se imediatamente.
              </p>
            </div>

            {isBlocked ? (
              <div className="max-w-md mx-auto p-12 bg-[#1a1a1a] border border-white/20 text-center space-y-8 animate-in mt-12 shadow-[0_0_100px_rgba(255,255,255,0.05)]">
                <h3 className="text-3xl font-serif italic text-white/90">Acesso Restrito</h3>
                <p className="text-sm font-light leading-relaxed text-white/60">
                  Miranda se recusa a aturar mais doentices visuais de graça. Assine o Passe Front Row para ter a mentoria real dela e 20 análises diárias.
                </p>
                <a 
                  href="https://pay.kiwify.com.br/xxxxx" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block px-12 py-5 bg-white text-black font-black uppercase tracking-[0.4em] text-[10px] transition-all hover:bg-neutral-300 w-full mb-4 text-center"
                >
                  Assinar Passe Front Row VIP
                </a>
                <p className="text-[9px] uppercase tracking-[0.2em] font-bold text-white/40 italic">
                  Faça login com o mesmo email usado na compra após o pagamento.
                </p>
                
                <button onClick={() => { localStorage.setItem('miranda_usage_count', '0'); window.location.reload(); }} className="px-4 py-2 border border-white/10 text-white/40 hover:text-white text-[9px] uppercase tracking-[0.5em] transition-all font-black mt-6 inline-block">Resetar Limite (Dev)</button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 w-full">
                <div className="flex flex-col md:flex-row gap-4 w-full md:max-w-[500px] justify-center">
                  <button 
                    onClick={startCamera}
                    className="group relative px-6 md:px-12 py-6 md:py-10 bg-white text-black font-black uppercase tracking-[0.2em] md:tracking-[0.4em] text-[10px] md:text-[11px] transition-all hover:bg-neutral-200 active:scale-95 shadow-[0_0_80px_rgba(255,255,255,0.1)] w-full text-center leading-relaxed"
                  >
                    Iniciar Audiência
                  </button>
                  <label 
                    className="cursor-pointer group relative px-6 md:px-12 py-6 md:py-10 bg-transparent border border-white text-white font-black uppercase tracking-[0.2em] md:tracking-[0.4em] text-[10px] md:text-[11px] transition-all hover:bg-white/10 active:scale-95 shadow-[0_0_80px_rgba(255,255,255,0.05)] w-full text-center leading-relaxed flex items-center justify-center gap-2 m-0"
                  >
                    Importar Galeria
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleFileUpload} 
                      className="hidden" 
                    />
                  </label>
                </div>
                <span className="text-[9px] md:text-[10px] text-white/40 uppercase tracking-[0.3em] font-bold text-center px-4">
                  {isPremium ? `${maxUses - (profile?.daily_looks || 0)} Análises Premium Restantes Hoje` : `${maxUses - usageCount} Avaliações Gratuitas Restantes`}
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

            <div className="pt-16 md:pt-32 grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-20 border-t border-white/5 w-full text-left">
              <div className="space-y-4 md:space-y-6">
                <span className="text-[10px] font-black uppercase tracking-[0.5em] text-white/20">Artigo I</span>
                <h4 className="font-serif text-2xl md:text-3xl italic">A Tirania do Caimento</h4>
                <p className="text-xs text-white/40 leading-relaxed font-light">O desleixo com a silhueta é o primeiro sinal de uma mente medíocre. Miranda não tolera o disforme.</p>
              </div>
              <div className="space-y-4 md:space-y-6 md:border-l md:border-white/5 md:pl-12 pt-8 md:pt-0 border-t border-white/5 md:border-t-0">
                <span className="text-[10px] font-black uppercase tracking-[0.5em] text-white/20">Artigo II</span>
                <h4 className="font-serif text-2xl md:text-3xl italic">Acessórios ou Armas?</h4>
                <p className="text-xs text-white/40 leading-relaxed font-light">Um cinto mal escolhido pode arruinar uma carreira. A joalheria deve ser intencional, nunca acidental.</p>
              </div>
              <div className="space-y-4 md:space-y-6 md:border-l md:border-white/5 md:pl-12 pt-8 md:pt-0 border-t border-white/5 md:border-t-0">
                <span className="text-[10px] font-black uppercase tracking-[0.5em] text-white/20">Artigo III</span>
                <h4 className="font-serif text-3xl italic">O Peso do Legado</h4>
                <p className="text-xs text-white/40 leading-relaxed font-light">Lembre-se: você está vestindo o trabalho de centenas de pessoas. Tente não ser um fardo.</p>
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
                <div className="flex flex-wrap items-center gap-4 md:gap-6">
                  <VerdictBadge verdict={result.verdict} />
                  <div className="flex items-baseline gap-2 bg-white/10 backdrop-blur-xl border border-white/20 px-4 md:px-6 py-1 md:py-2 rounded-full">
                    <span className="text-[8px] md:text-[10px] uppercase tracking-[0.3em] font-black text-white/50">Runway Index</span>
                    <span className="text-xl md:text-2xl font-serif italic font-bold text-white">{result.rating}</span>
                  </div>
                </div>
                
                <h2 className="text-5xl md:text-[7rem] lg:text-[10rem] font-serif italic tracking-tighter text-white leading-[0.85] md:leading-[0.8] max-w-full break-words">The<br className="md:hidden" /> Analysis.</h2>
                <div className="flex flex-wrap items-center gap-3 md:gap-6 text-[8px] md:text-[11px] uppercase tracking-[0.3em] md:tracking-[0.6em] text-white/40 font-black">
                  <span>Issue</span>
                  <span className="w-1 md:w-1.5 h-1 md:h-1.5 bg-white/20 rounded-full hidden md:block"></span>
                  <span>Editorial</span>
                  <span className="w-1 md:w-1.5 h-1 md:h-1.5 bg-white/20 rounded-full hidden md:block"></span>
                  <span>Volume IV</span>
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
                    {result.lead}
                  </p>
                </div>

                <div className="space-y-16 md:space-y-24">
                  {result.sections.map((section, idx) => (
                    <div key={idx} className="space-y-6 md:space-y-8 group">
                      <div className="flex items-center gap-4">
                        <span className="text-[10px] md:text-xs uppercase tracking-[0.4em] md:tracking-[0.8em] text-white/20 font-black">0{idx + 1} // {section.title}</span>
                        <div className="flex-1 h-[0.5px] bg-white/5 group-hover:bg-white/10 transition-colors"></div>
                      </div>
                      <h3 className="text-2xl md:text-3xl lg:text-4xl font-serif italic text-white/80 break-words">{section.title}</h3>
                      <p className="text-lg md:text-xl lg:text-2xl font-light leading-relaxed text-white/60 selection:bg-white selection:text-black break-words">
                        {section.content}
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
                          <span className="text-white/70 text-lg md:text-2xl font-light leading-relaxed group-hover:text-white transition-colors block">{tip}</span>
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
                          <span className="text-xl md:text-2xl font-serif italic text-white/40 group-hover:text-white transition-all">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-12 border-t border-white/5 space-y-8">
                    <h4 className="text-[10px] xl:text-[12px] uppercase tracking-[0.3em] xl:tracking-[0.5em] text-white/30 font-black break-words">Status de Publicação</h4>
                    <div className="flex items-center gap-4 xl:gap-6">
                       <div className={`w-6 h-6 rounded-full ${result.verdict === 'The Nod' ? 'bg-green-500 shadow-[0_0_20px_rgba(34,197,94,0.4)]' : result.verdict === 'The Lip Purse' ? 'bg-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.4)]' : 'bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)]'}`} />
                       <span className="text-xs md:text-sm uppercase tracking-[0.4em] font-black text-white/80">{result.verdict}</span>
                    </div>
                    <p className="text-[11px] text-white/20 italic leading-loose uppercase tracking-[0.2em]">
                      Decidido por Miranda Priestly. Incontestável. "Isso é tudo."
                    </p>
                  </div>

                  <div className="flex flex-col gap-4 w-full mt-10">
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
              <div 
                className="w-full h-full"
                style={{ 
                  backgroundImage: `url(${image})`, 
                  backgroundSize: 'cover', 
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat'
                }}
              />
              {/* Rich saturated contrast mapping - Vogue meets street culture */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-[#1A1A1A] z-10"></div>
              {/* Added subtle texture/grain overlay */}
              <div className="absolute inset-0 opacity-10 mix-blend-overlay z-[11]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")' }}></div>
            </div>

            {/* Masthead: "PROJECT MIRANDA" */}
            <div className="absolute top-12 left-0 right-0 z-20 flex justify-center w-full px-12">
              <h1 className="text-[7.5rem] font-bold tracking-tighter leading-none text-white drop-shadow-2xl mix-blend-difference opacity-90 uppercase" style={{ fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif' }}>
                PROJECT MIRANDA
              </h1>
            </div>

            {/* Additional Magazine Headers */}
            <div className="absolute top-44 left-16 z-20 flex flex-col items-start uppercase">
               <span className="text-white/80 tracking-[0.6em] text-sm font-bold border-b border-[#D32F2F] pb-2 mb-2">Issue No. 4</span>
               <span className="text-white/60 tracking-[0.4em] text-xs">The Critical Edition</span>
            </div>

            {/* Primary Headlines */}
            <div className="absolute top-[380px] left-16 z-30 max-w-[500px]">
              <div className="space-y-2">
                <p className="text-white/80 text-[10px] uppercase tracking-[0.8em] font-bold">Avaliação Oficial</p>
                <div className="w-12 h-[2px] bg-[#D32F2F]"></div>
                <p className="text-white text-4xl font-serif italic leading-tight drop-shadow-lg pt-4">
                  A Autópsia Editorial de <br />
                  <span className="text-[#D32F2F] font-bold not-italic text-5xl uppercase tracking-tighter">Miranda</span>
                </p>
              </div>
            </div>

            {/* Score Element - Refined Circular */}
            <div className="absolute top-[380px] right-16 z-30">
              <div className="w-40 h-40 rounded-full border border-white/20 bg-black/40 backdrop-blur-xl flex flex-col justify-center items-center shadow-[0_0_50px_rgba(211,47,47,0.3)]">
                <p className="text-white/60 text-[10px] font-bold uppercase tracking-[0.4em] mb-1">INDEX</p>
                <p className="text-white text-6xl font-serif italic text-[#D32F2F] font-bold leading-none">{result.rating}</p>
              </div>
            </div>

            {/* Critical Commentary Box */}
            <div className="absolute bottom-[260px] left-16 right-16 z-30 bg-black/60 backdrop-blur-xl border border-white/10 p-10 shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 left-0 w-2 h-full bg-[#D32F2F]"></div>
               <h3 className="text-white text-3xl font-serif italic leading-[1.4] opacity-95 relative z-10">
                 "{result.lead}"
               </h3>
            </div>

            {/* Bottom Elements: Selo Miranda & Barcode */}
            <div className="absolute bottom-12 left-16 right-16 z-40 flex justify-between items-end border-t border-white/20 pt-8">
              
              <div className="flex items-center gap-6">
                {/* Selo Miranda */}
                <div className="w-24 h-24 rounded-full border-4 border-[#D32F2F] flex items-center justify-center p-1 relative">
                  <div className="absolute inset-0 rounded-full border border-white/20 animate-[spin_10s_linear_infinite]"></div>
                  <div className="w-full h-full rounded-full border-2 border-[#D32F2F] flex items-center justify-center bg-[#D32F2F]/20 backdrop-blur-sm">
                    <div className="text-center flex flex-col items-center">
                      <span className="block text-white text-[8px] font-black tracking-[0.4em] uppercase mb-1">Selo</span>
                      <span className="block text-[#D32F2F] text-xl font-serif italic font-bold leading-none">M</span>
                      <span className="block text-white/50 text-[6px] font-black tracking-[0.2em] uppercase mt-1">Genuíno</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col">
                  <p className="text-[#D32F2F] text-[10px] font-bold uppercase tracking-[0.5em] mb-2">CERTIFICADO EDITORIAL</p>
                  <h4 className="text-white text-2xl font-black uppercase tracking-widest">
                    VISTO & AVALIADO
                  </h4>
                </div>
              </div>

              <div className="flex flex-col items-end gap-2">
                <p className="text-white/40 text-[10px] uppercase font-bold tracking-[0.3em]">PROJECT MIRANDA</p>
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