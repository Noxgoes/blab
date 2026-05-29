import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../utils/supabase'

const LANGUAGES = ['Spanish', 'French', 'German', 'Japanese', 'Mandarin', 'Arabic', 'Portuguese', 'Italian', 'Hindi', 'English']
const TYPES = ['Rambler', 'Freezer', 'Rusher', 'Pretender', 'Sparker', 'Ghost Speaker', 'Mumbler', 'Smooth Talker']

export default function Leaderboard({ onStart, feedbackData, user }) {
  const navigate = useNavigate()
  const [filter, setFilter] = useState('ALL TIME')
  const [selectedLanguage, setSelectedLanguage] = useState('Spanish')
  const [selectedType, setSelectedType] = useState('Sparker')
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [stats, setStats] = useState({ total: 0, highest: 0, commonType: '—' })

  const deviceId = localStorage.getItem('blabDeviceId')
  const authDeviceId = user ? `auth:${user.id}` : null
  const [myEntry, setMyEntry] = useState(null)
  const listRef = useRef(null)

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      let query = supabase.from('leaderboard').select('*')
      if (filter === 'ALL TIME') query = query.order('score', { ascending: false }).limit(50)
      else if (filter === 'THIS WEEK') {
        const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7)
        query = query.gte('created_at', weekAgo.toISOString()).order('score', { ascending: false }).limit(50)
      }
      else if (filter === 'BY LANGUAGE') query = query.ilike('language', `%${selectedLanguage}%`).order('score', { ascending: false }).limit(50)
      else if (filter === 'BY TYPE') query = query.ilike('speaker_type', `%${selectedType}%`).order('score', { ascending: false }).limit(50)

      const { data, error: err } = await query
      if (err) throw err
      
      const rows = data || []
      setSessions(rows)

      // ── STEP 8: FIND MY ENTRY ───────────────────────────────────────
      const found = rows.find(e => e.device_id === authDeviceId || e.device_id === deviceId)
      if (found) {
        const rank = rows.indexOf(found) + 1
        setMyEntry({ ...found, rank })
        // Scroll after 1s
        setTimeout(() => {
          const el = document.querySelector('.ldb__row--me')
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }, 1000)
      }
    } catch (err) { setError('Connection lost. Try again.') }
    finally { setLoading(false) }
  }, [filter, selectedLanguage, selectedType, deviceId, authDeviceId])

  useEffect(() => {
    fetchLeaderboard()
  }, [fetchLeaderboard])

  useEffect(() => {
    async function fetchStats() {
      try {
        const { data, error } = await supabase.from('leaderboard').select('score, speaker_type')
        if (error || !data) return
        const total = data.length
        const highest = data.length > 0 ? Math.max(...data.map(d => d.score || 0)) : 0
        const typeCounts = {}
        let maxCount = 0, commonType = '—'
        data.forEach(d => {
          const t = d.speaker_type || 'Mumbler'
          typeCounts[t] = (typeCounts[t] || 0) + 1
          if (typeCounts[t] > maxCount) { maxCount = typeCounts[t]; commonType = t }
        })
        setStats({ total, highest, commonType })
      } catch (err) { console.error(err) }
    }
    fetchStats()
  }, [])

  return (
    <div className="ldb">
      <button className="ldb__back" onClick={() => navigate('/')}>← BACK TO LANDING</button>

      <div className="ldb__header">
        <div className="ldb__title-area">
          <div className="ldb__logo">BLAB<sup className="ldb__tm">™</sup></div>
          <h1 className="ldb__title">The Board.</h1>
        </div>

        <div className="ldb__filter-group">
          {['ALL TIME', 'THIS WEEK', 'BY LANGUAGE', 'BY TYPE'].map(f => (
            <button key={f} className={`ldb__pill ${filter === f ? 'ldb__pill--active' : ''}`} onClick={() => setFilter(f)}>{f}</button>
          ))}
        </div>
      </div>

      {/* YOUR BEST STRIP (Requirement Step 8) */}
      {myEntry && (
        <div className="ldb__my-strip">
          <div className="ldb__my-strip-left">
            <span className="ldb__my-label">YOUR BEST</span>
            <span className="ldb__my-score">{myEntry.score}</span>
            <span className="ldb__my-rank">· Rank #{myEntry.rank} overall</span>
          </div>
          <div className="ldb__my-strip-right">
            <span>{(myEntry.speaker_type || 'Mumbler').toUpperCase()}</span>
            <span className="ldb__my-dot">•</span>
            <span>{(myEntry.language || 'English').toUpperCase()}</span>
          </div>
        </div>
      )}

      {filter === 'BY LANGUAGE' && (
        <div className="ldb__sub-filters">
          {LANGUAGES.map(lang => (
            <button key={lang} className={`ldb__pill ldb__pill--sub ${selectedLanguage === lang ? 'ldb__pill--active' : ''}`} onClick={() => setSelectedLanguage(lang)}>{lang.toUpperCase()}</button>
          ))}
        </div>
      )}

      {filter === 'BY TYPE' && (
        <div className="ldb__sub-filters">
          {TYPES.map(t => (
            <button key={t} className={`ldb__pill ldb__pill--sub ${selectedType === t ? 'ldb__pill--active' : ''}`} onClick={() => setSelectedType(t)}>{t.toUpperCase()}</button>
          ))}
        </div>
      )}

      <div className="ldb__stats-bar">
        <div className="ldb__stat"><div className="ldb__stat-val">{stats.total}</div><div className="ldb__stat-lbl">TOTAL SESSIONS</div></div>
        <div className="ldb__stat-div" /><div className="ldb__stat"><div className="ldb__stat-val">{stats.highest}</div><div className="ldb__stat-lbl">HIGHEST SCORE</div></div>
        <div className="ldb__stat-div" /><div className="ldb__stat"><div className="ldb__stat-val">{stats.commonType.toUpperCase()}</div><div className="ldb__stat-lbl">COMMON TYPE</div></div>
      </div>

      <div className="ldb__table" ref={listRef}>
        {error ? (
          <div className="ldb__state ldb__state--error"><p className="ldb__err-msg">{error}</p><button className="ldb__retry-btn" onClick={fetchLeaderboard}>RETRY</button></div>
        ) : loading ? (
          <div className="ldb__loading-list"><div className="ldb__loading-pulse" /><div className="ldb__loading-pulse" style={{ animationDelay: '0.1s' }} /><div className="ldb__loading-pulse" style={{ animationDelay: '0.2s' }} /></div>
        ) : sessions.length === 0 ? (
          <div className="ldb__state"><p className="ldb__empty-msg">No one here yet.</p></div>
        ) : (
          <div className="ldb__rows">
            {sessions.slice(0, 3).map((s, idx) => (
              <div key={s.id || idx} className={`ldb__row-top ldb__row-top--${idx+1} ${s.device_id === deviceId ? 'ldb__row--me' : ''}`}>
                <div className="ldb__top-rank">#{idx+1}</div>
                <div className="ldb__top-user">
                  {s.username || 'Anonymous'}
                  {s.previous_score && s.score > s.previous_score && (
                    <span className="ldb__improvement">↑ {s.score - s.previous_score}</span>
                  )}
                </div>
                <div className="ldb__top-badge">{(s.speaker_type || 'MUMBLER').toUpperCase()}</div>
                <div className="ldb__top-lang">{(s.language || 'EN').toUpperCase()}</div>
                <div className="ldb__top-score">{s.score || 0}</div>
              </div>
            ))}
            {sessions.slice(3).map((s, idx) => (
              <div key={s.id || idx} className={`ldb__row-compact ${s.device_id === deviceId ? 'ldb__row--me' : ''}`}>
                <div className="ldb__comp-rank">#{idx+4}</div>
                <div className="ldb__comp-user">
                  {s.username || 'Anonymous'}
                  {s.previous_score && s.score > s.previous_score && (
                    <span className="ldb__improvement">↑ {s.score - s.previous_score}</span>
                  )}
                </div>
                <div className="ldb__comp-type">{(s.speaker_type || 'MUMBLER').toUpperCase()}</div>
                <div className="ldb__comp-score">{s.score || 0}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Session Check (Edge Case 5) */}
      {!feedbackData && (
        <div className="ldb__no-session">
          <p className="ldb__no-session-text">Complete a session to add your score.</p>
          <button className="ldb__no-session-btn" onClick={onStart}>SPEAK NOW →</button>
        </div>
      )}
    </div>
  )
}
