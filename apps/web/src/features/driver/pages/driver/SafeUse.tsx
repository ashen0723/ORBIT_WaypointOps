import { ArrowLeftIcon, ShieldAlertIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

export function SafeUse() {
  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-forest p-5 text-white md:p-10">
      <section className="w-full max-w-[390px] text-center md:max-w-2xl">
        <ShieldAlertIcon aria-hidden className="mx-auto h-12 w-12 md:h-16 md:w-16" />
        <p className="mt-8 text-sm font-semibold text-brand-pale md:text-lg">Next stop</p>
        <h1 className="mt-3 text-4xl font-bold leading-tight tracking-tight md:text-6xl xl:text-7xl">OUT070<br />Ampitiya</h1>
        <div className="mx-auto mt-8 max-w-xs border-y border-white/25 py-6 md:max-w-lg md:py-8">
          <p className="text-2xl font-bold md:text-4xl">ETA 06:20</p>
          <p className="mt-2 text-lg text-brand-pale md:text-2xl">Window closes 07:30</p>
        </div>
        <p className="mx-auto mt-8 max-w-xs text-lg font-semibold leading-7 md:max-w-lg md:text-2xl md:leading-9">Pull over safely to update deliveries.</p>
        <Link to="/profile" className="mx-auto mt-10 inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/40 px-5 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"><ArrowLeftIcon aria-hidden className="h-5 w-5" />Back when safely stopped</Link>
      </section>
    </main>);

}