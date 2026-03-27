
import React, { useState, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { User } from '@supabase/supabase-js';
import { removeBackground } from '@imgly/background-removal';
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
  const [cutoutImage, setCutoutImage] = useState<string | null>(null);
  const [isRemovingBg, setIsRemovingBg] = useState(false);
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
      const MAX_DIMENSION = 800; // Reduz a resolução para não explodir os limites grátis (429/Tokens)

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
        // Desenha redimensionado
        ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
        
        // Compacta fortemente (reduz payload e uso de Tokens na API)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
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

  const processImage = async (base64: string) => {
    setState('analyzing');
    setError(null);
    setCutoutImage(null);
    setIsRemovingBg(true);

    // Inicia remoção de fundo em background
    const url = `data:image/jpeg;base64,${base64}`;
    removeBackground(url).then((blob: Blob) => {
      const reader = new FileReader();
      reader.readAsDataURL(blob); 
      reader.onloadend = () => {
         setCutoutImage(reader.result as string);
         setIsRemovingBg(false);
      }
    }).catch(e => {
      console.error("Erro ao remover fundo", e);
      setIsRemovingBg(false);
    });

    try {
      // Usa isPremium real do banco de dados (se carregado)
      const jsonStr = await analyzeLook(base64, isPremium);
      const parsed: CritiqueResult = JSON.parse(jsonStr);
      setResult(parsed);
      
      const newCount = usageCount + 1;
      setUsageCount(newCount);
      localStorage.setItem('miranda_usage_count', newCount.toString());
      
      // Update usage if on DB/Premium
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
    setCutoutImage(null);
    setResult(null);
    setError(null);
  };

  const exportVerdict = async () => {
    if (!exportRef.current) return;
    try {
      setIsExporting(true);
      const canvas = await html2canvas(exportRef.current, { useCORS: true, backgroundColor: '#000', scale: 2 } as any);
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = 'miranda-capa.png';
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
    <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-white selection:text-black transition-colors duration-1000 relative">
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
              <h2 className="text-4xl md:text-8xl font-serif italic text-white/90 tracking-tighter leading-tight md:leading-none">"Florais?<br className="md:hidden" /> Para a primavera?<br className="md:hidden" /> Inovador."</h2>
              <p className="text-white/40 max-w-lg mx-auto leading-relaxed text-[10px] md:text-[12px] uppercase tracking-[0.4em] md:tracking-[0.6em] font-light">
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
                <button 
                  onClick={startCamera}
                  className="group relative px-8 md:px-24 py-6 md:py-10 bg-white text-black font-black uppercase tracking-[0.3em] md:tracking-[0.6em] text-[10px] md:text-[11px] transition-all hover:tracking-[0.4em] md:hover:tracking-[0.8em] hover:bg-neutral-200 active:scale-95 shadow-[0_0_80px_rgba(255,255,255,0.1)] w-full max-w-[300px] md:w-auto md:max-w-none break-words whitespace-normal text-center leading-relaxed"
                >
                  Iniciar Audiência
                </button>
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
          <div className="max-w-4xl mx-auto px-4 py-8 md:px-6 md:py-12 flex flex-col items-center space-y-8 md:space-y-12 animate-in zoom-in-95 duration-500">
            <div className="relative w-full max-w-lg aspect-[3/4] bg-neutral-900 overflow-hidden border border-white/10 shadow-[0_0_150px_rgba(255,255,255,0.05)] rounded-sm group">
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
                {isRemovingBg ? "Recortando o excesso... Miranda gosta apenas do essencial." : "Miranda está verificando se você tem o direito de respirar o mesmo ar que a Runway."}
              </p>
            </div>
          </div>
        )}

        {state === 'result' && result && image && (
          <div className="animate-in fade-in slide-in-from-bottom-20 duration-1000">
            <div className="relative w-full h-[70vh] md:h-[90vh] bg-[#0a0a0a] border-b border-white/10 overflow-hidden flex flex-col justify-end">
              {cutoutImage && <div className="absolute inset-0 bg-[#d91921]/10 blur-[100px]"></div>}
              <img 
                src={cutoutImage || image} 
                alt="Editorial Shot" 
                className={`w-full ${cutoutImage ? 'h-[90%] object-contain relative z-10' : 'h-full object-cover absolute inset-0 grayscale-[0.05] contrast-[1.1]'}`}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent z-10 pointer-events-none"></div>
              
              {/* Floating Result Info */}
              <div className="absolute bottom-8 md:bottom-24 left-4 md:left-24 right-4 md:right-8 flex flex-col items-start space-y-4 md:space-y-8 z-20">
                <div className="flex flex-wrap items-center gap-4 md:gap-6">
                  <VerdictBadge verdict={result.verdict} />
                  <div className="flex items-baseline gap-2 bg-white/10 backdrop-blur-xl border border-white/20 px-4 md:px-6 py-1 md:py-2 rounded-full">
                    <span className="text-[8px] md:text-[10px] uppercase tracking-[0.3em] font-black text-white/50">Runway Index</span>
                    <span className="text-xl md:text-2xl font-serif italic font-bold text-white">{result.rating}</span>
                  </div>
                </div>
                
                <h2 className="text-5xl md:text-[10rem] font-serif italic tracking-tighter text-white leading-[0.8] md:leading-[0.8]">The<br className="md:hidden" /> Analysis.</h2>
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

            <div className="max-w-7xl mx-auto px-6 md:px-24 py-16 md:py-32 grid grid-cols-1 lg:grid-cols-12 gap-16 md:gap-32">
              <div className="lg:col-span-8 space-y-16 md:space-y-20">
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
                      <h3 className="text-3xl md:text-4xl font-serif italic text-white/80">{section.title}</h3>
                      <p className="text-xl md:text-2xl font-light leading-relaxed text-white/60 selection:bg-white selection:text-black">
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
                <div className="p-6 md:p-12 bg-white/[0.02] border border-white/5 space-y-8 md:space-y-12 md:sticky md:top-40">
                  
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
                    <h4 className="text-[12px] uppercase tracking-[0.5em] text-white/30 font-black border-b border-white/10 pb-4">Aquisições Mandatórias</h4>
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
                    <h4 className="text-[12px] uppercase tracking-[0.5em] text-white/30 font-black">Status de Publicação</h4>
                    <div className="flex items-center gap-6">
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
                      className="w-full py-6 md:py-8 bg-transparent border border-white text-white hover:bg-white hover:text-black transition-all uppercase text-[9px] md:text-[11px] tracking-[0.3em] md:tracking-[0.7em] font-black group flex items-center justify-center gap-4"
                    >
                      {isExporting ? 'Processando..' : <><Download size={14} /> Exportar Capa</>}
                    </button>
                    <button 
                      onClick={reset}
                      className="w-full py-6 md:py-8 bg-white text-black hover:bg-neutral-200 transition-all uppercase text-[9px] md:text-[11px] tracking-[0.3em] md:tracking-[0.7em] font-black group shadow-[0_0_40px_rgba(255,255,255,0.05)] flex items-center justify-center gap-4"
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

      {result && image && (
        <div style={{ position: 'absolute', top: -9999, left: -9999, opacity: 1, pointerEvents: 'none' }}>
          <div ref={exportRef} className="w-[1080px] h-[1920px] relative flex flex-col overflow-hidden font-sans text-white bg-black">

            {/* Foto de Fundo Inteira */}
            <div className="absolute inset-0 z-0 bg-black flex flex-col justify-end">
              {cutoutImage && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-[800px] h-[800px] bg-[#d91921] rounded-full blur-[120px] opacity-40"></div>
                </div>
              )}
              <img 
                src={cutoutImage || image} 
                className={`w-full ${cutoutImage ? 'h-[85%] object-contain drop-shadow-[0_0_40px_rgba(0,0,0,0.8)] z-10 relative' : 'h-full object-cover absolute inset-0'}`} 
                alt="" 
              />
              {!cutoutImage && <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/20 via-40% to-black/95 z-10"></div>}
            </div>

            {/* === ZONA SUPERIOR (0–400px): Cabeçalho da Revista === */}
            <div className="w-full text-center z-20 pt-12 px-8 flex flex-col items-center">
              <h1 className="text-[14rem] font-serif tracking-tighter leading-[0.8] text-[#d91921] drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)] scale-y-110">RUNWAY</h1>
              <div className="w-[800px] flex justify-between items-center mt-6 text-white font-bold uppercase tracking-[0.8em] text-xl drop-shadow-lg">
                <span>W E S T <span className="text-[#d91921]">E N D</span></span>
                <span>I S S U E</span>
              </div>
            </div>

            {/* === ZONA MÉDIA-ALTA (400–850px): Manchetes laterais === */}
            <div className="absolute top-[400px] left-12 max-w-[380px] z-30 flex flex-col gap-4">
              <p className="text-white text-4xl font-bold uppercase italic leading-none drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)]">
                HELL ON <br/>
                <span className="text-[#d91921]">HEELS!</span>
              </p>

              <div className="space-y-1 mt-4">
                <p className="text-[#d91921] text-2xl font-black uppercase tracking-wider drop-shadow-md">THE INDEX OF</p>
                <p className="text-white text-3xl font-light uppercase tracking-[0.1em] drop-shadow-md">FASHION:</p>
                <p className="text-white text-lg uppercase tracking-widest font-light mt-1 drop-shadow-md">WHAT YOU NEED TO KNOW NOW.</p>
              </div>

              {/* Avaliação destacada */}
              <div className="mt-6 bg-[#d91921] text-white py-5 px-8 rounded-sm shadow-2xl inline-block -rotate-2 transform self-start">
                <p className="text-xl uppercase tracking-[0.4em] font-black text-center mb-1">SCORE</p>
                <p className="text-7xl font-serif italic font-bold leading-none">{result.rating}%</p>
              </div>
            </div>

            {/* Informações da Lateral Direita */}
            <div className="absolute top-[500px] right-12 max-w-[320px] z-30 text-right space-y-8">
               <div className="space-y-2">
                 <p className="text-white text-2xl font-serif drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)]">HOW TO</p>
                 <p className="text-[#d91921] text-5xl font-black uppercase tracking-tighter drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)]">SURVIVE</p>
                 <p className="text-white text-xl font-light uppercase tracking-widest drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)]">THE BOSS FROM HELL!</p>
               </div>
            </div>

            {/* === ZONA MÉDIA-BAIXA (850–1350px): Citação principal === */}
            <div className="absolute top-[880px] left-14 right-14 z-30">
               <h3 className="text-white text-[2.8rem] font-serif italic leading-[1.2] drop-shadow-[0_5px_8px_rgba(0,0,0,0.9)] text-center" style={{ display: '-webkit-box', WebkitLineClamp: 6, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                 &ldquo;{result.lead}&rdquo;
               </h3>
            </div>

            {/* === ZONA INFERIOR (1350–1750px): Análise + Veredito === */}
            <div className="absolute bottom-[280px] left-16 right-16 z-30 flex gap-10">
              {/* Análise à esquerda */}
              <div className="flex-1 border-l-4 border-[#d91921] pl-6">
                <p className="text-[#d91921] text-xl font-black uppercase tracking-[0.3em] drop-shadow-md mb-2">{result.sections[0]?.title}</p>
                <p className="text-white/90 text-xl font-serif italic drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] leading-relaxed" style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{result.sections[0]?.content}</p>
              </div>
              {/* Veredito à direita */}
              <div className="w-[280px] flex-shrink-0 text-right flex flex-col justify-end">
                <p className="text-white text-lg uppercase tracking-[0.3em] font-light drop-shadow-md mb-2">OFFICIAL VERDICT</p>
                <h4 className="text-[#d91921] text-3xl font-black uppercase drop-shadow-md">{result.verdict}</h4>
              </div>
            </div>

            {/* === ZONA RODAPÉ (1750–1920px): Barcode + Branding === */}
            <div className="absolute bottom-10 left-16 right-16 z-40 flex justify-between items-end">
              <div className="text-base uppercase tracking-[0.6em] font-black text-white/50 drop-shadow-md">
                PROJECT MIRANDA
              </div>
              <div className="bg-white p-3 shadow-xl">
                <div className="flex flex-col items-center">
                  <div className="w-48 h-14 flex gap-[2px] items-end justify-between px-1">
                     {[...Array(38)].map((_,i) => <div key={i} className="bg-black h-full" style={{width: Math.random() * 4 + 1 + 'px'}}></div>)}
                  </div>
                  <div className="w-full flex justify-between text-[12px] font-mono tracking-widest pt-1 font-bold text-black border-t border-black/20 mt-1">
                    <span>ISSN 0921</span>
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
