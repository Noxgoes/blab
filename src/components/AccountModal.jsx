import { useState } from 'react'
import { supabase } from '../utils/supabase'
import { getRank, getRankProgress } from '../utils/storage'

export default function AccountModal({ user, userData, onClose, onSignOut }) {
  const currentUsername = user?.user_metadata?.username || user?.email?.split('@')[0] || 'speaker'
  const email = user?.email || ''
  
  const rank = getRank(userData.totalXP)
  const progress = getRankProgress(userData.totalXP)

  const [isEditing, setIsEditing] = useState(false)
  const [newUsername, setNewUsername] = useState(currentUsername)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSaveUsername = async (e) => {
    e.preventDefault()
    const cleanUsername = newUsername.trim().toLowerCase()
    if (!cleanUsername) return
    if (cleanUsername === currentUsername) {
      setIsEditing(false)
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

      const authDeviceId = `auth:${user.id}`
      if (existingUser && existingUser.device_id !== authDeviceId) {
        setError('That username is already taken on the board.')
        setLoading(false)
        return
      }

      // Update Supabase Auth metadata
      const { error: authErr } = await supabase.auth.updateUser({
        data: { username: cleanUsername }
      })
      if (authErr) throw authErr

      // Update local storage
      localStorage.setItem('blabUsername', cleanUsername)

      // Update Leaderboard entry if exists
      await supabase
        .from('leaderboard')
        .update({ username: cleanUsername })
        .eq('device_id', authDeviceId)

      setIsEditing(false)
    } catch (err) {
      console.error(err)
      setError('Failed to update username. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="account-overlay" onClick={onClose}>
      <div className="account-box" onClick={e => e.stopPropagation()}>
        <button className="account-close" onClick={onClose}>×</button>

        <div className="account-header">
          <span className="account-badge">✦ SIGNED IN</span>
          <div className="account-logo">BLAB<sup className="account-logo-tm">™</sup></div>
          
          {isEditing ? (
            <form onSubmit={handleSaveUsername} style={{ marginTop: 12 }}>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center' }}>
                <input 
                  type="text" 
                  className="auth-input" 
                  value={newUsername}
                  onChange={e => setNewUsername(e.target.value.slice(0, 20))}
                  style={{ maxWidth: 220, textAlign: 'center', margin: 0, padding: '8px 12px', fontSize: '1rem' }}
                  disabled={loading}
                  autoFocus
                  required
                />
                <button type="submit" className="btn btn--small" style={{ height: '38px', padding: '0 12px' }} disabled={loading}>
                  {loading ? '...' : 'SAVE'}
                </button>
                <button type="button" className="btn btn--small btn--outline" style={{ height: '38px', padding: '0 12px' }} onClick={() => { setIsEditing(false); setError(null); }} disabled={loading}>
                  ×
                </button>
              </div>
              {error && <p style={{ color: '#cc2b2b', fontSize: 11, fontFamily: 'var(--font-mono)', marginTop: 8, textTransform: 'uppercase', textAlign: 'center' }}>{error}</p>}
            </form>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4 }}>
              <h2 className="account-title" style={{ margin: 0 }}>{currentUsername}</h2>
              <button 
                onClick={() => setIsEditing(true)} 
                style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.5, fontSize: 14, padding: 4 }}
                title="Change username"
              >
                ✏️
              </button>
            </div>
          )}
          <p className="account-email" style={{ marginTop: 6 }}>{email}</p>
        </div>

        <div className="account-divider" />

        <div className="account-rank-section">
          <div className="account-rank-meta">
            <span className="account-rank-label">CURRENT RANK</span>
            <span className="account-rank-name">{rank.name.toUpperCase()}</span>
          </div>
          
          <div className="account-xp-bar-container">
            <div 
              className="account-xp-bar" 
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          
          <div className="account-xp-text">
            <span>{userData.totalXP} XP</span>
            {rank.maxXP !== Infinity && (
              <span>NEXT RANK AT {rank.maxXP + 1} XP</span>
            )}
          </div>
        </div>

        <div className="account-divider" />

        <div className="account-stats-grid">
          <div className="account-stat">
            <div className="account-stat-val">{userData.sessionsPlayed}</div>
            <div className="account-stat-lbl">SESSIONS</div>
          </div>
          
          <div className="account-stat-div" />
          
          <div className="account-stat">
            <div className="account-stat-val">
              {userData.currentStreak} <span className="account-fire">🔥</span>
            </div>
            <div className="account-stat-lbl">DAY STREAK</div>
          </div>
        </div>

        <div className="account-divider" />

        <div className="account-actions">
          <button className="btn btn--primary btn--small" onClick={onSignOut} style={{ width: '100%' }}>
            SIGN OUT OF ACCOUNT
          </button>
        </div>
      </div>
    </div>
  )
}
