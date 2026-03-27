
import React from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';

interface HeaderProps {
  user: User | null;
  setShowAuth: (v: boolean) => void;
}

const Header: React.FC<HeaderProps> = ({ user, setShowAuth }) => {
  return (
    <header className="py-4 md:py-8 px-4 flex flex-col items-center justify-center border-b border-white/10 bg-black sticky top-0 z-50 relative group">
      <div className="md:absolute md:top-8 md:right-6 mb-4 md:mb-0 w-full md:w-auto flex justify-end">
        {user ? (
          <button 
            onClick={() => supabase.auth.signOut()} 
            className="text-[9px] uppercase tracking-[0.3em] text-white/50 hover:text-white transition-colors"
          >
            Sair ({user.email?.split('@')[0]})
          </button>
        ) : (
          <button 
            onClick={() => setShowAuth(true)} 
            className="text-[9px] uppercase tracking-[0.3em] font-black text-white hover:text-white/70 transition-colors border border-white/20 px-4 py-2"
          >
            Acesso Editorial
          </button>
        )}
      </div>

      <h1 className="text-4xl md:text-8xl font-serif tracking-widest uppercase mb-1 md:mb-2 text-center">Runway</h1>
      <p className="text-[10px] md:text-xs tracking-[0.3em] uppercase text-white/50 font-light text-center">Issue Edition</p>
    </header>
  );
};

export default Header;
