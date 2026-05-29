import { useEffect } from 'react'

export default function RankUpOverlay({ rankName }) {
  return (
    <div className="rankup-overlay">
      <span className="rankup-overlay__label">Rank Up</span>
      <span className="rankup-overlay__rank">{rankName}</span>
    </div>
  )
}
