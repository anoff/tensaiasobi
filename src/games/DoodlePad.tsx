import React, { useRef, useState, useEffect } from 'react';
import KidButton from '../components/KidButton';
import ConfirmWipeButton from '../components/ConfirmWipeButton';
import { useTranslation } from '../hooks/useTranslation';
import { getCanvasCoords } from '../utils/canvas';

interface DoodlePadProps {
  playPop: () => void;
}

const PRESETS_COLORS = [
  '#FF4D4D', // Red
  '#FF7675', // Soft Red
  '#FF9F43', // Orange
  '#FECA57', // Yellow
  '#1DD1A1', // Teal
  '#10AC84', // Green
  '#48DBFB', // Sky Blue
  '#54A0FF', // Ocean Blue
  '#5F27CD', // Purple
  '#CE93D8', // Candy Purple
  '#FF6EB4', // Candy Pink
  '#FF9FF3', // Light Pink
  '#8D6E63', // Brown
  '#95A5A6', // Grey
  '#2C3E50', // Dark Blue/Black
];

export function DoodlePad({ playPop }: DoodlePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [color, setColor] = useState(PRESETS_COLORS[0]);
  const [brushSize, setBrushSize] = useState(10);
  const [isEraser, setIsEraser] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const { t } = useTranslation();


  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;


    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const resizeCanvas = () => {
      const container = containerRef.current;
      if (!container) return;


      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) {
        tempCtx.drawImage(canvas, 0, 0);
      }


      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;

      // Re-configure ctx properties after resize
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';


      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);


      ctx.drawImage(tempCanvas, 0, 0);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault(); // Prevents touch scrolling on iOS/Android
    const coords = getCanvasCoords(canvasRef.current, e);
    if (!coords) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);


    ctx.lineWidth = brushSize;
    if (isEraser) {
      ctx.globalCompositeOperation = 'destination-out';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color;
    }


    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();

    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();

    const coords = getCanvasCoords(canvasRef.current, e);
    if (!coords) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx) {
      ctx.closePath();
    }
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    playPop();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const downloadDrawing = () => {
    playPop();
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const dataUrl = canvas.toDataURL('image/png');
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const filename = `tensaiasobi-${year}-${month}-${day}.png`;

      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error('Error downloading drawing:', e);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-2 w-full select-none h-full gap-2 overflow-hidden">
      {/* Canvas Area */}
      <div
        ref={containerRef}
        className="flex-1 border-4 border-slate-300 rounded-[2rem] overflow-hidden shadow-inner bg-white relative"
      >
        <canvas
          ref={canvasRef}
          data-testid="doodle-canvas"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
        />
      </div>

      {/* Controls — single compact row */}
      <div className="flex items-center gap-3 bg-slate-100 px-3 py-2 rounded-3xl border-2 border-slate-200 shrink-0 select-none w-full overflow-hidden">
        {/* Color Palette (Scrollable row) */}
        <div className="flex items-center gap-2 flex-1 overflow-x-auto scrollbar-hide py-1 pr-1">
          {PRESETS_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => {
                playPop();
                setColor(c);
                setIsEraser(false);
              }}
              style={{ backgroundColor: c }}
              className={`
                w-7 h-7 rounded-full border-2 transition-transform duration-75 cursor-pointer outline-none shrink-0
                ${color === c && !isEraser ? 'scale-110 border-slate-800 shadow-md ring-2 ring-white' : 'border-slate-300'}
              `}
            />
          ))}

          {/* Eraser */}
          <button
            onClick={() => { playPop(); setIsEraser(true); }}
            data-testid="doodle-eraser"
            className={`
              w-7 h-7 rounded-full border-2 transition-all duration-75 flex items-center justify-center cursor-pointer outline-none text-sm shrink-0
              ${isEraser ? 'scale-110 border-slate-800 bg-slate-300 shadow-md ring-2 ring-white' : 'border-slate-300 bg-white hover:bg-slate-50'}
            `}
            title={t.doodlePad.eraser}
          >
            🧽
          </button>
        </div>

        {/* Brush Sizes */}
        <div className="flex bg-white rounded-2xl border-2 border-slate-200 p-1 gap-1 shrink-0">
          {([5, 12, 24] as const).map((size) => (
            <button
              key={size}
              onClick={() => { playPop(); setBrushSize(size); }}
              className={`
                px-1.5 py-1 flex items-center justify-center rounded-xl transition-all duration-75 outline-none cursor-pointer
                ${brushSize === size ? 'bg-slate-200 text-slate-800' : 'text-slate-400 hover:text-slate-600'}
              `}
            >
              <div
                style={{ width: `${size === 5 ? 6 : size === 12 ? 12 : 20}px`, height: `${size === 5 ? 6 : size === 12 ? 12 : 20}px` }}
                className="rounded-full bg-slate-800"
              />
            </button>
          ))}
        </div>

        {/* Action Buttons: Download & Reset */}
        <div className="flex gap-1.5 shrink-0">
          <KidButton
            color="green"
            size="sm"
            data-testid="doodle-download"
            onClick={downloadDrawing}
            className="!py-1.5 !px-3 shadow-[0_4px_0_0_#059669] active:translate-y-[2px] active:shadow-[0_1px_0_0_#059669]"
            title={t.doodlePad.download}
          >
            📥
          </KidButton>

          <ConfirmWipeButton
            onConfirm={clearCanvas}
            size="sm"
            data-testid="doodle-clear"
            label="🗑"
            confirmLabel="🗑️?"
            className="!py-1.5 !px-3 shadow-[0_4px_0_0_#b91c1c] active:translate-y-[2px] active:shadow-[0_1px_0_0_#b91c1c]"
          />
        </div>
      </div>
    </div>
  );
}

export default DoodlePad;
