import React from 'react';
import { toast } from 'sonner';
import { SmartphoneIcon } from 'lucide-react';
import { CurvedLines } from '../ui/CurvedLines';

export function AppPromoCard() {
  return (
    <div className="relative overflow-hidden rounded-card bg-gradient-to-r from-forest to-brand p-4 text-white">
      <CurvedLines className="text-white/10" />
      <span className="relative grid h-9 w-9 place-items-center rounded-full bg-white/10 ring-1 ring-white/30">
        <SmartphoneIcon aria-hidden="true" className="h-4 w-4" />
      </span>
      <p className="relative mt-4 text-lg font-semibold leading-tight">Get the Waypoint mobile app</p>
      <p className="relative mt-1 text-xs text-white/75">Receive deliveries right on the floor</p>
      <button
        type="button"
        onClick={() => toast.success('Download link sent', { description: 'Check your phone for a text from Waypoint.' })}
        className="relative mt-4 h-10 w-full rounded-full bg-gradient-to-r from-forest to-brand text-sm font-semibold transition-[filter] duration-150 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
        
        Download
      </button>
    </div>);

}