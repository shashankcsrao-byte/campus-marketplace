import type { ReactNode } from 'react';
import { BagIcon, BoltIcon, ChatIcon, HeartIcon } from '../components/ui/Icons';

/** Shared layout for Login / Register: playful side panel + form card. */
export default function AuthCard({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer: ReactNode }) {
  return (
    <div className="mx-auto grid max-w-5xl items-center gap-10 py-2 sm:py-8 lg:grid-cols-2">
      {/* Side panel (desktop only, decorative) */}
      <div aria-hidden="true" className="relative hidden h-[30rem] overflow-hidden rounded-[2rem] border-2 border-ink bg-sun p-10 shadow-pop-lg lg:block">
        <span className="absolute -right-10 -bottom-10 size-48 rounded-full border-2 border-ink bg-bubblegum" />
        <span className="absolute top-24 -right-6 size-20 rotate-12 rounded-2xl border-2 border-ink bg-sky" />
        <p className="font-display text-4xl leading-tight font-bold text-ink">
          Your campus.
          <br />
          Your <span className="rounded-lg border-2 border-ink bg-white px-1.5">stuff.</span>
          <br />
          Your price.
        </p>
        <ul className="relative mt-10 space-y-3 font-bold text-ink">
          <li className="flex w-fit -rotate-1 items-center gap-3 rounded-xl border-2 border-ink bg-white px-4 py-2 shadow-pop-sm">
            <BoltIcon className="size-5 text-brand-600" /> Post in under a minute
          </li>
          <li className="flex w-fit rotate-1 items-center gap-3 rounded-xl border-2 border-ink bg-white px-4 py-2 shadow-pop-sm">
            <ChatIcon className="size-5 text-brand-600" /> Chat with buyers live
          </li>
          <li className="flex w-fit -rotate-1 items-center gap-3 rounded-xl border-2 border-ink bg-white px-4 py-2 shadow-pop-sm">
            <HeartIcon className="size-5 text-brand-600" /> Save what you love
          </li>
        </ul>
      </div>

      <div className="mx-auto w-full max-w-md">
        <div className="mb-6 text-center lg:text-left">
          <span className="mx-auto mb-4 flex size-14 -rotate-6 items-center justify-center rounded-2xl border-2 border-ink bg-brand-600 text-white shadow-pop lg:mx-0">
            <BagIcon className="size-7" />
          </span>
          <h1 className="text-3xl font-bold text-ink">{title}</h1>
          <p className="mt-1 font-medium text-slate-600">{subtitle}</p>
        </div>
        <div className="card-pop p-6 sm:p-8">{children}</div>
        <p className="mt-6 text-center text-sm font-semibold text-slate-700 lg:text-left">{footer}</p>
      </div>
    </div>
  );
}
