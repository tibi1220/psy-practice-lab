import { useLayoutEffect, useRef } from 'react';
import type { ReactNode } from 'react';

// Keep the complete task and its controls visible when a question grows or the
// available height changes (including mobile browser chrome and orientation).
export function TestViewport({ children }: { children: ReactNode }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (!viewport || !content) return;
    const fit = () => {
      const scale = Math.min(
        1,
        viewport.clientHeight / Math.max(1, content.scrollHeight),
        viewport.clientWidth / Math.max(1, content.scrollWidth),
      );
      content.style.transform = `scale(${scale})`;
    };
    const observer = new ResizeObserver(fit);
    observer.observe(viewport);
    observer.observe(content);
    fit();
    return () => observer.disconnect();
  }, []);

  return (
    <main className='fixed inset-0 h-dvh overflow-hidden bg-slate-950 px-4 py-3 text-white sm:py-5'>
      <div
        ref={viewportRef}
        className='relative h-full w-full'
      >
        <div
          ref={contentRef}
          className='absolute inset-x-0 top-0 origin-top'
        >
          {children}
        </div>
      </div>
    </main>
  );
}
