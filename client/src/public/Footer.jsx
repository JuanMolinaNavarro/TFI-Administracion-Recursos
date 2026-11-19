import React from "react";
import { BrandMark, BrandWordmark } from "../shared/components.jsx";
export default function Footer({ onNavigate, inert }) {
 const switchTab = onNavigate;
 return (<footer className="rtl-mini-footer" inert={inert}>
      <div className="mini-footer-container">

        <button type="button" className="mini-footer-brand" onClick={() => { switchTab('find'); }} title="Ir al inicio" aria-label="RTL, Reserva Tu Lugar — Ir al inicio">
          <BrandMark className="mini-footer-mark" />
          <span className="mini-footer-brand-text">
            <BrandWordmark />
            <span className="mini-footer-tagline">Tu lugar en la cancha, reservado en segundos.</span>
          </span>
        </button>

        <address className="mini-footer-contact" aria-label="Información de contacto">
          <h2>Hablemos de tu próximo partido</h2>
          <p>¿Tenés una consulta? Estamos para ayudarte.</p>
          <div className="footer-contact-links">
            <a href="tel:+543865658984" className="footer-contact-link">
              <span className="footer-contact-icon"><i className="fa-solid fa-phone" aria-hidden="true"></i></span>
              <span><small>Teléfono de contacto</small><strong>3816443413</strong></span>
            </a>
            <a href="mailto:Lionelmessi91218@gmail.com" className="footer-contact-link">
              <span className="footer-contact-icon"><i className="fa-regular fa-envelope" aria-hidden="true"></i></span>
              <span><small>Correo electrónico</small><strong>admin@rtl.com</strong></span>
            </a>
          </div>
          <a className="footer-whatsapp-link" href="https://wa.me/5493816443413" target="_blank" rel="noopener noreferrer">
            <i className="fa-brands fa-whatsapp" aria-hidden="true"></i> Escribinos por WhatsApp <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i>
          </a>
        </address>


        <nav className="mini-footer-nav" aria-label="Navegación secundaria">
          <button type="button" className="mini-footer-link" onClick={() => { switchTab('find'); }}>Buscar Canchas</button>
          <span className="mini-footer-dot" aria-hidden="true">•</span>
          <button type="button" className="mini-footer-link" onClick={() => { switchTab('bookings'); }}>Mis Reservas</button>
          <span className="mini-footer-dot" aria-hidden="true">•</span>
          <button type="button" className="mini-footer-link" onClick={() => { switchTab('about'); }}>Sobre Nosotros</button>
          <span className="mini-footer-dot" aria-hidden="true">•</span>
          <a className="mini-footer-link" href="/clubes/">Para clubes</a>
        </nav>


        <div className="mini-footer-copy">
          <p>&copy; 2026 <strong>RTL (Reserva Tu Lugar)</strong>. Todos los derechos reservados. San Miguel de Tucumán, Argentina.</p>
        </div>
      </div>
    </footer>);
}
