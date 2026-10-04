import { CheckIcon, PackageIcon, SnowflakeIcon } from 'lucide-react';
import type { OrderType } from '../../types/orders';

interface TabInfo {
  drafted: number;
  submittedId?: string;
}

interface FreshOrderTabsProps {
  value: OrderType;
  onChange: (type: OrderType) => void;
  info: Record<OrderType, TabInfo>;
}

const TABS: {value: OrderType;label: string;Icon: typeof PackageIcon;}[] = [
{ value: 'dry', label: 'Dry order', Icon: PackageIcon },
{ value: 'chilled', label: 'Chilled order', Icon: SnowflakeIcon }];


export function FreshOrderTabs({ value, onChange, info }: FreshOrderTabsProps) {
  return (
    <div role="tablist" aria-label="Delivery type" className="grid grid-cols-2 gap-2">
      {TABS.map(({ value: tab, label, Icon }) => {
        const selected = tab === value;
        const { drafted, submittedId } = info[tab];
        return (
          <button
            key={tab}
            type="button"
            role="tab"
            id={`tab-${tab}`}
            aria-selected={selected}
            aria-controls="line-items-panel"
            onClick={() => onChange(tab)}
            className={`flex flex-col items-start rounded-lg border px-3 py-2 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-not-allowed ${
            selected ? 'border-brand bg-brand-pale' : 'border-line bg-surface hover:border-hatch'}`
            }>
            
            <span className={`flex items-center gap-2 text-sm font-semibold ${selected ? 'text-forest' : 'text-ink'}`}>
              <Icon aria-hidden="true" className="h-4 w-4" />
              {label}
            </span>
            <span className="mt-0.5 flex items-center gap-1 text-xs text-subtle">
              {submittedId && <CheckIcon aria-hidden="true" className="h-3 w-3 text-brand-medium" />}
              {submittedId ? `Sent · ${submittedId}` : drafted ? `${drafted} item${drafted === 1 ? '' : 's'} drafted` : 'Not started'}
            </span>
          </button>);

      })}
    </div>);

}