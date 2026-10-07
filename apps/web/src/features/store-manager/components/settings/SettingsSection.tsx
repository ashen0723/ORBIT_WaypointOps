import type React from 'react';

export function PanelHeading({ title, subtitle, action }: {title: string;subtitle?: string;action?: React.ReactNode;}) {
  return <div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-semibold text-ink md:text-2xl">{title}</h2>{subtitle && <p className="mt-1 text-sm text-subtle">{subtitle}</p>}</div>{action}</div>;
}

export function SettingsSection({ title, children, action }: {title: string;children: React.ReactNode;action?: React.ReactNode;}) {
  return <section className="mt-6 rounded-card border border-line bg-canvas/35 p-4 md:p-5"><div className="flex items-center justify-between gap-3"><h3 className="font-semibold text-ink">{title}</h3>{action}</div><div className="mt-4">{children}</div></section>;
}
