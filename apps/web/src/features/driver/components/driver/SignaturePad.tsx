import { PointerEvent, useEffect, useRef, useState } from 'react';
import { RotateCcwIcon } from 'lucide-react';

type Point = {x: number;y: number;};

interface SignaturePadProps {
  onSignedChange: (signed: boolean) => void;
  onSignatureChange?: (svg: string | undefined) => void;
}

export function SignaturePad({ onSignedChange, onSignatureChange }: SignaturePadProps) {
  const surfaceRef = useRef<SVGSVGElement>(null);
  const [strokes, setStrokes] = useState<Point[][]>([]);
  const [drawing, setDrawing] = useState(false);

  useEffect(() => {
    const valid = strokes.some(stroke => stroke.length > 1);
    onSignedChange(valid);
    onSignatureChange?.(valid ? surfaceRef.current?.outerHTML : undefined);
  }, [strokes, onSignedChange, onSignatureChange]);

  const pointFromEvent = (event: PointerEvent<SVGSVGElement>): Point => {
    const bounds = surfaceRef.current?.getBoundingClientRect();
    return { x: event.clientX - (bounds?.left ?? 0), y: event.clientY - (bounds?.top ?? 0) };
  };

  const start = (event: PointerEvent<SVGSVGElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrawing(true);
    setStrokes((current) => [...current, [pointFromEvent(event)]]);
  };

  const move = (event: PointerEvent<SVGSVGElement>) => {
    if (!drawing) return;
    const point = pointFromEvent(event);
    setStrokes((current) => current.map((stroke, index) => index === current.length - 1 ? [...stroke, point] : stroke));
  };

  const end = () => setDrawing(false);
  const clear = () => {
    setStrokes([]);
    onSignedChange(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-ink">Recipient signature</p>
        <button type="button" onClick={clear} className="inline-flex h-12 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
          <RotateCcwIcon aria-hidden className="h-4 w-4" />
          Clear
        </button>
      </div>
      <svg
        ref={surfaceRef}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        role="img"
        aria-label="Signature pad. Draw with your finger."
        className="h-32 w-full touch-none rounded-card border border-line bg-surface">
        
        <line x1="16" y1="104" x2="350" y2="104" stroke="#E0E3E0" strokeWidth="1" />
        {strokes.map((stroke, index) =>
        <polyline key={index} points={stroke.map((point) => `${point.x},${point.y}`).join(' ')} fill="none" stroke="#111111" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        )}
      </svg>
      <p className="mt-1 text-xs text-subtle">Ask the receiver to sign above.</p>
    </div>);

}