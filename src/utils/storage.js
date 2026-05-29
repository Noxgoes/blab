export const RANKS = [
  { name: 'Mute', minXP: 0, maxXP: 199 },
  { name: 'Mumbler', minXP: 200, maxXP: 499 },
  { name: 'Rambler', minXP: 500, maxXP: 999 },
  { name: 'Smooth Talker', minXP: 1000, maxXP: 1799 },
  { name: 'Ghost Speaker', minXP: 1800, maxXP: Infinity },
]

export function getRank(xp) {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (xp >= RANKS[i].minXP) return RANKS[i]
  }
  return RANKS[0]
}

export function getRankProgress(xp) {
  const rank = getRank(xp)
  const idx = RANKS.indexOf(rank)
  if (idx === RANKS.length - 1) return 1
  const nextRank = RANKS[idx + 1]
  return (xp - rank.minXP) / (nextRank.minXP - rank.minXP)
}

const DEFAULT_DATA = {
  totalXP: 0,
  sessionsPlayed: 0,
  currentStreak: 0,
  lastSessionDate: null,
  sessionHistory: [],
}

export function loadUserData() {
  try {
    const raw = localStorage.getItem('blab_user_data')
    if (raw) return { ...DEFAULT_DATA, ...JSON.parse(raw) }
  } catch {}
  return { ...DEFAULT_DATA }
}

export function saveUserData(data) {
  localStorage.setItem('blab_user_data', JSON.stringify(data))
}

export function checkStreak(data) {
  if (!data.lastSessionDate) return data
  const today = new Date().toISOString().split('T')[0]
  const yesterday = getYesterday()
  if (data.lastSessionDate !== today && data.lastSessionDate !== yesterday) {
    return { ...data, currentStreak: 0 }
  }
  return data
}

function getYesterday() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().split('T')[0]
}
