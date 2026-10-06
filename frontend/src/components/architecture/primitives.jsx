// Shared layout primitives for the Architecture showcase.
import { useInView } from './hooks';

/** Fade/slide-in wrapper. `delay` in ms for staggering siblings. */
export function Reveal({ children, delay = 0, className = '', as: Tag = 'div', ...rest }) {
    const [ref, inView] = useInView();
    return (
        <Tag
            ref={ref}
            className={`arch-reveal ${inView ? 'is-in' : ''} ${className}`}
            style={{ transitionDelay: inView ? `${delay}ms` : '0ms' }}
            {...rest}
        >
            {children}
        </Tag>
    );
}

/** A page section with an anchor id and consistent vertical rhythm. */
export function Section({ id, children, className = '' }) {
    return (
        <section id={id} className={`arch-section ${className}`} style={{ scrollMarginTop: '90px' }}>
            {children}
        </section>
    );
}

/** The eyebrow + title + optional lede block that opens each section. */
export function SectionHead({ index, eyebrow, title, lede }) {
    return (
        <Reveal>
            <div className="flex items-baseline gap-3 mb-3">
                {index != null && (
                    <span className="arch-num text-[13px]" style={{ color: 'var(--arch-accent)' }}>
                        {String(index).padStart(2, '0')}
                    </span>
                )}
                <span className="arch-eyebrow">{eyebrow}</span>
            </div>
            <h2 className="arch-h text-[clamp(1.7rem,3.4vw,2.6rem)] font-semibold max-w-3xl">
                {title}
            </h2>
            {lede && (
                <p
                    className="mt-4 text-[15px] leading-relaxed max-w-2xl"
                    style={{ color: 'var(--arch-text-dim)' }}
                >
                    {lede}
                </p>
            )}
        </Reveal>
    );
}

/** A small monospace pill used for tags / labels / status. */
export function Tag({ children, tone = 'default', className = '' }) {
    const tones = {
        default: { color: 'var(--arch-text-dim)', border: 'var(--arch-line-strong)', bg: 'transparent' },
        accent: { color: 'var(--arch-accent-bright)', border: 'var(--arch-accent-line)', bg: 'var(--arch-accent-wash)' },
        cool: { color: 'var(--arch-cool)', border: 'var(--violet-line)', bg: 'var(--arch-cool-wash)' },
    };
    const t = tones[tone] || tones.default;
    return (
        <span
            className={`arch-mono inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-full whitespace-nowrap ${className}`}
            style={{ color: t.color, border: `1px solid ${t.border}`, background: t.bg }}
        >
            {children}
        </span>
    );
}
