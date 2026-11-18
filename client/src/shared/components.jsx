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
export function Busy({ children }) { return <span className="rtl-busy"><Spinner />{children}</span>; }
export function InlineLoader({ label }) { return <div className="rtl-inline-loader" role="status"><Spinner />{label}</div>; }
export function PageLoader({ label }) { return <div className="rtl-loader rtl-page-loader" role="status"><span className="rtl-loader-mark"><img src="/assets/logo-mark.webp" alt="" width="64" height="64" /></span><span className="rtl-loader-label">{label}</span></div>; }
export function ErrorMessage({ error }) { return error ? <p className="form-error" role="alert">{error.message || error}</p> : null; }
export function useCatalog() {
  const [catalog, setCatalog] = useState({ complexes: [], courts: [] });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { const controller = new AbortController(); request('/catalog', { signal: controller.signal }).then(setCatalog).catch(error => { if (error.name !== 'AbortError') setError(error); }).finally(() => { if (!controller.signal.aborted) setLoading(false); }); return () => controller.abort(); }, []);
  return { catalog, setCatalog, error, loading };
}
