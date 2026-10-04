import { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-gradient-to-r from-forest to-brand text-white hover:from-forest hover:to-brand-medium disabled:from-hatch disabled:to-hatch disabled:text-white',
  secondary: 'border border-line bg-surface text-ink hover:bg-canvas disabled:text-muted',
  outline: 'border border-ink/80 bg-surface text-ink hover:bg-canvas disabled:border-line disabled:text-muted',
  ghost: 'text-subtle hover:bg-canvas hover:text-ink disabled:text-muted'
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-5 text-sm',
  lg: 'h-12 px-6 text-base'
};

export function buttonStyles(variant: Variant = 'primary', size: Size = 'md', fullWidth = false): string {
  return `inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${fullWidth ? 'w-full' : ''}`;
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
}

export function Button({ variant = 'primary', size = 'md', fullWidth = false, className = '', type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={`${buttonStyles(variant, size, fullWidth)} ${className}`} {...props} />;
}