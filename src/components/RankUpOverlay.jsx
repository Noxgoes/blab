import { useEffect, useRef } from 'react'

export default function RankUpOverlay({ rankName }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    let animationFrameId

    // Handle resizing to fill overlay parent
    const resizeCanvas = () => {
      canvas.width = canvas.parentElement.clientWidth
      canvas.height = canvas.parentElement.clientHeight
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    // Confetti particles definition matching brand colors
    const colors = [
      '#cc2b2b', // Brand Red
      '#d97008', // Brand Orange/Gold
      '#1a1a1a', // Brand Dark
      '#888888', // Slate Grey
      '#e5dfd3'  // Cream Accent
    ]

    const particles = []
    const particleCount = 140

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * -canvas.height - 20, // Start staggered above the screen
        r: Math.random() * 4 + 4, // size radius for circles
        w: Math.random() * 8 + 6,  // width for rectangles
        h: Math.random() * 12 + 8, // height for rectangles
        color: colors[Math.floor(Math.random() * colors.length)],
        vy: Math.random() * 4 + 4, // fall speed
        vx: Math.random() * 2 - 1, // drift speed
        rotation: Math.random() * 360,
        rotationSpeed: Math.random() * 5 - 2.5,
        opacity: Math.random() * 0.4 + 0.6,
        shape: Math.random() > 0.4 ? 'rect' : 'circle' // diverse shapes
      })
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      let activeParticles = 0

      particles.forEach((p) => {
        if (p.y > canvas.height + 20) return // Out of bounds
        activeParticles++

        // Update positions with gravity and wind sway
        p.y += p.vy
        p.x += p.vx + Math.sin(p.y / 25) * 0.6
        p.rotation += p.rotationSpeed

        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate((p.rotation * Math.PI) / 180)
        ctx.globalAlpha = p.opacity
        ctx.fillStyle = p.color

        // Draw shape
        if (p.shape === 'rect') {
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
        } else {
          ctx.beginPath()
          ctx.arc(0, 0, p.r, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.restore()
      })

      if (activeParticles > 0) {
        animationFrameId = requestAnimationFrame(draw)
      }
    }

    draw()

    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener('resize', resizeCanvas)
    }
  }, [])

  return (
    <div className="rankup-overlay" style={{ position: 'fixed', overflow: 'hidden' }}>
      <canvas 
        ref={canvasRef} 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 1
        }} 
      />
      <div style={{ zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', textAlign: 'center' }}>
        <span className="rankup-overlay__label">Rank Up</span>
        <span className="rankup-overlay__rank">{rankName}</span>
      </div>
    </div>
  )
}
