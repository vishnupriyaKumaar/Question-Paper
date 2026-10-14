import { useCallback, useEffect, useState } from 'react';
import { getToken, setToken, setUnauthorizedHandler } from './api.js';
import Login from './components/Login.jsx';
import Workspace from './components/Workspace.jsx';
import IntroSplash from './components/IntroSplash.jsx';
import CornerBar from './components/CornerBar.jsx';

// Scroll-linked background: --p (0..1) drives zoom/shift/darkening over the first
// screens, --sp (0..1) is whole-page progress for the header progress line.
function useScrollFx() {
  useEffect(() => {
    const root = document.documentElement;
    let raf = 0;
    const update = () => {
      raf = 0;
      const y = window.scrollY;
      const vh = window.innerHeight || 1;
      const max = Math.max(1, document.documentElement.scrollHeight - vh);
      root.style.setProperty('--p', Math.min(1, y / (vh * 1.1)).toFixed(4));
      root.style.setProperty('--sp', Math.min(1, y / max).toFixed(4));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
}

export default function App() {
  const [authed, setAuthed] = useState(Boolean(getToken()));
  const [introDone, setIntroDone] = useState(false);
  const [installEvt, setInstallEvt] = useState(null);
  const [installed, setInstalled] = useState(() => typeof window !== 'undefined' && (window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true));
  useScrollFx();
  useEffect(() => {
    const onPrompt = (e) => { e.preventDefault(); setInstallEvt(e); };
    const onInstalled = () => { setInstalled(true); setInstallEvt(null); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => { window.removeEventListener('beforeinstallprompt', onPrompt); window.removeEventListener('appinstalled', onInstalled); };
  }, []);
  const install = useCallback(async () => {
    if (!installEvt) return;
    installEvt.prompt();
    try { await installEvt.userChoice; } catch { /* dismissed */ }
    setInstallEvt(null);
  }, [installEvt]);

  const logout = useCallback(() => {
    setToken('');
    setAuthed(false);
    window.scrollTo(0, 0);
  }, []);
  useEffect(() => { setUnauthorizedHandler(logout); }, [logout]);

  return (
    <>
      <div className="bg-scene" aria-hidden="true">
        <div className="bg-photo" />
        <div className="bg-aurora" />
        <div className="bg-veil" />
      </div>
      {authed ? <Workspace onLogout={logout} canInstall={Boolean(installEvt)} onInstall={install} installed={installed} /> : <Login onDone={() => setAuthed(true)} />}
      <CornerBar />
      {!introDone && <IntroSplash onDone={() => setIntroDone(true)} />}
    </>
  );
}
