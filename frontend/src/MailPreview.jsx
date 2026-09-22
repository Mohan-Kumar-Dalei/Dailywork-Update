import { useEffect, useRef, useState } from 'react';

/**
 * Mail ka preview iframe me.
 *
 * Seedha div me daalne par app ka apna CSS (body ka line-height, table ke
 * rules) mail ke andar ghus jaata tha -- text ke gaps badh jaate the aur
 * table chhota lagta tha. Iframe ka apna document hai, to bilkul wahi
 * dikhta hai jo mail client me dikhega.
 */
export default function MailPreview({ html }) {
  const ref = useRef(null);
  const [height, setHeight] = useState(240);

  // height:auto zaroori hai -- warna body iframe jitni unchi ho jaati hai
  const doc = `<!doctype html><html><head><meta charset="utf-8">
<style>html,body{margin:0;padding:16px;height:auto;background:#fff;overflow:hidden;}</style>
</head><body>${html || ''}</body></html>`;

  useEffect(() => {
    const frame = ref.current;
    if (!frame) return;

    /**
     * Sirf body ka content naapo.
     * documentElement.scrollHeight iframe ki apni height ke barabar hota hai,
     * to usse naapne par height har baar thodi badhti jaati thi.
     */
    const fit = () => {
      const body = frame.contentDocument?.body;
      if (!body) return;
      const next = body.scrollHeight;
      setHeight((prev) => (Math.abs(prev - next) > 1 ? next : prev));
    };

    fit();
    const timers = [80, 250, 600].map((ms) => setTimeout(fit, ms));  // fonts settle
    window.addEventListener('resize', fit);
    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener('resize', fit);
    };
  }, [html]);

  return (
    <iframe
      ref={ref}
      title="Mail preview"
      srcDoc={doc}
      scrolling="no"
      // height content naap kar tay hoti hai, isliye inline
      style={{ height }}
      onLoad={() => {
        const body = ref.current?.contentDocument?.body;
        if (body) setHeight(body.scrollHeight);
      }}
      className="block w-full min-h-[200px] overflow-hidden bg-white border border-line rounded-[9px]"
    />
  );
}
