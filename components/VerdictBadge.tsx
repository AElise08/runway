
import React from 'react';

interface Props {
  verdict: 'The Nod' | 'The Lip Purse' | 'The Purse Drop';
}

const VerdictBadge: React.FC<Props> = ({ verdict }) => {
  const styles = {
    'The Nod': 'bg-green-900/20 text-green-400 border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.2)]',
    'The Lip Purse': 'bg-yellow-900/20 text-yellow-400 border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.2)]',
    'The Purse Drop': 'bg-red-900/20 text-red-400 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
  };

  return (
    <div className={`px-5 py-1.5 border rounded-full text-[10px] uppercase tracking-[0.2em] font-black backdrop-blur-md ${styles[verdict]}`}>
      {verdict}
    </div>
  );
};

export default VerdictBadge;
