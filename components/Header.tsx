import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';

const Header: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="absolute top-0 left-0 w-full z-50 bg-white shadow-sm font-serif">
      <div className="flex flex-col w-full">
        {/* Top bar with RUNWAY logo */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/10">
          <div className="flex-1"></div>
          <div className="flex-1 flex justify-center">
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-black tracking-tighter" style={{ fontFamily: 'Didot, "Times New Roman", Times, serif' }}>
              RUNWAY
            </h1>
          </div>
          <div className="flex flex-1 justify-end">
            <button 
              className="p-2 text-black hover:opacity-70 transition-opacity focus:outline-none"
              onClick={() => setIsOpen(!isOpen)}
            >
              {isOpen ? <X size={24} /> : <Menu size={24} strokeWidth={1.5} />}
            </button>
          </div>
        </div>

        {/* Bottom bar with categories and shoes */}
        <div className="hidden md:flex items-center justify-center gap-12 py-3 border-b border-black/10">
          <a href="https://runwayonline.com/fashion" target="_blank" rel="noopener noreferrer" className="text-black text-xs font-bold uppercase tracking-widest hover:opacity-60 transition-opacity">Fashion</a>
          <a href="https://runwayonline.com/beauty" target="_blank" rel="noopener noreferrer" className="text-black text-xs font-bold uppercase tracking-widest hover:opacity-60 transition-opacity">Beauty</a>
          <img src="/sapatos.png" alt="Sapatos The Devil Wears Prada" className="h-6 md:h-8 object-contain" />
          <a href="https://runwayonline.com/people" target="_blank" rel="noopener noreferrer" className="text-black text-xs font-bold uppercase tracking-widest hover:opacity-60 transition-opacity">People</a>
          <a href="https://runwayonline.com/travel" target="_blank" rel="noopener noreferrer" className="text-black text-xs font-bold uppercase tracking-widest hover:opacity-60 transition-opacity">Travel</a>
        </div>

        {/* Collapsible Mobile Menu */}
        <div 
          className={`overflow-hidden transition-all duration-300 md:hidden bg-white border-b border-black/10 ${
            isOpen ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0 border-transparent'
          }`}
        >
          <div className="flex flex-col items-center gap-4 py-6">
            <a href="https://runwayonline.com/fashion" target="_blank" rel="noopener noreferrer" className="text-black text-xs font-bold uppercase tracking-widest hover:opacity-60">Fashion</a>
            <a href="https://runwayonline.com/beauty" target="_blank" rel="noopener noreferrer" className="text-black text-xs font-bold uppercase tracking-widest hover:opacity-60">Beauty</a>
            <img src="/sapatos.png" alt="Sapatos" className="h-6 object-contain my-1" />
            <a href="https://runwayonline.com/people" target="_blank" rel="noopener noreferrer" className="text-black text-xs font-bold uppercase tracking-widest hover:opacity-60">People</a>
            <a href="https://runwayonline.com/travel" target="_blank" rel="noopener noreferrer" className="text-black text-xs font-bold uppercase tracking-widest hover:opacity-60">Travel</a>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
