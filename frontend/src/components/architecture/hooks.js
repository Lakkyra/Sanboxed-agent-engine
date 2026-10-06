// Small, dependency-free animation primitives for the Architecture showcase.
// IntersectionObserver-based reveal, a count-up, reduced-motion detection,
// and a lightweight "step sequencer" used to drive the animated diagrams.

import { useState, useEffect, useRef, useCallback } from 'react';

/** True when the OS requests reduced motion. Reactive to changes. */
export function useReducedMotion() {
    const [reduced, setReduced] = useState(
        () =>
            typeof window !== 'undefined' &&
            window.matchMedia &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
    useEffect(() => {
        if (!window.matchMedia) return;
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        const onChange = () => setReduced(mq.matches);
        mq.addEventListener?.('change', onChange);
        return () => mq.removeEventListener?.('change', onChange);
    }, []);
    return reduced;
}

/**
 * Reveal-on-scroll. Returns [ref, inView]. Once revealed it stays revealed
 * (we don't re-hide on scroll-out — that reads as jittery, not premium).
 */
export function useInView(options = {}) {
    const { threshold = 0.2, rootMargin = '0px 0px -8% 0px', once = true } = options;
    const ref = useRef(null);
    const [inView, setInView] = useState(false);

    useEffect(() => {
        const node = ref.current;
        if (!node) return;
        if (typeof IntersectionObserver === 'undefined') {
            setInView(true);
            return;
        }
        const obs = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setInView(true);
                        if (once) obs.unobserve(entry.target);
                    } else if (!once) {
                        setInView(false);
                    }
                });
            },
            { threshold, rootMargin }
        );
        obs.observe(node);
        return () => obs.disconnect();
    }, [threshold, rootMargin, once]);

    return [ref, inView];
}

/**
 * Counts from 0 to `end` once `active` becomes true. Eased (fast-out, slow-in).
 * Respects reduced motion by snapping to the final value.
 */
export function useCountUp(end, { active = true, duration = 1400, decimals = 0 } = {}) {
    const reduced = useReducedMotion();
    const [value, setValue] = useState(0);
    const started = useRef(false);

    useEffect(() => {
        if (!active || started.current) return;
        started.current = true;
        if (reduced) {
            setValue(end);
            return;
        }
        let raf;
        const start = performance.now();
        const tick = (now) => {
            const t = Math.min(1, (now - start) / duration);
            // easeOutExpo — snappy arrival, characteristic of good count-ups
            const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
            setValue(end * eased);
            if (t < 1) raf = requestAnimationFrame(tick);
            else setValue(end);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [active, end, duration, reduced]);

    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
}

/**
 * Advances an integer step 0..count-1 on an interval while `active`.
 * Used to drive the agent-loop and request-flow animations. Pauses on
 * reduced motion (holds a representative frame).
 */
export function useSequence(count, { active = true, interval = 1600, holdFrame = 0 } = {}) {
    const reduced = useReducedMotion();
    const [step, setStep] = useState(0);

    useEffect(() => {
        if (!active) return;
        if (reduced) {
            setStep(holdFrame);
            return;
        }
        const id = setInterval(() => {
            setStep((s) => (s + 1) % count);
        }, interval);
        return () => clearInterval(id);
    }, [active, count, interval, reduced, holdFrame]);

    return [step, setStep];
}

/** Convenience: reveal wrapper state with a stagger index → inline style. */
export function useStagger(index = 0, base = 60) {
    return useCallback(
        (inView) => ({
            transitionDelay: inView ? `${index * base}ms` : '0ms',
        }),
        [index, base]
    );
}
