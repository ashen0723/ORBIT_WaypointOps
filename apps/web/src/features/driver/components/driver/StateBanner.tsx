import React from 'react';
import { CheckCircle2Icon, InfoIcon, TriangleAlertIcon, WifiOffIcon } from 'lucide-react';

type Tone = 'success' | 'warning' | 'danger' | 'info';

const CONFIG = {
  success: { className: 'border-brand/30 bg-brand-pale text-forest', icon: CheckCircle2Icon },
  warning: { className: 'border-amber/50 bg-amber-pale text-amber-ink', icon: WifiOffIcon },
  danger: { className: 'border-danger/30 bg-danger-pale text-danger-ink', icon: TriangleAlertIcon },
  info: { className: 'border-line bg-surface text-ink', icon: InfoIcon }
};

interface StateBannerProps {
  tone: Tone;
  title: string;
  detail?: string;
  children?: React.ReactNode;
}

export function StateBanner({ tone, title, detail, children }: StateBannerProps) {
  const config = CONFIG[tone];
  const Icon = config.icon;
  return (
    <section className={`rounded-card border p-4 ${config.className}`}>
      <div className="flex gap-3">
        <Icon aria-hidden className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold leading-5">{title}</p>
          {detail && <p className="mt-1 text-sm leading-5 opacity-90">{detail}</p>}
          {children}
        </div>
      </div>
    </section>);

}