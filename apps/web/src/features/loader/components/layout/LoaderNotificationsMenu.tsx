import React, {
  useEffect,
  useRef,
  useState,
} from 'react';
import { Link } from 'react-router-dom';
import {
  AnimatePresence,
  motion,
} from 'framer-motion';
import {
  BellIcon,
  CheckCircle2Icon,
  TriangleAlertIcon,
} from 'lucide-react';

import { useLoader } from '../../contexts/LoaderContext';

export function LoaderNotificationsMenu() {
  const { issues } = useLoader();

  const [open, setOpen] = useState(false);

  const ref = useRef<HTMLDivElement>(null);

  const notes = Object.values(issues)
    .filter((issue) => issue.reported)
    .map((issue) => {
      const hasDecision =
        issue.decisionReceived ||
        Boolean(issue.dispatcherDecision) ||
        (issue.resolution !== undefined &&
          issue.resolution !== 'open');

      const Icon = hasDecision
        ? CheckCircle2Icon
        : TriangleAlertIcon;

      const tone = hasDecision
        ? 'bg-brand-pale text-forest'
        : 'bg-amber-pale text-amber-ink';

      let title: string;

      if (hasDecision) {
        title =
          'Dispatcher decision received';
      } else if (
        issue.type === 'damaged'
      ) {
        title = 'Damage reported';
      } else {
        title = 'Shortage reported';
      }

      let body: string;

      if (issue.dispatcherDecision) {
        body = `${issue.orderId} · ${issue.itemName} · ${issue.dispatcherDecision}`;
      } else if (
        issue.resolution ===
        'replacement_loaded'
      ) {
        body = `${issue.orderId} · ${issue.itemName} · Replacement recorded`;
      } else if (
        issue.resolution === 'ship_short'
      ) {
        const quantityText =
          issue.approvedShipQuantity !==
            undefined
            ? `Ship ${issue.approvedShipQuantity} ${issue.unit}`
            : 'Ship-short decision recorded';

        body = `${issue.orderId} · ${issue.itemName} · ${quantityText}`;
      } else if (hasDecision) {
        body = `${issue.orderId} · ${issue.itemName} · Review the issue resolution`;
      } else {
        body = `${issue.orderId} · ${issue.itemName} · Awaiting Dispatcher review`;
      }

      return {
        id: `issue-${issue.itemId}`,
        Icon,
        tone,
        title,
        body,

        /**
         * Until issue-detail routes are migrated to real issue IDs,
         * notifications open the Loader Issues page instead of using
         * a hardcoded vehicle or order.
         */
        to: '/issues',
      };
    });

  useEffect(() => {
    if (!open) {
      return;
    }

    const onDown = (
      event: MouseEvent,
    ) => {
      if (
        ref.current &&
        !ref.current.contains(
          event.target as Node,
        )
      ) {
        setOpen(false);
      }
    };

    const onKey = (
      event: KeyboardEvent,
    ) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener(
      'mousedown',
      onDown,
    );

    document.addEventListener(
      'keydown',
      onKey,
    );

    return () => {
      document.removeEventListener(
        'mousedown',
        onDown,
      );

      document.removeEventListener(
        'keydown',
        onKey,
      );
    };
  }, [open]);

  return (
    <div
      ref={ref}
      className="relative"
    >
      <button
        type="button"
        onClick={() =>
          setOpen((current) => !current)
        }
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={
          notes.length > 0
            ? `Notifications, ${notes.length} new`
            : 'Notifications'
        }
        className="relative grid h-10 w-10 place-items-center rounded-full text-ink transition-colors duration-150 hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand md:h-11 md:w-11 md:bg-surface md:hover:bg-brand-pale"
      >
        <BellIcon
          aria-hidden="true"
          className="h-5 w-5"
        />

        {notes.length > 0 && (
          <span className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-amber px-1 text-[10px] font-bold text-amber-ink">
            {notes.length}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{
              opacity: 0,
              y: -4,
              scale: 0.98,
            }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
            }}
            exit={{
              opacity: 0,
              y: -4,
              scale: 0.98,
            }}
            transition={{
              duration: 0.16,
              ease: [0.23, 1, 0.32, 1],
            }}
            className="absolute right-0 top-14 z-40 w-[min(360px,calc(100vw-2rem))] origin-top-right overflow-hidden rounded-card bg-surface shadow-pop ring-1 ring-line"
          >
            <div className="border-b border-line px-4 py-3">
              <p className="text-sm font-semibold text-ink">
                Loader updates
              </p>

              <p className="mt-0.5 text-xs text-subtle">
                Loading issues and Dispatcher
                responses
              </p>
            </div>

            {notes.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <span className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-canvas text-subtle">
                  <BellIcon
                    aria-hidden="true"
                    className="h-5 w-5"
                  />
                </span>

                <p className="mt-3 text-sm font-semibold text-ink">
                  No new updates
                </p>

                <p className="mt-1 text-xs leading-5 text-subtle">
                  Loading issue decisions and
                  plan updates will appear here.
                </p>
              </div>
            ) : (
              <ul className="max-h-[420px] divide-y divide-line overflow-y-auto">
                {notes.map(
                  ({
                    id,
                    Icon,
                    tone,
                    title,
                    body,
                    to,
                  }) => (
                    <li key={id}>
                      <Link
                        to={to}
                        onClick={() =>
                          setOpen(false)
                        }
                        className="flex gap-3 px-4 py-3 transition-colors duration-150 hover:bg-canvas focus-visible:bg-canvas focus-visible:outline-none"
                      >
                        <span
                          className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${tone}`}
                        >
                          <Icon
                            aria-hidden="true"
                            className="h-4 w-4"
                          />
                        </span>

                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-ink">
                            {title}
                          </span>

                          <span className="mt-0.5 block text-sm leading-5 text-subtle">
                            {body}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ),
                )}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}