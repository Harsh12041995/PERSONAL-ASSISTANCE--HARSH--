import type { CSSProperties } from 'react';
import type { SageMood } from './types';

interface SageOrbProps {
    mood: SageMood;
    asleep?: boolean;
    dragging?: boolean;
    walking?: boolean;
    blink?: boolean;
    /** One-shot greeting flash, played once on mount by the parent. */
    greet?: boolean;
    size?: number;
    /** Renders the contact shadow + orbit ring — on for the roaming persona, off for small inline avatars (e.g. the Studio header). */
    grounded?: boolean;
}

const HUE: Record<SageMood, number> = { idle: 258, listening: 264, happy: 328, thinking: 196, concerned: 30 };
const GLOW: Record<SageMood, number> = { idle: 0.45, listening: 0.95, happy: 0.85, thinking: 0.6, concerned: 0.5 };

// A living orb, not a cartoon: real light modeling (off-center specular
// highlight, ambient-occlusion shading, a grounding contact shadow) and a hue
// that shifts with mood — the same visual language as Siri's orb and
// Copilot's Mico. Dimensionality comes from light and motion, not limbs.
export default function SageOrb({ mood, asleep = false, dragging = false, walking = false, blink = false, greet = false, size = 44, grounded = false }: SageOrbProps) {
    const eyesClosed = !dragging && (blink || (asleep && mood !== 'listening'));
    const orbStyle = {
        '--sage-hue': HUE[mood],
        '--sage-glow': GLOW[mood],
    } as CSSProperties;

    return (
        <div
            className={`sage-orb-wrap sage-${mood} ${dragging ? 'sage-dragging' : ''} ${walking ? 'sage-walking' : ''} ${greet ? 'sage-greet' : ''}`}
            style={{ width: size, height: size, position: 'relative' }}
        >
            {grounded && <div className="sage-contact-shadow" />}
            {grounded && <div className="sage-orbit" style={{ color: `hsl(${HUE[mood]} 85% 75%)` }} />}

            <div className={`sage-orb ${eyesClosed ? 'sage-blink' : ''} ${asleep && mood !== 'listening' ? 'sage-asleep' : ''}`} style={orbStyle}>
                <span className="sage-orb-highlight" />
                <span className="sage-eye sage-eye-l" />
                <span className="sage-eye sage-eye-r" />
                {grounded && mood === 'thinking' && !asleep && (
                    <>
                        <span className="sage-thinkmote" style={{ top: '8%', left: '68%' }} />
                        <span className="sage-thinkmote" style={{ top: '18%', left: '74%' }} />
                        <span className="sage-thinkmote" style={{ top: '30%', left: '64%' }} />
                    </>
                )}
            </div>
        </div>
    );
}
