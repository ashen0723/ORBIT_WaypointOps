import React, { ButtonHTMLAttributes } from 'react';
type Variant = 'primary' | 'secondary' | 'outline' | 'ghost';
type Size = 'sm' | 'md' | 'lg';
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-forest text-white shadow-card hover:bg-brand active:translate-y-px active:bg-forest disabled:bg-hatch disabled:text-white',
  secondary: 'border border-line/80 bg-surface text-ink shadow-card hover:border-brand/25 hover:bg-brand-pale/45 active:translate-y-px disabled:text-muted',
  outline: 'border border-ink/70 bg-surface text-ink hover:border-forest hover:bg-brand-pale/45 active:translate-y-px disabled:border-line disabled:text-muted',
  ghost: 'text-subtle hover:bg-brand-pale/55 hover:text-forest active:bg-brand-pale disabled:text-muted'
};
const SIZES: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-sm',
  md: 'h-11 px-5 text-sm',
  lg: 'h-12 px-6 text-base'
};
export function buttonStyles(variant: Variant = 'primary', size: Size = 'md', fullWidth = false): string {
  return `inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold transition-[background-color,border-color,color,transform,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${fullWidth ? 'w-full' : ''}`;
}
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
}
export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  type = 'button',
  ...props
}: ButtonProps) {
  return <button type={type} className={`${buttonStyles(variant, size, fullWidth)} ${className}`} {...props} />;
}