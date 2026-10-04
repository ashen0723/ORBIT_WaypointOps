import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { ApiError } from "../../api/client";
export {
  Button,
  buttonStyles,
} from "../../features/dispatcher/components/ui/Button";
import { Button } from "../../features/dispatcher/components/ui/Button";
export const numberText = (n: number) =>
  new Intl.NumberFormat("en", { maximumFractionDigits: 2 }).format(n);
export const labelText = (s: string) =>
  s
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/^./, (c) => c.toUpperCase());
export function Badge({ status }: { status: string }) {
  const tone = [
    "RECEIVED",
    "COMPLETED",
    "DELIVERED",
    "RESOLVED",
    "READY",
    "AVAILABLE",
  ].includes(status)
    ? "good"
    : [
          "FAILED",
          "PARTIAL",
          "CONFLICT",
          "OPEN",
          "UNAVAILABLE",
          "COMPLETED_WITH_EXCEPTIONS",
        ].includes(status)
      ? "warning"
      : "neutral";
  return <span className={`dispatch-badge ${tone}`}>{labelText(status)}</span>;
}
export function Panel({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="dispatch-panel">
      <div className="dispatch-panel-heading">
        <h2>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
export function EmptyState({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="dispatch-empty">
      <h3>{title}</h3>
      {children && <p>{children}</p>}
    </div>
  );
}
export function ErrorPanel({
  error,
  retry,
}: {
  error: unknown;
  retry?: () => void;
}) {
  if (!error) return null;
  const details =
    error instanceof ApiError && Array.isArray(error.details)
      ? error.details.filter(
          (
            d,
          ): d is {
            code?: string;
            message: string;
            actual?: number;
            limit?: number;
            entityId?: string;
          } => !!d && typeof d === "object" && typeof d.message === "string",
        )
      : [];
  return (
    <div className="dispatch-error" role="alert">
      <strong>
        {error instanceof Error
          ? error.message
          : "Something went wrong. Please retry."}
      </strong>
      {details.length > 0 && (
        <ul>
          {details.map((d, i) => (
            <li key={i}>
              <b>{labelText(d.code ?? "Check")}</b> — {d.message}
              {d.entityId && <span> · {d.entityId}</span>}
              {typeof d.actual === "number" && (
                <span> · actual {numberText(d.actual)}</span>
              )}
              {typeof d.limit === "number" && (
                <span> · limit {numberText(d.limit)}</span>
              )}
            </li>
          ))}
        </ul>
      )}
      {retry && (
        <Button variant="secondary" onClick={retry}>
          Retry
        </Button>
      )}
    </div>
  );
}
export function ReadState({
  loading,
  error,
  empty,
  retry,
  children,
}: {
  loading: boolean;
  error: unknown;
  empty: boolean;
  retry: () => void;
  children: ReactNode;
}) {
  return (
    <>
      {error && <ErrorPanel error={error} retry={retry} />}{" "}
      {loading && (
        <p role="status" className="dispatch-muted">
          Loading current data…
        </p>
      )}
      {!loading && !error && empty ? (
        <EmptyState title="No results">
          Try a different date or filter.
        </EmptyState>
      ) : (
        children
      )}
    </>
  );
}
export interface Column<T> {
  key: string;
  label: string;
  render: (row: T) => ReactNode;
}
export function DataTable<T>({
  caption,
  rows,
  columns,
  rowKey,
}: {
  caption: string;
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
}) {
  return (
    <div className="dispatch-table-scroll">
      <table>
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} scope="col">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={rowKey(r)}>
              {columns.map((c) => (
                <td key={c.key}>{c.render(r)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    id = useId();
  useEffect(() => {
    const el = ref.current!,
      previous = document.activeElement as HTMLElement | null;
    el.showModal();
    return () => {
      el.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="dispatch-dialog"
      aria-labelledby={id}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className="dispatch-panel-heading">
        <h2 id={id}>{title}</h2>
        <Button variant="ghost" onClick={onClose} aria-label="Close dialog">
          ✕
        </Button>
      </div>
      {children}
    </dialog>
  );
}
export function MutationForm({
  label,
  children,
  onSubmit,
  disabled = false,
}: {
  label: string;
  children?: ReactNode;
  onSubmit: (data: FormData) => Promise<unknown>;
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null),
    [saved, setSaved] = useState(false);
  const lock = useRef(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setSaved(false);
    setError(null);
    const data = new FormData(e.currentTarget);
    try {
      await onSubmit(data);
      setSaved(true);
    } catch (e) {
      setError(e);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} onChange={() => setSaved(false)}>
      <fieldset disabled={busy || disabled}>
        {children}
        <Button type="submit" disabled={disabled || busy}>
          {busy ? "Saving…" : label}
        </Button>
      </fieldset>
      <ErrorPanel error={error} />
      {saved && (
        <p role="status" className="dispatch-success">
          Saved successfully.
        </p>
      )}
    </form>
  );
}
export const formText = (f: FormData, key: string) => String(f.get(key) ?? "");
export const formNumber = (f: FormData, key: string) =>
  Number(formText(f, key));
