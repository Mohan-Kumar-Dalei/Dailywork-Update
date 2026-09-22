import { useEffect, useState } from 'react';

/**
 * Modal khulne/band hone ki animation.
 *
 * Do keede the:
 *  - unmount 150ms par hota tha jabki fade 200-300ms ka tha, to animation
 *    beech me kat jaati thi (wahi jhatka dikhta tha)
 *  - ek hi rAF se kabhi-kabhi pehla frame paint hone se pehle hi class badal
 *    jaati thi, jisse modal jhatke se khulta tha
 *
 * Isliye ab timing ek jagah hai aur sab modal wahi use karte hain.
 */
export const SHEET_MS = 200;

export function useSheet(onClose) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    let second;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => setShown(true));
    });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, []);

  /** Pehle fade out, phir tabhi unmount jab animation poori ho chuki ho. */
  function close() {
    setShown(false);
    setTimeout(onClose, SHEET_MS);
  }

  return { shown, close };
}
