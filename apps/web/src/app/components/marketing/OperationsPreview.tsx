import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { AlertCircleIcon, ArrowUpRightIcon, CheckCircle2Icon, MapPinIcon, TruckIcon } from 'lucide-react';
import { systemRoles } from '../../data/marketing';

export function OperationsPreview() {
  const reduceMotion = useReducedMotion();
  return (
    <div className="relative mx-auto mt-14 max-w-6xl px-4 pb-12 sm:px-10">
      <div className="pointer-events-none absolute inset-x-[8%] top-1/2 hidden h-px bg-line lg:block" />
      <div className="relative overflow-hidden rounded-[28px] border border-forest/10 bg-[#17231D] p-3 shadow-[0_36px_90px_rgba(15,77,46,0.16)] sm:p-5">
        <div className="rounded-[20px] border border-white/10 bg-[#F7F8F5] p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand">Operations preview</p>
              <h3 className="mt-1 text-lg font-semibold tracking-tight text-ink">Tuesday delivery network</h3>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-brand-pale px-3 py-2 text-xs font-semibold text-forest">
              <span className="h-2 w-2 rounded-full bg-brand-medium" /> All systems moving
            </div>
          </div>
          <div className="grid gap-4 pt-5 lg:grid-cols-[1.35fr_0.65fr]">
            <div className="relative min-h-[300px] overflow-hidden rounded-2xl border border-line bg-[#EDF2EC] p-5">
              <svg viewBox="0 0 620 300" className="absolute inset-0 h-full w-full" aria-hidden="true">
                <path d="M-20 245 C 120 255, 100 82, 260 112 S 410 252, 650 45" fill="none" stroke="#BDD9C7" strokeWidth="34" strokeLinecap="round" />
                <path d="M-20 245 C 120 255, 100 82, 260 112 S 410 252, 650 45" fill="none" stroke="#1B6B3F" strokeWidth="3" strokeLinecap="round" strokeDasharray="5 10" />
                {[['115', '210'], ['260', '112'], ['408', '194'], ['552', '92']].map(([x, y]) => <g key={x}><circle cx={x} cy={y} r="9" fill="#F7F8F5" stroke="#1B6B3F" strokeWidth="3" /><circle cx={x} cy={y} r="3" fill="#1B6B3F" /></g>)}
              </svg>
              <div className="relative flex h-full flex-col justify-between">
                <span className="w-fit rounded-xl border border-white bg-white/90 px-3 py-2 text-[11px] font-semibold text-ink shadow-card">Hub 02 · 12 departures</span>
                <motion.div
                  animate={reduceMotion ? undefined : { x: [0, 12, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  className="mb-14 ml-[42%] grid h-10 w-10 place-items-center rounded-full bg-forest text-white shadow-pop ring-4 ring-white/70">

                  <TruckIcon className="h-4 w-4" />
                </motion.div>
                <span className="ml-auto flex w-fit items-center gap-2 rounded-xl bg-white px-3 py-2 text-[11px] font-semibold shadow-card"><MapPinIcon className="h-3.5 w-3.5 text-brand" /> OUT014 · 06:20</span>
              </div>
            </div>
            <div className="grid content-start gap-3">
              <PreviewRow icon={<TruckIcon className="h-4 w-4" />} title="VEH014" meta="4 stops · On time" value="68%" />
              <PreviewRow icon={<CheckCircle2Icon className="h-4 w-4" />} title="Load complete" meta="Hub 02 · Bay 4" value="Ready" />
              <PreviewRow icon={<AlertCircleIcon className="h-4 w-4" />} title="Plan updated" meta="Stop 3 moved" value="Review" />
              <Link to="/login" className="mt-2 flex items-center justify-between rounded-xl bg-forest px-4 py-3 text-left text-xs font-semibold text-white transition-[background-color,transform] duration-150 hover:-translate-y-0.5 hover:bg-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2">
                Open operations <ArrowUpRightIcon className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
      <div className="relative z-10 -mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-4 lg:-mx-5 lg:mt-[-18px]">
        {systemRoles.map(({ label, icon: Icon }, index) =>
        <div key={label} className={`flex items-center gap-2 rounded-2xl border border-line bg-white px-3 py-3 text-xs font-semibold text-ink shadow-card sm:px-4 ${index % 2 ? 'lg:translate-y-4' : ''}`}>
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-brand-pale text-forest"><Icon className="h-4 w-4" /></span>
            {label}
          </div>
        )}
      </div>
    </div>);

}

function PreviewRow({ icon, title, meta, value }: {icon: React.ReactNode;title: string;meta: string;value: string;}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-white p-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-pale text-forest">{icon}</span>
      <span className="min-w-0 flex-1"><span className="block text-xs font-semibold text-ink">{title}</span><span className="mt-0.5 block truncate text-[10px] text-subtle">{meta}</span></span>
      <span className="text-[10px] font-bold text-brand">{value}</span>
    </div>);

}
