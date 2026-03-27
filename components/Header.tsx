
import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="py-8 px-6 flex flex-col items-center justify-center border-b border-white/10 bg-black sticky top-0 z-50">
      <h1 className="text-6xl md:text-8xl font-serif tracking-widest uppercase mb-2">Runway</h1>
      <p className="text-xs tracking-[0.3em] uppercase text-white/50 font-light">September Issue Edition</p>
    </header>
  );
};

export default Header;
