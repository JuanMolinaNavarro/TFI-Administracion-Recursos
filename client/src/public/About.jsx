import React from "react";
export default function About({ onFind }) {
 const goToFind = onFind;
 return (<section id="view-about" className="view-container active" aria-labelledby="tab-about-btn">
        <div id="about-subview-company" className="about-subview active">
          
          <div className="about-hero-card">
            <div className="about-badge-row">
              <span className="about-badge"><i className="fa-solid fa-bolt"></i> Start-up Deportiva 2026</span>
              <span className="about-badge secondary"><i className="fa-solid fa-location-dot"></i> Sede Tucumán, Argentina</span>
              <div className="about-status-indicator">
                <span className="status-dot"></span>
                <span>AWS Cloud • 99.9% Uptime</span>
              </div>
            </div>
            <h2 className="about-hero-title">RTL <span>| Reserva Tu Lugar</span></h2>
            <p className="about-hero-description">
              Plataforma tecnológica diseñada para digitalizar, simplificar y potenciar la gestión y reserva en tiempo real de canchas y complejos deportivos en Argentina.
            </p>
          </div>

          
          <div className="about-grid-two">
            <div className="about-card highlight">
              <div className="about-card-icon"><i className="fa-solid fa-bullseye"></i></div>
              <div className="about-card-content">
                <h3>Nuestra Misión</h3>
                <p>
                  Conectar personas con complejos deportivos y de recreación mediante una plataforma que simplifica reservas, administración y conexión con clientes, optimizando la gestión de las PyMEs del sector y promoviendo un estilo de vida activo.
                </p>
              </div>
            </div>

            <div className="about-card highlight">
              <div className="about-card-icon"><i className="fa-solid fa-mountain-sun"></i></div>
              <div className="about-card-content">
                <h3>Nuestra Visión</h3>
                <p>
                  En los próximos 10 años, RTL será la plataforma líder en Argentina para la gestión de complejos deportivos y de entretenimiento, reconocida por impulsar el crecimiento de las PyMEs del sector y fomentar una cultura más activa en la sociedad.
                </p>
              </div>
            </div>
          </div>

          
          <div className="about-section-block">
            <h3 className="about-section-title"><i className="fa-solid fa-chart-line"></i> Objetivos Estratégicos & Métricas</h3>
            <div className="about-stats-grid">
              <div className="about-stat-card">
                <span className="stat-number">-30%</span>
                <span className="stat-title">Deserción de Turnos</span>
                <p>Reducción del ausentismo mediante seña online obligatoria y recordatorios automáticos de WhatsApp 24h y 2h antes.</p>
              </div>
              <div className="about-stat-card">
                <span className="stat-number">+20%</span>
                <span className="stat-title">Base de Clientes</span>
                <p>Aumento de clientes para complejos mediante estrategias de visibilización digital, sistema de referidos y promociones.</p>
              </div>
              <div className="about-stat-card">
                <span className="stat-number">100%</span>
                <span className="stat-title">Auditoría en Caja</span>
                <p>Módulo de auditoría de caja en tiempo real para dueños (control anti-fraude) y facturación electrónica homologada con ARCA.</p>
              </div>
              <div className="about-stat-card">
                <span className="stat-number">300 Mbps</span>
                <span className="stat-title">Conectividad Dedicada</span>
                <p>Fibra óptica simétrica corporativa Claro con enlace de respaldo secundario (CCC) y red local Ubiquiti UniFi.</p>
              </div>
            </div>
          </div>

          
          <div className="about-section-block">
            <h3 className="about-section-title"><i className="fa-solid fa-layer-group"></i> Propuesta de Valor para el Sector</h3>
            <div className="about-grid-two">
              <div className="about-card">
                <h4 className="card-subtitle"><i className="fa-solid fa-users"></i> Para los Deportistas</h4>
                <ul className="about-list">
                  <li><i className="fa-solid fa-check"></i> Búsqueda ágil por zona, deporte y servicios.</li>
                  <li><i className="fa-solid fa-check"></i> Reserva y confirmación inmediata con cupos en vivo.</li>
                  <li><i className="fa-solid fa-check"></i> Notificaciones y comprobante digital inmediato.</li>
                  <li><i className="fa-solid fa-check"></i> Reprogramación rápida ante contingencias climáticas.</li>
                </ul>
              </div>
              <div className="about-card">
                <h4 className="card-subtitle"><i className="fa-solid fa-briefcase"></i> Para los Complejos (PyMEs)</h4>
                <ul className="about-list">
                  <li><i className="fa-solid fa-check"></i> Reducción drástica de turnos caídos e impagos.</li>
                  <li><i className="fa-solid fa-check"></i> Control total de ingresos y arqueo de turnos en vivo.</li>
                  <li><i className="fa-solid fa-check-check"></i> Integración administrativa y contable simplificada.</li>
                  <li><i className="fa-solid fa-check"></i> Encuestas de satisfacción post-turno para mejorar reputación.</li>
                </ul>
              </div>
            </div>
          </div>

          
          <div className="club-invite-banner">
            <div className="club-invite-content">
              <h4><i className="fa-solid fa-trophy" style={{"color": "var(--accent-dark)", "marginRight": "0.5rem"}}></i> ¿Administrás un complejo o club deportivo?</h4>
              <p>Digitalizá turnos, reducí ausentismo y gestioná caja y stock con la app pensada para clubes argentinos.</p>
            </div>
            <a className="club-invite-cta" href="/clubes/">
              Conocer RTL para Clubes <i className="fa-solid fa-arrow-right" aria-hidden="true"></i>
            </a>
          </div>

          
          <div className="about-section-block">
            <h3 className="about-section-title"><i className="fa-solid fa-users"></i> Equipo Fundador de RTL</h3>
            <div className="team-cards-grid">
              <div className="student-card">
                <div className="student-avatar"><i className="fa-solid fa-user"></i></div>
                <div className="student-details">
                  <strong>Aybar Barrera, Lucas Facundo</strong>
                </div>
              </div>
              <div className="student-card">
                <div className="student-avatar"><i className="fa-solid fa-user"></i></div>
                <div className="student-details">
                  <strong>Castillo, Lautaro</strong>
                </div>
              </div>
              <div className="student-card">
                <div className="student-avatar"><i className="fa-solid fa-user"></i></div>
                <div className="student-details">
                  <strong>Figueroa, Cesar Bernabe</strong>
                </div>
              </div>
              <div className="student-card">
                <div className="student-avatar"><i className="fa-solid fa-user"></i></div>
                <div className="student-details">
                  <strong>Garcia, Cristian Nahuel</strong>
                </div>
              </div>
              <div className="student-card">
                <div className="student-avatar"><i className="fa-solid fa-user"></i></div>
                <div className="student-details">
                  <strong>Khouri, Jose Nicolas</strong>
                </div>
              </div>
              <div className="student-card">
                <div className="student-avatar"><i className="fa-solid fa-user"></i></div>
                <div className="student-details">
                  <strong>Molina Navarro, Juan Martin</strong>
                </div>
              </div>
              <div className="student-card">
                <div className="student-avatar"><i className="fa-solid fa-user"></i></div>
                <div className="student-details">
                  <strong>Svaldi, Luisina María</strong>
                </div>
              </div>
            </div>
          </div>

          
          <div className="about-cta-container">
            <button className="go-book-btn" onClick={() => { goToFind(); }}>
              <i className="fa-solid fa-magnifying-glass"></i> Explorar Canchas Disponibles
            </button>
          </div>
        </div>
      </section>);
}
