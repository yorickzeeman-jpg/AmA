import { useState, useEffect } from 'react'
import { T } from './data.js'

// PWAInstallPrompt — shows a branded install banner
// on Android (Chrome fires beforeinstallprompt automatically)
// On iOS, shows manual instructions since Apple doesn't support the event

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [show, setShow]                     = useState(false)
  const [isIOS, setIsIOS]                   = useState(false)
  const [dismissed, setDismissed]           = useState(false)

  useEffect(() => {
    // Don't show if already installed (running as standalone PWA)
    if (window.matchMedia('(display-mode: standalone)').matches) return
    if (window.navigator.standalone === true) return // iOS standalone

    // Check if already dismissed this session
    if (sessionStorage.getItem('pwa-dismissed')) return

    // Detect iOS
    const ios = /ipad|iphone|ipod/i.test(navigator.userAgent) && !window.MSStream
    setIsIOS(ios)

    if (ios) {
      // Show iOS instructions after a short delay
      setTimeout(() => setShow(true), 3000)
      return
    }

    // Android / Chrome — listen for the install event
    const handler = e => {
      e.preventDefault()
      setDeferredPrompt(e)
      setTimeout(() => setShow(true), 2000)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  function handleInstall() {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      deferredPrompt.userChoice.then(choice => {
        if (choice.outcome === 'accepted') {
          console.log('[PWA] User installed AEB Portal')
        }
        setShow(false)
        setDeferredPrompt(null)
      })
    }
  }

  function handleDismiss() {
    setShow(false)
    sessionStorage.setItem('pwa-dismissed', '1')
  }

  if (!show || dismissed) return null

  // iOS — manual instructions
  if (isIOS) {
    return (
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999,
        background: '#fff',
        borderRadius: '20px 20px 0 0',
        padding: '16px 20px 32px',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.18)',
        animation: 'slideUp .3s ease',
      }}>
        <style>{`@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
        <div style={{ width: 36, height: 4, background: '#e5e7eb', borderRadius: 2, margin: '0 auto 16px' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(145deg,#07122a,#0f2347)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
            <span style={{ fontSize: 26, fontWeight: 900, color: T.orange, fontFamily: 'Arial' }}>A</span>
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 2 }}>Install AEB Portal</div>
            <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.4 }}>Add to your Home Screen for quick access — works like a native app.</div>
          </div>
        </div>
        <div style={{ background: '#f9fafb', borderRadius: 12, padding: '12px 14px', marginBottom: 14 }}>
          {[
            ['1', 'Tap the Share button', '⬆️', 'at the bottom of Safari'],
            ['2', 'Select', '📲', '"Add to Home Screen"'],
            ['3', 'Tap', '✅', '"Add" — done!'],
          ].map(([n, pre, ic, post]) => (
            <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, fontSize: 13, color: '#374151' }}>
              <span style={{ width: 22, height: 22, borderRadius: '50%', background: T.navy, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{n}</span>
              {pre} <span style={{ fontSize: 16 }}>{ic}</span> {post}
            </div>
          ))}
        </div>
        <button onClick={handleDismiss} style={{ width: '100%', padding: '10px', background: 'none', border: '1px solid #e5e7eb', borderRadius: 10, fontSize: 13, color: '#9ca3af', cursor: 'pointer', fontFamily: 'inherit' }}>
          Maybe later
        </button>
      </div>
    )
  }

  // Android / Chrome — native install button
  return (
    <div style={{
      position: 'fixed', bottom: 16, left: 16, right: 16, zIndex: 9999,
      background: '#fff',
      borderRadius: 16,
      padding: '14px 16px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
      display: 'flex', alignItems: 'center', gap: 14,
      animation: 'slideUp .3s ease',
      border: '1px solid #e5e7eb',
    }}>
      <style>{`@keyframes slideUp{from{transform:translateY(120px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(145deg,#07122a,#0f2347)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: 22, fontWeight: 900, color: T.orange, fontFamily: 'Arial' }}>A</span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 1 }}>Install AEB Portal</div>
        <div style={{ fontSize: 11, color: '#6b7280' }}>Add to home screen for quick access</div>
      </div>
      <button onClick={handleInstall} style={{ padding: '8px 14px', background: T.navy, color: '#fff', border: 'none', borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
        Install
      </button>
      <button onClick={handleDismiss} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 18, padding: 4, flexShrink: 0, lineHeight: 1 }}>×</button>
    </div>
  )
}
