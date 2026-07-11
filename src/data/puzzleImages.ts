export interface PuzzleImage {
  id: string;
  nameKey: string;
  svgContent: string;
  emoji: string;
}

export const PUZZLE_IMAGES: PuzzleImage[] = [
  {
    id: 'rainbow',
    nameKey: 'rainbow',
    emoji: '🌈',
    svgContent: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="100%" height="100%">
  <defs>
    <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#bae6fd" />
      <stop offset="100%" stop-color="#e0f2fe" />
    </linearGradient>
    <linearGradient id="grassGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#4ade80" />
      <stop offset="100%" stop-color="#22c55e" />
    </linearGradient>
  </defs>
  <rect width="400" height="400" fill="url(#skyGrad)" />
  <circle cx="80" cy="80" r="40" fill="#fbbf24" />
  <circle cx="80" cy="80" r="30" fill="#f59e0b" />
  <path d="M 50,320 A 150,150 0 0,1 350,320" fill="none" stroke="#f43f5e" stroke-width="24" />
  <path d="M 68,320 A 132,132 0 0,1 332,320" fill="none" stroke="#fb923c" stroke-width="24" />
  <path d="M 86,320 A 114,114 0 0,1 314,320" fill="none" stroke="#facc15" stroke-width="24" />
  <path d="M 104,320 A 96,96 0 0,1 296,320" fill="none" stroke="#4ade80" stroke-width="24" />
  <path d="M 122,320 A 78,78 0 0,1 278,320" fill="none" stroke="#3b82f6" stroke-width="24" />
  <path d="M 140,320 A 60,60 0 0,1 260,320" fill="none" stroke="#8b5cf6" stroke-width="24" />
  <path d="M 0,300 Q 100,280 200,300 T 400,300 L 400,400 L 0,400 Z" fill="url(#grassGrad)" />
  <circle cx="60" cy="300" r="35" fill="#ffffff" />
  <circle cx="95" cy="300" r="25" fill="#ffffff" />
  <circle cx="340" cy="300" r="35" fill="#ffffff" />
  <circle cx="305" cy="300" r="25" fill="#ffffff" />
  <circle cx="180" cy="350" r="8" fill="#ec4899" />
  <circle cx="180" cy="350" r="3" fill="#facc15" />
  <circle cx="230" cy="360" r="8" fill="#3b82f6" />
  <circle cx="230" cy="360" r="3" fill="#facc15" />
</svg>`
  },
  {
    id: 'space',
    nameKey: 'space',
    emoji: '🚀',
    svgContent: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="100%" height="100%">
  <defs>
    <linearGradient id="spaceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="50%" stop-color="#1e1b4b" />
      <stop offset="100%" stop-color="#311042" />
    </linearGradient>
    <linearGradient id="fireGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#f97316" />
      <stop offset="100%" stop-color="#ef4444" />
    </linearGradient>
  </defs>
  <rect width="400" height="400" fill="url(#spaceGrad)" />
  <circle cx="50" cy="60" r="3" fill="#ffffff" opacity="0.8" />
  <circle cx="320" cy="80" r="2" fill="#ffffff" opacity="0.6" />
  <circle cx="150" cy="220" r="4" fill="#ffffff" opacity="0.9" />
  <circle cx="80" cy="330" r="2.5" fill="#ffffff" opacity="0.7" />
  <circle cx="280" cy="300" r="3.5" fill="#ffffff" opacity="0.8" />
  <polygon points="120,40 123,47 130,47 125,51 127,58 120,54 113,58 115,51 110,47 117,47" fill="#fef08a" />
  <polygon points="340,240 342,245 347,245 343,248 345,253 340,250 335,253 337,248 333,245 338,245" fill="#fef08a" />
  <ellipse cx="280" cy="120" rx="45" ry="45" fill="#f43f5e" />
  <path d="M 220,130 Q 280,80 340,110 Q 280,160 220,130" fill="none" stroke="#38bdf8" stroke-width="12" opacity="0.8" />
  <path d="M 120,240 L 140,290 L 110,270 L 80,290 Z" fill="url(#fireGrad)" />
  <path d="M 120,240 L 130,275 L 110,260 L 90,275 Z" fill="#facc15" />
  <rect x="90" y="120" width="60" height="120" rx="30" fill="#e2e8f0" />
  <path d="M 90,150 L 90,120 A 30,30 0 0,1 150,120 L 150,150 Z" fill="#ef4444" />
  <path d="M 90,210 L 60,240 L 90,240 Z" fill="#ef4444" />
  <path d="M 150,210 L 180,240 L 150,240 Z" fill="#ef4444" />
  <circle cx="120" cy="170" r="18" fill="#38bdf8" stroke="#94a3b8" stroke-width="4" />
  <path d="M 110,160 A 10,10 0 0,1 125,160" fill="none" stroke="#ffffff" stroke-width="2" />
</svg>`
  },
  {
    id: 'dino',
    nameKey: 'dino',
    emoji: '🦕',
    svgContent: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="100%" height="100%">
  <defs>
    <linearGradient id="dinoSky" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#bae6fd" />
      <stop offset="100%" stop-color="#7dd3fc" />
    </linearGradient>
    <linearGradient id="volcanoGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#78716c" />
      <stop offset="100%" stop-color="#44403c" />
    </linearGradient>
  </defs>
  <rect width="400" height="400" fill="url(#dinoSky)" />
  <polygon points="260,300 320,180 350,180 410,300" fill="url(#volcanoGrad)" />
  <polygon points="315,180 325,180 330,210 325,230 320,210" fill="#ef4444" />
  <polygon points="330,180 345,180 350,200 340,220 335,200" fill="#f97316" />
  <circle cx="335" cy="150" r="20" fill="#e7e5e4" opacity="0.8" />
  <circle cx="355" cy="130" r="15" fill="#d6d3d1" opacity="0.6" />
  <circle cx="340" cy="60" r="30" fill="#facc15" />
  <rect y="280" width="400" height="120" fill="#a16207" />
  <path d="M 0,280 Q 200,260 400,280 L 400,300 L 0,300 Z" fill="#84cc16" />
  <rect x="50" y="160" width="12" height="120" rx="6" fill="#78350f" />
  <path d="M 56,160 Q 20,140 10,160" fill="none" stroke="#22c55e" stroke-width="12" stroke-linecap="round" />
  <path d="M 56,160 Q 50,120 40,110" fill="none" stroke="#22c55e" stroke-width="12" stroke-linecap="round" />
  <path d="M 56,160 Q 90,140 100,160" fill="none" stroke="#22c55e" stroke-width="12" stroke-linecap="round" />
  <path d="M 120,280 Q 80,240 80,200 Q 100,240 120,270 Z" fill="#4ade80" />
  <circle cx="215" cy="155" r="4" fill="#0f172a" />
  <circle cx="217" cy="153" r="1" fill="#ffffff" />
  <circle cx="210" cy="165" r="5" fill="#f43f5e" opacity="0.6" />
  <ellipse cx="160" cy="260" rx="40" ry="30" fill="#4ade80" />
  <rect x="135" y="275" width="15" height="30" rx="7" fill="#22c55e" />
  <rect x="170" y="275" width="15" height="30" rx="7" fill="#22c55e" />
  <path d="M 185,250 C 210,250 210,180 200,160 C 190,140 230,140 230,160 C 230,180 195,210 195,250 Z" fill="#4ade80" />
  <circle cx="150" cy="250" r="5" fill="#facc15" />
  <circle cx="170" cy="255" r="4" fill="#facc15" />
  <circle cx="160" cy="242" r="3.5" fill="#facc15" />
</svg>`
  },
  {
    id: 'ocean',
    nameKey: 'ocean',
    emoji: '🐙',
    svgContent: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="100%" height="100%">
  <defs>
    <linearGradient id="oceanGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#0284c7" />
      <stop offset="100%" stop-color="#0c4a6e" />
    </linearGradient>
    <linearGradient id="subGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#facc15" />
      <stop offset="100%" stop-color="#eab308" />
    </linearGradient>
  </defs>
  <rect width="400" height="400" fill="url(#oceanGrad)" />
  <path d="M 0,350 Q 200,330 400,350 L 400,400 L 0,400 Z" fill="#fef08a" />
  <circle cx="100" cy="200" r="8" fill="none" stroke="#bae6fd" stroke-width="2" opacity="0.6" />
  <circle cx="110" cy="170" r="5" fill="none" stroke="#bae6fd" stroke-width="2" opacity="0.6" />
  <circle cx="290" cy="150" r="10" fill="none" stroke="#bae6fd" stroke-width="2" opacity="0.5" />
  <circle cx="280" cy="100" r="6" fill="none" stroke="#bae6fd" stroke-width="2" opacity="0.5" />
  <path d="M 50,400 Q 30,320 60,250 T 40,180" fill="none" stroke="#22c55e" stroke-width="8" stroke-linecap="round" />
  <path d="M 350,400 Q 370,330 340,260 T 360,190" fill="none" stroke="#22c55e" stroke-width="8" stroke-linecap="round" />
  <ellipse cx="300" cy="290" rx="25" ry="20" fill="#ec4899" />
  <circle cx="290" cy="285" r="3" fill="#000" />
  <circle cx="310" cy="285" r="3" fill="#000" />
  <path d="M 280,305 Q 260,330 270,340" fill="none" stroke="#ec4899" stroke-width="6" stroke-linecap="round" />
  <path d="M 293,308 Q 285,340 295,350" fill="none" stroke="#ec4899" stroke-width="6" stroke-linecap="round" />
  <path d="M 307,308 Q 315,340 310,350" fill="none" stroke="#ec4899" stroke-width="6" stroke-linecap="round" />
  <path d="M 320,305 Q 340,330 330,340" fill="none" stroke="#ec4899" stroke-width="6" stroke-linecap="round" />
  <rect x="65" y="170" width="10" height="40" rx="3" fill="#94a3b8" />
  <rect x="75" y="187" width="15" height="6" fill="#64748b" />
  <rect x="90" y="140" width="180" height="100" rx="50" fill="url(#subGrad)" />
  <rect x="160" y="100" width="40" height="40" fill="#eab308" />
  <path d="M 180,100 L 180,70 L 195,70" fill="none" stroke="#94a3b8" stroke-width="6" stroke-linecap="round" />
  <circle cx="140" cy="190" r="20" fill="#38bdf8" stroke="#e2e8f0" stroke-width="4" />
  <circle cx="220" cy="190" r="20" fill="#38bdf8" stroke="#e2e8f0" stroke-width="4" />
</svg>`
  },
  {
    id: 'forest',
    nameKey: 'forest',
    emoji: '🐻',
    svgContent: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="100%" height="100%">
  <defs>
    <linearGradient id="forestSky" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ccfbf1" />
      <stop offset="100%" stop-color="#f0fdfa" />
    </linearGradient>
    <linearGradient id="bearGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#b45309" />
      <stop offset="100%" stop-color="#78350f" />
    </linearGradient>
  </defs>
  <rect width="400" height="400" fill="url(#forestSky)" />
  <polygon points="80,300 20,220 140,220" fill="#047857" />
  <polygon points="80,240 30,160 130,160" fill="#065f46" />
  <polygon points="80,180 40,110 120,110" fill="#064e3b" />
  <rect x="72" y="300" width="16" height="60" fill="#78350f" />
  <circle cx="180" cy="100" r="6" fill="#fde047" opacity="0.7" />
  <circle cx="280" cy="80" r="4" fill="#fde047" opacity="0.6" />
  <circle cx="250" cy="180" r="8" fill="#fde047" opacity="0.5" />
  <circle cx="230" cy="130" r="5" fill="#fde047" opacity="0.8" />
  <path d="M 0,330 Q 200,310 400,330 L 400,400 L 0,400 Z" fill="#15803d" />
  <path d="M 280,350 Q 280,310 290,310 Q 300,310 300,350 Z" fill="#f5f5f4" />
  <path d="M 260,310 Q 290,260 320,310 Z" fill="#ef4444" />
  <circle cx="280" cy="290" r="4" fill="#ffffff" />
  <circle cx="295" cy="280" r="3.5" fill="#ffffff" />
  <circle cx="305" cy="295" r="3" fill="#ffffff" />
  <circle cx="180" cy="210" r="12" fill="#78350f" />
  <circle cx="180" cy="210" r="6" fill="#fda4af" />
  <circle cx="240" cy="210" r="12" fill="#78350f" />
  <circle cx="240" cy="210" r="6" fill="#fda4af" />
  <circle cx="210" cy="230" r="30" fill="url(#bearGrad)" />
  <circle cx="210" cy="240" r="12" fill="#fed7aa" />
  <polygon points="207,236 213,236 210,240" fill="#000" />
  <circle cx="198" cy="225" r="4.5" fill="#000" />
  <circle cx="198" cy="225" r="1.5" fill="#fff" />
  <circle cx="222" cy="225" r="4.5" fill="#000" />
  <circle cx="222" cy="225" r="1.5" fill="#fff" />
  <ellipse cx="210" cy="300" rx="35" ry="40" fill="url(#bearGrad)" />
  <ellipse cx="210" cy="300" rx="20" ry="25" fill="#fed7aa" />
  <circle cx="170" cy="320" r="12" fill="#78350f" />
  <circle cx="250" cy="320" r="12" fill="#78350f" />
</svg>`
  }
];
