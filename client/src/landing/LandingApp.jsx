import React, { useEffect, useRef, useState } from 'react';
import { BrandWordmark } from '../shared/components.jsx';
import ClubModal from '../public/ClubModal.jsx';
import { PlanCards, PlanGuarantee } from '../public/PlanCards.jsx';
import { customPlan } from '../public/clubPlans.js';
import '../styles/theme.css';
import '../styles/public.css';
import './landing.css';

const benefits = [
  ['fa-calendar-days', 'Agenda clara', 'Cada turno, organizado por cancha y horario.'],
  ['fa-table-cells', 'Canchas bajo control', 'Precios, fotos y disponibilidad siempre actualizados.'],
  ['fa-wallet', 'Cobros ordenados', 'Pagos registrados y pendientes a la vista.'],
];

const tour = [
  { eyebrow: 'Agenda', title: 'Mirá todo tu día de un vistazo', text: 'Creá reservas, confirmá turnos pendientes y encontrá horarios libres desde una agenda organizada por cancha.', points: ['Vista por cancha y horario', 'Reservas confirmadas y pendientes', 'Historial y exportación'], image: 'landing-agenda.webp', width: 1112, height: 718, alt: 'Agenda de RTL con reservas organizadas por cancha y horario' },
  { eyebrow: 'Canchas', title: 'Cada cancha, con su propia información', text: 'Actualizá fotos, precios, capacidad y disponibilidad cuando lo necesites, sin depender de nadie.', points: ['Fotos y datos de cada cancha', 'Precio por hora', 'Habilitación con un clic'], image: 'landing-canchas.webp', width: 1440, height: 900, alt: 'Panel de RTL con las canchas de un complejo deportivo' },
  { eyebrow: 'Cobros', title: 'Sabé qué se cobró y qué falta', text: 'Registrá pagos y seguí los importes pendientes de cada turno desde un mismo lugar.', points: ['Importes cobrados y por cobrar', 'Búsqueda por cliente o reserva', 'Filtros por estado y mes'], image: 'landing-cobros.webp', width: 1440, height: 900, alt: 'Panel de pagos de RTL con importes cobrados y pendientes' },
];

const steps = [
  ['Enviá tu solicitud', 'Contanos sobre tu complejo y cuántas canchas tenés.'],
  ['Te contactamos', 'El equipo de RTL revisa tus datos y se comunica con vos.'],
  ['Empezá a gestionar', 'Creamos tu acceso para que administres tu complejo.'],
];

