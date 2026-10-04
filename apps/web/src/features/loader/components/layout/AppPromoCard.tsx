import React from 'react';
import { toast } from 'sonner';
import { SmartphoneIcon } from 'lucide-react';
import { CurvedLines } from '../ui/CurvedLines';
export function AppPromoCard() {
  return <div className="relative overflow-hidden rounded-card bg-forest p-5 text-white shadow-pop">
      <CurvedLines className="text-white/10" />
      <span className="relative grid h-10 w-10 place-items-center rounded-full bg-white/10 ring-1 ring-white/30">
        <SmartphoneIcon aria-hidden="true" className="h-4 w-4" />
      </span>
      <p className="relative mt-5 text-xl font-semibold leading-tight">Get the Waypoint mobile app</p>
      <p className="relative mt-1 text-sm leading-5 text-white/75">Receive deliveries right on the floor</p>
      <button type="button" onClick={() => toast.success('Download link sent', {
      description: 'Check your phone for a text from Waypoint.'
    })} className="relative mt-5 h-11 w-full rounded-full bg-surface text-sm font-semibold text-forest shadow-card transition-[background-color,color,transform] duration-150 hover:bg-brand-pale active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
        Download
      </button>
    </div>;
}