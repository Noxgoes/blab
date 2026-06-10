import { useEffect, useRef, useState, useCallback } from 'react'

const STAR_COUNT = 1200
const SEARCH_DURATION = 2000
const ZOOM_DURATION = 1500

export default function TopicGeneration({ language, level, mode, topic, onReady }) {
  const canvasRef = useRef(null)
  const starsRef = useRef([])
  const phaseRef = useRef('search')
  const chosenRef = useRef(null)
  const startTimeRef = useRef(Date.now())
  const animIdRef = useRef(null)
  
  const [countdown, setCountdown] = useState(5)
  const [phase, setPhase] = useState('search')
  
  // Mic & Deepgram initialization state (Edge Case 8)
  const [micState, setMicState] = useState('initializing') // initializing | ready | denied | error
  const [showMicError, setShowMicError] = useState(false)

  // ── CANVAS ANIMATION ───────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1

    function resize() {
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      ctx.scale(dpr, dpr)
      canvas.style.width = window.innerWidth + 'px'
      canvas.style.height = window.innerHeight + 'px'
    }
    resize()
    window.addEventListener('resize', resize)

    const stars = []
    for (let i = 0; i < STAR_COUNT; i++) {
      stars.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        r: Math.random() * 1.5 + 0.5,
        brightness: Math.random() * 0.3 + 0.1,
        flickerSpeed: Math.random() * 0.02 + 0.005,
        flickerOffset: Math.random() * Math.PI * 2,
      })
    }
    starsRef.current = stars

    const cx = window.innerWidth / 2
    const cy = window.innerHeight / 2
    let closest = stars[0], closestDist = Infinity
    stars.forEach(s => {
      const d = Math.hypot(s.x - cx, s.y - cy)
      if (d < closestDist && d > 50) { closest = s; closestDist = d }
    })
    chosenRef.current = closest
    startTimeRef.current = Date.now()

    function animate() {
      const w = window.innerWidth
      const h = window.innerHeight
      ctx.clearRect(0, 0, w, h)
      const elapsed = Date.now() - startTimeRef.current
      const p = phaseRef.current

      if (p === 'search' && elapsed > SEARCH_DURATION) {
        phaseRef.current = 'zoom'
        startTimeRef.current = Date.now()
      }
      if (p === 'zoom' && (Date.now() - startTimeRef.current) > ZOOM_DURATION) {
        phaseRef.current = 'reveal'
        setPhase('reveal')
        return
      }

      const zoomElapsed = p === 'zoom' ? Date.now() - startTimeRef.current : 0
      const zoomT = Math.min(zoomElapsed / ZOOM_DURATION, 1)
      const easeT = zoomT * zoomT * (3 - 2 * zoomT)

      let scale = 1
      if (p === 'zoom' && chosenRef.current) {
        scale = 1 + easeT * 15
      }

      ctx.save()
      if (p === 'zoom' && chosenRef.current) {
        const focusX = w / 2 + (chosenRef.current.x - w / 2) * easeT
        const focusY = h / 2 + (chosenRef.current.y - h / 2) * easeT
        ctx.translate(w / 2, h / 2)
        ctx.scale(scale, scale)
        ctx.translate(-focusX, -focusY)
      }

      const now = Date.now() / 1000
      stars.forEach(s => {
        let b = s.brightness + Math.sin(now * s.flickerSpeed * 60 + s.flickerOffset) * 0.15
        if (p === 'search' && Math.random() < 0.003) b = 1
        if (s === chosenRef.current && (p === 'zoom' || (p === 'search' && elapsed > SEARCH_DURATION * 0.8))) {
          b = 1
          ctx.shadowBlur = 20 + Math.sin(now * 4) * 10
          ctx.shadowColor = '#c41e1e'
        } else { ctx.shadowBlur = 0 }
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(26, 26, 26, ${Math.max(0, Math.min(1, b))})`
        ctx.fill()
        ctx.shadowBlur = 0
      })
      ctx.restore()

      // Draw screen-space overlay elements (Reticle, Scanning Lines)
      if (p !== 'reveal') {
        const timeSec = Date.now() / 1000
        ctx.save()
        
        // 1. Horizontal scanline sweeping down
        const scanY = ((Date.now() % 3000) / 3000) * h
        ctx.beginPath()
        ctx.moveTo(0, scanY)
        ctx.lineTo(w, scanY)
        ctx.strokeStyle = 'rgba(196, 30, 30, 0.12)'
        ctx.lineWidth = 1.5
        ctx.stroke()
        
        // 2. High-tech reticle at the center of screen (w / 2, h / 2)
        const cx = w / 2
        const cy = h / 2
        
        // Pulse scale
        let reticleScale = 1
        if (p === 'zoom') {
          reticleScale = 1.5 - easeT * 0.5
        } else {
          reticleScale = 1.0 + Math.sin(timeSec * 4) * 0.05
        }
        
        ctx.translate(cx, cy)
        ctx.scale(reticleScale, reticleScale)
        
        // Rotating outer dashed circle
        ctx.beginPath()
        ctx.arc(0, 0, 45, 0, Math.PI * 2)
        ctx.strokeStyle = p === 'zoom' ? '#c41e1e' : 'rgba(26, 26, 26, 0.2)'
        ctx.lineWidth = 1.5
        ctx.setLineDash([6, 12])
        ctx.rotate(timeSec * (p === 'zoom' ? 1.5 : 0.4))
        ctx.stroke()
        ctx.setLineDash([]) // Reset
        
        // Stationary target brackets (four corners)
        const bracketSize = 10
        const bracketDist = 55
        ctx.rotate(-timeSec * (p === 'zoom' ? 1.5 : 0.4)) // counter-rotate
        
        ctx.strokeStyle = '#c41e1e'
        ctx.lineWidth = 2
        
        // Top-left bracket
        ctx.beginPath()
        ctx.moveTo(-bracketDist + bracketSize, -bracketDist)
        ctx.lineTo(-bracketDist, -bracketDist)
        ctx.lineTo(-bracketDist, -bracketDist + bracketSize)
        ctx.stroke()
        
        // Top-right bracket
        ctx.beginPath()
        ctx.moveTo(bracketDist - bracketSize, -bracketDist)
        ctx.lineTo(bracketDist, -bracketDist)
        ctx.lineTo(bracketDist, -bracketDist + bracketSize)
        ctx.stroke()
        
        // Bottom-left bracket
        ctx.beginPath()
        ctx.moveTo(-bracketDist + bracketSize, bracketDist)
        ctx.lineTo(-bracketDist, bracketDist)
        ctx.lineTo(-bracketDist, bracketDist - bracketSize)
        ctx.stroke()
        
        // Bottom-right bracket
        ctx.beginPath()
        ctx.moveTo(bracketDist - bracketSize, bracketDist)
        ctx.lineTo(bracketDist, bracketDist)
        ctx.lineTo(bracketDist, bracketDist - bracketSize)
        ctx.stroke()
        
        // Center crosshair (tiny dot and four tick marks)
        ctx.beginPath()
        ctx.arc(0, 0, 2, 0, Math.PI * 2)
        ctx.fillStyle = '#c41e1e'
        ctx.fill()
        
        ctx.strokeStyle = 'rgba(196, 30, 30, 0.6)'
        ctx.lineWidth = 1
        
        ctx.beginPath()
        ctx.moveTo(-15, 0); ctx.lineTo(-8, 0)
        ctx.moveTo(15, 0); ctx.lineTo(8, 0)
        ctx.moveTo(0, -15); ctx.lineTo(0, -8)
        ctx.moveTo(0, 15); ctx.lineTo(0, 8)
        ctx.stroke()
        
        ctx.restore()
      }

      animIdRef.current = requestAnimationFrame(animate)
    }
    animIdRef.current = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(animIdRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [])

  // ── MIC INITIALIZATION (Edge Case 2 & 8) ───────────────────────────
  const initMic = useCallback(async () => {
    setMicState('initializing')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      // Keep stream for a moment to verify it works, then stop tracks for now
      // The Recording screen will re-request its own stream
      stream.getTracks().forEach(t => t.stop())
      setMicState('ready')
    } catch (err) {
      console.error('Mic Access Denied:', err)
      setMicState('denied')
      setShowMicError(true)
    }
  }, [])

  useEffect(() => {
    initMic()
  }, [initMic])

  // ── COUNTDOWN LOGIC (Edge Case 8) ──────────────────────────────────
  useEffect(() => {
    if (phase !== 'reveal' || !topic || micState === 'denied') return
    
    if (countdown <= 0) {
      if (micState === 'ready') {
        onReady(topic)
      } else {
        // If countdown hit 0 but mic isn't ready, show error (Edge Case 8)
        setShowMicError(true)
      }
      return
    }
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [phase, countdown, topic, onReady, micState])

  const handleRetryMic = () => {
    setShowMicError(false)
    setCountdown(5)
    initMic()
  }

  return (
    <div className="screen topic-screen">
      <canvas ref={canvasRef} />
      
      {phase !== 'reveal' && (
        <div className="topic__pre-reveal">
          <div className="topic__status-text">
            {phase === 'search' ? (
              mode === 'nightmare' ? 'DIALING UP CHAOS...' : 'CHOOSING A PROMPT...'
            ) : (
              'TOPIC LOCKED'
            )}
          </div>
          <div className="topic__sub-status">
            {phase === 'search' ? (
              mode === 'nightmare' ? 'BRACING FOR ABSURDITY' : 'PREPARING YOUR SPEAKER CHALLENGE'
            ) : (
              'PREPARE TO SPEAK'
            )}
          </div>
        </div>
      )}

      {phase === 'reveal' && topic && !showMicError && (
        <div className="topic__content">
          <div className="topic__text">
            {topic.includes('\n') ? (
              <>
                <span className="topic__text-main">{topic.split('\n')[0]}</span>
                <span className="topic__text-sub">{topic.split('\n')[1]}</span>
              </>
            ) : (
              <span className="topic__text-main">{topic}</span>
            )}
          </div>
          <p className="topic__countdown">You have {countdown} seconds to think.</p>
          <div className="topic__timer-circle">
            <svg className="topic__timer-svg" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" className="topic__timer-track" />
              <circle cx="50" cy="50" r="40" className="topic__timer-bar" style={{
                strokeDasharray: 251.2,
                strokeDashoffset: 251.2 - (251.2 * countdown) / 5
              }} />
            </svg>
            <span className="topic__countdown-number">{countdown}</span>
          </div>
        </div>
      )}

      {/* Mic Permission/Error Overlay (Edge Case 2 & 8) */}
      {showMicError && (
        <div className="mic-error-overlay">
          <div className="mic-error-content">
            <h2 className="mic-error-title">
              {micState === 'denied' ? "BLAB needs your microphone." : "Microphone not ready."}
            </h2>
            <p className="mic-error-sub">
              {micState === 'denied' 
                ? "Allow microphone access in your browser settings, then try again." 
                : "Check your connection and try again."}
            </p>
            <button className="mic-error-btn" onClick={handleRetryMic}>TRY AGAIN</button>
          </div>
        </div>
      )}
    </div>
  )
}
