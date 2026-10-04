import React, { FormEvent, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowRightIcon, EyeIcon, EyeOffIcon, LockKeyholeIcon, UserRoundIcon } from 'lucide-react';
import { useAuth } from '../providers/AuthProvider';
import { demoAccounts, ROLE_LABEL } from '../../features/dispatcher/data/users';
import { DEMO_PASSWORD } from '../../features/dispatcher/data/rules';
import { HOME_BY_ROLE } from '../../features/dispatcher/data/navigation';
import { BrandMark } from '../components/marketing/BrandMark';
import { LivingNetwork } from '../components/marketing/LivingNetwork';
import { CurvedLines } from '../components/marketing/CurvedLines';

export function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  if (user) return <Navigate to={HOME_BY_ROLE[user.role]} replace />;

  async function signIn(credentials: { email: string; password: string }) {
    if (!credentials.email.trim() || !credentials.password) {
      setError('Enter your email and password.');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      const message = await login(credentials.email, credentials.password);
      if (message) setError(message);
      else navigate('/', { replace: true });
    } finally {
      setIsLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void signIn({ email, password });
  }

  return (
    <main className="grid min-h-screen w-full bg-[#FAF9F5] text-ink lg:grid-cols-[1.12fr_0.88fr]">
      <section className="relative hidden min-h-screen overflow-hidden bg-forest text-white lg:flex lg:flex-col" aria-label="Waypoint delivery network">
        <CurvedLines className="text-white/[0.035]" />
        <div className="relative z-20 p-10 xl:p-12"><BrandMark light /></div>
        <div className="absolute inset-0"><LivingNetwork variant="login" /></div>
        <motion.div initial={reduceMotion ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }} className="relative z-10 mt-auto max-w-xl p-10 pb-12 xl:p-12 xl:pb-14">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/10 px-3 py-2 text-[10px] font-bold tracking-[0.16em] text-brand-mint backdrop-blur-sm"><span className="h-1.5 w-1.5 rounded-full bg-brand-mint" /> WAYPOINT OPERATIONS</div>
          <h1 className="text-5xl font-semibold leading-[1.02] tracking-[-0.05em] xl:text-6xl">Everything moves<br />when everything connects.</h1>
          <p className="mt-5 max-w-md text-base leading-7 text-white/70">Waypoint brings every stage of delivery into one shared operational system.</p>
          <div className="mt-8 flex items-center gap-5 border-t border-white/10 pt-5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70"><span>2 hubs</span><span className="h-1 w-1 rounded-full bg-brand-mint" /><span>60 vehicles</span><span className="h-1 w-1 rounded-full bg-brand-mint" /><span>120 outlets</span></div>
        </motion.div>
      </section>

      <section className="relative flex min-h-screen items-center justify-center px-5 py-10 sm:px-10 lg:px-12">
        <div className="absolute left-5 top-6 lg:hidden"><BrandMark /></div>
        <motion.div initial={reduceMotion ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, delay: 0.06, ease: [0.22, 1, 0.36, 1] }} className="w-full max-w-[430px] pt-20 lg:pt-0">
          <Link to="/" className="mb-10 inline-flex items-center gap-2 text-xs font-semibold text-subtle transition-colors duration-150 hover:text-forest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">← Back to Waypoint</Link>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">Operations portal</p>
          <h2 className="mt-4 text-[42px] font-semibold leading-none tracking-[-0.045em] sm:text-5xl">Welcome back.</h2>
          <p className="mt-4 text-base text-subtle">Sign in to continue to Waypoint.</p>

          <form onSubmit={handleSubmit} className="mt-10 space-y-6">
            <Field label="Email" icon={<UserRoundIcon className="h-4 w-4" />}>
              <input id="email" name="email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@waypoint.lk" className="h-14 w-full rounded-2xl border border-line bg-white pl-12 pr-4 text-[15px] font-medium text-ink shadow-[0_1px_2px_rgba(0,0,0,0.03)] outline-none transition-[border-color,box-shadow,background-color] duration-150 placeholder:text-muted focus:border-brand focus:bg-white focus:ring-4 focus:ring-brand/10" />
            </Field>
            <Field label="Password" icon={<LockKeyholeIcon className="h-4 w-4" />}>
              <input id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" aria-describedby={error ? 'login-error' : undefined} className="h-14 w-full rounded-2xl border border-line bg-white pl-12 pr-12 text-[15px] font-medium text-ink shadow-[0_1px_2px_rgba(0,0,0,0.03)] outline-none transition-[border-color,box-shadow,background-color] duration-150 placeholder:text-muted focus:border-brand focus:bg-white focus:ring-4 focus:ring-brand/10" />
              <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute right-4 top-1/2 -translate-y-1/2 rounded-lg p-1 text-muted transition-colors duration-150 hover:text-forest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">{showPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}</button>
            </Field>

            <AnimatePresence initial={false}>
              {error && <motion.p id="login-error" role="alert" initial={reduceMotion ? false : { opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }} className="flex items-center gap-2 text-sm font-medium text-[#A63D42]"><span className="h-1.5 w-1.5 rounded-full bg-[#A63D42]" />{error}</motion.p>}
            </AnimatePresence>

            <button type="submit" disabled={isLoading || !email.trim() || !password.trim()} className="flex h-14 w-full items-center justify-center gap-3 whitespace-nowrap rounded-2xl bg-brand px-6 text-[15px] font-bold text-white shadow-[0_12px_30px_rgba(15,77,46,0.18)] transition-[transform,background-color,box-shadow] duration-150 hover:-translate-y-0.5 hover:bg-forest hover:shadow-[0_16px_36px_rgba(15,77,46,0.22)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-hatch disabled:shadow-none">
              {isLoading ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white" /> Signing in…</> : <>Sign in <ArrowRightIcon className="h-4 w-4" /></>}
            </button>
          </form>

          <div className="mt-8 border-t border-line pt-6">
            <p className="text-xs font-semibold text-subtle">Demo accounts · password: <code>{DEMO_PASSWORD}</code></p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {demoAccounts.filter((account) => account.email !== 'store2@waypoint.lk').map((account) => <button key={account.id} type="button" disabled={isLoading} onClick={() => { setEmail(account.email); setPassword(DEMO_PASSWORD); void signIn({ email: account.email, password: DEMO_PASSWORD }); }} className="rounded-xl border border-line bg-white px-3 py-3 text-left text-xs font-semibold text-ink transition-colors hover:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-60">{ROLE_LABEL[account.role]}<span className="mt-1 block truncate font-normal text-subtle">{account.email}</span></button>)}
            </div>
          </div>
        </motion.div>
      </section>
    </main>);

}

function Field({ label, icon, children }: {label: string;icon: React.ReactNode;children: React.ReactNode;}) {
  return <label className="block"><span className="mb-2.5 block text-xs font-bold uppercase tracking-[0.12em] text-ink">{label}</span><span className="relative block"><span className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-muted">{icon}</span>{children}</span></label>;
}
