import { useNavigate, useLocation } from 'react-router-dom'

export default function GlobalNav({ onStart, isAnalyzing, user, userData, onOpenAuth, onOpenAccount }) {
  const navigate = useNavigate()
  const location = useLocation()

  const isSessionFlow = ['/setup', '/topic', '/recording', '/feedback'].includes(location.pathname)

  const handleQuit = () => {
    if (location.pathname === '/recording') {
      window.history.back()
    } else {
      navigate('/')
    }
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
      {/* Mobile-only second row of links — always visible, no JS needed */}
      {!isSessionFlow && (
        <div className="lp-nav__mobile-bar">
          <button className="lp-nav__mobile-link" onClick={() => navigate('/')}>HOME</button>
          <button className="lp-nav__mobile-link" onClick={() => navigate('/about')}>ABOUT</button>
          <button className="lp-nav__mobile-link" onClick={() => navigate('/leaderboard')}>RANKS</button>
          <button className="lp-nav__mobile-link" onClick={() => navigate('/contact')}>CONTACT</button>
          {user ? (
            <button className="lp-nav__mobile-link lp-nav__mobile-link--auth" onClick={onOpenAccount}>
              {(user.user_metadata?.username || 'ACCOUNT').toUpperCase().slice(0, 8)}
            </button>
          ) : (
            <button className="lp-nav__mobile-link lp-nav__mobile-link--auth" onClick={onOpenAuth}>
              SIGN IN
            </button>
          )}
        </div>
      )}

      <nav className="lp-nav lp-nav--global">
        <div className="lp-nav__left" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          <span className="lp-nav__logo">BLAB</span>
          <img src="/images/tongue.png" alt="" className="lp-nav__logo-icon" />
          <sup className="lp-nav__tm">™</sup>
        </div>

        {/* Desktop links — hidden on mobile via CSS */}
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
          {isSessionFlow ? (
            <button className="lp-nav__cta lp-nav__cta--pill lp-nav__cta--quit" onClick={handleQuit}>
              {quitLabel} <span className="lp-nav__cta-arrow">{quitArrow}</span>
            </button>
          ) : (
            location.pathname === '/' ? (
              <button className="lp-nav__cta lp-nav__cta--pill" onClick={onStart}>
                SPEAK <span className="lp-nav__cta-arrow">↗</span>
              </button>
            ) : (
              <button className="lp-nav__cta lp-nav__cta--pill" onClick={onStart}>
                SPEAK <span className="lp-nav__cta-arrow">↗</span>
              </button>
            )
          )}
        </div>
      </nav>
    </>
  )
}
