import { PlusIcon, Trash2Icon } from 'lucide-react';
import type { CatalogItem, LineDraft, Unit } from '../../types/orders';
import { Button } from '../ui/Button';
import { createBlankLine, lineError } from '../../utils/lineDrafts';

interface LineItemsEditorProps {
  lines: LineDraft[];
  onChange: (lines: LineDraft[]) => void;
  suggestions: CatalogItem[];
  listId: string;
  showErrors: boolean;
}

const UNITS: Unit[] = ['cases', 'units', 'crates'];
const field =
'h-10 w-full rounded-xl border bg-surface px-3 text-base text-ink placeholder:text-muted transition-colors duration-150 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:bg-canvas disabled:text-muted lg:text-sm';

export function LineItemsEditor({ lines, onChange, suggestions, listId, showErrors }: LineItemsEditorProps) {
  const update = (id: string, patch: Partial<LineDraft>) => onChange(lines.map((l) => l.id === id ? { ...l, ...patch } : l));

  const handleName = (line: LineDraft, name: string) => {
    const match = suggestions.find((s) => s.name.toLowerCase() === name.trim().toLowerCase());
    update(line.id, { name, unit: match?.unit ?? line.unit });
  };

  const remove = (id: string) => {
    if (lines.length === 1) onChange([createBlankLine(suggestions[0]?.unit)]);else
    onChange(lines.filter((l) => l.id !== id));
  };

  const add = () => onChange([...lines, createBlankLine(suggestions[0]?.unit)]);

  return (
    <div>
      <table className="hidden w-full text-sm md:table">
        <thead>
          <tr className="border-b border-line text-left text-xs font-semibold text-subtle">
            <th scope="col" className="w-10 pb-2 pr-2">#</th>
            <th scope="col" className="pb-2 pr-4">Item name</th>
            <th scope="col" className="w-28 pb-2 pr-4">Quantity</th>
            <th scope="col" className="w-36 pb-2 pr-4">Unit</th>
            <th scope="col" className="w-10 pb-2">
              <span className="sr-only">Remove</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {lines.map((line, i) => {
            const error = showErrors ? lineError(line) : null;
            return (
              <tr key={line.id} className="align-top">
                <td className="py-3 pr-2 pt-5 tabular-nums text-subtle">{i + 1}</td>
                <td className="py-3 pr-4">
                  <input
                    aria-label={`Item ${i + 1} name`}
                    list={listId}
                    value={line.name}
                    onChange={(e) => handleName(line, e.target.value)}
                    placeholder="Search or type an item"
                    aria-invalid={Boolean(error)}
                    className={`${field} ${error ? 'border-danger' : 'border-line'}`} />
                  
                  {error && <p className="mt-1 text-xs font-medium text-danger-ink">{error}</p>}
                </td>
                <td className="py-3 pr-4">
                  <input
                    aria-label={`Item ${i + 1} quantity`}
                    type="number"
                    inputMode="numeric"
                    min={1}
                    value={line.qty}
                    onChange={(e) => update(line.id, { qty: e.target.value })}
                    placeholder="0"
                    className={`${field} border-line tabular-nums`} />
                  
                </td>
                <td className="py-3 pr-4">
                  <select
                    aria-label={`Item ${i + 1} unit`}
                    value={line.unit}
                    onChange={(e) => update(line.id, { unit: e.target.value as Unit })}
                    className={`${field} border-line`}>
                    
                    {UNITS.map((u) =>
                    <option key={u} value={u}>
                        {u[0].toUpperCase() + u.slice(1)}
                      </option>
                    )}
                  </select>
                </td>
                <td className="py-3">
                  <button
                    type="button"
                    onClick={() => remove(line.id)}
                    aria-label={`Remove item ${i + 1}`}
                    className="grid h-10 w-10 place-items-center rounded-lg text-subtle transition-colors duration-150 hover:bg-danger-pale hover:text-danger-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:hover:bg-transparent">
                    
                    <Trash2Icon className="h-4 w-4" />
                  </button>
                </td>
              </tr>);

          })}
        </tbody>
      </table>

      <ul className="space-y-4 md:hidden">
        {lines.map((line, i) => {
          const error = showErrors ? lineError(line) : null;
          return (
            <li key={line.id} className={`rounded-xl border p-4 ${error ? 'border-danger' : 'border-line'}`}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-ink">Item {i + 1}</p>
                <button
                  type="button"
                  onClick={() => remove(line.id)}
                  aria-label={`Remove item ${i + 1}`}
                  className="-mr-2 grid h-10 w-10 place-items-center rounded-lg text-subtle hover:bg-danger-pale hover:text-danger-ink">
                  
                  <Trash2Icon className="h-5 w-5" />
                </button>
              </div>
              <label className="mt-2 block">
                <span className="text-sm text-subtle">Item name</span>
                <input
                  list={listId}
                  value={line.name}
                  onChange={(e) => handleName(line, e.target.value)}
                  placeholder="Search or type an item"
                  aria-invalid={Boolean(error)}
                  className={`${field} mt-1 border-line`} />
                
              </label>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-sm text-subtle">Quantity</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    value={line.qty}
                    onChange={(e) => update(line.id, { qty: e.target.value })}
                    placeholder="0"
                    className={`${field} mt-1 border-line tabular-nums`} />
                  
                </label>
                <label className="block">
                  <span className="text-sm text-subtle">Unit</span>
                  <select
                    value={line.unit}
                    onChange={(e) => update(line.id, { unit: e.target.value as Unit })}
                    className={`${field} mt-1 border-line`}>
                    
                    {UNITS.map((u) =>
                    <option key={u} value={u}>
                        {u[0].toUpperCase() + u.slice(1)}
                      </option>
                    )}
                  </select>
                </label>
              </div>
              {error && <p className="mt-2 text-sm font-medium text-danger-ink">{error}</p>}
            </li>);

        })}
      </ul>

      <datalist id={listId}>
        {suggestions.map((s) =>
        <option key={s.name} value={s.name} />
        )}
      </datalist>

      <Button variant="outline" onClick={add} className="mt-4 w-full md:w-auto">
        <PlusIcon aria-hidden="true" className="h-4 w-4" />
        Add item
      </Button>
    </div>);

}