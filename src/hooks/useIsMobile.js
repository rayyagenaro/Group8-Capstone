// src/hooks/useIsMobile.js
import { useState, useEffect } from 'react';

export function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Set initial value after component mounts to access `window`
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, [breakpoint]);

  return isMobile;
}