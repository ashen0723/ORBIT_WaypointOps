import React, { useEffect, useState } from 'react';
import { CloudUploadIcon, MinusIcon, PlusIcon } from 'lucide-react';
import { BrandTag, TempTag } from '../dispatch/BrandTag';
import { StatusBadge } from '../dispatch/StatusBadge';
import { Button } from '../ui/Button';
import type { LoadLine, Order, Outlet } from '../../types/dispatch';
import { formatDateTime } from '../../utils/clock';
import { missingUnits } from '../../utils/fieldOps';
import { outletLabel } from '../../utils/format';
import { lineState } from '../../utils/status';

interface LoadLineRowProps {
  line: LoadLine;
  order: Order;
  outlet?: Outlet;
  seq: number;
  editable: boolean;
  pending: boolean;
  onSave: (loaded: number, damaged: number, reason: string) => void;
}

const BADGE = {
  waiting: { label: 'Not counted', tone: 'neutral' as const },
  complete: { label: 'Fully loaded', tone: 'success' as const },
  exception: { label: 'Exception', tone: 'attention' as const }
};

export function LoadLineRow({ line, order, outlet, seq, editable, pending, onSave }: LoadLineRowProps) {
  const [loaded, setLoaded] = useState(line.loadedUnits ?? line.expectedUnits);
  const [damaged, setDamaged] = useState(line.damagedUnits);
  const [reason, setReason] = useState(line.reason);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!editing) {
      setLoaded(line.loadedUnits ?? line.expectedUnits);
      setDamaged(line.damagedUnits);
      setReason(line.reason);
    }
  }, [line, editing]);

  const missing = Math.max(0, line.expectedUnits - loaded - damaged);
  const isException = missing > 0 || damaged > 0;
  const overflow = loaded + damaged > line.expectedUnits;
  const canSave = !overflow && (!isException || reason.trim().length > 0);
  const state = lineState(line);

  const save = () => {
    if (!canSave) return;
    onSave(loaded, damaged, isException ? reason : '');
    setEditing(false);
  };

  return (
    <li id={`load-${order.id}`} className="px-4 py-4 md:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-1.5">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-forest text-xs font-semibold text-white">{seq}</span>
            <span className="font-semibold tabular-nums text-ink">{order.id}</span>
            <BrandTag brand={order.brand} />
            <TempTag temperature={order.temperature} />
          </p>
          <p className="mt-1 text-sm text-ink">{outletLabel(outlet)}</p>
          <p className="text-sm text-subtle">
            Expected <span className="font-semibold text-ink">{line.expectedUnits} units</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {pending &&
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-pale px-2 py-0.5 text-[11px] font-semibold text-amber-ink">
              <CloudUploadIcon aria-hidden="true" className="h-3 w-3" />
              Waiting to sync
            </span>
          }
          <StatusBadge badge={BADGE[state]} size="sm" />
        </div>
      </div>

      {line.loadedUnits !== null && !editing &&
      <div className="mt-3 rounded-2xl bg-canvas px-4 py-3 text-sm">
          <p className="text-ink">
            <span className="font-semibold">{line.loadedUnits}</span> loaded · <span className="font-semibold">{missingUnits(line)}</span> missing · <span className="font-semibold">{line.damagedUnits}</span> damaged
          </p>
          {line.reason && <p className="mt-0.5 text-subtle">Reason: {line.reason}</p>}
          <p className="mt-0.5 text-xs text-subtle">
            Recorded by {line.recordedBy}
            {line.recordedAt ? ` · ${formatDateTime(line.recordedAt)}` : ''}
          </p>
        </div>
      }

      {editable && (line.loadedUnits === null || editing) &&
      <div className="mt-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Counter label="Loaded (good)" value={loaded} max={line.expectedUnits} onChange={setLoaded} id={order.id} />
            <Counter label="Damaged (not loaded)" value={damaged} max={line.expectedUnits} onChange={setDamaged} id={`${order.id}-d`} />
          </div>
          <p className={`text-sm ${overflow ? 'text-danger-ink' : 'text-subtle'}`} aria-live="polite">
            {overflow ? `Loaded + damaged can’t exceed ${line.expectedUnits}.` : `Missing: ${missing} unit${missing === 1 ? '' : 's'}`}
          </p>
          {isException &&
        <label className="block">
              <span className="text-sm font-semibold text-ink">Reason (required)</span>
              <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Short-picked by warehouse; 2 cartons crushed"
            className="mt-1.5 h-12 w-full rounded-2xl border border-line bg-surface px-4 text-base text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand" />
          
            </label>
        }
          <div className="flex flex-wrap gap-2">
            <Button size="lg" onClick={save} disabled={!canSave}>
              Save count
            </Button>
            <Button
            size="lg"
            variant="secondary"
            onClick={() => {
              setLoaded(line.expectedUnits);
              setDamaged(0);
            }}>
            
              All {line.expectedUnits} loaded
            </Button>
            <Button
            size="lg"
            variant="ghost"
            onClick={() => {
              setLoaded(0);
              setDamaged(0);
            }}>
            
              None loaded
            </Button>
            {editing &&
          <Button size="lg" variant="ghost" onClick={() => setEditing(false)}>
                Cancel
              </Button>
          }
          </div>
        </div>
      }
      {editable && line.loadedUnits !== null && !editing &&
      <Button size="md" variant="ghost" className="mt-2" onClick={() => setEditing(true)}>
          Correct count
        </Button>
      }
    </li>);

}

function Counter({ label, value, max, onChange, id }: {label: string;value: number;max: number;onChange: (n: number) => void;id: string;}) {
  const set = (n: number) => onChange(Math.max(0, Math.min(max, Number.isFinite(n) ? Math.round(n) : 0)));
  return (
    <div>
      <label htmlFor={`count-${id}`} className="text-sm font-semibold text-ink">
        {label}
      </label>
      <div className="mt-1.5 flex items-center gap-2">
        <button type="button" aria-label={`Decrease ${label}`} onClick={() => set(value - 1)} className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-line bg-surface text-ink hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
          <MinusIcon aria-hidden="true" className="h-5 w-5" />
        </button>
        <input
          id={`count-${id}`}
          type="number"
          inputMode="numeric"
          min={0}
          max={max}
          value={value}
          onChange={(e) => set(Number(e.target.value))}
          className="h-12 w-full min-w-0 rounded-2xl border border-line bg-surface px-3 text-center text-lg font-semibold tabular-nums text-ink focus:outline-none focus:ring-2 focus:ring-brand" />
        
        <button type="button" aria-label={`Increase ${label}`} onClick={() => set(value + 1)} className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-line bg-surface text-ink hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
          <PlusIcon aria-hidden="true" className="h-5 w-5" />
        </button>
      </div>
    </div>);

}