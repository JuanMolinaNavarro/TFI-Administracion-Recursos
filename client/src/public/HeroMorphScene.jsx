import React, { useEffect, useRef, useState } from 'react';
import '../styles/hero.css';

export default function HeroMorphScene() {
  const hostRef = useRef(null), canvasRef = useRef(null), copyRef = useRef(null), worldRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onMotion = event => worldRef.current?.setReduced(event.matches);
    motion.addEventListener('change', onMotion);
    import('./hero/engine.js').then(({ createHeroWorld }) => {
      if (!alive) return;
      worldRef.current = createHeroWorld({
        host: hostRef.current,
        canvas: canvasRef.current,
        copy: copyRef.current,
        reduced: motion.matches,
        onReady: () => setReady(true),
      });
    }).catch(() => {});
    return () => {
      alive = false;
      motion.removeEventListener('change', onMotion);
      worldRef.current?.destroy();
      worldRef.current = null;
    };
  }, []);

  return <section ref={hostRef} className="morph-hero" aria-labelledby="morph-hero-title">
    <canvas ref={canvasRef} className={`morph-hero-canvas ${ready ? 'is-ready' : ''}`} aria-hidden="true" />
    <div ref={copyRef} className="morph-hero-copy">
      <h1 id="morph-hero-title">Tu lugar en la cancha, <span>reservado en segundos</span></h1>
      <p>Encontrá un complejo cerca, elegí el horario y confirmá tu turno.</p>
    </div>
  </section>;
}
