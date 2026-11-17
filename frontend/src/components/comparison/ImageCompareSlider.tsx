import { useState, useRef, useCallback, useEffect } from 'react';
import { ChevronsLeftRight, Clock, Sparkles } from 'lucide-react';

interface ImageCompareSliderProps {
  originalSrc: string;
  enhancedSrc: string;
  originalLabel?: string;
  enhancedLabel?: string;
  latencyMs?: number | null;
  entropyGain?: number;
}

export function ImageCompareSlider({
  originalSrc,
  enhancedSrc,
  originalLabel = 'Original Low-Light',
  enhancedLabel = 'CLAHE Enhanced',
  latencyMs,
  entropyGain
}: ImageCompareSliderProps) {
  const [sliderPos, setSliderPos] = useState<number>(50); // percentage (0 to 100)
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const width = rect.width;
    const percentage = Math.max(0, Math.min(100, (x / width) * 100));
    setSliderPos(percentage);
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging || e.touches.length === 0) return;
    handleMove(e.touches[0].clientX);
  }, [isDragging, handleMove]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    handleMove(e.clientX);
  }, [isDragging, handleMove]);

  const handleStopDragging = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleStopDragging);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleStopDragging);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleStopDragging);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleStopDragging);
    };
  }, [isDragging, handleMouseMove, handleStopDragging, handleTouchMove]);

  return (
    <div className="flex flex-col space-y-3">
      {/* Metrics Bar above slider */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-xs">
        <div className="flex items-center space-x-2">
          <span className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 font-medium border border-slate-700">
            {originalLabel}
          </span>
          <span className="text-slate-500 font-mono">vs</span>
          <span className="px-2.5 py-1 rounded bg-cyan-950/80 text-cyan-300 font-medium border border-cyan-700/50 flex items-center space-x-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>{enhancedLabel}</span>
          </span>
        </div>

        <div className="flex items-center space-x-3 text-slate-400">
          {latencyMs !== undefined && latencyMs !== null && (
            <span className="flex items-center space-x-1 font-mono text-emerald-400 bg-emerald-950/50 border border-emerald-800/40 px-2 py-0.5 rounded">
              <Clock className="w-3 h-3" />
              <span>Processing: {latencyMs.toFixed(2)} ms</span>
            </span>
          )}
          {entropyGain !== undefined && (
            <span className="font-mono text-cyan-400 bg-cyan-950/50 border border-cyan-800/40 px-2 py-0.5 rounded">
              Entropy: {entropyGain > 0 ? `+${entropyGain}` : entropyGain} bits
            </span>
          )}
        </div>
      </div>

      {/* Interactive Slider Container */}
      <div
        ref={containerRef}
        onMouseDown={() => setIsDragging(true)}
        onTouchStart={() => setIsDragging(true)}
        className="relative w-full overflow-hidden rounded-xl border border-slate-700 bg-slate-950 select-none cursor-ew-resize aspect-video max-h-[580px] flex items-center justify-center shadow-2xl"
      >
        {/* Enhanced Image (Background - Right side revealed as slider moves left) */}
        <img
          src={enhancedSrc}
          alt="CLAHE Enhanced"
          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
        />

        {/* Original Image (Foreground - Left side clipped based on sliderPos) */}
        <div
          className="absolute inset-0 overflow-hidden pointer-events-none"
          style={{ width: `${sliderPos}%` }}
        >
          <img
            src={originalSrc}
            alt="Original Dark"
            className="absolute inset-0 w-full h-full object-contain max-w-none"
            style={{
              width: containerRef.current ? `${containerRef.current.clientWidth}px` : '100%',
              height: '100%'
            }}
          />
        </div>

        {/* Draggable Divider Line */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.8)] pointer-events-none z-20"
          style={{ left: `${sliderPos}%` }}
        >
          {/* Circular Drag Handle */}
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-9 h-9 rounded-full bg-slate-900 border-2 border-cyan-400 text-cyan-300 shadow-xl flex items-center justify-center transition-transform hover:scale-110">
            <ChevronsLeftRight className="w-5 h-5" />
          </div>
        </div>

        {/* Floating Condition Tags */}
        <div className="absolute top-3 left-3 z-10 px-2.5 py-1 rounded-md bg-black/75 backdrop-blur-sm text-[11px] font-semibold text-slate-300 border border-slate-700 pointer-events-none">
          {originalLabel} (Left)
        </div>
        <div className="absolute top-3 right-3 z-10 px-2.5 py-1 rounded-md bg-black/75 backdrop-blur-sm text-[11px] font-semibold text-cyan-300 border border-cyan-800 pointer-events-none">
          {enhancedLabel} (Right)
        </div>

        {/* Bottom Helper Instruction */}
        <div className="absolute bottom-2 inset-x-0 mx-auto w-max z-10 px-3 py-1 rounded-full bg-slate-950/80 backdrop-blur-sm text-[11px] text-slate-400 border border-slate-800 pointer-events-none flex items-center space-x-1.5">
          <ChevronsLeftRight className="w-3.5 h-3.5 text-cyan-400" />
          <span>Drag horizontal slider to compare details</span>
        </div>
      </div>
    </div>
  );
}

export default ImageCompareSlider;

