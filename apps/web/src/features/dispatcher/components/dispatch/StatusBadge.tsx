import React from 'react';
import { Badge, TONE_DOTS, TONE_STYLES } from '../../utils/status';

interface StatusBadgeProps {
  badge: Badge;
  size?: 'sm' | 'md';
}

export function StatusBadge({ badge, size = 'md' }: StatusBadgeProps) {
  const sizing = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1 text-xs';
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-semibold ${sizing} ${TONE_STYLES[badge.tone]}`}>
      <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${TONE_DOTS[badge.tone]}`} />
      {badge.label}
    </span>);

}