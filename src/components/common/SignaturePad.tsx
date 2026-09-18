import React, { useRef, useEffect, useState, useCallback } from 'react';
import { RotateCcw, Check, PenLine, Sparkles } from 'lucide-react';

interface SignaturePadProps {
  initialValue?: string;
  onChange: (dataUrl: string | undefined) => void;
  height?: number;
}

/** Tiny sky-blue scribble used only for demo walkthroughs (not a legal wet signature). */
function paintDemoScribble(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
) {
  ctx.strokeStyle = '#0284c7';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  const y = height * 0.55;
  ctx.moveTo(width * 0.12, y);
  ctx.bezierCurveTo(width * 0.22, y - height * 0.28, width * 0.28, y + height * 0.22, width * 0.38, y - height * 0.05);
  ctx.bezierCurveTo(width * 0.48, y - height * 0.32, width * 0.55, y + height * 0.18, width * 0.68, y);
  ctx.bezierCurveTo(width * 0.78, y - height * 0.15, width * 0.82, y + height * 0.1, width * 0.88, y - height * 0.02);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(width * 0.72, y + height * 0.12);
  ctx.lineTo(width * 0.9, y + height * 0.22);
  ctx.stroke();
}

export const SignaturePad: React.FC<SignaturePadProps> = ({
  initialValue,
  onChange,
  height = 160
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(Boolean(initialValue));

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    const rect = parent.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = rect.width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (initialValue) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, height);
      };
      img.src = initialValue;
    }
  }, [height, initialValue]);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [resizeCanvas]);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    if ('touches' in e && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    } else if ('clientX' in e) {
      return {
        x: (e as React.MouseEvent).clientX - rect.left,
        y: (e as React.MouseEvent).clientY - rect.top
      };
    }
    return { x: 0, y: 0 };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = (e?: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    if (e) e.preventDefault();
    setIsDrawing(false);

    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');
    setHasSignature(true);
    onChange(dataUrl);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, height);
    setHasSignature(false);
    onChange(undefined);
  };

  const handleDemoSign = (e: React.MouseEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, height);
    paintDemoScribble(ctx, rect.width, height);
    const dataUrl = canvas.toDataURL('image/png');
    setHasSignature(true);
    onChange(dataUrl);
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <PenLine className="w-3.5 h-3.5 text-sky-400" />
          Inspector Digital Signature (Sign with finger or stylus)
        </label>
        <div className="flex items-center gap-1.5">
          {!hasSignature && (
            <button
              type="button"
              onClick={handleDemoSign}
              className="inline-flex items-center gap-1 text-xs text-sky-300 hover:text-sky-200 font-medium px-2 py-1 rounded bg-sky-500/10 border border-sky-500/30 active:scale-95 transition-all"
              title="Demo only — applies a placeholder scribble for walkthroughs"
            >
              <Sparkles className="w-3 h-3" />
              Use demo signature
            </button>
          )}
          {hasSignature && (
            <button
              type="button"
              onClick={handleClear}
              className="inline-flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 font-medium px-2 py-1 rounded bg-rose-500/10 border border-rose-500/20 active:scale-95 transition-all"
            >
              <RotateCcw className="w-3 h-3" />
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="relative w-full rounded-xl border-2 border-dashed border-slate-700 hover:border-sky-500/50 bg-slate-900/90 overflow-hidden shadow-inner transition-colors">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full cursor-crosshair block"
        />

        {!hasSignature && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-slate-500">
            <PenLine className="w-6 h-6 mb-1 stroke-1 text-slate-600" />
            <p className="text-xs">Touch and sign inside the box</p>
            <p className="text-[10px] text-slate-600 mt-1">or use Demo signature above</p>
          </div>
        )}

        {hasSignature && (
          <div className="pointer-events-none absolute bottom-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-semibold border border-emerald-500/30">
            <Check className="w-3 h-3" />
            Signed
          </div>
        )}
      </div>
    </div>
  );
};
