import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getRank, getRankProgress } from '../utils/storage'
import './Landing.css'

const FILLER_ANNOTATIONS = [
  { text: 'uhh...', label: 'FILLER DETECTED', top: '22%', left: '16%' },
  { text: 'like...', label: 'FILLER DETECTED', top: '48%', left: '12%' },
  { text: 'hmm...', label: 'FILLER DETECTED', bottom: '22%', left: '24%' },
  { text: 'let me think...', label: 'LONG PAUSE', top: '18%', right: '14%' },
  { text: 'actually...', label: 'FILLER DETECTED', top: '38%', right: '6%' },
  { text: 'I mean...', label: 'FILLER DETECTED', bottom: '42%', right: '8%' },
  { text: 'you hesitated too long.', label: 'TOO MUCH HESITATION', bottom: '18%', right: '14%' },
]

const MOBILE_ANNOTATIONS = [
  { text: 'uhh...', label: 'FILLER', top: '8%', left: '2%' },
  { text: 'like...', label: 'FILLER', bottom: '8%', left: '2%' },
  { text: 'hmm...', label: 'PAUSE', top: '8%', right: '2%' },
  { text: 'I mean...', label: 'FILLER', bottom: '8%', right: '2%' },
]

const TICKER_ITEMS = [
  'Thought faster than you spoke.',
  'You used 6 filler words.',
  'Confidence dropped.',
  'Pauses were longer than usual.',
  'Grammar was solid but delivery lacked punch.',
  'You repeated yourself 3 times.',
  'Vocabulary was too basic for your level.',
]

