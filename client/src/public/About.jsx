import React from "react";
import { BrandMark } from "../shared/components.jsx";

const PLAYER_BENEFITS = [
  'Buscá canchas por zona, deporte y servicios.',
  'Reservá con disponibilidad en vivo y confirmación inmediata.',
  'Recibí notificaciones y el comprobante digital al instante.',
  'Reprogramá rápido si el clima no acompaña.',
];

const CLUB_BENEFITS = [
  'Menos turnos caídos e impagos.',
  'Ingresos y arqueo de turnos en tiempo real.',
  'Administración y contabilidad en un solo lugar.',
  'Encuestas después de cada turno para cuidar la reputación.',
];

const GOALS = [
  { title: 'Reducir 30% los turnos perdidos', detail: 'Con seña online obligatoria y recordatorios por WhatsApp 24 h y 2 h antes del turno.' },
  { title: 'Sumar 20% de clientes por complejo', detail: 'Con visibilidad digital, un sistema de referidos y promociones.' },
  { title: 'Caja auditada en tiempo real', detail: 'Control anti-fraude para dueños y facturación electrónica homologada con ARCA.' },
];

const TEAM = [
  'Aybar Barrera, Lucas Facundo',
  'Castillo, Lautaro',
  'Figueroa, Cesar Bernabe',
  'Garcia, Cristian Nahuel',
  'Khouri, Jose Nicolas',
  'Molina Navarro, Juan Martin',
  'Svaldi, Luisina María',
];

export default function About({ onFind }) {
  return (
    <section id="view-about" className="view-container active about-page" aria-labelledby="about-title">
      <header className="about-intro">
        <BrandMark className="about-mark" />
        <div>
          <h2 id="about-title">Sobre nosotros</h2>
          <p className="about-lead">
            RTL (Reserva Tu Lugar) es una plataforma para reservar canchas en tiempo real y gestionar complejos deportivos en Argentina. Nacimos en 2026 en Tucumán.
          </p>
        </div>
      </header>

      <div className="about-panel about-statements">
        <section aria-labelledby="about-mission">
          <h3 id="about-mission">Misión</h3>
          <p>
            Conectar personas con complejos deportivos y de recreación mediante una plataforma que simplifica reservas, administración y conexión con clientes, optimizando la gestión de las PyMEs del sector y promoviendo un estilo de vida activo.
          </p>
        </section>
        <section aria-labelledby="about-vision">
          <h3 id="about-vision">Visión</h3>
          <p>
            En los próximos 10 años, RTL será la plataforma líder en Argentina para la gestión de complejos deportivos y de entretenimiento, reconocida por impulsar el crecimiento de las PyMEs del sector y fomentar una cultura más activa en la sociedad.
          </p>
        </section>
      </div>

      <section className="about-block" aria-labelledby="about-offer">
        <h3 id="about-offer">Qué ofrecemos</h3>
        <div className="about-columns">
          <div>
            <h4>Para jugadores</h4>
            <ul className="about-list">
              {PLAYER_BENEFITS.map(item => <li key={item}>{item}</li>)}
            </ul>
          </div>
          <div>
            <h4>Para complejos</h4>
            <ul className="about-list">
              {CLUB_BENEFITS.map(item => <li key={item}>{item}</li>)}
            </ul>
          </div>
        </div>
      </section>

      <section className="about-block" aria-labelledby="about-goals">
        <h3 id="about-goals">Objetivos</h3>
        <ol className="about-goals">
          {GOALS.map(goal => (
            <li key={goal.title}>
              <strong>{goal.title}</strong>
              <p>{goal.detail}</p>
            </li>
          ))}
        </ol>
      </section>

      <aside className="about-panel about-clubs" aria-labelledby="about-clubs-title">
        <div>
          <h3 id="about-clubs-title">¿Administrás un complejo deportivo?</h3>
          <p>Digitalizá turnos, reducí el ausentismo y gestioná caja y stock con una app pensada para clubes argentinos.</p>
        </div>
        <a className="club-invite-cta" href="/clubes/">
          Conocer RTL para clubes <i className="fa-solid fa-arrow-right" aria-hidden="true"></i>
        </a>
      </aside>

      <section className="about-block" aria-labelledby="about-team">
        <h3 id="about-team">Equipo fundador</h3>
        <ul className="about-team">
          {TEAM.map(name => <li key={name}>{name}</li>)}
        </ul>
      </section>

      <div className="about-cta-container">
        <button type="button" className="go-book-btn" onClick={onFind}>
          <i className="fa-solid fa-magnifying-glass" aria-hidden="true"></i> Buscar canchas
        </button>
      </div>
    </section>
  );
}
