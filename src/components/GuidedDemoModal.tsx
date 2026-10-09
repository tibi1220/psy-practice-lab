import { Localized, useTextTranslation } from './Localization';
import * as Dialog from '@radix-ui/react-dialog';
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';

export type DemoStep = {
  title: string;
  description: string;
  visual: ReactNode;
};

export type DemoTheme =
  'cyan' | 'violet' | 'emerald' | 'amber' | 'pink' | 'rose';

const themes: Record<
  DemoTheme,
  {
    accent: string;
    soft: string;
    progress: string;
    button: string;
    ring: string;
  }
> = {
  cyan: {
    accent: 'text-cyan-300',
    soft: 'bg-cyan-300/10 border-cyan-300/20',
    progress: 'bg-cyan-300',
    button: 'bg-cyan-300 hover:bg-cyan-200',
    ring: 'focus-visible:outline-cyan-300',
  },
  violet: {
    accent: 'text-violet-300',
    soft: 'bg-violet-300/10 border-violet-300/20',
    progress: 'bg-violet-300',
    button: 'bg-violet-300 hover:bg-violet-200',
    ring: 'focus-visible:outline-violet-300',
  },
  emerald: {
    accent: 'text-emerald-300',
    soft: 'bg-emerald-300/10 border-emerald-300/20',
    progress: 'bg-emerald-300',
    button: 'bg-emerald-300 hover:bg-emerald-200',
    ring: 'focus-visible:outline-emerald-300',
  },
  amber: {
    accent: 'text-amber-300',
    soft: 'bg-amber-300/10 border-amber-300/20',
    progress: 'bg-amber-300',
    button: 'bg-amber-300 hover:bg-amber-200',
    ring: 'focus-visible:outline-amber-300',
  },
  pink: {
    accent: 'text-pink-300',
    soft: 'bg-pink-300/10 border-pink-300/20',
    progress: 'bg-pink-300',
    button: 'bg-pink-300 hover:bg-pink-200',
    ring: 'focus-visible:outline-pink-300',
  },
  rose: {
    accent: 'text-rose-300',
    soft: 'bg-rose-300/10 border-rose-300/20',
    progress: 'bg-rose-300',
    button: 'bg-rose-300 hover:bg-rose-200',
    ring: 'focus-visible:outline-rose-300',
  },
};

