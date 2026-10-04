import React, { useEffect, useRef } from 'react';

interface SignaturePadProps {
  onChange: (dataUrl: string | null) => void;
}

export function SignaturePad({ onChange }: SignaturePadProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const dirty = useRef(false);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    c.width = c.offsetWidth * 2;
    c.height = c.offsetHeight * 2;
    const ctx = c.getContext('2d');
    if (ctx) {
      ctx.scale(2, 2);
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#111';
    }
  }, []);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const clear = () => {
    const c = ref.current;
    c?.getContext('2d')?.clearRect(0, 0, c.width, c.height);
    dirty.current = false;
    onChange(null);
  };

  return (
    <div>
      <canvas
        ref={ref}
        aria-label="Signature area"
        className="h-40 w-full touch-none rounded-2xl border border-line bg-surface"
        onPointerDown={(e) => {
          drawing.current = true;
          const ctx = e.currentTarget.getContext('2d');
          const p = pos(e);
          ctx?.beginPath();
          ctx?.moveTo(p.x, p.y);
        }}
        onPointerMove={(e) => {
          if (!drawing.current) return;
          const ctx = e.currentTarget.getContext('2d');
          const p = pos(e);
          ctx?.lineTo(p.x, p.y);
          ctx?.stroke();
          dirty.current = true;
        }}
        onPointerUp={(e) => {
          drawing.current = false;
          if (dirty.current) onChange(e.currentTarget.toDataURL('image/png'));
        }}
        onPointerLeave={() => {
          drawing.current = false;
        }} />
      
      <button type="button" onClick={clear} className="mt-1 text-sm font-medium text-subtle hover:text-ink">
        Clear signature
      </button>
    </div>);

}