'use client';

import { useEffect } from 'react';

export default function KaTeXStyles() {
  useEffect(() => {
    // Check if KaTeX stylesheet is already loaded
    const existingLink = document.querySelector('link[href*="katex"]');
    if (existingLink) {
      return;
    }

    // Create and append link tag for KaTeX CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css';
    link.integrity = 'sha384-n8MVd4RsNIU0tAv4ct0nTaAbDJwPJzDEaqSD1odI+WdtXRGWt2kTvGFasHpSy3SV';
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);

    // Cleanup function (though we want to keep it loaded)
    return () => {
      // Don't remove on unmount - we want it to persist
    };
  }, []);

  return null;
}

