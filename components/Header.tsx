
import React from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';

interface HeaderProps {
  user: User | null;
  setShowAuth: (v: boolean) => void;
}

const Header: React.FC<HeaderProps> = ({ user, setShowAuth }) => {
  return (
    <header className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-5xl">
      <div className="rounded-[2.5rem] bg-white text-[#111111] shadow-[0_8px_30px_rgba(0,0,0,0.06)] px-4 py-3 md:px-8 md:py-4 flex items-center justify-between">
        
        <nav className="hidden md:flex flex-1 items-center gap-8 text-[11px] font-semibold text-[#111111]/70">
          <a href="#landing-hero" className="hover:text-black transition-colors">Veredito</a>
          <a href="#landing-benefits" className="hover:text-black transition-colors">Diferenciais</a>
          <a href="#landing-flow" className="hover:text-black transition-colors">Como Funciona</a>
        </nav>

        <div className="flex flex-col items-center justify-center flex-1">
          <h1 className="text-2xl md:text-3xl font-serif tracking-[0.05em] font-bold text-black">Runway</h1>
          <span className="text-[7px] uppercase tracking-[0.3em] text-black/40 font-black">
            Season
          </span>
        </div>

        <div className="flex flex-1 items-center justify-end gap-3 md:gap-5">
          {user ? (
            <button
              onClick={() => supabase.auth.signOut()}
              className="px-4 md:px-5 py-2.5 text-[11px] font-semibold text-[#111111]/70 hover:text-black transition-colors"
            >
              Sair
            </button>
          ) : (
            <>
              <a
                href="#landing-pricing"
                className="hidden md:block px-4 py-2.5 text-[11px] font-semibold text-[#111111]/70 hover:text-black transition-colors"
              >
                Planos
              </a>
              <button
                onClick={() => setShowAuth(true)}
                className="inline-block px-6 py-3 rounded-full bg-[#0d0d0d] text-white text-[11px] font-semibold hover:bg-black transition-colors shadow-md"
              >
                Acessar Editorial
              </button>
            </>
          )}
        </div>

      </div>
    </header>
  );
};

export default Header;
