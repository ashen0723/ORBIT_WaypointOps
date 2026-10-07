import type { ReactNode } from 'react';

interface NavigationSectionLabelProps {
  children: ReactNode;
  className?: string;
  variant?: 'sidebar' | 'drawer' | 'collapsible';
}

const variants = {
  sidebar: 'px-6',
  drawer: 'px-4',
  // not-sr-only resets padding, so the desktop inset must use the same breakpoint.
  collapsible: 'px-6 md:sr-only lg:not-sr-only lg:px-6',
};

export function NavigationSectionLabel({ children, className = '', variant = 'sidebar' }: NavigationSectionLabelProps) {
  return <p className={`text-xs font-medium uppercase tracking-wide text-subtle ${variants[variant]} ${className}`}>{children}</p>;
}
