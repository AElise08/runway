
import React from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';

interface HeaderProps {
  user: User | null;
  setShowAuth: (v: boolean) => void;
}

const Header: React.FC<HeaderProps> = ({ user, setShowAuth }) => {
  return (
    <header className="sticky top-0 z-50 px-4 pt-4 md:pt-6">
      <div className="max-w-6xl mx-auto rounded-full border border-[#f0e6db]/60 bg-[#f6f0e9]/95 text-[#16110f] shadow-[0_18px_80px_rgba(0,0,0,0.18)] backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3 px-4 py-3 md:px-6 md:py-4">
          <nav className="hidden md:flex items-center gap-6 text-[10px] uppercase tracking-[0.28em] font-black text-[#16110f]/70">
            <a href="#landing-hero" className="hover:text-[#16110f] transition-colors">Roast</a>
            <a href="#landing-benefits" className="hover:text-[#16110f] transition-colors">Desafios</a>
            <a href="#landing-flow" className="hover:text-[#16110f] transition-colors">Como Funciona</a>
          </nav>

          <div className="flex flex-col items-center flex-1 md:flex-none">
            <h1 className="text-2xl md:text-5xl font-serif tracking-[0.25em] uppercase text-center">Runway</h1>
            <span className="text-[8px] md:text-[10px] uppercase tracking-[0.38em] text-[#7f1d1d] font-black">
              Runway Season
            </span>
          </div>

          <div className="flex items-center justify-end gap-2 md:gap-3 min-w-[128px] md:min-w-[220px]">
            {user ? (
              <button
                onClick={() => supabase.auth.signOut()}
                className="px-4 md:px-5 py-2.5 rounded-full text-[9px] uppercase tracking-[0.28em] font-black text-[#16110f]/75 hover:text-[#16110f] transition-colors"
              >
                Sair
              </button>
            ) : (
              <button
                onClick={() => setShowAuth(true)}
                className="px-4 md:px-6 py-2.5 rounded-full bg-[#2a0505] text-[#fff1eb] text-[9px] uppercase tracking-[0.28em] font-black hover:bg-[#3b0909] transition-colors"
              >
                Acesso Editorial
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
