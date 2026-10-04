import React, { HTMLAttributes } from 'react';
export function Card({
  className = '',
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={`rounded-card border border-line/70 bg-surface shadow-card ${className}`} {...props} />;
}