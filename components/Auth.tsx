import React, { useState } from 'react';
import { supabase } from '../services/supabase';

const Auth: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    
    // Magic Link
    const { error } = await supabase.auth.signInWithOtp({
      email,
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage('Verifique seu e-mail para o link de login.');
    }
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
    });
    if (error) {
      setMessage(error.message);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 border border-white/10 bg-black/40 backdrop-blur-md max-w-sm mx-auto shadow-2xl space-y-6">
      <h3 className="font-serif italic text-2xl text-white">Identifique-se</h3>
      <p className="text-[10px] uppercase font-black tracking-[0.2em] text-white/50 text-center">
        Membros do conselho editorial devem entrar.
      </p>

      {message && <div className="text-white/80 text-xs italic bg-white/5 p-4 w-full text-center border border-white/10">{message}</div>}

      <form onSubmit={handleLogin} className="w-full space-y-4">
        <input 
          type="email" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@condenast.com" 
          required
          className="w-full bg-transparent border border-white/20 p-4 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white transition-colors"
        />
        <button 
          type="submit" 
          disabled={loading}
          className="w-full py-4 bg-white text-black text-[10px] font-black uppercase tracking-[0.3em] hover:bg-neutral-300 transition-all disabled:opacity-50"
        >
          {loading ? 'Aguarde...' : 'Enviar Link Mágico'}
        </button>
      </form>

      <div className="w-full flex items-center gap-4 py-2">
        <div className="flex-1 border-t border-white/10"></div>
        <span className="text-[9px] uppercase text-white/30 font-black tracking-[0.2em]">Ou</span>
        <div className="flex-1 border-t border-white/10"></div>
      </div>

      <button 
        onClick={handleGoogleLogin}
        className="w-full py-4 border border-white/20 text-white text-[10px] font-black uppercase tracking-[0.3em] hover:bg-white/10 transition-all"
      >
        Entrar com Google
      </button>
    </div>
  );
};

export default Auth;
