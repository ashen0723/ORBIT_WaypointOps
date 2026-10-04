import React from 'react';
import {
  MapPinIcon,
  SnowflakeIcon,
  TruckIcon,
} from 'lucide-react';

interface TripContextBarProps {
  compact?: boolean;

  vehicleId?: string;
  trip?: string;
  brand?: string;
  district?: string;

  temperature?: 'Reefer' | 'Ambient';

  planVersion?: number;
}

export function TripContextBar({
  compact = false,
  vehicleId,
  trip,
  brand,
  district,
  temperature,
  planVersion,
}: TripContextBarProps) {
  const hasTripContext =
    vehicleId ||
    trip ||
    brand ||
    district ||
    temperature ||
    planVersion !== undefined;

  if (!hasTripContext) {
    return (
      <div
        className={`rounded-card border border-line/80 bg-surface px-4 py-3 shadow-card ${compact ? '' : 'md:px-5 md:py-3.5'
          }`}
      >
        <p className="text-sm font-medium text-subtle">
          Trip information will appear here when a loading trip is selected.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-wrap items-center gap-x-4 gap-y-3 rounded-card border border-brand/20 bg-brand-pale/65 px-4 py-3 shadow-card ${compact ? '' : 'md:px-5 md:py-3.5'
        }`}
    >
      {vehicleId && (
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-forest">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-forest text-white shadow-card">
            <TruckIcon
              aria-hidden="true"
              className="h-4 w-4"
            />
          </span>

          <span className="text-base tabular-nums tracking-tight">
            {vehicleId}
          </span>
        </span>
      )}

      {vehicleId && (trip || brand || district) && (
        <span
          className="hidden h-5 w-px bg-brand/25 sm:block"
          aria-hidden="true"
        />
      )}

      {trip && (
        <span className="text-sm font-semibold text-ink">
          {trip}
        </span>
      )}

      {brand && (
        <span className="text-sm text-subtle">
          {brand}
        </span>
      )}

      {district && (
        <span className="inline-flex items-center gap-1.5 text-sm text-subtle">
          <MapPinIcon
            aria-hidden="true"
            className="h-3.5 w-3.5"
          />
          {district}
        </span>
      )}

      {planVersion !== undefined && (
        <span className="rounded-full bg-surface/75 px-3 py-1.5 text-xs font-semibold text-subtle ring-1 ring-inset ring-brand/15">
          Plan v{planVersion}
        </span>
      )}

      {temperature && (
        <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-surface/75 px-3 py-1.5 text-sm font-semibold text-forest ring-1 ring-inset ring-brand/15">
          {temperature === 'Reefer' && (
            <SnowflakeIcon
              aria-hidden="true"
              className="h-4 w-4"
            />
          )}

          {temperature}
        </span>
      )}
    </div>
  );
}