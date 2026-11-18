import React from 'react';
import { Modal } from '../shared/components.jsx';
import { friendly, money } from '../shared/api.js';

export default function TicketModal({ ticket, onClose, onViewBookings }) {
  const details = [
    ['Cancha', ticket.courtName],
    ['Fecha', friendly(ticket.date)],
    ['Hora', ticket.slot],
    ['Titular', ticket.userName],
  ];

  return (
    <Modal title="Reserva confirmada" className="react-public-dialog ticket-dialog" onClose={onClose}>
      <div className="ticket-stage">
        <div className="ticket-printer" aria-hidden="true">
          <div className="ticket-printer-panel">
            <span className="ticket-printer-brand">RTL</span>
            <span className="ticket-printer-status">
              <i className="ticket-printer-led" />
              <span className="ticket-printer-labels">
                <span className="ticket-printer-printing">Imprimiendo</span>
                <span className="ticket-printer-ready">Listo</span>
              </span>
            </span>
          </div>
          <div className="ticket-printer-slot" />
        </div>

        <div className="ticket-output">
          <div className="ticket-paper">
            <article className="ticket-sheet">
              <div className="ticket-sheet-head">
                <div className="ticket-sheet-brand">
                  <strong>RTL</strong>
                  <span>Reserva Tu Lugar</span>
                </div>
                <span className="ticket-stamp">Confirmada</span>
              </div>

              <dl className="ticket-sheet-details">
                {details.map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>

              <div className="ticket-sheet-total">
                <span>Total</span>
                <strong>{money(ticket.price)}</strong>
              </div>

              <div className="ticket-sheet-code">
                <span>Código de reserva</span>
                <code>{ticket.id}</code>
              </div>

              <p className="ticket-sheet-note">Presentá este comprobante en la recepción del complejo.</p>
            </article>
          </div>
        </div>
      </div>

      <div className="ticket-actions">
        <button type="button" className="go-book-btn" onClick={onViewBookings}>Ver mis reservas</button>
      </div>
    </Modal>
  );
}
