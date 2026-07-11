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
  <path d="M 80,10 L 80,30 M 80,130 L 80,150 M 10,80 L 30,80 M 130,80 L 150,80 M 30,30 L 45,45 M 130,130 L 115,115 M 30,130 L 45,115 M 130,30 L 115,45" stroke="#f59e0b" stroke-width="4" stroke-linecap="round" />
  <circle cx="180" cy="60" r="3" fill="#ffffff" opacity="0.9" />
  <circle cx="280" cy="40" r="2" fill="#ffffff" opacity="0.7" />
  <circle cx="340" cy="80" r="3.5" fill="#ffffff" opacity="0.8" />
  <circle cx="40" cy="180" r="2.5" fill="#ffffff" opacity="0.6" />
  <path d="M 140,50 Q 145,45 150,50 Q 155,45 160,50 Q 155,53 150,50 Q 145,53 140,50 Z" fill="#475569" />
  <path d="M 220,30 Q 223,26 227,30 Q 231,26 235,30 Q 231,32 227,30 Q 223,32 220,30 Z" fill="#475569" />
  <path d="M 50,320 A 150,150 0 0,1 350,320" fill="none" stroke="#f43f5e" stroke-width="24" />
  <path d="M 68,320 A 132,132 0 0,1 332,320" fill="none" stroke="#fb923c" stroke-width="24" />
  <path d="M 86,320 A 114,114 0 0,1 314,320" fill="none" stroke="#facc15" stroke-width="24" />
  <path d="M 104,320 A 96,96 0 0,1 296,320" fill="none" stroke="#4ade80" stroke-width="24" />
  <path d="M 122,320 A 78,78 0 0,1 278,320" fill="none" stroke="#3b82f6" stroke-width="24" />
  <path d="M 140,320 A 60,60 0 0,1 260,320" fill="none" stroke="#8b5cf6" stroke-width="24" />
  <circle cx="60" cy="300" r="35" fill="#ffffff" />
  <circle cx="95" cy="300" r="25" fill="#ffffff" />
  <circle cx="340" cy="300" r="35" fill="#ffffff" />
  <circle cx="305" cy="300" r="25" fill="#ffffff" />
  <circle cx="200" cy="180" r="22" fill="#ffffff" opacity="0.85" />
  <circle cx="225" cy="185" r="16" fill="#ffffff" opacity="0.85" />
  <circle cx="180" cy="190" r="14" fill="#ffffff" opacity="0.85" />
  <path d="M -50,300 Q 100,270 250,310 T 450,290 L 450,400 L -50,400 Z" fill="url(#grassGrad)" />
  <path d="M 150,330 Q 280,310 420,340 L 420,400 L 150,400 Z" fill="#16a34a" opacity="0.7" />
  <g transform="translate(110, 220) scale(0.6)">
    <ellipse cx="0" cy="0" rx="3" ry="12" fill="#1e293b" />
    <circle cx="-10" cy="-8" r="8" fill="#f43f5e" />
    <circle cx="10" cy="-8" r="8" fill="#f43f5e" />
    <circle cx="-8" cy="4" r="6" fill="#fda4af" />
    <circle cx="8" cy="4" r="6" fill="#fda4af" />
  </g>
  <g transform="translate(290, 200) scale(0.5)">
    <ellipse cx="0" cy="0" rx="3" ry="12" fill="#1e293b" />
    <circle cx="-10" cy="-8" r="8" fill="#f97316" />
    <circle cx="10" cy="-8" r="8" fill="#f97316" />
    <circle cx="-8" cy="4" r="6" fill="#fde047" />
    <circle cx="8" cy="4" r="6" fill="#fde047" />
  </g>
  <circle cx="60" cy="350" r="7" fill="#ef4444" /><circle cx="60" cy="350" r="3" fill="#facc15" />
  <circle cx="130" cy="370" r="8" fill="#ec4899" /><circle cx="130" cy="370" r="3.5" fill="#ffffff" />
  <circle cx="180" cy="345" r="7" fill="#f59e0b" /><circle cx="180" cy="345" r="2.5" fill="#d97706" />
  <circle cx="240" cy="360" r="9" fill="#3b82f6" /><circle cx="240" cy="360" r="4" fill="#fde047" />
  <circle cx="310" cy="340" r="6" fill="#8b5cf6" /><circle cx="310" cy="340" r="2" fill="#ffffff" />
  <circle cx="370" cy="365" r="8" fill="#ec4899" /><circle cx="370" cy="365" r="3" fill="#ffffff" />
  <g transform="translate(90, 345) scale(0.6)">
    <path d="M 0,15 Q 0,0 10,0 Q 20,0 20,15 Z" fill="#f5f5f4" />
    <path d="M -5,5 Q 10,-10 25,5 Z" fill="#ef4444" />
    <circle cx="5" cy="0" r="1.5" fill="#ffffff" />
    <circle cx="15" cy="-2" r="1.5" fill="#ffffff" />
  </g>
  <g transform="translate(330, 355) scale(0.5)">
    <path d="M 0,15 Q 0,0 10,0 Q 20,0 20,15 Z" fill="#f5f5f4" />
    <path d="M -5,5 Q 10,-10 25,5 Z" fill="#ef4444" />
  </g>
  <g transform="translate(210, 375) scale(0.5)">
    <ellipse cx="0" cy="0" rx="8" ry="6" fill="#ef4444" />
    <circle cx="-6" cy="0" r="3" fill="#000000" />
    <line x1="0" y1="-6" x2="0" y2="6" stroke="#000000" stroke-width="1.5" />
    <circle cx="-2" cy="-2" r="1.2" fill="#000000" />
    <circle cx="-2" cy="2" r="1.2" fill="#000000" />
    <circle cx="3" cy="-1.5" r="1.2" fill="#000000" />
    <circle cx="3" cy="1.5" r="1.2" fill="#000000" />
  </g>
