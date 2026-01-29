import React from 'react';

interface HelixLineProps {
  className?: string;
}

export function HelixLine({ className = "" }: HelixLineProps) {
  return (
    <div className={`fixed inset-0 pointer-events-none z-[-1] overflow-hidden ${className}`}>
      <svg
        className="absolute top-0 left-1/2 -translate-x-1/2 h-full w-[200px] opacity-20"
        viewBox="0 0 100 800"
        preserveAspectRatio="none"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Primary Helix Strand */}
        <path
          d="M50,0 
             C80,50 80,150 50,200 
             C20,250 20,350 50,400 
             C80,450 80,550 50,600 
             C20,650 20,750 50,800"
          stroke="currentColor"
          strokeWidth="2"
          className="text-primary"
          vectorEffect="non-scaling-stroke"
        />
        
        {/* Secondary Helix Strand (Intertwined) */}
        <path
          d="M50,0 
             C20,50 20,150 50,200 
             C80,250 80,350 50,400 
             C20,450 20,550 50,600 
             C80,650 80,750 50,800"
          stroke="currentColor"
          strokeWidth="2"
          className="text-accent"
          vectorEffect="non-scaling-stroke"
          strokeDasharray="4 4"
        />
      </svg>
    </div>
  );
}
