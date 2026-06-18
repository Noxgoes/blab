import { useState } from 'react'
import { supabase } from '../utils/supabase'

export default function AuthModal({ onClose }) {
  const [activeTab, setActiveTab] = useState('signin') // 'signin' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const handleGoogleSignIn = async () => {
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    }
  }

  const handleSignIn = async (e) => {
    e.preventDefault()
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields.')
      return
    }
    setLoading(true)
    setError(null)
    
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      onClose()
    }
  }

  const handleSignUp = async (e) => {
    e.preventDefault()
    const cleanUsername = username.trim().toLowerCase()
    if (!cleanUsername || !email.trim() || !password.trim()) {
      setError('Please fill in all fields.')
      return
    }
    if (cleanUsername.length < 3) {
      setError('Username must be at least 3 characters.')
      return
    }
    setLoading(true)
    setError(null)

    try {
      // ── DUPLICATE CHECK ──────────────────────────────────────────────
      const { data: existingUser } = await supabase
        .from('leaderboard')
        .select('username, device_id')
        .eq('username', cleanUsername)
        .maybeSingle()

      if (existingUser) {
        const localDeviceId = localStorage.getItem('blabDeviceId')
        if (existingUser.device_id !== localDeviceId) {
          setError('That username is already taken on the board.')
          setLoading(false)
          return
        }
      }

      const { data, error: signUpErr } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: {
            username: cleanUsername
          }
        }
      })

      if (signUpErr) {
        setError(signUpErr.message)
        setLoading(false)
      } else {
        if (data?.session) {
          localStorage.setItem('blabUsername', cleanUsername)
          onClose()
        } else {
          setSuccess('Account created! Please check your email for the confirmation link.')
          setLoading(false)
        }
      }
    } catch (err) {
      setError('An unexpected error occurred.')
      setLoading(false)
    }
  }

  return (
    <div className="auth-overlay" onClick={onClose}>
      <div className="auth-box" onClick={e => e.stopPropagation()}>
        <button className="auth-close" onClick={onClose}>×</button>
        
        <div className="auth-header">
          <div className="auth-logo">BLAB<sup className="auth-logo-tm">™</sup></div>
          <h2 className="auth-title">Identify yourself.</h2>
        </div>

        <div className="auth-tabs">
          <button 
            className={`auth-tab ${activeTab === 'signin' ? 'auth-tab--active' : ''}`}
            onClick={() => { setActiveTab('signin'); setError(null); setSuccess(null); }}
          >
            SIGN IN
          </button>
          <button 
            className={`auth-tab ${activeTab === 'signup' ? 'auth-tab--active' : ''}`}
            onClick={() => { setActiveTab('signup'); setError(null); setSuccess(null); }}
          >
            SIGN UP
          </button>
        </div>

        {error && <div className="auth-error-banner">{error}</div>}
        {success && <div className="auth-success-banner">{success}</div>}

        {activeTab === 'signin' ? (
          <form className="auth-form" onSubmit={handleSignIn}>
            <div className="auth-field">
              <label className="auth-label">EMAIL ADDRESS</label>
              <input 
                type="email" 
                className="auth-input" 
                placeholder="you@domain.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                disabled={loading}
                required
              />
            </div>
            
            <div className="auth-field">
              <label className="auth-label">PASSWORD</label>
              <input 
                type="password" 
                className="auth-input" 
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <button type="submit" className="auth-btn auth-btn--solid" disabled={loading}>
              {loading ? 'AUTHENTICATING...' : 'ENTER'}
            </button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={handleSignUp}>
            <div className="auth-field">
              <label className="auth-label">USERNAME (FOR THE BOARD)</label>
              <input 
                type="text" 
                className="auth-input" 
                placeholder="e.g. smoothspeaker"
                value={username}
                onChange={e => setUsername(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div className="auth-field">
              <label className="auth-label">EMAIL ADDRESS</label>
              <input 
                type="email" 
                className="auth-input" 
                placeholder="you@domain.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                disabled={loading}
                required
              />
            </div>
            
            <div className="auth-field">
              <label className="auth-label">PASSWORD</label>
              <input 
                type="password" 
                className="auth-input" 
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <button type="submit" className="auth-btn auth-btn--solid" disabled={loading}>
              {loading ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT'}
            </button>
          </form>
        )}

        <div className="auth-divider">
          <span className="auth-divider-text">OR CONTINUE WITH</span>
        </div>

        <div className="auth-btn-google-container" style={{ display: 'flex', justifyContent: 'center', width: '100%', marginTop: '1rem' }}>
          <button className="auth-btn-google" onClick={handleGoogleSignIn} disabled={loading}>
            <svg className="auth-google-icon" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            Continue with Google
          </button>
        </div>
      </div>
    </div>
  )
}
