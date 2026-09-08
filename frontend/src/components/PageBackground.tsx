import React from 'react';
import { PageBackgroundConfig } from '../hooks/usePageBackground';

interface Props {
  bgConfig: PageBackgroundConfig;
}

export const PageBackground: React.FC<Props> = ({ bgConfig }) => {
  if (bgConfig.type === 'none') return null;

  if (bgConfig.type === 'gradient') {
    return (
      <div
        className="fixed inset-0 pointer-events-none z-0 transition-all duration-300"
        style={{
          background: `radial-gradient(circle at center, ${bgConfig.gradientColor1} 0%, ${bgConfig.gradientColor2} 100%)`,
          backgroundAttachment: 'fixed',
        }}
      />
    );
  }

  if (bgConfig.type === 'image' && bgConfig.imageUrl) {
    // imageBrightness is -100 to 100, where 0 is normal (1.0 factor)
    const brightness = Math.max(0, Math.min(2, 1 + (bgConfig.imageBrightness || 0) / 100));

    return (
      <div
        className="fixed inset-0 pointer-events-none z-0 transition-all duration-300"
        style={{
          backgroundImage: `url(${bgConfig.imageUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed',
          filter: `brightness(${brightness})`,
        }}
      />
    );
  }

  return null;
};
