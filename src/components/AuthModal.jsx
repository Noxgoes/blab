import { useState } from 'react'
import { supabase } from '../utils/supabase'
import { GoogleLogin } from '@react-oauth/google'

export default function AuthModal({ onClose }) {
  const [activeTab, setActiveTab] = useState('signin') // 'signin' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true)
    setError(null)
    const idToken = credentialResponse.credential

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      if (data?.session) {
        onClose()
      } else {
        setSuccess('Logged in via Google.')
        setLoading(false)
      }
    }
  }

  const handleGoogleError = () => {
    setError('Google Login Failed')
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
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            theme="outline"
            text="continue_with"
            shape="rectangular"
            width="100%"
          />
        </div>
      </div>
    </div>
  )
}
