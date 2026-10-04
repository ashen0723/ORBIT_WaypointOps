import React from 'react';
import { SnowflakeIcon, ThermometerSnowflakeIcon } from 'lucide-react';
import type { Brand, Temperature } from '../../types/dispatch';
import { TEMPERATURE_LABEL } from '../../utils/vehicle';

const BRAND_STYLES: Record<Brand, string> = {
  Fresh: 'bg-brand-pale text-forest',
  Style: 'bg-purple/10 text-purple-ink',
  Tech: 'bg-canvas text-ink ring-1 ring-inset ring-line'
};

const TEMP_STYLES: Record<Temperature, string> = {
  ambient: 'bg-amber-pale text-amber-ink',
  chilled: 'bg-teal/10 text-teal-ink',
  frozen: 'bg-blue/10 text-blue-ink'
};

export function BrandTag({ brand }: {brand: Brand;}) {
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${BRAND_STYLES[brand]}`}>{brand}</span>;
}

export function TempTag({ temperature }: {temperature: Temperature;}) {
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${TEMP_STYLES[temperature]}`}>
      {temperature === 'chilled' && <ThermometerSnowflakeIcon aria-hidden="true" className="h-3 w-3" />}
      {temperature === 'frozen' && <SnowflakeIcon aria-hidden="true" className="h-3 w-3" />}
      {TEMPERATURE_LABEL[temperature]}
    </span>);

}

export function VanOnlyTag() {
  return <span className="whitespace-nowrap rounded-full bg-purple/10 px-2 py-0.5 text-[11px] font-semibold text-purple-ink">Van only</span>;
}