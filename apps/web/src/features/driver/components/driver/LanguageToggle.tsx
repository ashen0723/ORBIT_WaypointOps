import { useEffect, useRef, useState } from 'react';
import { ChevronDownIcon } from 'lucide-react';

const OPTIONS = ['EN', 'සිං', 'தமி'];

interface LanguageToggleProps {
  value: string;
  onChange: (value: string) => void;
  variant: 'compact' | 'full';
  tone?: 'canvas' | 'surface';
}

export function LanguageToggle({ value, onChange, variant, tone = 'canvas' }: LanguageToggleProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    const handlePointer = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  if (variant === 'full') {
    return (
      <div className="inline-flex rounded-full bg-canvas p-1" role="group" aria-label="Language">
        {OPTIONS.map((option) =>
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          aria-pressed={value === option}
          className={`h-12 min-w-14 rounded-full px-3 text-sm font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${value === option ? 'bg-surface text-forest shadow-card' : 'text-subtle hover:text-ink'}`}>
          
            {option}
          </button>
        )}
      </div>);

  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Language: ${value}`}
        className={`inline-flex h-12 min-w-12 items-center justify-center gap-1 rounded-full px-3 text-xs font-semibold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${tone === 'surface' ? 'bg-surface' : 'bg-canvas'}`}>
        
        {value}
        <ChevronDownIcon aria-hidden className={`h-3.5 w-3.5 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open &&
      <div role="menu" aria-label="Language" className="absolute right-0 top-full z-40 mt-1 w-32 rounded-card bg-surface p-1 shadow-pop">
          {OPTIONS.map((option) =>
        <button
          key={option}
          type="button"
          role="menuitemradio"
          aria-checked={value === option}
          onClick={() => {onChange(option);setOpen(false);}}
          className={`flex h-12 w-full items-center rounded-xl px-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${value === option ? 'bg-brand-pale text-forest' : 'text-ink hover:bg-canvas'}`}>
          
              {option}
            </button>
        )}
        </div>
      }
    </div>);

}