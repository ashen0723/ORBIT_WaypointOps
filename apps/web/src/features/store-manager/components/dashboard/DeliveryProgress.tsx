import { Card } from '../ui/Card';
import { useOrders } from '../../contexts/OrdersContext';
import { WEEK_START } from '../../data/schedule';
import { todayColombo } from '../../api/storeApi';

const ARC_PATH = 'M30 122 A90 90 0 0 1 210 122';
const GAP = 1.5;

export function DeliveryProgress() {
  const { orders, live } = useOrders();
  const today = live ? todayColombo() : null;
  const weekStart = today ? new Date(`${today}T00:00:00Z`) : null;
  if (weekStart) weekStart.setUTCDate(weekStart.getUTCDate() - (weekStart.getUTCDay() + 6) % 7);
  const start = weekStart ? weekStart.toISOString().slice(0, 10) : WEEK_START;
  const weekOrders = orders.filter((order) => order.requestedDate >= start && (!today || order.requestedDate <= today));
  const total = Math.max(1, weekOrders.length);
  const completed = weekOrders.filter((order) => order.status === 'delivered' || order.status === 'receipt_confirmed').length;
  const inProgress = weekOrders.filter((order) => ['confirmed', 'planned', 'loading', 'in_transit'].includes(order.status)).length;
  const pending = Math.max(0, weekOrders.length - completed - inProgress);
  const completedPct = completed / total * 100;
  const progressPct = inProgress / total * 100;
  const percent = Math.round(completedPct);

  const segment = (start: number, length: number, stroke: string) =>
  length > 0 ?
  <path
    d={ARC_PATH}
    pathLength={100}
    fill="none"
    stroke={stroke}
    strokeWidth={28}
    strokeDasharray={`${Math.max(0, length - GAP)} 100`}
    strokeDashoffset={-start} /> :

  null;

  return (
    <Card className="flex h-full flex-col p-4 md:p-6">
      <h2 className="text-lg font-semibold text-ink">Delivery Progress</h2>
      <div className="relative mx-auto mt-4 w-full max-w-[320px]">
        <svg
          viewBox="0 0 240 140"
          className="block h-auto w-full"
          role="img"
          aria-label={`${completed} of ${weekOrders.length} orders completed, ${inProgress} in progress, ${pending} pending`}>
          
          <defs>
            <pattern id="progress-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="7" height="7" fill="#FFFFFF" />
              <line x1="0" y1="0" x2="0" y2="7" stroke="#B5BAB6" strokeWidth="3" />
            </pattern>
          </defs>
          <path d={ARC_PATH} fill="none" stroke="#EEF0EE" strokeWidth={28} />
          {segment(0, completedPct, '#2A8A50')}
          {segment(completedPct, progressPct, '#0F4D2E')}
          {segment(completedPct + progressPct, 100 - completedPct - progressPct, 'url(#progress-hatch)')}
        </svg>
        <div className="absolute inset-x-0 bottom-0 text-center">
          <p className="text-[40px] font-semibold leading-none tabular-nums text-ink">{percent}%</p>
          <p className="mt-1 text-sm text-subtle">Delivered this week</p>
        </div>
      </div>
      <div className="mt-auto flex flex-wrap justify-center gap-x-4 gap-y-2 pt-5 text-sm text-subtle">
        <span className="flex items-center gap-2">
          <span aria-hidden="true" className="h-3 w-3 rounded-full bg-brand-medium" />
          Completed ({completed})
        </span>
        <span className="flex items-center gap-2">
          <span aria-hidden="true" className="h-3 w-3 rounded-full bg-forest" />
          In Progress ({inProgress})
        </span>
        <span className="flex items-center gap-2">
          <span aria-hidden="true" className="h-3 w-3 rounded-full hatch-stripes" />
          Pending ({pending})
        </span>
      </div>
    </Card>);

}
