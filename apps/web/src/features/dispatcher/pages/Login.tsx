import { FormEvent, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ArrowRightIcon, Loader2Icon, PackageCheckIcon, RouteIcon, StoreIcon, TruckIcon } from 'lucide-react';
import { Logo } from '../components/layout/Logo';
import { Button } from '../components/ui/Button';
import { useSession } from '../contexts/SessionContext';
import { HOME_BY_ROLE } from '../data/navigation';
import { demoAccounts, ROLE_LABEL } from '../data/users';
import { DEMO_PASSWORD } from '../data/rules';
import type { Role } from '../types/dispatch';

const ROLE_ICON: Record<Role, typeof RouteIcon> = { dispatcher: RouteIcon, loader: PackageCheckIcon, driver: TruckIcon, store_manager: StoreIcon };
const INPUT = 'mt-1.5 h-12 w-full rounded-2xl border border-line bg-surface px-4 text-base text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand';

export function Login() {
  const { user, login } = useSession();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={HOME_BY_ROLE[user.role]} replace />;

  const signIn = async (e?: FormEvent, creds?: {email: string;password: string;}) => {
    e?.preventDefault();
    const c = creds ?? { email, password };
    if (!c.email.trim() || !c.password) {
      setError('Enter your email and password.');
      return;
    }
    setBusy(true);
    setError(null);
    const err = await login(c.email, c.password);
    setBusy(false);
    if (err) setError(err);else
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen w-full bg-canvas px-4 py-10 md:py-16">
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-12">
        <section className="rounded-panel bg-surface p-6 shadow-card md:p-10">
          <Logo subtitle="Delivery operations" to="/login" />
          <h1 className="mt-10 text-3xl font-semibold tracking-tight text-ink">Sign in</h1>
          <p className="mt-1 text-subtle">Each role sees only its own work.</p>
          <form onSubmit={(e) => void signIn(e)} className="mt-8 space-y-4" noValidate>
            <label className="block">
              <span className="text-sm font-semibold text-ink">Email</span>
              <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className={INPUT} placeholder="name@waypoint.lk" />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-ink">Password</span>
              <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={INPUT} />
            </label>
            {error &&
            <p role="alert" className="rounded-2xl bg-danger-pale px-4 py-3 text-sm text-danger-ink">
                {error}
              </p>
            }
            <Button type="submit" size="lg" fullWidth disabled={busy}>
              {busy ? <Loader2Icon aria-hidden="true" className="h-5 w-5 animate-spin" /> : null}
              Sign in
            </Button>
          </form>
          <p className="mt-6 text-xs text-subtle">Tip: open a second browser tab to sign in as another role — sessions are per tab, data is shared.</p>
        </section>

        <section aria-labelledby="demo-title">
          <h2 id="demo-title" className="text-lg font-semibold text-ink">
            Demonstration accounts
          </h2>
          <p className="mt-1 text-sm text-subtle">
            Password for all: <code className="rounded-md bg-surface px-1.5 py-0.5 font-semibold text-ink">{DEMO_PASSWORD}</code>
          </p>
          <ul className="mt-4 space-y-2">
            {demoAccounts.map((a) => {
              const Icon = ROLE_ICON[a.role];
              return (
                <li key={a.id}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setEmail(a.email);
                      setPassword(DEMO_PASSWORD);
                      void signIn(undefined, { email: a.email, password: DEMO_PASSWORD });
                    }}
                    className="flex w-full items-center gap-4 rounded-card bg-surface p-4 text-left shadow-card transition-shadow duration-150 hover:shadow-pop focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-60">
                    
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-pale text-forest">
                      <Icon aria-hidden="true" className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-ink">
                        {ROLE_LABEL[a.role]} · {a.name}
                      </span>
                      <span className="block truncate text-sm text-subtle">
                        {a.email} — {a.description}
                      </span>
                    </span>
                    <ArrowRightIcon aria-hidden="true" className="h-5 w-5 shrink-0 text-subtle" />
                  </button>
                </li>);

            })}
          </ul>
        </section>
      </div>
    </div>);

}