import { ActivityIcon, CheckIcon, Clock3Icon, NavigationIcon, RadioIcon } from 'lucide-react';
import { visibilityEvents } from '../../data/marketing';

export function VisibilityPanel() {
  return (
    <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[#17231D] p-5 text-white shadow-[0_30px_80px_rgba(15,77,46,0.18)] sm:p-8">
      <div className="absolute right-[-80px] top-[-100px] h-64 w-64 rounded-full border border-brand-mint/15" />
      <div className="absolute right-[-20px] top-[-40px] h-40 w-40 rounded-full border border-brand-mint/10" />
      <div className="relative flex items-center justify-between border-b border-white/10 pb-5">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-mint">Network intelligence</p>
          <p className="mt-1 text-sm font-semibold">Illustrative operation</p>
        </div>
        <span className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-[10px] font-semibold text-white/80"><RadioIcon className="h-3 w-3 text-brand-mint" /> Preview</span>
      </div>
      <div className="relative grid gap-4 pt-5 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-2xl bg-white/[0.06] p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/55">Delivery progress</span>
            <ActivityIcon className="h-4 w-4 text-brand-mint" />
          </div>
          <div className="mt-8 flex items-end gap-3"><span className="text-5xl font-semibold tracking-[-0.05em]">84</span><span className="pb-1 text-sm text-white/55">of 96 stops</span></div>
          <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full w-[87%] rounded-full bg-brand-mint" /></div>
          <div className="mt-6 grid grid-cols-2 gap-3 border-t border-white/10 pt-5 text-xs">
            <span><span className="block text-white/70">On time</span><strong className="mt-1 block text-lg">91%</strong></span>
            <span><span className="block text-white/70">Open issues</span><strong className="mt-1 block text-lg">02</strong></span>
          </div>
        </div>
        <div className="space-y-3">
          {visibilityEvents.map((event, index) =>
          <div key={event.label} className={`flex items-center gap-3 rounded-2xl p-4 ${event.tone}`}>
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-current/10">{index === 0 ? <NavigationIcon className="h-4 w-4" /> : index === 1 ? <Clock3Icon className="h-4 w-4" /> : <CheckIcon className="h-4 w-4" />}</span>
              <span className="min-w-0 flex-1"><span className="block text-[10px] font-bold uppercase tracking-[0.12em] opacity-60">{event.label}</span><span className="mt-0.5 block text-sm font-semibold">{event.value}</span></span>
              <span className="hidden max-w-[100px] text-right text-[10px] leading-4 opacity-55 sm:block">{event.meta}</span>
            </div>
          )}
        </div>
      </div>
    </div>);

}
