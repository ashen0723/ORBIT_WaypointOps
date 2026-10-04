import { motion, useReducedMotion } from 'framer-motion';
import { workflowSteps } from '../../data/marketing';

export function WorkflowJourney() {
  const reduceMotion = useReducedMotion();
  return (
    <div className="relative mt-14">
      <svg aria-hidden="true" viewBox="0 0 1000 130" preserveAspectRatio="none" className="absolute left-0 top-3 hidden h-24 w-full lg:block">
        <path d="M35 72 C 120 15, 270 125, 390 68 S 680 18, 965 68" fill="none" stroke="#C7DDCF" strokeWidth="2" />
        <motion.path
          d="M35 72 C 120 15, 270 125, 390 68 S 680 18, 965 68"
          fill="none"
          stroke="#1B6B3F"
          strokeWidth="3"
          strokeLinecap="round"
          initial={reduceMotion ? false : { pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }} />

      </svg>
      <ol className="relative grid gap-3 lg:grid-cols-5 lg:gap-5">
        {workflowSteps.map((step, index) =>
        <li key={step.number} className={`group relative flex gap-4 border-b border-line py-5 lg:block lg:border-0 lg:py-0 ${index % 2 ? 'lg:pt-20' : ''}`}>
            <span className="relative z-10 grid h-11 w-11 shrink-0 place-items-center rounded-full border-4 border-[#F7F8F5] bg-forest text-xs font-bold text-white shadow-[0_0_0_1px_rgba(15,77,46,0.15)] transition-transform duration-200 group-hover:scale-110">
              {step.number}
            </span>
            <div className="lg:mt-6">
              <h3 className="text-lg font-semibold tracking-tight text-ink">{step.title}</h3>
              <p className="mt-1 max-w-[160px] text-sm leading-6 text-subtle">{step.detail}</p>
            </div>
          </li>
        )}
      </ol>
    </div>);

}
