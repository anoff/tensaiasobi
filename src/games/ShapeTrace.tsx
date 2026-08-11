import React, { useState, useRef } from 'react';
import GameConfetti from '../components/GameConfetti';
import KidButton from '../components/KidButton';
import ConfirmWipeButton from '../components/ConfirmWipeButton';
import DifficultySelector from '../components/DifficultySelector';
import type { GameDifficulty, GameProps } from '../types/game';
import { useTranslation } from '../hooks/useTranslation';
import { getCanvasCoords } from '../utils/canvas';
import { starMultiplier } from '../utils/difficulty';
import { useCanvasLoop } from '../hooks/useCanvasLoop';
import { spawnParticles, drawParticles, type Particle } from '../utils/particles';
import {
  getPixelCoord,
  getDistanceToPath,
  getPathSamples,
  getMarginSize as marginMultiplier,
  type Point,
} from '../utils/traceGeometry';

interface Shape {
  id: string;
  name: string;
  emoji: string;
  points: Point[];
  color: string;
}

const SHAPES: Shape[] = [
  {
    id: 'star',
    name: 'Star',
    emoji: '⭐',
    color: '#FFD740',
    points: [
      { x: 50, y: 15 },
      { x: 61, y: 40 },
      { x: 88, y: 40 },
      { x: 66, y: 56 },
      { x: 74, y: 83 },
      { x: 50, y: 67 },
      { x: 26, y: 83 },
      { x: 34, y: 56 },
      { x: 12, y: 40 },
      { x: 39, y: 40 },
      { x: 50, y: 15 },
    ],
  },
  {
    id: 'heart',
    name: 'Heart',
    emoji: '❤️',
    color: '#FF4D4D',
    points: [
      { x: 50, y: 30 },
      { x: 38, y: 18 },
      { x: 22, y: 18 },
      { x: 14, y: 32 },
      { x: 18, y: 52 },
      { x: 32, y: 68 },
      { x: 50, y: 85 },
      { x: 68, y: 68 },
      { x: 82, y: 52 },
      { x: 86, y: 32 },
      { x: 78, y: 18 },
      { x: 62, y: 18 },
      { x: 50, y: 30 },
    ],
  },
  {
    id: 'moon',
    name: 'Moon',
    emoji: '🌙',
    color: '#CE93D8',
    points: [
      { x: 60, y: 15 },
      { x: 72, y: 28 },
      { x: 76, y: 46 },
      { x: 72, y: 64 },
      { x: 60, y: 78 },
      { x: 44, y: 85 },
      { x: 42, y: 72 },
      { x: 34, y: 58 },
      { x: 32, y: 46 },
      { x: 36, y: 32 },
      { x: 46, y: 22 },
      { x: 60, y: 15 },
    ],
  },
  {
    id: 'balloon',
    name: 'Balloon',
    emoji: '🎈',
    color: '#FF4081',
    points: [
      { x: 50, y: 15 },
      { x: 68, y: 18 },
      { x: 78, y: 32 },
      { x: 78, y: 52 },
      { x: 68, y: 66 },
      { x: 50, y: 72 },
      { x: 54, y: 76 },
      { x: 46, y: 82 },
      { x: 52, y: 88 },
      { x: 48, y: 94 },
      { x: 50, y: 72 },
      { x: 32, y: 66 },
      { x: 22, y: 52 },
      { x: 22, y: 32 },
      { x: 32, y: 18 },
      { x: 50, y: 15 },
    ],
  },
  {
    id: 'crown',
    name: 'Crown',
    emoji: '👑',
    color: '#FFAB40',
    points: [
      { x: 18, y: 80 },
      { x: 82, y: 80 },
      { x: 88, y: 48 },
      { x: 80, y: 36 },
      { x: 65, y: 56 },
      { x: 50, y: 22 },
      { x: 35, y: 56 },
      { x: 20, y: 36 },
      { x: 12, y: 48 },
      { x: 18, y: 80 },
    ],
  },
  {
    id: 'triangle',
    name: 'Triangle',
    emoji: '🔺',
    color: '#69F0AE',
    points: [
      { x: 50, y: 18 },
      { x: 68, y: 48 },
      { x: 85, y: 78 },
      { x: 50, y: 78 },
      { x: 15, y: 78 },
      { x: 32, y: 48 },
      { x: 50, y: 18 },
    ],
  },
  // 22 Additional shapes
  {
    id: 'square',
    name: 'Square',
    emoji: '⏹️',
    color: '#4FC3F7',
    points: [
      { x: 20, y: 20 },
      { x: 80, y: 20 },
      { x: 80, y: 80 },
      { x: 20, y: 80 },
      { x: 20, y: 20 },
    ],
  },
  {
    id: 'circle',
    name: 'Circle',
    emoji: '⭕',
    color: '#E91E63',
    points: Array.from({ length: 17 }, (_, i) => {
      const angle = (i / 16) * Math.PI * 2;
      return {
        x: Math.round(50 + Math.cos(angle) * 32),
        y: Math.round(50 + Math.sin(angle) * 32),
      };
    }),
  },
  {
    id: 'diamond',
    name: 'Diamond',
    emoji: '🔷',
    color: '#00E5FF',
    points: [
      { x: 50, y: 15 },
      { x: 80, y: 50 },
      { x: 50, y: 85 },
      { x: 20, y: 50 },
      { x: 50, y: 15 },
    ],
  },
  {
    id: 'pentagon',
    name: 'Pentagon',
    emoji: '⬠',
    color: '#CE93D8',
    points: [
      { x: 50, y: 15 },
      { x: 83, y: 39 },
      { x: 71, y: 78 },
      { x: 29, y: 78 },
      { x: 17, y: 39 },
      { x: 50, y: 15 },
    ],
  },
  {
    id: 'hexagon',
    name: 'Hexagon',
    emoji: '⬡',
    color: '#FFF176',
    points: [
      { x: 50, y: 15 },
      { x: 80, y: 32 },
      { x: 80, y: 68 },
      { x: 50, y: 85 },
      { x: 20, y: 68 },
      { x: 20, y: 32 },
      { x: 50, y: 15 },
    ],
  },
  {
    id: 'house',
    name: 'House',
    emoji: '🏠',
    color: '#8D6E63',
    points: [
      { x: 20, y: 80 },
      { x: 20, y: 50 },
      { x: 50, y: 20 },
      { x: 80, y: 50 },
      { x: 80, y: 80 },
      { x: 20, y: 80 },
    ],
  },
  {
    id: 'fish',
    name: 'Fish',
    emoji: '🐟',
    color: '#0284c7',
    points: [
      { x: 15, y: 50 },
      { x: 35, y: 33 },
      { x: 65, y: 33 },
      { x: 75, y: 45 },
      { x: 85, y: 30 },
      { x: 80, y: 50 },
      { x: 85, y: 70 },
      { x: 75, y: 55 },
      { x: 65, y: 67 },
      { x: 35, y: 67 },
      { x: 15, y: 50 },
    ],
  },
  {
    id: 'cloud',
    name: 'Cloud',
    emoji: '☁️',
    color: '#90A4AE',
    points: [
      { x: 25, y: 65 },
      { x: 18, y: 50 },
      { x: 28, y: 35 },
      { x: 45, y: 35 },
      { x: 55, y: 23 },
      { x: 70, y: 28 },
      { x: 80, y: 43 },
      { x: 80, y: 60 },
      { x: 70, y: 65 },
      { x: 25, y: 65 },
    ],
  },
  {
    id: 'lightning',
    name: 'Lightning',
    emoji: '⚡',
    color: '#FFD54F',
    points: [
      { x: 55, y: 15 },
      { x: 25, y: 55 },
      { x: 48, y: 55 },
      { x: 40, y: 85 },
      { x: 75, y: 45 },
      { x: 52, y: 45 },
      { x: 55, y: 15 },
    ],
  },
  {
    id: 'envelope',
    name: 'Envelope',
    emoji: '✉️',
    color: '#B0BEC5',
    points: [
      { x: 15, y: 25 },
      { x: 85, y: 25 },
      { x: 85, y: 75 },
      { x: 15, y: 75 },
      { x: 15, y: 25 },
      { x: 50, y: 50 },
      { x: 85, y: 25 },
    ],
  },
  {
    id: 'apple',
    name: 'Apple',
    emoji: '🍎',
    color: '#E53935',
    points: [
      { x: 50, y: 25 },
      { x: 65, y: 20 },
      { x: 78, y: 30 },
      { x: 80, y: 50 },
      { x: 72, y: 70 },
      { x: 50, y: 80 },
      { x: 28, y: 70 },
      { x: 20, y: 50 },
      { x: 22, y: 30 },
      { x: 35, y: 20 },
      { x: 50, y: 25 },
    ],
  },
  {
    id: 'flower',
    name: 'Flower',
    emoji: '🌸',
    color: '#F48FB1',
    points: [
      { x: 50, y: 35 },
      { x: 60, y: 23 },
      { x: 70, y: 35 },
      { x: 60, y: 45 },
      { x: 75, y: 50 },
      { x: 65, y: 60 },
      { x: 50, y: 65 },
      { x: 35, y: 60 },
      { x: 25, y: 50 },
      { x: 40, y: 45 },
      { x: 30, y: 35 },
      { x: 40, y: 23 },
      { x: 50, y: 35 },
    ],
  },
  {
    id: 'key',
    name: 'Key',
    emoji: '🔑',
    color: '#FFB300',
    points: [
      { x: 30, y: 25 },
      { x: 42, y: 25 },
      { x: 48, y: 35 },
      { x: 42, y: 45 },
      { x: 38, y: 45 },
      { x: 38, y: 60 },
      { x: 50, y: 60 },
      { x: 50, y: 66 },
      { x: 38, y: 66 },
      { x: 38, y: 76 },
      { x: 50, y: 76 },
      { x: 50, y: 82 },
      { x: 32, y: 82 },
      { x: 32, y: 45 },
      { x: 22, y: 45 },
      { x: 18, y: 35 },
      { x: 22, y: 25 },
      { x: 30, y: 25 },
    ],
  },
  {
    id: 'car',
    name: 'Car',
    emoji: '🚗',
    color: '#FF3D00',
    points: [
      { x: 15, y: 70 },
      { x: 15, y: 50 },
      { x: 30, y: 50 },
      { x: 40, y: 30 },
      { x: 70, y: 30 },
      { x: 80, y: 50 },
      { x: 85, y: 50 },
      { x: 85, y: 70 },
      { x: 75, y: 70 },
      { x: 70, y: 80 },
      { x: 60, y: 80 },
      { x: 55, y: 70 },
      { x: 40, y: 70 },
      { x: 35, y: 80 },
      { x: 25, y: 80 },
      { x: 20, y: 70 },
      { x: 15, y: 70 },
    ],
  },
  {
    id: 'tree',
    name: 'Tree',
    emoji: '🌲',
    color: '#4CAF50',
    points: [
      { x: 50, y: 15 },
      { x: 65, y: 35 },
      { x: 57, y: 35 },
      { x: 72, y: 55 },
      { x: 62, y: 55 },
      { x: 80, y: 75 },
      { x: 55, y: 75 },
      { x: 55, y: 85 },
      { x: 45, y: 85 },
      { x: 45, y: 75 },
      { x: 20, y: 75 },
      { x: 38, y: 55 },
      { x: 28, y: 55 },
      { x: 43, y: 35 },
      { x: 35, y: 35 },
      { x: 50, y: 15 },
    ],
  },
  {
    id: 'boat',
    name: 'Boat',
    emoji: '⛵',
    color: '#00ACC1',
    points: [
      { x: 20, y: 70 },
      { x: 80, y: 70 },
      { x: 70, y: 82 },
      { x: 30, y: 82 },
      { x: 20, y: 70 },
      { x: 50, y: 70 },
      { x: 50, y: 20 },
      { x: 75, y: 62 },
      { x: 52, y: 62 },
      { x: 52, y: 70 },
      { x: 20, y: 70 },
    ],
  },
  {
    id: 'clover',
    name: 'Clover',
    emoji: '☘️',
    color: '#43A047',
    points: [
      { x: 50, y: 45 },
      { x: 65, y: 35 },
      { x: 72, y: 45 },
      { x: 60, y: 55 },
      { x: 65, y: 70 },
      { x: 50, y: 65 },
      { x: 35, y: 70 },
      { x: 40, y: 55 },
      { x: 28, y: 45 },
      { x: 35, y: 35 },
      { x: 50, y: 45 },
      { x: 50, y: 85 },
      { x: 46, y: 85 },
      { x: 46, y: 55 },
      { x: 50, y: 45 },
    ],
  },
  {
    id: 'butterfly',
    name: 'Butterfly',
    emoji: '🦋',
    color: '#29B6F6',
    points: [
      { x: 50, y: 35 },
      { x: 70, y: 15 },
      { x: 85, y: 30 },
      { x: 65, y: 50 },
      { x: 80, y: 65 },
      { x: 70, y: 80 },
      { x: 52, y: 60 },
      { x: 52, y: 82 },
      { x: 48, y: 82 },
      { x: 48, y: 60 },
      { x: 30, y: 80 },
      { x: 20, y: 65 },
      { x: 35, y: 50 },
      { x: 15, y: 30 },
      { x: 30, y: 15 },
      { x: 50, y: 35 },
    ],
  },
  {
    id: 'icecream',
    name: 'Ice Cream',
    emoji: '🍦',
    color: '#FF8A80',
    points: [
      { x: 35, y: 60 },
      { x: 25, y: 50 },
      { x: 35, y: 25 },
      { x: 50, y: 15 },
      { x: 65, y: 25 },
      { x: 75, y: 50 },
      { x: 65, y: 60 },
      { x: 50, y: 88 },
      { x: 35, y: 60 },
    ],
  },
  {
    id: 'trophy',
    name: 'Trophy',
    emoji: '🏆',
    color: '#FFC107',
    points: [
      { x: 25, y: 25 },
      { x: 75, y: 25 },
      { x: 70, y: 55 },
      { x: 55, y: 65 },
      { x: 55, y: 78 },
      { x: 70, y: 78 },
      { x: 70, y: 85 },
      { x: 30, y: 85 },
      { x: 30, y: 78 },
      { x: 45, y: 78 },
      { x: 45, y: 65 },
      { x: 30, y: 55 },
      { x: 25, y: 25 },
    ],
  },
  {
    id: 'rocket',
    name: 'Rocket',
    emoji: '🚀',
    color: '#CFD8DC',
    points: [
      { x: 50, y: 15 },
      { x: 65, y: 35 },
      { x: 65, y: 70 },
      { x: 75, y: 80 },
      { x: 60, y: 80 },
      { x: 50, y: 72 },
      { x: 40, y: 80 },
      { x: 25, y: 80 },
      { x: 35, y: 70 },
      { x: 35, y: 35 },
      { x: 50, y: 15 },
    ],
  },
  {
    id: 'bell',
    name: 'Bell',
    emoji: '🔔',
    color: '#FFCA28',
    points: [
      { x: 50, y: 20 },
      { x: 65, y: 35 },
      { x: 65, y: 70 },
      { x: 80, y: 75 },
      { x: 58, y: 75 },
      { x: 55, y: 85 },
      { x: 45, y: 85 },
      { x: 42, y: 75 },
      { x: 20, y: 75 },
      { x: 35, y: 70 },
      { x: 35, y: 35 },
      { x: 50, y: 20 },
    ],
  },
  {
    id: 'cat',
    name: 'Cat',
    emoji: '🐱',
    color: '#FFCC80',
    points: [
      { x: 35, y: 25 },
      { x: 42, y: 38 },
      { x: 50, y: 35 },
      { x: 58, y: 38 },
      { x: 65, y: 25 },
      { x: 72, y: 48 },
      { x: 75, y: 60 },
      { x: 65, y: 72 },
      { x: 50, y: 78 },
      { x: 35, y: 72 },
      { x: 25, y: 60 },
      { x: 28, y: 48 },
      { x: 35, y: 25 },
    ],
  },
  {
    id: 'dog',
    name: 'Dog',
    emoji: '🐶',
    color: '#A1887F',
    points: [
      { x: 35, y: 30 },
      { x: 50, y: 25 },
      { x: 65, y: 30 },
      { x: 70, y: 40 },
      { x: 78, y: 40 },
      { x: 80, y: 60 },
      { x: 70, y: 60 },
      { x: 68, y: 72 },
      { x: 50, y: 80 },
      { x: 32, y: 72 },
      { x: 30, y: 60 },
      { x: 20, y: 60 },
      { x: 22, y: 40 },
      { x: 30, y: 40 },
      { x: 35, y: 30 },
    ],
  },
  {
    id: 'chick',
    name: 'Chick',
    emoji: '🐤',
    color: '#FFF176',
    points: [
      { x: 45, y: 20 },
      { x: 58, y: 20 },
      { x: 64, y: 28 },
      { x: 78, y: 28 },
      { x: 68, y: 38 },
      { x: 62, y: 48 },
      { x: 70, y: 62 },
      { x: 65, y: 74 },
      { x: 45, y: 78 },
      { x: 25, y: 74 },
      { x: 20, y: 60 },
      { x: 32, y: 55 },
      { x: 38, y: 42 },
      { x: 45, y: 20 },
    ],
  },
  {
    id: 'elephant',
    name: 'Elephant',
    emoji: '🐘',
    color: '#90A4AE',
    points: [
      { x: 35, y: 30 },
      { x: 50, y: 25 },
      { x: 55, y: 38 },
      { x: 58, y: 55 },
      { x: 68, y: 55 },
      { x: 66, y: 45 },
      { x: 58, y: 43 },
      { x: 50, y: 45 },
      { x: 50, y: 78 },
      { x: 42, y: 78 },
      { x: 42, y: 63 },
      { x: 30, y: 63 },
      { x: 30, y: 78 },
      { x: 22, y: 78 },
      { x: 20, y: 45 },
      { x: 28, y: 32 },
      { x: 35, y: 30 },
    ],
  },
  {
    id: 'rabbit',
    name: 'Rabbit',
    emoji: '🐰',
    color: '#E0E0E0',
    points: [
      { x: 42, y: 15 },
      { x: 48, y: 35 },
      { x: 52, y: 35 },
      { x: 58, y: 15 },
      { x: 64, y: 32 },
      { x: 70, y: 48 },
      { x: 65, y: 65 },
      { x: 50, y: 74 },
      { x: 35, y: 65 },
      { x: 30, y: 48 },
      { x: 36, y: 32 },
      { x: 42, y: 15 },
    ],
  },
  {
    id: 'turtle',
    name: 'Turtle',
    emoji: '🐢',
    color: '#81C784',
    points: [
      { x: 25, y: 55 },
      { x: 38, y: 35 },
      { x: 50, y: 30 },
      { x: 62, y: 35 },
      { x: 75, y: 55 },
      { x: 85, y: 50 },
      { x: 88, y: 58 },
      { x: 80, y: 63 },
      { x: 72, y: 63 },
      { x: 66, y: 75 },
      { x: 58, y: 75 },
      { x: 58, y: 63 },
      { x: 42, y: 63 },
      { x: 38, y: 75 },
      { x: 30, y: 75 },
      { x: 30, y: 61 },
      { x: 20, y: 61 },
      { x: 25, y: 55 },
    ],
  },
];


