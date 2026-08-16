import type { ReactNode } from 'react';
import { useReveal } from '../hooks/useReveal';

/**
 * Fades, lifts, and scales a card into place the first time it scrolls into
 * view — plain IntersectionObserver + CSS transition, no animation library.
 * The "expo-out" easing curve gives it a soft, decelerating settle instead
 * of a linear pop.
 */
export default function Reveal({ children, delayMs = 0, className = '' }: { children: ReactNode; delayMs?: number; className?: string }) {
  const { ref, visible } = useReveal<HTMLDivElement>();

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-[0.97]'} ${className}`}
      style={{
        transitionDelay: visible ? `${delayMs}ms` : '0ms',
        transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {children}
    </div>
  );
}
