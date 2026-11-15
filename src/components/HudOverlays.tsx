import React from 'react';
import type { BallEdition } from '../data/editions';

interface HudOverlaysProps {
  edition: BallEdition;
  scrollProgress: number;
}

export const HudOverlays: React.FC<HudOverlaysProps> = ({
  edition,
  scrollProgress,
}) => {
  // Opacity envelope for Hero watermark (fades cleanly before About Us)
  const heroWatermarkOpacity = Math.max(0, 1 - scrollProgress * 1.45);
  const heroParallaxY = -scrollProgress * 64;

  return (
    <div className="pointer-events-none select-none absolute inset-0 overflow-hidden">
      {/* Subtle radial spotlight behind center stage */}
      <div className="absolute inset-0 spotlight-radial" />

      {/* Section 01: Monumental Background Display Watermark (z-0, occluded by z-10 3D ball) */}
      {heroWatermarkOpacity > 0.01 && (
        <div
          className="absolute inset-0 flex items-center justify-center z-0 will-change-transform"
          style={{
            opacity: heroWatermarkOpacity,
            transform: `translate3d(0, ${heroParallaxY}px, 0)`,
          }}
        >
          <span
            className="font-display uppercase text-[#585858]/70 tracking-[0.01em] leading-[0.85] text-center whitespace-nowrap"
            style={{ fontSize: 'clamp(110px, min(20vw, 31vh), 300px)' }}
          >
            {edition.watermark}
          </span>
        </div>
      )}
    </div>
  );
};