export default function Landing({ userData, onStart }) {
  const navigate = useNavigate()
  const hasPlayed = userData.sessionsPlayed > 0
  const rank = getRank(userData.totalXP)
  const progress = getRankProgress(userData.totalXP)
  const lastScore = userData.sessionHistory?.[0]?.score ?? 0
  const streak = userData.currentStreak || 0
  const [visibleAnnotations, setVisibleAnnotations] = useState([])
  const waveRef = useRef(null)

  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 900)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Compute actual average fluency score
  const avgScore = userData.sessionHistory && userData.sessionHistory.length > 0
    ? Math.round(userData.sessionHistory.reduce((acc, s) => acc + s.score, 0) / userData.sessionHistory.length)
    : null

  // Stagger annotation appearance
  useEffect(() => {
    const items = isMobile ? MOBILE_ANNOTATIONS : FILLER_ANNOTATIONS
    setVisibleAnnotations([])
    items.forEach((_, i) => {
      setTimeout(() => {
        setVisibleAnnotations(prev => [...prev, i])
      }, 800 + i * 300)
    })
  }, [isMobile])

  // Draw waveform
  useEffect(() => {
    const canvas = waveRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    const w = canvas.offsetWidth
    const h = canvas.offsetHeight
    canvas.width = w * dpr
    canvas.height = h * dpr
    ctx.scale(dpr, dpr)

    ctx.strokeStyle = '#b8a99a'
    ctx.lineWidth = 1.2
    ctx.beginPath()
    for (let x = 0; x < w; x++) {
      const amp = Math.sin(x * 0.03) * 8 + Math.sin(x * 0.07) * 5 + Math.sin(x * 0.15) * 3 + (Math.random() - 0.5) * 4
      const y = h / 2 + amp
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    }
    ctx.stroke()
  }, [])

  return (
    <div className="landing-page">
      {/* GlobalNav handled in App.jsx */}

      {/* HERO */}
      <main className="lp-hero">
        <div className="lp-hero__left">
          <span className="lp-hero__badge">✦ AI SPEAKING COACH</span>
          <h1 className="lp-hero__title">
            YOU KNOW IT.<br />
            YOUR MOUTH<br />
            <em className="lp-hero__title-accent">doesn't.</em>
          </h1>
          <p className="lp-hero__sub">
            Random topics. Real pressure.<br />
            AI feedback that's brutally honest.
          </p>
          <button className="lp-hero__enter" onClick={onStart}>
            BEGIN SPEAKING <span className="lp-hero__enter-arrow">→</span>
          </button>
        </div>

        <div className="lp-hero__right">
          {/* Waveform behind tongue */}
          <canvas ref={waveRef} className="lp-hero__waveform" />

          {/* Tongue illustration */}
          <div className="lp-hero__tongue-wrap">
            <img src="/images/tongue.png" alt="" className="lp-hero__tongue" />
          </div>

          {/* Floating filler annotations */}
          {(isMobile ? MOBILE_ANNOTATIONS : FILLER_ANNOTATIONS).map((a, i) => (
            <div
              key={i}
              className={`lp-annotation ${visibleAnnotations.includes(i) ? 'lp-annotation--visible' : ''}`}
              style={{ top: a.top, left: a.left, right: a.right, bottom: a.bottom }}
            >
              <span className="lp-annotation__text">{a.text}</span>
              <span className="lp-annotation__label">{a.label}</span>
              <span className="lp-annotation__plus">+</span>
            </div>
          ))}

          {/* Dashed orbit ring */}
          <div className="lp-hero__orbit" />
        </div>
      </main>

      {/* STATS BAR */}
      <section className="lp-stats">
        <div className="lp-stats__item">
          <div className="lp-stats__value">
            <span className="lp-stats__big">{hasPlayed ? lastScore : '--'}</span>
            {hasPlayed && <span className="lp-stats__small"> /100</span>}
          </div>
          <div className="lp-stats__meta">
            <span className="lp-stats__label">CURRENT SCORE</span>
            <span className="lp-stats__sub-label">
              {hasPlayed ? (lastScore <= 40 ? 'KEEP GOING' : lastScore <= 65 ? 'NOT BAD' : 'SOLID') : 'PLAY A SESSION'}
            </span>
          </div>
        </div>

        <div className="lp-stats__divider" />

        <div className="lp-stats__item">
          <div className="lp-stats__value">
            <span className="lp-stats__big">{streak}</span>
            <span className="lp-stats__fire">🔥</span>
          </div>
          <div className="lp-stats__meta">
            <span className="lp-stats__label">DAY STREAK</span>
            <span className="lp-stats__sub-label">
              {streak >= 7 ? 'ON FIRE' : streak >= 3 ? 'NICE CONSISTENCY' : streak >= 1 ? 'KEEP IT UP' : 'START A STREAK'}
            </span>
          </div>
        </div>

        <div className="lp-stats__divider" />

        <div className="lp-stats__item">
          <div className="lp-stats__value">
            <span className="lp-stats__wave-icon">⎍⎎⎍</span>
            <span className="lp-stats__big">{avgScore !== null ? avgScore : '--'}</span>
            {avgScore !== null && <span className="lp-stats__percent">%</span>}
          </div>
          <div className="lp-stats__meta">
            <span className="lp-stats__label">{isMobile ? 'FLUENCY' : 'FLUENCY UNDER PRESSURE'}</span>
            <span className="lp-stats__sub-label">
              {avgScore !== null ? (avgScore >= 80 ? 'EXCELLENT' : avgScore >= 60 ? 'GOOD CONTROL' : avgScore >= 40 ? 'STEADY' : 'NEEDS WORK') : 'NO SESSIONS'}
            </span>
          </div>
        </div>

      </section>

      {/* LIVE FEEDBACK TICKER */}
      <footer className="lp-ticker">
        <div className="lp-ticker__label-wrap">
          <span className="lp-ticker__icon">⎍⎎⎍⎎</span>
          <span className="lp-ticker__label">LIVE FEEDBACK</span>
        </div>
        <div className="lp-ticker__track">
          <div className="lp-ticker__scroll">
            {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
              <span key={i} className="lp-ticker__item">
                {item}
                <span className="lp-ticker__dot">•</span>
              </span>
            ))}
          </div>
        </div>
        <button className="lp-ticker__arrow" onClick={onStart}>→</button>
      </footer>
    </div>
  )
}
