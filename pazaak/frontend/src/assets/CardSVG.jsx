import React from 'react';

// Card back SVG
export const CardBack = ({ width = 100, height = 140 }) => (
  <svg width={width} height={height} viewBox="0 0 100 140" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="cardBackGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{ stopColor: '#1a237e', stopOpacity: 1 }} />
        <stop offset="100%" style={{ stopColor: '#0d47a1', stopOpacity: 1 }} />
      </linearGradient>
      <pattern id="starPattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
        <circle cx="10" cy="10" r="1" fill="#ffeb3b" opacity="0.3" />
      </pattern>
    </defs>

    {/* Card border */}
    <rect x="2" y="2" width="96" height="136" rx="8" fill="url(#cardBackGradient)" stroke="#ffd700" strokeWidth="3" />

    {/* Star pattern */}
    <rect x="5" y="5" width="90" height="130" rx="6" fill="url(#starPattern)" />

    {/* Center emblem */}
    <circle cx="50" cy="70" r="25" fill="none" stroke="#ffd700" strokeWidth="2" />
    <circle cx="50" cy="70" r="20" fill="none" stroke="#ffd700" strokeWidth="1" />

    {/* Pazaak text */}
    <text x="50" y="75" textAnchor="middle" fill="#ffd700" fontSize="12" fontWeight="bold" fontFamily="serif">
      PAZAAK
    </text>
  </svg>
);

// Number card SVG
export const NumberCard = ({ value, width = 100, height = 140 }) => (
  <svg width={width} height={height} viewBox="0 0 100 140" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id={`cardGradient${value}`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{ stopColor: '#f5f5f5', stopOpacity: 1 }} />
        <stop offset="100%" style={{ stopColor: '#e0e0e0', stopOpacity: 1 }} />
      </linearGradient>
    </defs>

    {/* Card border */}
    <rect x="2" y="2" width="96" height="136" rx="8" fill="url(#cardGradient${value})" stroke="#333" strokeWidth="2" />

    {/* Corner values */}
    <text x="15" y="25" textAnchor="middle" fill="#333" fontSize="24" fontWeight="bold" fontFamily="sans-serif">
      {value}
    </text>
    <text x="85" y="125" textAnchor="middle" fill="#333" fontSize="24" fontWeight="bold" fontFamily="sans-serif">
      {value}
    </text>

    {/* Center value */}
    <text x="50" y="80" textAnchor="middle" fill="#1976d2" fontSize="48" fontWeight="bold" fontFamily="sans-serif">
      {value}
    </text>
  </svg>
);

// Side card SVG (with +/- modifiers)
export const SideCard = ({ value, modifier, width = 100, height = 140 }) => {
  const getColor = () => {
    if (modifier === '+') return '#4caf50';
    if (modifier === '-') return '#f44336';
    if (modifier === '+/-') return '#ff9800';
    if (modifier === '2x') return '#9c27b0';
    return '#757575';
  };

  const color = getColor();
  const displayValue = modifier === '2x' ? '2×' : `${modifier}${value}`;

  return (
    <svg width={width} height={height} viewBox="0 0 100 140" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`sideCardGradient${modifier}${value}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: color, stopOpacity: 0.9 }} />
          <stop offset="100%" style={{ stopColor: color, stopOpacity: 0.7 }} />
        </linearGradient>
      </defs>

      {/* Card border */}
      <rect x="2" y="2" width="96" height="136" rx="8" fill={`url(#sideCardGradient${modifier}${value})`} stroke="#ffd700" strokeWidth="3" />

      {/* Inner frame */}
      <rect x="8" y="8" width="84" height="124" rx="6" fill="none" stroke="#fff" strokeWidth="2" opacity="0.5" />

      {/* Corner symbols */}
      <text x="15" y="25" textAnchor="middle" fill="#fff" fontSize="18" fontWeight="bold" fontFamily="sans-serif">
        {modifier}
      </text>
      <text x="85" y="125" textAnchor="middle" fill="#fff" fontSize="18" fontWeight="bold" fontFamily="sans-serif">
        {modifier}
      </text>

      {/* Center value */}
      <text x="50" y="85" textAnchor="middle" fill="#fff" fontSize="42" fontWeight="bold" fontFamily="sans-serif">
        {displayValue}
      </text>
    </svg>
  );
};

// Empty slot (for deck placeholders)
export const EmptySlot = ({ width = 100, height = 140 }) => (
  <svg width={width} height={height} viewBox="0 0 100 140" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="2" width="96" height="136" rx="8" fill="none" stroke="#666" strokeWidth="2" strokeDasharray="5,5" />
  </svg>
);