export function GuidedDemoModal({
  title,
  introduction,
  steps: stepInput,
  theme,
  triggerLabel = 'View guided demo',
  eyebrow = 'Guided demo',
}: {
  title: string;
  introduction: string;
  steps: DemoStep[] | (() => DemoStep[]);
  theme: DemoTheme;
  triggerLabel?: string;
  eyebrow?: string;
}) {
  const t = useTextTranslation();

  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const steps = useMemo(
    () =>
      typeof stepInput === 'function' ? (open ? stepInput() : []) : stepInput,
    [stepInput, open],
  );
  const colors = themes[theme];
  const step = steps[stepIndex] ?? { title: '', description: '', visual: null };

  const updateOpen = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) setStepIndex(0);
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={updateOpen}
    >
      <Dialog.Trigger asChild>
        <button
          type='button'
          className={`min-h-14 rounded-full border border-white/15 bg-white/[0.04] px-7 font-bold text-white transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-4 ${colors.ring}`}
        >
          <Localized>{triggerLabel}</Localized>
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className='demo-modal-overlay fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm' />
        <div className='pointer-events-none fixed inset-0 z-50 grid place-items-center p-4'>
          <Dialog.Content className='demo-modal-content pointer-events-auto relative flex max-h-[min(92dvh,48rem)] w-full max-w-2xl flex-col overflow-hidden rounded-[2rem] border border-white/15 bg-slate-950 text-white shadow-2xl shadow-black/60 focus:outline-none lg:max-h-[92dvh] lg:min-h-[min(80dvh,64rem)]'>
            <header className='flex shrink-0 items-start justify-between gap-5 border-b border-white/10 px-5 py-5 sm:px-7'>
              <div>
                <p
                  className={`font-mono text-xs font-bold uppercase tracking-[0.25em] ${colors.accent}`}
                >
                  <Localized>{eyebrow}</Localized>
                </p>
                <Dialog.Title className='mt-2 text-2xl font-black tracking-tight sm:text-3xl'>
                  <Localized>{title}</Localized>
                </Dialog.Title>
                <Dialog.Description className='mt-2 max-w-xl text-sm leading-6 text-slate-400'>
                  <Localized>{introduction}</Localized>
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button
                  type='button'
                  aria-label={t('common.accessibility.closeTolowercase', {
                    toLowerCase: eyebrow.toLowerCase(),
                  })}
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 text-xl text-slate-400 transition hover:bg-white/10 hover:text-white focus-visible:outline-2 ${colors.ring}`}
                >
                  <Localized>{'×'}</Localized>
                </button>
              </Dialog.Close>
            </header>

            <div className='min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6'>
              <div
                className='mb-5 flex items-center gap-2'
                aria-hidden='true'
              >
                <Localized>
                  {steps.map((demoStep, index) => (
                    <span
                      key={demoStep.title}
                      className={`h-1.5 flex-1 rounded-full transition-colors ${
                        index <= stepIndex ? colors.progress : 'bg-white/10'
                      }`}
                    />
                  ))}
                </Localized>
              </div>

              <div
                key={step.title}
                className={`demo-step-visual flex min-h-52 items-center justify-center overflow-hidden rounded-3xl border p-5 sm:min-h-60 sm:p-7 lg:min-h-[min(45dvh,32rem)] ${colors.soft}`}
              >
                <Localized>{step.visual}</Localized>
              </div>

              <div className='mt-5'>
                <p className={`font-mono text-xs font-bold ${colors.accent}`}>
                  <Localized id='common.labels.step' />{' '}
                  <Localized>{stepIndex + 1}</Localized>{' '}
                  <Localized id='common.labels.of' />{' '}
                  <Localized>{steps.length}</Localized>
                </p>
                <h3 className='mt-2 text-xl font-black sm:text-2xl'>
                  <Localized>{step.title}</Localized>
                </h3>
                <p className='mt-2 text-sm leading-6 text-slate-400 sm:text-base'>
                  <Localized>{step.description}</Localized>
                </p>
              </div>
            </div>

            <footer className='flex shrink-0 items-center justify-between gap-3 border-t border-white/10 px-5 py-4 sm:px-7'>
              <button
                type='button'
                disabled={stepIndex === 0}
                onClick={() => setStepIndex(current => current - 1)}
                className={`min-h-11 rounded-full border border-white/15 px-5 font-bold text-white transition hover:bg-white/10 focus-visible:outline-2 disabled:cursor-not-allowed disabled:opacity-30 ${colors.ring}`}
              >
                <Localized id='common.actions.back' />
              </button>
              <Localized>
                {stepIndex < steps.length - 1 ? (
                  <button
                    type='button'
                    onClick={() => setStepIndex(current => current + 1)}
                    className={`min-h-11 rounded-full px-6 font-bold text-slate-950 transition focus-visible:outline-2 focus-visible:outline-offset-2 ${colors.button} ${colors.ring}`}
                  >
                    <Localized id='common.actions.nextStep' />
                  </button>
                ) : (
                  <Dialog.Close asChild>
                    <button
                      type='button'
                      className={`min-h-11 rounded-full px-6 font-bold text-slate-950 transition focus-visible:outline-2 focus-visible:outline-offset-2 ${colors.button} ${colors.ring}`}
                    >
                      <Localized id='common.actions.gotIt' />
                    </button>
                  </Dialog.Close>
                )}
              </Localized>
            </footer>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function DemoKey({ children }: { children: ReactNode }) {
  return (
    <span className='flex min-h-12 min-w-14 items-center justify-center rounded-xl border border-white/20 bg-slate-950 px-4 font-mono text-xl font-black text-white shadow-[0_5px_0_rgba(255,255,255,0.08)]'>
      <Localized>{children}</Localized>
    </span>
  );
}
