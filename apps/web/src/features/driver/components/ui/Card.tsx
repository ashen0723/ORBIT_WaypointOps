import React, { HTMLAttributes } from 'react';

export function Card({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`rounded-card bg-surface shadow-card ${className}`} {...props} />;
}