import React from 'react';

interface PageIntroProps {
  title: string;
  description?: string;
  meta?: string;
  titleInDesktopHeader?: boolean;
}

export function PageIntro({ title, description, meta, titleInDesktopHeader = false }: PageIntroProps) {
  return (
    <div className="max-w-2xl">
      {meta && <p className="text-sm font-semibold text-forest">{meta}</p>}
      <h1 className={`mt-1 text-2xl font-bold leading-tight tracking-tight text-ink ${titleInDesktopHeader ? 'xl:sr-only' : ''}`}>{title}</h1>
      {description && <p className="mt-2 text-sm leading-6 text-subtle">{description}</p>}
    </div>);

}