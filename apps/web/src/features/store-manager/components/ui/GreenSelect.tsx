import { useGreenDropdown } from '../../hooks/useGreenDropdown';
import { type KeyboardEvent, useEffect, useRef, useState } from 'react';
import { CheckIcon, ChevronDownIcon } from 'lucide-react';
import { GreenDropdownPanel, greenDropdownOptionClass } from './GreenDropdown';

export interface GreenSelectOption<T extends string> { value: T; label: string }

interface GreenSelectProps<T extends string> {
  value: T;
  options: GreenSelectOption<T>[];
  onChange: (value: T) => void;
  label: string;
  className?: string;
  id?: string;
  invalid?: boolean;
}

export function GreenSelect<T extends string>({ value, options, onChange, label, className = '', id, invalid }: GreenSelectProps<T>) {
  const { open, setOpen, root, trigger, panelId, onBlur } = useGreenDropdown();
  const [focused, setFocused] = useState(0);
  const list = useRef<HTMLDivElement>(null);
  const selectedIndex = Math.max(0, options.findIndex(option => option.value === value));



  useEffect(() => {
    if (open) list.current?.querySelectorAll<HTMLButtonElement>('[role="option"]')[focused]?.focus();
  }, [open, focused]);

  const choose = (index: number) => {
    const option = options[index];
    if (!option) return;
    onChange(option.value);
    setOpen(false);
    trigger.current?.focus();
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && open) { event.stopPropagation(); setOpen(false); trigger.current?.focus(); return; }
    if (options.length === 0) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) { setFocused(selectedIndex); setOpen(true); }
      else setFocused(index => (index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length);
    }
    if (event.key === 'Home' && open) { event.preventDefault(); setFocused(0); }
    if (event.key === 'End' && open) { event.preventDefault(); setFocused(options.length - 1); }
    if ((event.key === 'Enter' || event.key === ' ') && open) { event.preventDefault(); choose(focused); }
  };

  return <div ref={root} className={`relative ${className}`} onKeyDown={onKeyDown}
    onBlur={onBlur}>
    <button ref={trigger} id={id} type="button" aria-controls={open ? panelId : undefined} disabled={options.length === 0} aria-label={label} aria-haspopup="listbox" aria-expanded={open} aria-invalid={invalid || undefined}
      onClick={() => { setFocused(selectedIndex); setOpen(!open); }}
      className={`flex h-full w-full items-center justify-between gap-3 rounded-[inherit] border bg-surface px-3 text-left font-medium text-ink transition-colors hover:bg-brand-pale focus:outline-none focus:ring-2 focus:ring-brand/30 ${invalid ? 'border-danger' : open ? 'border-brand' : 'border-line'}`}>
      <span className="truncate">{options.find(option => option.value === value)?.label ?? label}</span>
      <ChevronDownIcon aria-hidden="true" className={`h-4 w-4 shrink-0 text-forest transition-transform ${open ? 'rotate-180' : ''}`} />
    </button>
    {open && <GreenDropdownPanel ref={list} id={panelId} role="listbox" aria-label={label} className="left-0 right-0 max-h-60 min-w-full max-w-[min(28rem,calc(100vw-2rem))] overflow-y-auto p-1.5">
      {options.map((option, index) => <button key={option.value} type="button" role="option" aria-selected={option.value === value} tabIndex={-1}
        onMouseEnter={() => setFocused(index)} onClick={() => choose(index)}
        className={greenDropdownOptionClass}>
        <span>{option.label}</span>{option.value === value && <CheckIcon aria-hidden="true" className="h-4 w-4" />}
      </button>)}
    </GreenDropdownPanel>}
  </div>;
}
