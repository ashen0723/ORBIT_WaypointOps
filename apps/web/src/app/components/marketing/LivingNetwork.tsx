import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { CheckIcon, Clock3Icon, RadioIcon, TruckIcon } from 'lucide-react';

const NETWORK_IMAGE = "/c7b42614-c012-4639-b473-65abc99b1dcd.jpg";
const LOGIN_IMAGE = "/1ca395ef-401b-4112-8437-0c4b1615535f.jpg";

interface LivingNetworkProps {
  variant?: 'hero' | 'login';
}

export function LivingNetwork({ variant = 'hero' }: LivingNetworkProps) {
  const reduceMotion = useReducedMotion();
  const isLogin = variant === 'login';

  return (
    <div className={`relative isolate overflow-hidden ${isLogin ? 'h-full min-h-[420px]' : 'aspect-[1.08/1] min-h-[440px] w-full'}`}>
      <img
        src={isLogin ? LOGIN_IMAGE : NETWORK_IMAGE}
        alt="Isometric Waypoint delivery network connecting a distribution hub, vehicle and retail outlets"
        className={`absolute inset-0 h-full w-full object-cover ${isLogin ? 'object-center opacity-80' : 'rounded-[32px] object-center'}`} />

      <div className={`absolute inset-0 ${isLogin ? 'bg-gradient-to-b from-forest/5 via-transparent to-forest' : 'rounded-[32px] ring-1 ring-inset ring-white/10'}`} />

      {!isLogin &&
      <>
          <StatusCard className="left-2 top-[16%] sm:left-0" icon={<TruckIcon className="h-3.5 w-3.5" />} label="VEH014" value="In transit" delay={0.15} />
          <StatusCard className="right-0 top-[38%]" icon={<Clock3Icon className="h-3.5 w-3.5" />} label="OUT014" value="ETA · 06:20" delay={0.25} />
          <StatusCard className="bottom-[8%] left-[12%]" icon={<CheckIcon className="h-3.5 w-3.5" />} label="TRIP 01" value="Loading complete" delay={0.35} />
        </>
      }

      <motion.span
        aria-hidden="true"
        className={`absolute grid h-8 w-8 place-items-center rounded-full border border-brand-mint/60 bg-forest/80 text-brand-mint shadow-[0_0_0_8px_rgba(95,191,138,0.12)] ${isLogin ? 'left-[61%] top-[43%]' : 'left-[57%] top-[52%]'}`}
        animate={reduceMotion ? undefined : { scale: [1, 1.08, 1], opacity: [0.8, 1, 0.8] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}>

        <RadioIcon className="h-3.5 w-3.5" />
      </motion.span>
    </div>);

}

interface StatusCardProps {
  className: string;
  icon: React.ReactNode;
  label: string;
  value: string;
  delay: number;
}

function StatusCard({ className, icon, label, value, delay }: StatusCardProps) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay, ease: [0.22, 1, 0.36, 1] }}
      className={`absolute z-20 flex items-center gap-3 rounded-2xl border border-white/15 bg-[#F8FAF7]/95 p-3 pr-5 text-ink shadow-[0_18px_50px_rgba(0,0,0,0.24)] backdrop-blur-md ${className}`}>

      <span className="grid h-8 w-8 place-items-center rounded-xl bg-brand-pale text-forest">{icon}</span>
      <span>
        <span className="block text-[9px] font-bold tracking-[0.18em] text-subtle">{label}</span>
        <span className="mt-0.5 block whitespace-nowrap text-xs font-semibold">{value}</span>
      </span>
    </motion.div>);

}