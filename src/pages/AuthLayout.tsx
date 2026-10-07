import type { ReactNode } from 'react';
import { BagIcon } from '../components/ui/Icons';

/** Shared card layout for Login / Register. */
export default function AuthCard({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer: ReactNode }) {
  return (
    <div className="mx-auto flex max-w-md flex-col py-4 sm:py-10">
      <div className="mb-6 text-center">
        <span className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-md">
          <BagIcon className="size-6" />
        </span>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">{children}</div>
      <p className="mt-6 text-center text-sm text-slate-600">{footer}</p>
    </div>
  );
}
