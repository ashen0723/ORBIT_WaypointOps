import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckIcon, TriangleAlertIcon } from 'lucide-react';
import type { OrderItem } from '../../types/orders';
import type { IssueType, ItemCheck } from '../../types/receipt';
import { PhotoCapture } from './PhotoCapture';
interface ReceiptItemRowProps {
  item: OrderItem;
  check: ItemCheck;
  showErrors: boolean;
  onChange: (check: ItemCheck) => void;
}
const ISSUE_TYPES: {
  value: IssueType;
  label: string;
}[] = [{
  value: 'missing',
  label: 'Missing'
}, {
  value: 'damaged',
  label: 'Damaged'
}, {
  value: 'wrong_item',
  label: 'Wrong item'
}];
export function ReceiptItemRow({
  item,
  check,
  showErrors,
  onChange
}: ReceiptItemRowProps) {
  const isOk = check.result === 'ok';
  const isIssue = check.result === 'issue';
  const typeError = showErrors && isIssue && !check.issueType;
  const descError = showErrors && isIssue && !check.description.trim();
  const unmarked = showErrors && check.result === null;
  const descId = `desc-${item.id}`;
  return <li className="px-4 py-4 md:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="font-medium text-ink">{item.name}</p>
          <p className="text-sm text-subtle">
            {item.qty} {item.unit} ordered
          </p>
          {unmarked && <p className="mt-1 text-xs font-medium text-danger-ink">Mark this item as received or flag an issue</p>}
        </div>
        <div role="radiogroup" aria-label={`${item.name} condition`} className="grid grid-cols-2 gap-2 sm:w-64 sm:shrink-0">
          <button type="button" role="radio" aria-checked={isOk} onClick={() => onChange({
          ...check,
          result: 'ok'
        })} className={`flex h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border text-sm font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${isOk ? 'border-brand bg-brand-pale text-forest' : 'border-line text-subtle hover:border-hatch hover:text-ink'}`}>
            <CheckIcon aria-hidden="true" className="h-4 w-4" />
            Received OK
          </button>
          <button type="button" role="radio" aria-checked={isIssue} onClick={() => onChange({
          ...check,
          result: 'issue'
        })} className={`flex h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border text-sm font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${isIssue ? 'border-amber bg-amber-pale text-amber-ink' : 'border-line text-subtle hover:border-hatch hover:text-ink'}`}>
            <TriangleAlertIcon aria-hidden="true" className="h-4 w-4" />
            Issue
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {isIssue && <motion.div initial={{
        height: 0,
        opacity: 0
      }} animate={{
        height: 'auto',
        opacity: 1
      }} exit={{
        height: 0,
        opacity: 0
      }} transition={{
        duration: 0.22,
        ease: [0.23, 1, 0.32, 1]
      }} className="overflow-hidden">
            <div className="mt-4 space-y-4 rounded-lg bg-canvas p-4">
              <fieldset>
                <legend className="text-sm font-semibold text-ink">
                  Issue type <span className="text-danger-ink">*</span>
                </legend>
                <div className="mt-2 grid gap-2 sm:flex sm:flex-wrap">
                  {ISSUE_TYPES.map((t) => {
                const selected = check.issueType === t.value;
                return <label key={t.value} className={`flex h-10 cursor-pointer items-center gap-2 rounded-lg border bg-surface px-3 text-sm font-medium transition-colors duration-150 focus-within:ring-2 focus-within:ring-brand ${selected ? 'border-brand text-ink' : 'border-line text-subtle hover:text-ink'}`}>
                        <input type="radio" name={`issue-${item.id}`} value={t.value} checked={selected} onChange={() => onChange({
                    ...check,
                    issueType: t.value
                  })} className="h-4 w-4 accent-brand" />
                        {t.label}
                      </label>;
              })}
                </div>
                {typeError && <p className="mt-1 text-xs font-medium text-danger-ink">Choose an issue type</p>}
              </fieldset>

              <div>
                <label htmlFor={descId} className="text-sm font-semibold text-ink">
                  Describe the issue <span className="text-danger-ink">*</span>
                </label>
                <textarea id={descId} rows={3} required aria-invalid={descError} value={check.description} onChange={(e) => onChange({
              ...check,
              description: e.target.value
            })} placeholder="e.g. Box was crushed, 2 units leaking" className={`mt-2 w-full resize-y rounded-lg border bg-surface px-3 py-2 text-base text-ink placeholder:text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 lg:text-sm ${descError ? 'border-danger' : 'border-line'}`} />
                {descError && <p className="mt-1 text-xs font-medium text-danger-ink">Describe what’s wrong so dispatch can act on it</p>}
              </div>

              <PhotoCapture photos={check.photos} onChange={(photos) => onChange({
            ...check,
            photos
          })} itemName={item.name} />
            </div>
          </motion.div>}
      </AnimatePresence>
    </li>;
}