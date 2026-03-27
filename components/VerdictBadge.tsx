
import React from 'react';

interface Props {
  verdict: 'The Nod' | 'The Purse Drop';
}

const VerdictBadge: React.FC<Props> = ({ verdict }) => {
  const styles = {
    'The Nod': 'bg-[#8B0000]/25 text-[#FFE2E2] border-[#D32F2F]/60 shadow-[0_0_18px_rgba(211,47,47,0.28)]',
    'The Purse Drop': 'bg-[#5C0000]/30 text-[#FF9B9B] border-[#FF4D4D]/65 shadow-[0_0_18px_rgba(255,77,77,0.24)]'
  };

  return (
    <div className={`px-5 py-1.5 border rounded-full text-[10px] uppercase tracking-[0.2em] font-black backdrop-blur-md ${styles[verdict]}`}>
      {verdict}
    </div>
  );
};

export default VerdictBadge;
