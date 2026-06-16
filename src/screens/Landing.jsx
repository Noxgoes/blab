import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getRank, getRankProgress } from '../utils/storage'
import './Landing.css'

const FILLER_WORDS = [
  { text: 'uhh...', label: 'FILLER DETECTED' },
  { text: 'like...', label: 'FILLER DETECTED' },
  { text: 'hmm...', label: 'FILLER DETECTED' },
  { text: 'let me think...', label: 'LONG PAUSE' },
  { text: 'actually...', label: 'FILLER DETECTED' },
  { text: 'I mean...', label: 'FILLER DETECTED' },
  { text: 'you hesitated too long.', label: 'TOO MUCH HESITATION' },
]

const MOBILE_WORDS = [
  { text: 'uhh...', label: 'FILLER' },
  { text: 'like...', label: 'FILLER' },
  { text: 'hmm...', label: 'PAUSE' },
  { text: 'I mean...', label: 'FILLER' },
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
  const waveRef = useRef(null)
  const orbitRef = useRef(null)
  const rafRef = useRef(null)
  const angleRef = useRef(0)           // current global orbit angle (radians)
  const draggingRef = useRef(null)     // { index, startX, startY, origAngle }

  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 900)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const words = isMobile ? MOBILE_WORDS : FILLER_WORDS
  const count = words.length

  // Per-annotation state: angle offset from orbit, and free drag offset
  // Always allocate 7 (desktop max) — mobile just uses the first 4
  const annState = useRef(
    Array.from({ length: 7 }, (_, i) => ({
      angleOffset: (2 * Math.PI * i) / 7,   // evenly spaced
      dragX: 0,
      dragY: 0,
      isDragging: false,
      isDetached: false,                     // true when user has dragged it off orbit
    }))
  )

  // Visible (faded-in) state
  const [visibleSet, setVisibleSet] = useState(new Set())
  useEffect(() => {
    const ids = []
    words.forEach((_, i) => {
      ids.push(setTimeout(() => setVisibleSet(prev => new Set([...prev, i])), 600 + i * 200))
    })
    return () => ids.forEach(clearTimeout)
  }, [isMobile])

  // Compute actual average fluency score
  const avgScore = userData.sessionHistory && userData.sessionHistory.length > 0
    ? Math.round(userData.sessionHistory.reduce((acc, s) => acc + s.score, 0) / userData.sessionHistory.length)
    : null

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

  // Orbit animation loop
  useEffect(() => {
    const SPEED = 0.003   // radians per frame
    const tick = () => {
      if (!orbitRef.current) { rafRef.current = requestAnimationFrame(tick); return }
      const container = orbitRef.current
      const rect = container.getBoundingClientRect()
      const cx = rect.width / 2
      const cy = rect.height / 2
      const R = Math.min(cx, cy) * 0.88  // orbit radius relative to container

      if (!draggingRef.current) {
        angleRef.current += SPEED
      }

      const currentCount = container.dataset.count ? parseInt(container.dataset.count) : 7
      const nodes = container.querySelectorAll('.lp-ann')
      nodes.forEach((node, i) => {
        const state = annState.current[i]
        if (!state) return

        if (state.isDragging || state.isDetached) {
          // keep at drag position, just update transform
          node.style.transform = `translate(${state.dragX}px, ${state.dragY}px)`
          node.style.left = ''
          node.style.top = ''
        } else {
          const a = angleRef.current + state.angleOffset
          const x = cx + Math.cos(a) * R
          const y = cy + Math.sin(a) * R
          // Offset so the label is centered on the point
          node.style.left = (x) + 'px'
          node.style.top = (y) + 'px'
          node.style.transform = 'translate(-50%, -50%)'
        }
      })

      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  // Pointer events for dragging
  const handlePointerDown = useCallback((e, i) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    const node = e.currentTarget
    const rect = orbitRef.current.getBoundingClientRect()
    annState.current[i].isDragging = true
    annState.current[i].isDetached = true
    // Capture current pixel position so drag starts from there
    const nodeRect = node.getBoundingClientRect()
    annState.current[i].dragX = nodeRect.left - rect.left + nodeRect.width / 2
    annState.current[i].dragY = nodeRect.top - rect.top + nodeRect.height / 2
    draggingRef.current = { index: i, startPX: e.clientX, startPY: e.clientY,
      origDragX: annState.current[i].dragX, origDragY: annState.current[i].dragY }
    node.style.cursor = 'grabbing'
    node.style.zIndex = 20
  }, [])

  const handlePointerMove = useCallback((e, i) => {
    if (!annState.current[i].isDragging) return
    const d = draggingRef.current
    if (!d || d.index !== i) return
    annState.current[i].dragX = d.origDragX + (e.clientX - d.startPX)
    annState.current[i].dragY = d.origDragY + (e.clientY - d.startPY)
  }, [])

  const handlePointerUp = useCallback((e, i) => {
    annState.current[i].isDragging = false
    draggingRef.current = null
    const node = e.currentTarget
    node.style.cursor = 'grab'
    node.style.zIndex = 5

    // Snap back to orbit if released close to center
    const container = orbitRef.current
    const rect = container.getBoundingClientRect()
    const cx = rect.width / 2
    const cy = rect.height / 2
    const R = Math.min(cx, cy) * 0.88
    const dx = annState.current[i].dragX - cx
    const dy = annState.current[i].dragY - cy
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist < R * 0.5) {
      // close to center → snap back to orbit
      annState.current[i].isDetached = false
      annState.current[i].angleOffset = Math.atan2(dy, dx) - angleRef.current
    }
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
            Random topics. Real pressure. 60 seconds. Brutally honest AI feedback.
          </p>
          <button className="lp-hero__enter" onClick={onStart}>
            BEGIN SPEAKING <span className="lp-hero__enter-arrow">→</span>
          </button>
        </div>

        <div className="lp-hero__right" ref={orbitRef} data-count={words.length}>
          {/* Waveform behind tongue */}
          <canvas ref={waveRef} className="lp-hero__waveform" />

          {/* Tongue illustration */}
          <div className="lp-hero__tongue-wrap">
            <img src="/images/tongue.png" alt="" className="lp-hero__tongue" />
          </div>

          {/* Orbit-aligned draggable filler annotations */}
          {words.map((w, i) => (
            <div
              key={i}
              className={`lp-ann ${visibleSet.has(i) ? 'lp-ann--visible' : ''}`}
              style={{ position: 'absolute', cursor: 'grab', userSelect: 'none', zIndex: 5 }}
              onPointerDown={e => handlePointerDown(e, i)}
              onPointerMove={e => handlePointerMove(e, i)}
              onPointerUp={e => handlePointerUp(e, i)}
            >
              <span className="lp-annotation__text">{w.text}</span>
              <span className="lp-annotation__label">{w.label}</span>
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
