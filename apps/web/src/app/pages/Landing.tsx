import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRightIcon, ChevronDownIcon } from 'lucide-react';
import { BrandMark } from '../components/marketing/BrandMark';
import { LivingNetwork } from '../components/marketing/LivingNetwork';
import { OperationsPreview } from '../components/marketing/OperationsPreview';
import { RoleGrid } from '../components/marketing/RoleGrid';
import { VisibilityPanel } from '../components/marketing/VisibilityPanel';
import { WorkflowJourney } from '../components/marketing/WorkflowJourney';
import { CurvedLines } from '../components/marketing/CurvedLines';
import { operationalStats } from '../data/marketing';

export function Landing() {
  const reduceMotion = useReducedMotion();
  return (
    <main className="min-h-screen w-full overflow-hidden bg-[#F7F8F5] text-ink">
      <section className="relative min-h-[880px] overflow-hidden bg-forest text-white lg:min-h-screen">
        <CurvedLines className="text-white/[0.035]" />
        <div className="absolute left-[6%] top-[24%] h-72 w-72 rounded-full border border-brand-mint/10" />
        <div className="absolute left-[12%] top-[32%] h-40 w-40 rounded-full border border-brand-mint/[0.07]" />
        <nav aria-label="Main navigation" className="relative z-40 mx-auto flex max-w-[1440px] items-center justify-between px-5 py-6 sm:px-8 lg:px-12">
          <BrandMark light />
          <div className="hidden items-center gap-8 text-sm text-white/65 md:flex">
            <a href="#platform" className="rounded-md transition-colors duration-150 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-mint">Platform</a>
            <a href="#workflow" className="rounded-md transition-colors duration-150 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-mint">Workflow</a>
            <a href="#roles" className="rounded-md transition-colors duration-150 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-mint">Roles</a>
          </div>
          <Link to="/login" className="inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-xl bg-white px-5 text-sm font-semibold text-forest shadow-[0_8px_24px_rgba(0,0,0,0.14)] transition-[transform,background-color] duration-150 hover:-translate-y-0.5 hover:bg-brand-pale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-mint focus-visible:ring-offset-2 focus-visible:ring-offset-forest">Sign in <ArrowRightIcon className="h-4 w-4" /></Link>
        </nav>

        <div className="relative z-10 mx-auto grid min-h-[760px] max-w-[1440px] items-center gap-10 px-5 pb-16 pt-8 sm:px-8 lg:grid-cols-[0.88fr_1.12fr] lg:px-12 lg:pb-10 lg:pt-0">
          <motion.div initial={reduceMotion ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }} className="relative z-20 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3 py-2 text-[10px] font-bold tracking-[0.18em] text-brand-mint">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-mint shadow-[0_0_0_5px_rgba(95,191,138,0.12)]" /> WAYPOINT OPERATIONS NETWORK
            </div>
            <h1 className="mt-7 text-[50px] font-semibold leading-[0.98] tracking-[-0.05em] sm:text-[64px] lg:text-[72px]">Every delivery.<br /><span className="text-brand-mint">One connected flow.</span></h1>
            <p className="mt-7 max-w-xl text-base leading-7 text-white/65 sm:text-lg">Waypoint connects ordering, planning, loading and delivery into one intelligent operational experience.</p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link to="/login" className="inline-flex h-14 items-center gap-3 whitespace-nowrap rounded-2xl bg-brand-mint px-6 text-sm font-bold text-forest shadow-[0_14px_30px_rgba(0,0,0,0.16)] transition-[transform,background-color] duration-150 hover:-translate-y-0.5 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-forest">Enter Waypoint <ArrowRightIcon className="h-4 w-4" /></Link>
              <a href="#workflow" className="inline-flex h-14 items-center gap-2 whitespace-nowrap rounded-2xl border border-white/15 px-6 text-sm font-semibold text-white transition-[border-color,background-color] duration-150 hover:border-white/30 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-mint">Explore the workflow <ChevronDownIcon className="h-4 w-4" /></a>
            </div>
            <dl className="mt-12 flex gap-8 border-t border-white/10 pt-6 sm:gap-12">
              {operationalStats.map((stat) => <div key={stat.label}><dt className="text-[10px] font-medium uppercase tracking-[0.14em] text-white/70">{stat.label}</dt><dd className="mt-1 text-xl font-semibold text-white">{stat.value}</dd></div>)}
            </dl>
          </motion.div>
          <motion.div initial={reduceMotion ? false : { opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, delay: 0.06, ease: [0.22, 1, 0.36, 1] }} className="relative -mr-5 lg:-mr-20">
            <LivingNetwork />
          </motion.div>
        </div>
      </section>

      <section id="platform" className="scroll-mt-8 px-5 py-24 sm:px-8 lg:py-32">
        <div className="mx-auto max-w-[1200px] text-center">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">One shared operation</p>
          <h2 className="mx-auto mt-4 max-w-3xl text-4xl font-semibold leading-[1.06] tracking-[-0.045em] sm:text-5xl">One operation.<br />One connected system.</h2>
          <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-subtle">Every role sees exactly what they need, while the entire network stays in sync.</p>
          <OperationsPreview />
        </div>
      </section>

      <section id="workflow" className="scroll-mt-8 border-y border-line bg-white px-5 py-24 sm:px-8 lg:py-32">
        <div className="mx-auto max-w-[1200px]">
          <div className="max-w-2xl"><p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">A single operational journey</p><h2 className="mt-4 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">From order to arrival.</h2><p className="mt-5 text-base leading-7 text-subtle">One continuous route from request to verified receipt. No handoff disappears between systems.</p></div>
          <WorkflowJourney />
        </div>
      </section>

      <section id="roles" className="scroll-mt-8 px-5 py-24 sm:px-8 lg:py-32">
        <div className="mx-auto max-w-[1200px]">
          <div className="grid gap-4 lg:grid-cols-2 lg:items-end"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">Built around the work</p><h2 className="mt-4 text-4xl font-semibold leading-[1.06] tracking-[-0.045em] sm:text-5xl">One platform.<br />Four focused experiences.</h2></div><p className="max-w-lg text-base leading-7 text-subtle lg:justify-self-end">A shared source of truth, shaped into the right experience for every person moving the delivery forward.</p></div>
          <RoleGrid />
        </div>
      </section>

      <section className="border-y border-line bg-white px-5 py-24 sm:px-8 lg:py-32">
        <div className="mx-auto grid max-w-[1200px] items-center gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">Quietly intelligent</p><h2 className="mt-4 text-4xl font-semibold leading-[1.06] tracking-[-0.045em] sm:text-5xl">Know what’s happening before it becomes a problem.</h2><p className="mt-6 max-w-md text-base leading-7 text-subtle">Live route context, meaningful alerts and coordinated updates help teams act early—without adding noise.</p></div>
          <VisibilityPanel />
        </div>
      </section>

      <section className="px-5 py-16 sm:px-8 lg:py-24">
        <div className="relative mx-auto max-w-[1200px] overflow-hidden rounded-[28px] bg-forest px-6 py-16 text-white sm:px-12 lg:px-16 lg:py-20">
          <CurvedLines className="text-white/[0.06]" />
          <svg aria-hidden="true" viewBox="0 0 600 120" className="absolute bottom-0 right-0 h-28 w-1/2 opacity-30"><path d="M0 100 C170 0, 280 135, 600 25" fill="none" stroke="#5FBF8A" strokeWidth="2" strokeDasharray="6 10" /><circle cx="570" cy="34" r="7" fill="#5FBF8A" /></svg>
          <div className="relative flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-mint">Waypoint operations network</p><h2 className="mt-4 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">Ready to move?</h2><p className="mt-4 text-base text-white/70">Access the Waypoint operations network.</p></div><Link to="/login" className="inline-flex h-14 w-fit items-center gap-3 whitespace-nowrap rounded-2xl bg-white px-6 text-sm font-bold text-forest transition-[transform,background-color] duration-150 hover:-translate-y-0.5 hover:bg-brand-pale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-mint">Sign in <ArrowRightIcon className="h-4 w-4" /></Link></div>
        </div>
      </section>

      <footer className="border-t border-line px-5 py-8 sm:px-8"><div className="mx-auto flex max-w-[1200px] flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><BrandMark /><p className="text-xs text-muted">Internal Operations System · © 2026 Waypoint</p></div></footer>
    </main>);

}
