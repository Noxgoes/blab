import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

export default function GlobalNav({ onStart, isAnalyzing, user, userData, onOpenAuth, onOpenAccount }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  const isSessionFlow = ['/setup', '/topic', '/recording', '/feedback'].includes(location.pathname)

  const handleQuit = () => {
    if (location.pathname === '/recording') {
      window.history.back()
    } else {
      navigate('/')
    }
  }

  const navTo = (path) => {
    setMenuOpen(false)
    navigate(path)
  }

  let quitLabel = 'QUIT SESSION'
  let quitArrow = '✕'
  if (location.pathname === '/setup') {
    quitLabel = 'CANCEL'
  } else if (location.pathname === '/feedback') {
    quitLabel = 'EXIT'
    quitArrow = '→'
  }

  return (
    <>
      <nav className="lp-nav lp-nav--global">
        <div className="lp-nav__left" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          <span className="lp-nav__logo">BLAB</span>
          <img src="/images/tongue.png" alt="" className="lp-nav__logo-icon" />
          <sup className="lp-nav__tm">™</sup>
        </div>

        {/* Desktop links */}
        <div className="lp-nav__links">
          <button className="lp-nav__link" onClick={() => navigate('/')}>HOME</button>
          <button className="lp-nav__link" onClick={() => navigate('/about')}>ABOUT</button>
          <button className="lp-nav__link" onClick={() => navigate('/leaderboard')}>RANKS</button>
          <button className="lp-nav__link" onClick={() => navigate('/contact')}>CONTACT</button>
          {user ? (
            <button className="lp-nav__link lp-nav__link--auth" onClick={onOpenAccount}>
              {user.user_metadata?.username?.toUpperCase() || 'ACCOUNT'}
            </button>
          ) : (
            <button className="lp-nav__link lp-nav__link--auth" onClick={onOpenAuth}>
              SIGN IN
            </button>
          )}
        </div>

        <div className="lp-nav__actions">
          {/* Hamburger — mobile only */}
          <button
            className="lp-nav__hamburger"
            onClick={() => setMenuOpen(o => !o)}
            aria-label="Toggle menu"
          >
            <span className={`lp-nav__ham-bar ${menuOpen ? 'lp-nav__ham-bar--open-1' : ''}`} />
            <span className={`lp-nav__ham-bar ${menuOpen ? 'lp-nav__ham-bar--open-2' : ''}`} />
            <span className={`lp-nav__ham-bar ${menuOpen ? 'lp-nav__ham-bar--open-3' : ''}`} />
          </button>

          {isSessionFlow ? (
            <button className="lp-nav__cta lp-nav__cta--pill lp-nav__cta--quit" onClick={handleQuit}>
              {quitLabel} <span className="lp-nav__cta-arrow">{quitArrow}</span>
            </button>
          ) : (
            location.pathname === '/' ? (
              <button className="lp-nav__cta lp-nav__cta--pill" onClick={onStart}>
                BEGIN SPEAKING <span className="lp-nav__cta-arrow">↗</span>
              </button>
            ) : (
              <button className="lp-nav__cta lp-nav__cta--pill" onClick={onStart}>
                BEGIN SESSION <span className="lp-nav__cta-arrow">↗</span>
              </button>
            )
          )}
        </div>
      </nav>

      {/* Mobile slide-down drawer */}
      <div className={`lp-nav__drawer ${menuOpen ? 'lp-nav__drawer--open' : ''}`}>
        <button className="lp-nav__drawer-link" onClick={() => navTo('/')}>HOME</button>
        <button className="lp-nav__drawer-link" onClick={() => navTo('/about')}>ABOUT</button>
        <button className="lp-nav__drawer-link" onClick={() => navTo('/leaderboard')}>RANKS</button>
        <button className="lp-nav__drawer-link" onClick={() => navTo('/contact')}>CONTACT</button>
        {user ? (
          <button className="lp-nav__drawer-link" onClick={() => { setMenuOpen(false); onOpenAccount() }}>
            {user.user_metadata?.username?.toUpperCase() || 'ACCOUNT'}
          </button>
        ) : (
          <button className="lp-nav__drawer-link" onClick={() => { setMenuOpen(false); onOpenAuth() }}>
            SIGN IN
          </button>
        )}
      </div>

      {/* Backdrop */}
      {menuOpen && <div className="lp-nav__backdrop" onClick={() => setMenuOpen(false)} />}
    </>
  )
}
