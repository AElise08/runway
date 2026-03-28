import React, { useState } from 'react';
import { supabase } from '../services/supabase';

const Auth: React.FC<{ initialAction?: 'login' | 'signup' }> = ({ initialAction = 'login' }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(initialAction === 'signup');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    if (isSignUp) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        setMessage(error.message);
      } else {
        setMessage('Verifique seu e-mail para confirmar a conta antes de prosseguir.');
      }
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setMessage(error.message);
      } else {
        setMessage('Login realizado com sucesso.');
      }
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 border border-white/10 bg-black/40 backdrop-blur-md max-w-sm mx-auto shadow-2xl space-y-6">
      <h3 className="font-serif italic text-2xl text-white">
        {isSignUp ? 'Criar Conta' : 'Identifique-se'}
      </h3>
      <p className="text-[10px] uppercase font-black tracking-[0.2em] text-white/50 text-center">
        {isSignUp 
          ? 'Cadastre-se para acessar o premium.' 
          : 'Membros do conselho editorial devem entrar.'}
      </p>

      {message && <div className="text-white/80 text-xs italic bg-white/5 p-4 w-full text-center border border-white/10">{message}</div>}
      
      <form onSubmit={handleAuth} className="w-full space-y-4">
        <input 
          type="email" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@condenast.com" 
          required
          className="w-full bg-transparent border border-white/20 p-4 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white transition-colors"
        />
        <input 
          type="password" 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Sua senha de acesso" 
          required
          minLength={6}
          className="w-full bg-transparent border border-white/20 p-4 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white transition-colors"
        />
        <button 
          type="submit" 
          disabled={loading}
          className="w-full py-4 bg-white text-black text-[10px] font-black uppercase tracking-[0.3em] hover:bg-neutral-300 transition-all disabled:opacity-50"
        >
          {loading ? 'Aguarde...' : (isSignUp ? 'Criar Conta' : 'Acessar')}
        </button>
      </form>
      
      <button 
        onClick={() => { setIsSignUp(!isSignUp); setMessage(''); }}
        className="text-[10px] text-white/50 hover:text-white uppercase tracking-[0.1em] underline underline-offset-4"
      >
        {isSignUp ? 'Já tem conta? Fazer Login' : 'Ainda não é membro? Criar conta'}
      </button>
    </div>
  );
};

export default Auth;