export function ShapeTrace({ playPop, playSuccess, playError, onStarEarned }: GameProps) {
  const { t } = useTranslation();
  const [shapeIndex, setShapeIndex] = useState(0);
  const [difficulty, setDifficulty] = useState<GameDifficulty>('easy');
  const [drawingPoints, setDrawingPoints] = useState<{ x: number; y: number }[]>([]);
  const [isWon, setIsWon] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showErrorShake, setShowErrorShake] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isDrawingRef = useRef(false);
  const particlesRef = useRef<Particle[]>([]);

  const shape = SHAPES[shapeIndex];

  const getMarginSize = (canvasWidth: number): number =>
    marginMultiplier(canvasWidth, difficulty, { easy: 0.13, medium: 0.08, hard: 0.045 });

  const loadShape = (index: number) => {
    setShapeIndex(index);
    setDrawingPoints([]);
    setIsWon(false);
    setShowConfetti(false);
    setShowErrorShake(false);
    particlesRef.current = [];
  };

  const nextShape = () => {
    playPop();
    const nextIdx = (shapeIndex + 1) % SHAPES.length;
    loadShape(nextIdx);
  };

  useCanvasLoop(
    canvasRef,
    containerRef,
    (ctx, size) => {
      const marginSize = getMarginSize(size);

      ctx.clearRect(0, 0, size, size);
      const scalePoint = (p: Point) => getPixelCoord(p, size);

      // 1. Background Silhouette Emoji
      ctx.save();
      ctx.globalAlpha = isWon ? 1.0 : 0.06;
      ctx.font = `${size * 0.55}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (!isWon) {
        ctx.fillStyle = '#000000';
      }
      ctx.fillText(shape.emoji, size / 2, size / 2);
      ctx.restore();

      if (!isWon) {
        // 2. Draw Slightly Shaded Corridor Margin
        ctx.save();
        ctx.strokeStyle = `${shape.color}26`;
        ctx.lineWidth = marginSize * 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        shape.points.forEach((p, idx) => {
          const pt = scalePoint(p);
          if (idx === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });
        ctx.stroke();
        ctx.restore();

        // 3. Target Outline Guide Line
        ctx.save();
        ctx.strokeStyle = '#94A3B8';
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 6]);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        shape.points.forEach((p, idx) => {
          const pt = scalePoint(p);
          if (idx === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });
        ctx.stroke();
        ctx.restore();
      }

      // 4. Player crayon drawing points
      if (drawingPoints.length > 1) {
        ctx.save();
        ctx.strokeStyle = shape.color;
        ctx.lineWidth = Math.max(5, size * 0.02);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowBlur = 8;
        ctx.shadowColor = shape.color;
        ctx.beginPath();
        drawingPoints.forEach((pt, idx) => {
          if (idx === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });
        ctx.stroke();
        ctx.restore();
      }

      // 5. Start marker point
      if (!isWon && shape.points.length > 0) {
        const startPt = scalePoint(shape.points[0]);
        const pulse = 10 + Math.sin(Date.now() / 150) * 3;

        ctx.save();
        ctx.fillStyle = '#4CAF50';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#4CAF50';
        ctx.beginPath();
        ctx.arc(startPt.x, startPt.y, pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🏁', startPt.x, startPt.y);
      }

      // 6. Draw particles
      drawParticles(ctx, particlesRef.current);
    },
    [shapeIndex, drawingPoints, isWon, difficulty],
    420
  );

  const handlePointerDown = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (isWon) return;

    const coords = getCanvasCoords(canvasRef.current, e);
    if (!coords) return;

    isDrawingRef.current = true;
    playPop();
    setDrawingPoints([coords]);
    setShowErrorShake(false);
  };

  const handlePointerMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || isWon) return;

    const coords = getCanvasCoords(canvasRef.current, e);
    if (!coords) return;

    setDrawingPoints((prev) => [...prev, coords]);

    if (Math.random() < 0.25) {
      spawnParticles(particlesRef.current, coords.x, coords.y, shape.color, 8);
    }
  };

  const handlePointerUp = () => {
    isDrawingRef.current = false;
  };

  const handleCheckTrace = () => {
    const canvas = canvasRef.current;
    if (!canvas || drawingPoints.length < 5) {
      playError();
      setShowErrorShake(true);
      return;
    }

    const size = canvas.width;
    const marginSize = getMarginSize(size);
    const pixelPoints = shape.points.map((p) => getPixelCoord(p, size));


    let pointsInside = 0;
    drawingPoints.forEach((pt) => {
      const dist = getDistanceToPath(pt, pixelPoints);
      if (dist <= marginSize) {
        pointsInside += 1;
      }
    });

    const accuracyRate = pointsInside / drawingPoints.length;
    const isAccurate = accuracyRate >= 0.82;


    const targetSamples = getPathSamples(pixelPoints);
    let coveredSamples = 0;

    targetSamples.forEach((sample) => {
      const isCovered = drawingPoints.some((pt) => Math.hypot(pt.x - sample.x, pt.y - sample.y) <= marginSize * 1.35);
      if (isCovered) {
        coveredSamples += 1;
      }
    });

    const completionRate = coveredSamples / targetSamples.length;
    const isComplete = completionRate >= 0.80;

    if (isAccurate && isComplete) {
      setIsWon(true);
      setShowConfetti(true);
      playSuccess();
      const multiplier = starMultiplier(difficulty);
      onStarEarned?.(3 * multiplier);
    } else {
      playError();
      setShowErrorShake(true);
      setTimeout(() => setShowErrorShake(false), 500);
    }
  };

  const handleReset = () => {
    playPop();
    setDrawingPoints([]);
    setIsWon(false);
    setShowConfetti(false);
    setShowErrorShake(false);
  };

  const changeDifficulty = (diff: GameDifficulty) => {
    playPop();
    setDifficulty(diff);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-between p-2 w-full select-none max-w-lg mx-auto h-full animate-fade-in">
      {showConfetti && (
        <GameConfetti pieces={150} />
      )}

      {/* Header Shape Palette Selector */}
      <div className="w-full flex justify-between bg-white/80 p-2 rounded-3xl border-2 border-slate-200 shadow-sm shrink-0 gap-1.5 overflow-x-auto select-none">
        {SHAPES.map((sh, idx) => (
          <button
            key={sh.id}
            onClick={() => { playPop(); loadShape(idx); }}
            className={`
              w-11 h-11 flex items-center justify-center rounded-2xl text-2xl border-2 transition-all outline-none cursor-pointer shrink-0
              ${shapeIndex === idx
                ? 'border-slate-800 bg-slate-100 scale-110 shadow-sm'
                : 'border-slate-200 bg-white hover:bg-slate-50'
              }
            `}
          >
            {sh.emoji}
          </button>
        ))}
      </div>

      {/* Difficulty Sub-menu Selector */}
      <DifficultySelector
        selected={difficulty}
        options={['easy', 'medium', 'hard']}
        onChange={changeDifficulty}
        className="mt-2 shrink-0"
      />

      {/* Tracing Playground Area */}
      <div className="flex-1 flex flex-col items-center justify-center my-4 w-full h-full min-h-[280px]">
        <div
          ref={containerRef}
          className={`relative border-8 border-slate-300 rounded-[2.5rem] overflow-hidden shadow-inner bg-white flex items-center justify-center w-full aspect-square max-w-[420px] ${showErrorShake ? 'animate-shake' : ''
            }`}
        >
          <canvas
            ref={canvasRef}
            data-testid="trace-canvas"
            onMouseDown={handlePointerDown}
            onMouseMove={handlePointerMove}
            onMouseUp={handlePointerUp}
            onMouseLeave={handlePointerUp}
            onTouchStart={handlePointerDown}
            onTouchMove={handlePointerMove}
            onTouchEnd={handlePointerUp}
            className="w-full h-full cursor-crosshair touch-none"
          />

          {/* Victory Overlay Screen */}
          {isWon && (
            <div className="absolute inset-0 bg-white/95 flex flex-col items-center justify-center p-4 space-y-4 z-20 overflow-y-auto">
              <span className="text-6xl sm:text-7xl animate-bounce">{shape.emoji}</span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-800 text-center leading-tight">
                {t.shapeTrace.victory}
              </h2>
              <KidButton
                color="pink"
                size="md"
                onClick={nextShape}
                className="shadow-[0_6px_0_0_#d81b60] active:translate-y-[4px] whitespace-nowrap"
              >
                🌈 {t.shapeTrace.nextShape}
              </KidButton>
            </div>
          )}
        </div>
      </div>

      {/* Control Actions: Check, Reset */}
      <div className="w-full flex justify-center gap-4 py-2 shrink-0 select-none">
        <KidButton
          variant="primary"
          color="green"
          size="md"
          data-testid="trace-check"
          onClick={handleCheckTrace}
          disabled={isWon || drawingPoints.length < 5}
          className={`px-6 py-3 min-h-12 border-b-6 shadow-md rounded-[1.5rem] transition-all flex items-center gap-2 ${isWon || drawingPoints.length < 5 ? 'opacity-40 pointer-events-none' : ''
            }`}
        >
          ✅ {t.common.check}
        </KidButton>

        <ConfirmWipeButton
          onConfirm={handleReset}
          size="md"
          data-testid="trace-reset"
          label={`🗑️ ${t.common.reset}`}
          confirmLabel={`🗑️ ${t.common.confirmReset}`}
          className="px-6 py-3 min-h-12 border-b-6 shadow-md rounded-[1.5rem] transition-all flex items-center gap-2"
        />
      </div>

      {/* Bottom Help bar */}
      <div className="w-full text-center py-1 shrink-0">
        <span className="bg-white/90 border-2 border-slate-200 rounded-full px-5 py-1.5 text-xs font-extrabold text-slate-500 shadow-sm inline-flex items-center gap-1.5">
          👉 {t.shapeTrace.help}
        </span>
      </div>
    </div>
  );
}

export default ShapeTrace;