</svg>`
  },
  {
    id: 'space',
    nameKey: 'space',
    emoji: '🚀',
    svgContent: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="100%" height="100%">
  <defs>
    <linearGradient id="spaceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0b0f19" />
      <stop offset="40%" stop-color="#1e1b4b" />
      <stop offset="75%" stop-color="#311042" />
      <stop offset="100%" stop-color="#4c1d95" />
    </linearGradient>
    <linearGradient id="nebulaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#a855f7" stop-opacity="0" />
      <stop offset="50%" stop-color="#ec4899" stop-opacity="0.25" />
      <stop offset="100%" stop-color="#3b82f6" stop-opacity="0.2" />
    </linearGradient>
    <linearGradient id="fireGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#f97316" />
      <stop offset="100%" stop-color="#ef4444" />
    </linearGradient>
  </defs>
  <rect width="400" height="400" fill="url(#spaceGrad)" />
  <path d="M -50,150 Q 100,50 250,180 T 450,250 L 400,400 L -50,400 Z" fill="url(#nebulaGrad)" filter="blur(20px)" />
  <path d="M 50,-50 Q 250,100 200,250 T 350,450" fill="none" stroke="url(#nebulaGrad)" stroke-width="80" filter="blur(30px)" />
  <circle cx="30" cy="40" r="1.5" fill="#ffffff" opacity="0.6" />
  <circle cx="90" cy="20" r="2.5" fill="#fde047" opacity="0.8" />
  <circle cx="160" cy="50" r="1.2" fill="#ffffff" opacity="0.5" />
  <circle cx="210" cy="30" r="3" fill="#38bdf8" opacity="0.9" filter="blur(0.5px)" />
  <circle cx="270" cy="60" r="1" fill="#ffffff" opacity="0.4" />
  <circle cx="330" cy="25" r="2" fill="#ffffff" opacity="0.7" />
  <circle cx="380" cy="70" r="1.5" fill="#a7f3d0" opacity="0.8" />
  <circle cx="40" cy="110" r="2" fill="#ffffff" opacity="0.7" />
  <circle cx="220" cy="100" r="1.5" fill="#ffffff" opacity="0.5" />
  <circle cx="300" cy="130" r="2.5" fill="#fde047" opacity="0.9" />
  <circle cx="25" cy="200" r="1.2" fill="#ffffff" opacity="0.4" />
  <circle cx="75" cy="250" r="3" fill="#fda4af" opacity="0.8" />
  <circle cx="180" cy="220" r="1.5" fill="#ffffff" opacity="0.6" />
  <circle cx="370" cy="180" r="2" fill="#ffffff" opacity="0.8" />
  <circle cx="50" cy="310" r="1.5" fill="#ffffff" opacity="0.6" />
  <circle cx="130" cy="340" r="2.5" fill="#38bdf8" opacity="0.7" />
  <circle cx="240" cy="320" r="1" fill="#ffffff" opacity="0.5" />
  <circle cx="360" cy="330" r="3" fill="#fde047" opacity="0.9" />
  <circle cx="310" cy="380" r="1.5" fill="#ffffff" opacity="0.6" />
  <g transform="translate(340, 70) scale(0.6)">
    <path d="M 0,-15 L 3,-3 L 15,0 L 3,3 L 0,15 L -3,3 L -15,0 L -3,-3 Z" fill="#ffffff" />
  </g>
  <g transform="translate(60, 160) scale(0.5)">
    <path d="M 0,-15 L 3,-3 L 15,0 L 3,3 L 0,15 L -3,3 L -15,0 L -3,-3 Z" fill="#fde047" />
  </g>
  <g transform="translate(280, 270) scale(0.7)">
    <path d="M 0,-15 L 3,-3 L 15,0 L 3,3 L 0,15 L -3,3 L -15,0 L -3,-3 Z" fill="#38bdf8" />
  </g>
  <g transform="translate(300, 90)">
    <ellipse cx="0" cy="0" rx="32" ry="32" fill="#ec4899" />
    <ellipse cx="0" cy="0" rx="26" ry="26" fill="#f43f5e" />
    <path d="M -55,10 Q 0,-25 55,-10 Q 0,40 -55,10" fill="none" stroke="#38bdf8" stroke-width="9" opacity="0.85" />
    <path d="M -42,8 Q 0,-18 42,-8" fill="none" stroke="#bae6fd" stroke-width="3" opacity="0.9" />
  </g>
  <g transform="translate(70, 320)">
    <circle cx="0" cy="0" r="22" fill="#3b82f6" />
    <path d="M -12,-5 Q -5,-15 5,-12 Q 10,-5 8,5 Q 2,15 -10,12 Z" fill="#10b981" />
    <path d="M 5,8 Q 12,5 15,12 Q 8,18 0,15 Z" fill="#10b981" />
    <circle cx="0" cy="0" r="22" fill="none" stroke="#1e3a8a" stroke-width="2.5" />
  </g>
  <g transform="translate(320, 260) scale(0.6)">
    <path d="M -20,0 A 20,20 0 0,1 20,0 Z" fill="#67e8f9" opacity="0.8" stroke="#0891b2" stroke-width="3" />
    <circle cx="0" cy="-7" r="5" fill="#ffffff" opacity="0.7" />
    <ellipse cx="0" cy="5" rx="36" ry="10" fill="#94a3b8" stroke="#475569" stroke-width="3" />
    <ellipse cx="0" cy="5" rx="30" ry="7" fill="#cbd5e1" />
    <circle cx="-18" cy="5" r="2.5" fill="#fde047" />
    <circle cx="0" cy="6" r="2.5" fill="#fde047" />
    <circle cx="18" cy="5" r="2.5" fill="#fde047" />
  </g>
  <g transform="translate(200, 360) scale(0.5)">
    <polygon points="0,5 8,-5 15,2 10,12 2,10" fill="#78716c" stroke="#44403c" stroke-width="2" />
  </g>
  <g transform="translate(225, 375) scale(0.4)">
    <polygon points="2,2 10,-6 14,0 8,10 0,8" fill="#78716c" stroke="#44403c" stroke-width="2" />
  </g>
  <g transform="translate(180, 345) scale(0.45)">
    <polygon points="-5,2 4,-8 10,-2 6,8 -2,6" fill="#a8a29e" stroke="#44403c" stroke-width="2" />
  </g>
  <g transform="translate(125, 175) rotate(-15)">
    <path d="M 0,70 L 15,110 L 0,95 L -15,110 Z" fill="url(#fireGrad)" />
    <path d="M 0,70 L 8,95 L 0,85 L -8,95 Z" fill="#facc15" />
    <rect x="-25" y="-30" width="50" height="100" rx="25" fill="#f1f5f9" stroke="#94a3b8" stroke-width="2" />
    <path d="M -25,0 A 25,25 0 0,1 25,0 L 25,-25 Q 0,-60 -25,-25 Z" fill="#ef4444" />
    <path d="M -25,50 L -45,75 L -25,75 Z" fill="#ef4444" />
    <path d="M 25,50 L 45,75 L 25,75 Z" fill="#ef4444" />
    <circle cx="0" cy="15" r="15" fill="#38bdf8" stroke="#94a3b8" stroke-width="3" />
    <circle cx="0" cy="18" r="7" fill="#ffffff" />
    <circle cx="-3" cy="16" r="1.5" fill="#000000" />
    <circle cx="3" cy="16" r="1.5" fill="#000000" />
    <path d="M -3,21 Q 0,24 3,21" fill="none" stroke="#000000" stroke-width="1.2" stroke-linecap="round" />
  </g>
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
      <stop offset="60%" stop-color="#7dd3fc" />
      <stop offset="100%" stop-color="#a5f3fc" />
    </linearGradient>
    <linearGradient id="volcanoGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#78716c" />
      <stop offset="100%" stop-color="#44403c" />
    </linearGradient>
  </defs>
  <rect width="400" height="400" fill="url(#dinoSky)" />
  <circle cx="340" cy="60" r="32" fill="#facc15" />
  <circle cx="340" cy="60" r="24" fill="#fbbf24" />
  <g fill="#ffffff" opacity="0.8">
    <circle cx="80" cy="70" r="20" /><circle cx="105" cy="70" r="15" /><circle cx="62" cy="75" r="12" />
  </g>
  <g fill="#ffffff" opacity="0.6">
    <circle cx="210" cy="50" r="16" /><circle cx="230" cy="50" r="12" /><circle cx="195" cy="53" r="10" />
  </g>
  <g transform="translate(160, 90) scale(0.6)" fill="#475569">
    <path d="M 0,0 C 15,-10 35,-15 50,-5 C 35,0 15,2 0,0 C -15,2 -35,0 -50,-5 C -35,-15 -15,-10 0,0 Z" />
    <polygon points="0,2 4,12 0,16 -4,12" />
  </g>
  <g transform="translate(250, 110) scale(0.4)" fill="#475569">
    <path d="M 0,0 C 15,-10 35,-15 50,-5 C 35,0 15,2 0,0 C -15,2 -35,0 -50,-5 C -35,-15 -15,-10 0,0 Z" />
  </g>
  <polygon points="250,280 305,170 335,170 390,280" fill="url(#volcanoGrad)" stroke="#292524" stroke-width="2" />
  <polygon points="302,170 312,170 315,195 308,215 303,190" fill="#ef4444" />
  <polygon points="315,170 328,170 332,190 324,210 318,190" fill="#f97316" />
  <circle cx="320" cy="145" r="18" fill="#d6d3d1" opacity="0.85" />
  <circle cx="338" cy="125" r="12" fill="#a8a29e" opacity="0.6" />
  <polygon points="-20,280 40,190 80,210 140,160 210,280" fill="#57534e" opacity="0.5" />
  <rect y="280" width="400" height="120" fill="#a16207" />
  <path d="M -20,280 Q 100,265 220,282 T 420,275 L 420,320 L -20,320 Z" fill="#84cc16" />
  <path d="M -20,310 Q 120,295 260,315 T 420,305 L 420,400 L -20,400 Z" fill="#4d7c0f" opacity="0.75" />
  <g transform="translate(50, 160)">
    <path d="M 12,120 Q 8,60 18,0 L 6,0 Q -4,60 0,120 Z" fill="#78350f" stroke="#451a03" stroke-width="1.5" />
    <path d="M 12,0 Q -15,-15 -25,5" fill="none" stroke="#15803d" stroke-width="10" stroke-linecap="round" />
    <path d="M 12,0 Q 12,-25 -2,-32" fill="none" stroke="#22c55e" stroke-width="10" stroke-linecap="round" />
    <path d="M 12,0 Q 40,-15 45,8" fill="none" stroke="#15803d" stroke-width="10" stroke-linecap="round" />
    <path d="M 12,0 Q 25,-30 18,-35" fill="none" stroke="#22c55e" stroke-width="8" stroke-linecap="round" />
  </g>
  <g transform="translate(340, 275) scale(0.65)">
    <path d="M 0,0 Q -20,-20 -15,-40 Q -5,-35 0,0" fill="#16a34a" />
    <path d="M 0,0 Q 0,-30 15,-45 Q 20,-35 0,0" fill="#22c55e" />
    <path d="M 0,0 Q 20,-15 35,-25 Q 30,-15 0,0" fill="#15803d" />
  </g>
  <g>
    <path d="M 12,280 Q 75,230 70,185 Q 92,225 120,265 Z" fill="#4ade80" stroke="#16a34a" stroke-width="2" />
    <polygon points="140,232 148,220 156,232" fill="#fb923c" />
    <polygon points="160,230 170,215 180,230" fill="#fb923c" />
    <polygon points="182,235 190,222 198,236" fill="#fb923c" />
    <ellipse cx="160" cy="260" rx="42" ry="32" fill="#4ade80" stroke="#16a34a" stroke-width="2" />
    <rect x="132" y="275" width="16" height="32" rx="8" fill="#22c55e" stroke="#15803d" stroke-width="2" />
    <rect x="168" y="275" width="16" height="32" rx="8" fill="#22c55e" stroke="#15803d" stroke-width="2" />
    <path d="M 185,250 C 215,250 215,175 202,155 C 190,135 235,135 232,155 C 228,175 195,210 195,250 Z" fill="#4ade80" stroke="#16a34a" stroke-width="2" />
    <path d="M 222,160 Q 228,162 225,166" fill="none" stroke="#16a34a" stroke-width="2.5" stroke-linecap="round" />
    <circle cx="214" cy="150" r="4.5" fill="#0f172a" />
    <circle cx="216" cy="148" r="1.5" fill="#ffffff" />
    <circle cx="208" cy="160" r="5" fill="#f43f5e" opacity="0.6" />
    <circle cx="145" cy="252" r="5" fill="#fb923c" />
    <circle cx="168" cy="258" r="4" fill="#fb923c" />
    <circle cx="158" cy="244" r="3.5" fill="#fb923c" />
  </g>
  <g transform="translate(100, 335) scale(0.7)">
    <path d="M -30,10 Q 0,-5 30,10" fill="none" stroke="#78350f" stroke-width="5" stroke-linecap="round" />
    <path d="M -25,15 Q 0,3 25,15" fill="none" stroke="#78350f" stroke-width="4" stroke-linecap="round" />
    <ellipse cx="-10" cy="0" rx="10" ry="14" fill="#f5f5f4" stroke="#d6d3d1" stroke-width="2" transform="rotate(-15 -10 0)" />
    <ellipse cx="10" cy="2" rx="10" ry="14" fill="#fafaf9" stroke="#d6d3d1" stroke-width="2" transform="rotate(20 10 2)" />
    <circle cx="-12" cy="-4" r="1" fill="#a855f7" /><circle cx="-7" cy="4" r="1" fill="#a855f7" />
    <circle cx="8" cy="-2" r="1.2" fill="#ec4899" /><circle cx="12" cy="6" r="1" fill="#ec4899" />
  </g>
</svg>`
  },
  {
    id: 'ocean',
    nameKey: 'ocean',
    emoji: '🐙',
    svgContent: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="100%" height="100%">
  <defs>
    <linearGradient id="oceanGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="35%" stop-color="#0284c7" />
      <stop offset="75%" stop-color="#0369a1" />
      <stop offset="100%" stop-color="#0c4a6e" />
    </linearGradient>
    <linearGradient id="subGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#fde047" />
      <stop offset="100%" stop-color="#eab308" />
    </linearGradient>
  </defs>
  <rect width="400" height="400" fill="url(#oceanGrad)" />
  <polygon points="0,0 60,0 200,400 0,400" fill="#ffffff" opacity="0.12" />
  <polygon points="0,0 120,0 350,400 150,400" fill="#ffffff" opacity="0.08" />
  <path d="M -20,350 Q 80,335 180,355 T 420,345 L 420,420 L -20,420 Z" fill="#fef08a" stroke="#ca8a04" stroke-width="2" />
  <path d="M 120,365 Q 260,350 420,370 L 420,420 L 120,420 Z" fill="#fde047" opacity="0.6" />
  <circle cx="40" cy="180" r="5" fill="none" stroke="#e0f2fe" stroke-width="1.5" opacity="0.7" />
  <circle cx="48" cy="165" r="3" fill="none" stroke="#e0f2fe" stroke-width="1" opacity="0.7" />
  <circle cx="160" cy="90" r="7" fill="none" stroke="#e0f2fe" stroke-width="2" opacity="0.6" />
  <circle cx="152" cy="70" r="4" fill="none" stroke="#e0f2fe" stroke-width="1.5" opacity="0.6" />
  <circle cx="290" cy="140" r="9" fill="none" stroke="#e0f2fe" stroke-width="2" opacity="0.5" />
  <circle cx="282" cy="115" r="5" fill="none" stroke="#e0f2fe" stroke-width="1.5" opacity="0.5" />
  <circle cx="340" cy="220" r="6" fill="none" stroke="#e0f2fe" stroke-width="1.5" opacity="0.6" />
  <g>
    <path d="M 40,400 Q 20,320 50,240 T 30,160" fill="none" stroke="#16a34a" stroke-width="9" stroke-linecap="round" />
    <path d="M 55,400 Q 35,330 60,260 T 45,185" fill="none" stroke="#22c55e" stroke-width="7" stroke-linecap="round" />
    <path d="M 360,400 Q 380,310 340,230 T 370,140" fill="none" stroke="#15803d" stroke-width="9" stroke-linecap="round" />
    <path d="M 345,400 Q 325,320 350,250 T 335,170" fill="none" stroke="#22c55e" stroke-width="7" stroke-linecap="round" />
  </g>
  <g fill="#f97316" stroke="#ea580c" stroke-width="1">
    <path d="M 80,80 C 95,75 100,85 105,80 L 112,85 L 110,80 L 112,75 Z" />
    <circle cx="85" cy="80" r="1" fill="#fff" />
    <path d="M 120,60 C 135,55 140,65 145,60 L 152,65 L 150,60 L 152,55 Z" />
    <path d="M 100,105 C 115,100 120,110 125,105 L 132,110 L 130,105 L 132,100 Z" />
  </g>
  <g transform="translate(290, 65) scale(0.65) rotate(-20)">
    <ellipse cx="0" cy="0" rx="25" ry="20" fill="#15803d" stroke="#14532d" stroke-width="2.5" />
    <path d="M -15,-15 Q -25,-35 -5,-25" fill="#22c55e" stroke="#14532d" stroke-width="2" />
    <path d="M 15,-15 Q 25,-35 5,-25" fill="#22c55e" stroke="#14532d" stroke-width="2" />
    <path d="M -12,15 Q -20,25 -8,22" fill="#22c55e" stroke="#14532d" stroke-width="1.5" />
    <path d="M 12,15 Q 20,25 8,22" fill="#22c55e" stroke="#14532d" stroke-width="1.5" />
    <ellipse cx="0" cy="-26" rx="8" ry="10" fill="#22c55e" stroke="#14532d" stroke-width="2" />
    <circle cx="-3" cy="-28" r="1.5" fill="#000" /><circle cx="3" cy="-28" r="1.5" fill="#000" />
  </g>
  <g>
    <ellipse cx="300" cy="285" rx="26" ry="22" fill="#ec4899" stroke="#db2777" stroke-width="2.5" />
    <circle cx="290" cy="280" r="4.5" fill="#ffffff" /><circle cx="290" cy="280" r="2" fill="#000000" />
    <circle cx="310" cy="280" r="4.5" fill="#ffffff" /><circle cx="310" cy="280" r="2" fill="#000000" />
    <circle cx="282" cy="288" r="3" fill="#fda4af" />
    <circle cx="318" cy="288" r="3" fill="#fda4af" />
    <path d="M 297,290 Q 300,294 303,290" fill="none" stroke="#db2777" stroke-width="2" stroke-linecap="round" />
    <path d="M 276,300 Q 255,320 262,332 T 282,315" fill="none" stroke="#ec4899" stroke-width="8" stroke-linecap="round" />
    <path d="M 290,304 Q 280,335 292,345 T 305,320" fill="none" stroke="#ec4899" stroke-width="8" stroke-linecap="round" />
    <path d="M 310,304 Q 320,335 308,345 T 295,320" fill="none" stroke="#ec4899" stroke-width="8" stroke-linecap="round" />
    <path d="M 324,300 Q 345,320 338,332 T 318,315" fill="none" stroke="#ec4899" stroke-width="8" stroke-linecap="round" />
  </g>
  <g>
    <rect x="65" y="180" width="10" height="40" rx="3" fill="#94a3b8" stroke="#475569" stroke-width="1.5" />
    <rect x="75" y="197" width="15" height="6" fill="#64748b" />
    <rect x="90" y="150" width="160" height="100" rx="50" fill="url(#subGrad)" stroke="#d97706" stroke-width="3" />
    <rect x="150" y="110" width="40" height="40" fill="#eab308" stroke="#d97706" stroke-width="3" />
    <path d="M 170,110 L 170,80 L 188,80" fill="none" stroke="#64748b" stroke-width="6" stroke-linecap="round" />
    <circle cx="188" cy="80" r="2" fill="#ef4444" />
    <circle cx="140" cy="200" r="22" fill="#e0f2fe" stroke="#d97706" stroke-width="4" />
    <circle cx="140" cy="200" r="18" fill="#38bdf8" />
    <path d="M 128,192 A 10,10 0 0,1 144,192" fill="none" stroke="#ffffff" stroke-width="2" />
    <circle cx="200" cy="200" r="22" fill="#e0f2fe" stroke="#d97706" stroke-width="4" />
    <circle cx="200" cy="200" r="18" fill="#38bdf8" />
  </g>
  <g transform="translate(50, 310) scale(0.65)">
    <rect x="0" y="25" width="60" height="40" fill="#78350f" stroke="#451a03" stroke-width="3" />
    <ellipse cx="30" cy="25" rx="26" ry="10" fill="#facc15" stroke="#ca8a04" stroke-width="2" />
    <circle cx="15" cy="22" r="6" fill="#fbbf24" /><circle cx="30" cy="20" r="6" fill="#fbbf24" /><circle cx="45" cy="22" r="6" fill="#fbbf24" />
    <circle cx="25" cy="25" r="4" fill="#ef4444" />
    <polygon points="35,22 39,26 35,30 31,26" fill="#3b82f6" />
    <path d="M -5,22 Q 30,-10 65,22 Z" fill="#92400e" stroke="#451a03" stroke-width="3" />
    <rect x="25" y="22" width="10" height="15" fill="#d97706" stroke="#451a03" stroke-width="1.5" />
    <circle cx="30" cy="30" r="3" fill="#000" />
  </g>
  <g transform="translate(160, 370) scale(0.55)">
    <polygon points="0,-18 5,-5 18,-5 8,3 12,16 0,8 -12,16 -8,3 -18,-5 -5,-5" fill="#f43f5e" stroke="#be123c" stroke-width="2" />
    <circle cx="0" cy="0" r="3" fill="#fde047" />
  </g>
  <g transform="translate(230, 375) scale(0.5)">
    <ellipse cx="0" cy="0" rx="16" ry="11" fill="#ef4444" stroke="#b91c1c" stroke-width="2" />
    <circle cx="-5" cy="-14" r="3.5" fill="#fff" stroke="#000" /><circle cx="-5" cy="-14" r="1" fill="#000" />
    <circle cx="5" cy="-14" r="3.5" fill="#fff" stroke="#000" /><circle cx="5" cy="-14" r="1" fill="#000" />
    <path d="M -12,5 Q -22,12 -12,18" fill="none" stroke="#ef4444" stroke-width="3" />
    <path d="M 12,5 Q 22,12 12,18" fill="none" stroke="#ef4444" stroke-width="3" />
    <path d="M -8,-5 Q -22,-18 -15,-5" fill="none" stroke="#ef4444" stroke-width="4" stroke-linecap="round" />
    <path d="M 8,-5 Q 22,-18 15,-5" fill="none" stroke="#ef4444" stroke-width="4" stroke-linecap="round" />
  </g>
</svg>`
  },
  {
    id: 'forest',
    nameKey: 'forest',
    emoji: '🐻',
    svgContent: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="100%" height="100%">
  <defs>
    <linearGradient id="forestSky" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#99f6e4" />
      <stop offset="60%" stop-color="#ccfbf1" />
      <stop offset="100%" stop-color="#f0fdfa" />
    </linearGradient>
    <linearGradient id="bearGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#b45309" />
      <stop offset="100%" stop-color="#78350f" />
    </linearGradient>
  </defs>
  <rect width="400" height="400" fill="url(#forestSky)" />
  <g fill="#fde047">
    <circle cx="40" cy="50" r="4" opacity="0.7" />
    <circle cx="160" cy="30" r="3" opacity="0.6" />
    <circle cx="340" cy="40" r="5" opacity="0.8" />
    <circle cx="280" cy="80" r="3" opacity="0.5" />
    <polygon points="120,60 123,65 120,70 117,65" opacity="0.8" />
    <polygon points="230,45 234,51 230,57 226,51" opacity="0.75" />
    <polygon points="360,110 363,115 360,120 357,115" opacity="0.9" />
    <polygon points="50,150 53,155 50,160 47,155" opacity="0.65" />
  </g>
  <g fill="#064e3b" opacity="0.4">
    <polygon points="40,280 -10,200 90,200" />
    <polygon points="320,280 270,180 370,180" />
  </g>
  <g fill="#0f766e" opacity="0.6">
    <polygon points="280,300 240,210 320,210" />
    <polygon points="90,300 40,190 140,190" />
  </g>
  <g>
    <rect x="72" y="300" width="16" height="50" fill="#78350f" stroke="#451a03" stroke-width="1.5" />
    <polygon points="80,300 15,220 145,220" fill="#047857" stroke="#064e3b" stroke-width="2" />
    <polygon points="80,240 25,165 135,165" fill="#065f46" stroke="#064e3b" stroke-width="2" />
    <polygon points="80,180 35,115 125,115" fill="#064e3b" stroke="#022c22" stroke-width="2" />
    <circle cx="50" cy="200" r="4.5" fill="#ef4444" /><circle cx="100" cy="185" r="4.5" fill="#ef4444" />
    <circle cx="65" cy="145" r="4.5" fill="#ef4444" /><circle cx="95" cy="140" r="4.5" fill="#ef4444" />
  </g>
  <g transform="translate(110, 160) scale(0.55)">
    <ellipse cx="0" cy="0" rx="14" ry="18" fill="#a16207" stroke="#451a03" stroke-width="2" />
    <ellipse cx="0" cy="0" rx="10" ry="14" fill="#fef08a" />
    <polygon points="-8,-12 -12,-20 -2,-16" fill="#a16207" stroke="#451a03" stroke-width="1.5" />
    <polygon points="8,-12 12,-20 2,-16" fill="#a16207" stroke="#451a03" stroke-width="1.5" />
    <path d="M -8,-3 Q -5,-7 -2,-3" fill="none" stroke="#451a03" stroke-width="2.5" stroke-linecap="round" />
    <path d="M 8,-3 Q 5,-7 2,-3" fill="none" stroke="#451a03" stroke-width="2.5" stroke-linecap="round" />
    <polygon points="0,-2 -3,2 3,2" fill="#f97316" />
  </g>
  <path d="M -20,330 Q 80,310 200,325 T 420,315 L 420,400 L -20,400 Z" fill="#15803d" stroke="#14532d" stroke-width="2" />
  <path d="M 120,345 Q 260,330 420,350 L 420,400 L 120,400 Z" fill="#166534" opacity="0.6" />
  <g transform="translate(290, 130) scale(0.5)">
    <ellipse cx="0" cy="0" rx="2" ry="10" fill="#1e293b" />
    <circle cx="-8" cy="-6" r="6.5" fill="#a855f7" />
    <circle cx="8" cy="-6" r="6.5" fill="#a855f7" />
    <circle cx="-6" cy="4" r="5" fill="#e9d5ff" />
    <circle cx="6" cy="4" r="5" fill="#e9d5ff" />
  </g>
  <g transform="translate(190, 90) scale(0.45) rotate(15)">
    <ellipse cx="0" cy="0" rx="2" ry="10" fill="#1e293b" />
    <circle cx="-8" cy="-6" r="6.5" fill="#f43f5e" />
    <circle cx="8" cy="-6" r="6.5" fill="#f43f5e" />
    <circle cx="-6" cy="4" r="5" fill="#fda4af" />
  </g>
  <g>
    <circle cx="180" cy="210" r="13" fill="#78350f" stroke="#451a03" stroke-width="2" />
    <circle cx="180" cy="210" r="7" fill="#fda4af" />
    <circle cx="240" cy="210" r="13" fill="#78350f" stroke="#451a03" stroke-width="2" />
    <circle cx="240" cy="210" r="7" fill="#fda4af" />
    <circle cx="210" cy="230" r="30" fill="url(#bearGrad)" stroke="#451a03" stroke-width="2.5" />
    <circle cx="210" cy="242" r="11" fill="#fed7aa" />
    <polygon points="206,238 214,238 210,243" fill="#000" />
    <path d="M 207,247 Q 210,249 213,247" fill="none" stroke="#000" stroke-width="1.5" stroke-linecap="round" />
    <circle cx="198" cy="226" r="4.5" fill="#000" /><circle cx="198" cy="226" r="1.5" fill="#fff" />
    <circle cx="222" cy="226" r="4.5" fill="#000" /><circle cx="222" cy="226" r="1.5" fill="#fff" />
    <circle cx="190" cy="236" r="3" fill="#fda4af" opacity="0.6" />
    <circle cx="230" cy="236" r="3" fill="#fda4af" opacity="0.6" />
    <ellipse cx="210" cy="302" rx="36" ry="42" fill="url(#bearGrad)" stroke="#451a03" stroke-width="2.5" />
    <ellipse cx="210" cy="302" rx="20" ry="26" fill="#fed7aa" />
    <circle cx="168" cy="324" r="12" fill="#78350f" stroke="#451a03" stroke-width="2" />
    <circle cx="252" cy="324" r="12" fill="#78350f" stroke="#451a03" stroke-width="2" />
  </g>
  <g transform="translate(285, 305) scale(0.65)">
    <path d="M -15,10 C -20,10 -25,18 -25,30 C -25,45 -15,50 15,50 C 45,50 55,45 55,30 C 55,18 50,10 45,10 Z" fill="#fb923c" stroke="#c2410c" stroke-width="3" />
    <ellipse cx="15" cy="10" rx="30" ry="8" fill="#f97316" stroke="#c2410c" stroke-width="3" />
    <ellipse cx="15" cy="10" rx="25" ry="5" fill="#fde047" />
    <path d="M 0,12 C 0,22 6,24 10,24 C 14,24 15,12 15,12 Z" fill="#fde047" />
    <rect x="-5" y="22" width="40" height="16" rx="3" fill="#fffef0" stroke="#78350f" stroke-width="1.5" />
    <path d="M 2,28 L 5,34 L 8,28 M 12,28 L 12,34 M 16,34 C 18,34 18,28 16,28 M 22,28 L 22,34" fill="none" stroke="#78350f" stroke-width="1.2" />
    <g transform="translate(-15, -15) scale(0.6)">
      <ellipse cx="0" cy="0" rx="8" ry="6" fill="#fde047" stroke="#000" stroke-width="1.5" />
      <line x1="-3" y1="-5" x2="-3" y2="5" stroke="#000" stroke-width="1.5" />
      <line x1="2" y1="-5" x2="2" y2="5" stroke="#000" stroke-width="1.5" />
      <ellipse cx="-1" cy="-8" rx="3" ry="5" fill="#e0f2fe" opacity="0.8" />
    </g>
    <g transform="translate(45, -5) scale(0.5) rotate(-30)">
      <ellipse cx="0" cy="0" rx="8" ry="6" fill="#fde047" stroke="#000" stroke-width="1.5" />
      <ellipse cx="-1" cy="-8" rx="3" ry="5" fill="#e0f2fe" opacity="0.8" />
    </g>
  </g>
  <g transform="translate(30, 335) scale(0.7)">
    <path d="M 28,40 Q 28,15 35,15 Q 42,15 42,40 Z" fill="#fafaf9" stroke="#d6d3d1" stroke-width="1.5" />
    <path d="M 12,18 Q 35,-20 58,18 Z" fill="#ef4444" stroke="#b91c1c" stroke-width="2.5" />
    <circle cx="35" cy="-2" r="5" fill="#ffffff" />
    <circle cx="24" cy="6" r="4.5" fill="#ffffff" />
    <circle cx="48" cy="8" r="4" fill="#ffffff" />
    <path d="M 68,40 Q 68,25 72,25 Q 76,25 76,40 Z" fill="#fafaf9" />
    <path d="M 60,25 Q 72,5 84,25 Z" fill="#ef4444" />
  </g>
</svg>`
  }
];
