import React, { lazy, Suspense, useEffect } from 'react';
import { createRoot } from 'react-dom/client';

const App = location.pathname.startsWith('/superadmin')
  ? lazy(() => import('./superadmin/SuperAdminApp.jsx'))
  : location.pathname.startsWith('/admin')
  ? lazy(() => import('./admin/AdminApp.jsx'))
  : location.pathname.startsWith('/clubes')
  ? lazy(() => import('./landing/LandingApp.jsx'))
  : lazy(() => import('./public/PublicApp.jsx'));

function hideBootSplash() {
  const splash = document.getElementById('boot-splash');
  if (!splash) return;
  splash.classList.add('is-done');
  setTimeout(() => splash.remove(), 300);
}
function BootReady() { useEffect(hideBootSplash, []); return null; }

class ErrorBoundary extends React.Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch() { hideBootSplash(); }
  render() {
    if (this.state.error) return <main role="alert"><h1>No se pudo abrir la aplicación</h1><p>Recargá la página. Si el error continúa, verificá que el servidor esté funcionando.</p><button onClick={() => location.reload()}>Recargar</button></main>;
    return this.props.children;
  }
}
createRoot(document.getElementById('root')).render(<React.StrictMode><ErrorBoundary><Suspense fallback={null}><App /><BootReady /></Suspense></ErrorBoundary></React.StrictMode>);
