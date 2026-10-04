import React from 'react';
import { SnowflakeIcon, TruckIcon } from 'lucide-react';
import { VEHICLE_LOAD } from '../../data/loader';

interface TripContextBarProps {
  compact?: boolean;
  vehicleId?: string;
  trip?: string;
  brand?: string;
  temperature?: 'Reefer' | 'Ambient';
}

export function TripContextBar({
  compact = false,
  vehicleId = VEHICLE_LOAD.vehicleId,
  trip = VEHICLE_LOAD.trip,
  brand = VEHICLE_LOAD.brand,
  temperature = 'Reefer'
}: TripContextBarProps) {
  return <div className={`flex flex-wrap items-center gap-x-4 gap-y-3 rounded-card border border-brand/20 bg-brand-pale/65 px-4 py-3 shadow-card ${compact ? '' : 'md:px-5 md:py-3.5'}`}>
    <span className="inline-flex items-center gap-2 text-sm font-semibold text-forest"><span className="grid h-8 w-8 place-items-center rounded-full bg-forest text-white shadow-card"><TruckIcon aria-hidden="true" className="h-4 w-4" /></span><span className="text-base tabular-nums tracking-tight">{vehicleId}</span></span>
    <span className="hidden h-5 w-px bg-brand/25 sm:block" aria-hidden="true" />
    <span className="text-sm font-semibold text-ink">{trip}</span>
    <span className="text-sm text-subtle">{brand}</span>
    <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-surface/75 px-3 py-1.5 text-sm font-semibold text-forest ring-1 ring-inset ring-brand/15">{temperature === 'Reefer' && <SnowflakeIcon aria-hidden="true" className="h-4 w-4" />}{temperature}</span>
  </div>;
}