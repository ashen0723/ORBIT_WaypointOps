import React from "react";

import {
  BellRingIcon,
  LockKeyholeIcon,
  ShieldCheckIcon,
  UserRoundIcon,
  WarehouseIcon,
} from "lucide-react";

import { useAuth } from "../../../app/providers/AuthProvider";

import { PageContainer } from "../components/ui/PageContainer";
import { PageHeader } from "../components/ui/PageHeader";
import { Card } from "../components/ui/Card";
import { Avatar } from "../components/ui/Avatar";

export function Settings() {
  const { user } = useAuth();

  const displayName = user?.name ?? "Loader";

  const email = user?.email ?? "Not available";

  const role = formatRole(user?.role);

  const depot = user?.depotId ?? "Not assigned";

  return (
    <PageContainer>
      <PageHeader
        title="Settings"
        subtitle="View your Loader account and work assignment."
      />

      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <Card className="p-5 md:p-7">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <Avatar name={displayName} size="lg" />

              <div className="min-w-0">
                <p className="text-xl font-semibold tracking-tight text-ink">
                  {displayName}
                </p>

                <p className="mt-1 truncate text-sm text-subtle">{email}</p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full bg-brand-pale px-3 py-1.5 text-xs font-semibold text-forest">
                    {role}
                  </span>

                  <span className="rounded-full bg-canvas px-3 py-1.5 text-xs font-semibold text-subtle ring-1 ring-inset ring-line">
                    Depot {depot}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-5 md:p-7">
            <SectionHeading
              icon={<UserRoundIcon aria-hidden="true" className="h-5 w-5" />}
              title="Account Information"
              subtitle="These details come from your signed-in Waypoint account."
            />

            <dl className="mt-5 grid gap-3 sm:grid-cols-2">
              <ReadOnlyField label="Name" value={displayName} />

              <ReadOnlyField label="Email" value={email} />

              <ReadOnlyField label="Role" value={role} />

              <ReadOnlyField
                label="User ID"
                value={user?.id ?? "Not available"}
              />
            </dl>
          </Card>

          <Card className="p-5 md:p-7">
            <SectionHeading
              icon={<WarehouseIcon aria-hidden="true" className="h-5 w-5" />}
              title="Work Assignment"
              subtitle="Depot assignment is controlled by Waypoint access management."
            />

            <dl className="mt-5 grid gap-3 sm:grid-cols-2">
              <ReadOnlyField label="Depot" value={depot} />

              <ReadOnlyField label="Access role" value={role} />
            </dl>

            <div className="mt-5 rounded-card border border-brand/15 bg-brand-pale/60 p-4">
              <p className="text-sm font-semibold text-forest">
                Depot is read-only
              </p>

              <p className="mt-1 text-sm leading-6 text-forest/75">
                A Loader should only receive loading work for the depot assigned
                to their account. Depot assignment cannot be changed from this
                screen.
              </p>
            </div>
          </Card>
        </div>

        <aside className="space-y-5">
          <Card className="p-5">
            <SectionHeading
              icon={<ShieldCheckIcon aria-hidden="true" className="h-5 w-5" />}
              title="Account Security"
            />

            <p className="mt-4 text-sm leading-6 text-subtle">
              Use your Waypoint sign-in credentials. Contact your administrator
              to change your password or account access.
            </p>

            <StatusRow
              icon={<LockKeyholeIcon aria-hidden="true" className="h-4 w-4" />}
              title="Authentication"
              detail="Managed by the shared Waypoint sign-in system"
            />
          </Card>

          <Card className="p-5">
            <SectionHeading
              icon={<BellRingIcon aria-hidden="true" className="h-5 w-5" />}
              title="Loader Notifications"
            />

            <p className="mt-4 text-sm leading-6 text-subtle">
              Operational Loader updates are shown from real workflow events
              rather than local preference switches.
            </p>

            <ul className="mt-4 space-y-2">
              <NotificationItem>New published loading trip</NotificationItem>

              <NotificationItem>Dispatcher plan change</NotificationItem>

              <NotificationItem>
                Dispatcher loading-issue decision
              </NotificationItem>
            </ul>
          </Card>
        </aside>
      </div>
    </PageContainer>
  );
}

function SectionHeading({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-brand-pale text-forest">
        {icon}
      </span>

      <div>
        <h2 className="text-lg font-semibold tracking-tight text-ink">
          {title}
        </h2>

        {subtitle && (
          <p className="mt-1 text-sm leading-6 text-subtle">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line/80 bg-canvas/55 px-4 py-3.5">
      <dt className="text-xs font-semibold text-subtle">{label}</dt>

      <dd className="mt-1.5 break-words text-sm font-semibold text-ink">
        {value}
      </dd>
    </div>
  );
}

function StatusRow({
  icon,
  title,
  detail,
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
}) {
  return (
    <div className="mt-5 flex gap-3 rounded-card border border-line/80 bg-canvas/55 p-4">
      <span className="mt-0.5 text-forest">{icon}</span>

      <div>
        <p className="text-sm font-semibold text-ink">{title}</p>

        <p className="mt-1 text-sm leading-5 text-subtle">{detail}</p>
      </div>
    </div>
  );
}

function NotificationItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 rounded-2xl bg-canvas/60 px-4 py-3 text-sm font-medium text-ink">
      <span
        aria-hidden="true"
        className="h-2 w-2 shrink-0 rounded-full bg-brand"
      />

      {children}
    </li>
  );
}

function formatRole(role?: string) {
  if (!role) {
    return "Loader";
  }

  return role
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
