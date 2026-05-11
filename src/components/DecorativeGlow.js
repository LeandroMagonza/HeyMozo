import React from 'react';
import './DecorativeGlow.css';

// Background glow blobs used across redesigned client/cajero screens.
// Defaults match the brand palette of the cliente flow (red + purple).
// For cajero screens override with green/cyan tones.
const DecorativeGlow = ({
  topLeftColor = 'rgba(232, 54, 42, 0.04)',
  bottomRightColor = 'rgba(147, 51, 234, 0.05)',
}) => {
  return (
    <>
      <div
        className="decorative-glow decorative-glow--top-left"
        style={{ background: topLeftColor }}
        aria-hidden="true"
      />
      <div
        className="decorative-glow decorative-glow--bottom-right"
        style={{ background: bottomRightColor }}
        aria-hidden="true"
      />
    </>
  );
};

export default DecorativeGlow;
