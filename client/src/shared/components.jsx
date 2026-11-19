import React, { useEffect, useRef, useState } from 'react';
import { request } from './api.js';
import '../styles/loader.css';

export function Icon({ name, ...props }) { return <i className={`fa-solid fa-${({ calendar: 'calendar-days', court: 'table-cells', wallet: 'wallet', dashboard: 'table-cells-large', users: 'users', plus: 'plus', close: 'xmark', arrow: 'arrow-right-from-bracket', download: 'download', clock: 'clock', check: 'check', leaf: 'leaf', menu: 'bars', edit: 'pen', left: 'chevron-left', right: 'chevron-right', info: 'circle-info', search: 'magnifying-glass' })[name] || name}`} aria-hidden="true" {...props} />; }
export function Modal({ title, children, onClose, className = '' }) {
  const ref = useRef(null), pressedOutside = useRef(false);
  const isOutside = event => { const box = ref.current.getBoundingClientRect(); return event.target === ref.current && (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom); };
  useEffect(() => {
    const dialog = ref.current, opener = document.activeElement;
    dialog.showModal();
    return () => { dialog.close(); if (opener?.isConnected) opener.focus({ preventScroll: true }); };
  }, []);
  return <dialog ref={ref} className={className} onCancel={event => { event.preventDefault(); onClose(); }} onPointerDown={event => { pressedOutside.current = isOutside(event); }} onClick={event => { if (pressedOutside.current && isOutside(event)) onClose(); pressedOutside.current = false; }} aria-label={title}><div className="dialog-heading"><h2>{title}</h2><button type="button" className="icon-button" aria-label="Cerrar" onClick={onClose}><Icon name="close" /></button></div>{children}</dialog>;
}
export function Spinner() { return <span className="rtl-spinner" aria-hidden="true" />; }
export function BrandWordmark() {
  return <span className="rtl-wordmark" aria-hidden="true"><span className="rtl-wordmark-word">R<span className="rtl-wordmark-rest"><i>{'eserva '}</i></span></span><span className="rtl-wordmark-word">T<span className="rtl-wordmark-rest"><i>{'u '}</i></span></span><span className="rtl-wordmark-word">L<span className="rtl-wordmark-rest"><i>ugar</i></span></span><span className="rtl-wordmark-ball-wrap"><span className="rtl-wordmark-ball-shadow" /><i className="fa-solid fa-futbol rtl-wordmark-ball" /></span></span>;
}
// Isotipo de RTL (calendario con cancha). Mismo dibujo que assets/rtl-mark.svg.
export function BrandMark({ className = '', size, title }) {
  return <svg className={`rtl-mark ${className}`.trim()} viewBox="36 36 440 440" width={size} height={size} role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true} focusable="false"><rect x="40" y="96" width="432" height="376" rx="104" fill="#65f1c2" /><g fill="#0a2e24"><rect x="136" y="40" width="60" height="112" rx="30" /><rect x="316" y="40" width="60" height="112" rx="30" /></g><g fill="none" stroke="#0a2e24" strokeWidth="21"><rect x="100" y="200" width="312" height="207" rx="33" /><path d="M256 200v207" /><circle className="rtl-mark-ball" cx="256" cy="303.5" r="40" /></g></svg>;
}
export function Busy({ children }) { return <span className="rtl-busy"><Spinner />{children}</span>; }
export function InlineLoader({ label }) { return <div className="rtl-inline-loader" role="status"><Spinner />{label}</div>; }
export function PageLoader({ label }) { return <div className="rtl-loader rtl-page-loader" role="status"><span className="rtl-loader-mark"><BrandMark size={64} /></span><span className="rtl-loader-label">{label}</span></div>; }
export function ErrorMessage({ error }) { return error ? <p className="form-error" role="alert">{error.message || error}</p> : null; }
export function useCatalog() {
  const [catalog, setCatalog] = useState({ complexes: [], courts: [] });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { const controller = new AbortController(); request('/catalog', { signal: controller.signal }).then(setCatalog).catch(error => { if (error.name !== 'AbortError') setError(error); }).finally(() => { if (!controller.signal.aborted) setLoading(false); }); return () => controller.abort(); }, []);
  return { catalog, setCatalog, error, loading };
}
