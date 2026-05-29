import { useRef, useCallback } from 'react'
import html2canvas from 'html2canvas'

export default function ShareCard({ topic, score, coachLine, rank, onClose }) {
  const cardRef = useRef(null)

  const scoreColor = score <= 40 ? '#ff3b3b' : score <= 65 ? '#ff9500' : '#00ff88'

  const handleCopy = useCallback(async () => {
    if (!cardRef.current) return
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#0a0a0a',
        scale: 2,
      })
      canvas.toBlob(async (blob) => {
        if (blob) {
          try {
            await navigator.clipboard.write([
              new ClipboardItem({ 'image/png': blob })
            ])
            alert('Copied to clipboard!')
          } catch {
            // Fallback: download
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = 'blab-score.png'
            a.click()
            URL.revokeObjectURL(url)
          }
        }
      }, 'image/png')
    } catch (err) {
      console.error('Share failed:', err)
    }
  }, [])

  return (
    <div className="share-overlay" onClick={onClose}>
      <div
        ref={cardRef}
        className="share-card"
        onClick={e => e.stopPropagation()}
      >
        <div className="share-card__header">
          <span className="share-card__logo">BLAB</span>
        </div>

        <div className="share-card__body">
          <p className="share-card__topic">{topic}</p>
          <div className="share-card__score" style={{ color: scoreColor }}>
            {score}
          </div>
          <p className="share-card__coach-line">"{coachLine}"</p>
          <span className="share-card__rank">{rank}</span>
        </div>

        <div className="share-card__footer">
          <span className="share-card__url">blab.app</span>
        </div>
      </div>

      <div className="share-overlay__actions">
        <button className="btn btn--primary btn--small" onClick={handleCopy}>
          Copy as Image
        </button>
        <button className="btn btn--ghost btn--small" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  )
}
