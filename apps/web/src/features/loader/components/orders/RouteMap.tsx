import React from 'react';
import { TruckIcon } from 'lucide-react';
import type { Order } from '../../types/orders';
import { Card } from '../ui/Card';
import { OUTLET_NAME } from '../../data/schedule';
const ROUTE: [number, number][] = [[40, 170], [130, 170], [130, 110], [250, 110], [250, 55], [360, 55]];
const STOPS: [number, number][] = [[130, 140], [190, 110], [250, 82]];
export function RouteMap({
  order


}: {order: Order;}) {
  const s = order.status;
  const progress = s === 'in_transit' ? order.vehicle?.progress ?? 0.5 : s === 'loading' ? 0 : s === 'delivered' || s === 'receipt_confirmed' ? 1 : null;
  const position = progress === null ? null : pointAt(progress);
  const traveled = progress === null ? [] : traveledPoints(progress);
  const caption = s === 'in_transit' && order.vehicle ? `${order.vehicle.stopsBefore} ${order.vehicle.stopsBefore === 1 ? 'stop' : 'stops'} before your outlet` : s === 'loading' ? 'Vehicle loading at depot' : progress === 1 ? 'Delivered to your outlet' : 'Vehicle position appears once the order is out for delivery';
  return <Card className="p-4 md:p-6">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-base font-semibold text-ink">Vehicle position</h2>
        <span className="text-xs text-subtle">Illustrative</span>
      </div>
      <div className="relative mt-4 overflow-hidden rounded-lg bg-canvas">
        <svg viewBox="0 0 400 220" role="img" aria-label={caption} className="block h-auto w-full">
          {[40, 80, 120, 160, 200].map((y) => <line key={`h${y}`} x1="0" x2="400" y1={y} y2={y} stroke="#E0E3E0" strokeWidth="1" />)}
          {[60, 120, 180, 240, 300, 360].map((x) => <line key={`v${x}`} y1="0" y2="220" x1={x} x2={x} stroke="#E0E3E0" strokeWidth="1" />)}
          <polyline points={ROUTE.map((p) => p.join(',')).join(' ')} fill="none" stroke="#B5BAB6" strokeWidth="4" strokeDasharray="2 6" strokeLinecap="round" />
          {traveled.length > 1 && <polyline points={traveled.map((p) => p.join(',')).join(' ')} fill="none" stroke="#3B5BDB" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />}
          {STOPS.map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="4" fill="#FFFFFF" stroke="#8A8F8C" strokeWidth="2" />)}
          <rect x="26" y="156" width="28" height="28" rx="6" fill="#111111" />
          <text x="40" y="206" textAnchor="middle" fontSize="11" fill="#5C615E" fontWeight="600">
            Depot
          </text>
          <circle cx="360" cy="55" r="10" fill="#1B6B3F" />
          <circle cx="360" cy="55" r="4" fill="#FFFFFF" />
          <text x="360" y="85" textAnchor="middle" fontSize="11" fill="#111111" fontWeight="600">
            {OUTLET_NAME}
          </text>
        </svg>
        {position && <span className="absolute grid h-8 w-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-blue text-white shadow-pop ring-2 ring-surface" style={{
        left: `${position[0] / 400 * 100}%`,
        top: `${position[1] / 220 * 100}%`
      }}>
            <TruckIcon aria-hidden="true" className="h-4 w-4" />
          </span>}
      </div>
      <p className="mt-4 text-sm text-ink">{caption}</p>
      {order.vehicle && <p className="mt-1 text-sm text-subtle">
          {order.vehicle.driver} · {order.vehicle.vehicleType} {order.vehicle.plate}
        </p>}
    </Card>;
}
function segmentLengths() {
  return ROUTE.slice(1).map((p, i) => Math.hypot(p[0] - ROUTE[i][0], p[1] - ROUTE[i][1]));
}
function pointAt(t: number): [number, number] {
  const lengths = segmentLengths();
  let remaining = lengths.reduce((a, b) => a + b, 0) * Math.min(1, Math.max(0, t));
  for (let i = 0; i < lengths.length; i++) {
    if (remaining <= lengths[i]) {
      const f = remaining / lengths[i];
      return [ROUTE[i][0] + (ROUTE[i + 1][0] - ROUTE[i][0]) * f, ROUTE[i][1] + (ROUTE[i + 1][1] - ROUTE[i][1]) * f];
    }
    remaining -= lengths[i];
  }
  return ROUTE[ROUTE.length - 1];
}
function traveledPoints(t: number): [number, number][] {
  const lengths = segmentLengths();
  const target = lengths.reduce((a, b) => a + b, 0) * t;
  const pts: [number, number][] = [ROUTE[0]];
  let acc = 0;
  for (let i = 0; i < lengths.length; i++) {
    if (acc + lengths[i] >= target) break;
    acc += lengths[i];
    pts.push(ROUTE[i + 1]);
  }
  pts.push(pointAt(t));
  return pts;
}