export default function LandingApp() {
  const [plan, setPlan] = useState(null);
  const root = useRef(null);
  const requestAccess = () => setPlan(customPlan);

  useEffect(() => {
    document.title = 'RTL para clubes';
    document.querySelector('meta[name="description"]')?.setAttribute('content', 'RTL ayuda a los complejos deportivos a ordenar reservas, canchas, clientes y cobros.');
    if (location.hash) {
      requestAnimationFrame(() => {
        try { document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView({ behavior: 'instant' }); } catch { /* Un enlace mal formado deja la página al inicio. */ }
      });
    }
  }, []);

  useEffect(() => {
    const element = root.current;
    if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const items = [...element.querySelectorAll('.reveal')];
    const showAll = () => items.forEach(item => item.classList.add('is-visible'));
    let observer, timer;
    try {
      observer = new IntersectionObserver(entries => {
        clearTimeout(timer);
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        });
      }, { rootMargin: '0px 0px -8% 0px' });
      items.forEach(item => observer.observe(item));
      element.classList.add('reveal-ready');
      timer = setTimeout(showAll, 1500);
    } catch {
      showAll();
    }
    return () => { clearTimeout(timer); observer?.disconnect(); };
  }, []);

  return <div className="landing" ref={root}>
    <header className="landing-header">
      <a className="landing-logo" href="/" aria-label="RTL, Reserva Tu Lugar"><BrandWordmark /></a>
      <nav aria-label="Secciones"><a href="#funciones">Funciones</a><a href="#planes">Planes</a><button type="button" onClick={requestAccess}>Solicitar alta</button></nav>
    </header>

    <main>
      <section className="landing-hero" aria-labelledby="landing-title">
        <div className="landing-hero-inner">
          <div className="landing-hero-copy">
            <h1 id="landing-title">Menos caos. Más canchas en juego.</h1>
            <p>Ordená reservas, canchas, clientes y cobros desde la computadora o el celular.</p>
            <div className="landing-actions"><button type="button" className="landing-button is-light" onClick={requestAccess}>Quiero sumar mi club</button><a className="landing-button is-outline" href="#planes">Ver planes</a></div>
          </div>
          <div className="landing-hero-visual">
            <div className="landing-frame hero-desktop"><img src="/assets/landing-panel-desktop.webp" alt="Panel de RTL con métricas y agenda de reservas de un complejo" width="1440" height="900" fetchPriority="high" /></div>
            <div className="landing-frame hero-phone"><img src="/assets/landing-panel-mobile.webp" alt="Panel de RTL en un celular" width="390" height="844" /></div>
          </div>
        </div>
      </section>

      <section className="landing-benefits" aria-label="Beneficios">
        {benefits.map(([icon, title, text]) => <article className="landing-benefit reveal" key={title}><span><i className={`fa-solid ${icon}`} aria-hidden="true"></i></span><div><h2>{title}</h2><p>{text}</p></div></article>)}
      </section>

      <section className="landing-section" id="funciones" aria-labelledby="funciones-title">
        <div className="landing-heading reveal"><span>Funciones</span><h2 id="funciones-title">Tu complejo, en un solo lugar</h2><p>Menos planillas y mensajes sueltos. Más claridad para vos y tu equipo.</p></div>
        <div className="landing-tour">{tour.map(item => <article className="landing-tour-item reveal" key={item.title}>
          <div className="landing-tour-copy"><span>{item.eyebrow}</span><h3>{item.title}</h3><p>{item.text}</p><ul>{item.points.map(point => <li key={point}><i className="fa-solid fa-check" aria-hidden="true"></i>{point}</li>)}</ul></div>
          <div className="landing-frame"><img src={`/assets/${item.image}`} alt={item.alt} width={item.width} height={item.height} loading="lazy" decoding="async" /></div>
        </article>)}</div>
      </section>

      <section className="landing-section" aria-labelledby="empezar-title">
        <div className="landing-heading reveal"><span>Alta simple</span><h2 id="empezar-title">Cómo empezar</h2></div>
        <ol className="landing-steps">{steps.map(([title, text], index) => <li className="reveal" key={title}><b>{index + 1}</b><h3>{title}</h3><p>{text}</p></li>)}</ol>
      </section>

      <section className="landing-section" id="planes" aria-labelledby="planes-title">
        <div className="landing-heading reveal"><span>Planes</span><h2 id="planes-title">Elegí el plan perfecto para tu club</h2><p>Planes flexibles que se adaptan a las necesidades de tu club.</p></div>
        <PlanCards onSelect={setPlan} />
        <PlanGuarantee onSelect={setPlan} />
      </section>

      <section className="landing-close" aria-labelledby="cierre-title">
        <h2 id="cierre-title">Sumá tu club a RTL</h2>
        <p>Dejanos tus datos y te ayudamos a dar el primer paso.</p>
        <button type="button" className="landing-button is-light" onClick={requestAccess}>Solicitar alta</button>
      </section>
    </main>

    <footer className="landing-footer"><span>© 2026 RTL (Reserva Tu Lugar)</span><nav aria-label="Enlaces"><a href="/">Ir al sitio de reservas</a><a href="https://wa.me/5493816443413" target="_blank" rel="noopener noreferrer">Escribinos por WhatsApp</a></nav></footer>
    {plan && <ClubModal plan={plan} onClose={() => setPlan(null)} />}
  </div>;
}
