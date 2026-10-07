import type { ReactNode } from 'react';

interface SidebarFrameProps {
  logo: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}

/** Shared desktop rail; role-specific navigation stays with its feature. */
export function SidebarFrame({ logo, children, footer }: SidebarFrameProps) {
  return (
    <aside className="sticky top-4 mt-4 hidden h-[calc(100vh-2rem)] shrink-0 flex-col overflow-y-auto rounded-panel bg-canvas py-6 md:flex md:w-[88px] lg:w-64">
      <div className="flex px-6 md:justify-center md:px-0 lg:justify-start lg:px-6">{logo}</div>
      <nav aria-label="Main" className="mt-8">{children}</nav>
      {footer && <div className="mt-auto hidden px-4 pt-8 lg:block">{footer}</div>}
    </aside>
  );
}
