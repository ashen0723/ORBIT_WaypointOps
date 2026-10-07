import { useId, useState } from 'react';
import { GreenDropdownPanel, greenDropdownOptionClass } from './GreenDropdown';

interface GreenAutocompleteProps {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  label: string;
  placeholder?: string;
  className?: string;
  invalid?: boolean;
}

export function GreenAutocomplete({ value, options, onChange, label, placeholder, className, invalid }: GreenAutocompleteProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const matches = [...new Set(options)].filter(option => option.toLowerCase().includes(value.trim().toLowerCase())).slice(0, 6);
  const expanded = open && matches.length > 0;
  const choose = (option: string) => {
    onChange(option);
    setOpen(false);
    setActive(-1);
  };

  return <div className="relative">
    <input role="combobox" aria-label={label} aria-autocomplete="list" aria-expanded={expanded}
      aria-controls={expanded ? id : undefined}
      aria-activedescendant={expanded && matches[active] !== undefined ? `${id}-${active}` : undefined}
      aria-invalid={invalid || undefined} value={value} placeholder={placeholder} className={className}
      onFocus={() => { setOpen(true); setActive(-1); }} onBlur={() => setOpen(false)}
      onChange={event => { onChange(event.target.value); setOpen(true); setActive(-1); }}
      onKeyDown={event => {
        if (event.key === 'Escape' && open) { event.stopPropagation(); setOpen(false); setActive(-1); }
        if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && matches.length) {
          event.preventDefault();
          setOpen(true);
          setActive(index => !expanded || index < 0
            ? event.key === 'ArrowDown' ? 0 : matches.length - 1
            : (index + (event.key === 'ArrowDown' ? 1 : -1) + matches.length) % matches.length);
        }
        if (event.key === 'Enter' && expanded && matches[active] !== undefined) {
          event.preventDefault();
          choose(matches[active]);
        }
      }} />
    {expanded && <GreenDropdownPanel id={id} role="listbox" aria-label={`${label} suggestions`}
      className="left-0 right-0 max-h-60 overflow-y-auto p-1.5">
      {matches.map((option, index) => <button key={option} id={`${id}-${index}`} type="button"
        role="option" tabIndex={-1} aria-selected={index === active}
        className={`${greenDropdownOptionClass} ${index === active ? 'bg-surface' : ''}`}
        onMouseDown={event => event.preventDefault()} onMouseEnter={() => setActive(index)}
        onClick={() => choose(option)}>{option}</button>)}
    </GreenDropdownPanel>}
  </div>;
}
