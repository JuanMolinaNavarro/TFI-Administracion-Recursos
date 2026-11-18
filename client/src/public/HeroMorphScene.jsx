import React, { useEffect, useRef, useState } from 'react';
import '../styles/hero.css';

const SCENES = ['Fútbol', 'Pádel', 'Básquetbol', 'Karting'];

export default function HeroMorphScene() {
  const hostRef = useRef(null), canvasRef = useRef(null), copyRef = useRef(null), pillsRef = useRef(null), worldRef = useRef(null), pausedRef = useRef(false);
  const [scene, setScene] = useState(0), [paused, setPaused] = useState(false), [ready, setReady] = useState(false);

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
        paused: pausedRef.current,
        onScene: setScene,
        onProgress: value => pillsRef.current?.style.setProperty('--hero-progress', value.toFixed(3)),
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

  function togglePause() {
    const next = !paused;
    pausedRef.current = next;
    setPaused(next);
    worldRef.current?.setPaused(next);
  }

  function choose(index) {
    setScene(index);
    worldRef.current?.goTo(index);
  }

  return <section ref={hostRef} className="morph-hero" aria-labelledby="morph-hero-title">
    <canvas ref={canvasRef} className={`morph-hero-canvas ${ready ? 'is-ready' : ''}`} aria-hidden="true" />
    <div ref={copyRef} className="morph-hero-copy">
      <h1 id="morph-hero-title">Tu lugar en la cancha, <span>reservado en segundos</span></h1>
      <p>Encontrá un complejo cerca, elegí el horario y confirmá tu turno.</p>
      <div ref={pillsRef} className="morph-hero-controls">
        <div className="morph-hero-pills" role="group" aria-label="Elegir escena del paisaje">
          {SCENES.map((name, index) => <button type="button" key={name} className={index === scene ? 'is-active' : ''} aria-pressed={index === scene} onClick={() => choose(index)}>{name}</button>)}
        </div>
        <button type="button" className="morph-hero-pause" aria-label={paused ? 'Reanudar animación' : 'Pausar animación'} aria-pressed={paused} onClick={togglePause}>
          <svg viewBox="0 0 16 16" aria-hidden="true">{paused ? <path d="M4 2.5v11l9-5.5z" /> : <path d="M4 2.5h3v11H4zM9 2.5h3v11H9z" />}</svg>
        </button>
      </div>
    </div>
  </section>;
}
