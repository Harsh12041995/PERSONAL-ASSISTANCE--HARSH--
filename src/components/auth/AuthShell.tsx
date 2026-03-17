import type { ReactNode } from "react";

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  quote: string;
  quoteAuthor: string;
  sideHeading: string;
  sideDescription: string;
}

const GLOBAL_TAGS = ["Tasks", "Finance", "Health", "Goals", "Knowledge", "Capture"];

export default function AuthShell({
  title,
  subtitle,
  children,
  quote,
  quoteAuthor,
  sideHeading,
  sideDescription,
}: AuthShellProps) {
  return (
    <div className="min-h-screen overflow-hidden bg-slate-50">
      <div className="relative flex min-h-screen">
        <aside className="relative hidden w-[46%] overflow-hidden bg-gradient-to-br from-emerald-700 via-teal-700 to-cyan-700 lg:flex">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(167,243,208,0.22),transparent_45%),radial-gradient(circle_at_80%_70%,rgba(125,211,252,0.22),transparent_45%)]" />
          <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(255,255,255,.15)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.15)_1px,transparent_1px)] [background-size:42px_42px]" />

          <div className="relative z-10 flex h-full w-full flex-col justify-between p-10 xl:p-12">
            <div className="flex items-center gap-3 text-white">
              <div className="grid h-10 w-10 place-items-center rounded-xl border border-white/35 bg-white/15 text-sm font-bold">PA</div>
              <span className="text-sm font-semibold tracking-wide text-white/90">Personal Assistance</span>
            </div>

            <div>
              <h1 className="max-w-md text-4xl font-bold leading-tight text-white xl:text-5xl">{sideHeading}</h1>
              <p className="mt-4 max-w-md text-base leading-relaxed text-emerald-100">{sideDescription}</p>
              <div className="mt-7 flex flex-wrap gap-2">
                {GLOBAL_TAGS.map((tag) => (
                  <span key={tag} className="rounded-full border border-white/30 bg-white/15 px-3 py-1 text-xs font-semibold text-white/90 backdrop-blur-sm">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="border-l-2 border-white/35 pl-4">
              <p className="text-sm italic text-emerald-50">"{quote}"</p>
              <p className="mt-1 text-xs text-emerald-200">- {quoteAuthor}</p>
            </div>
          </div>
        </aside>

        <main className="flex w-full items-center justify-center p-6 sm:p-10 lg:w-[54%]">
          <div className="w-full max-w-[460px] rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/70 sm:p-8">
            <div className="mb-8 text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-emerald-600 to-cyan-600 text-xl font-bold text-white shadow-lg shadow-emerald-200">
                PA
              </div>
              <h2 className="mt-4 text-2xl font-bold text-slate-900">{title}</h2>
              <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
            </div>

            {children}

            <div className="mt-7 border-t border-slate-100 pt-4 text-center text-xs text-slate-400">
              Secure access for your personal workspace
            </div>
            <div className="mt-2 text-center text-xs text-slate-400">Need help? Reach out to your workspace admin.</div>
          </div>
        </main>
      </div>
    </div>
  );
}
