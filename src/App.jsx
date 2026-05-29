import { useState, useEffect, useCallback, useRef } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import './index.css'
import Landing from './screens/Landing'
import Setup from './screens/Setup'
import TopicGeneration from './screens/TopicGeneration'
import Recording from './screens/Recording'
import Feedback from './screens/Feedback'
import Leaderboard from './screens/Leaderboard'
import About from './screens/About'
import Contact from './screens/Contact'
import RankUpOverlay from './components/RankUpOverlay'
import GlobalNav from './components/GlobalNav'
import { loadUserData, saveUserData, getRank, checkStreak } from './utils/storage'
import { getRandomTopic } from './utils/topics'
import { supabase } from './utils/supabase'
import AuthModal from './components/AuthModal'
import AccountModal from './components/AccountModal'


export default function App() {
  const navigate = useNavigate()
  const location = useLocation()
  
  useEffect(() => {
    window.scrollTo(0, 0)
    // ── DEVICE FINGERPRINT (Requirement Step 1) ──────────────────────
    const getOrCreateDeviceId = () => {
      const existing = localStorage.getItem('blabDeviceId')
      if (existing) return existing
      const newId = crypto.randomUUID()
      localStorage.setItem('blabDeviceId', newId)
      return newId
    }
    getOrCreateDeviceId()
  }, [location.pathname])

  // ── DYNAMIC TAB TITLES ──────────────────────────────────────────────
  useEffect(() => {
    const titles = {
      '/': 'BLAB — Real ones speak.',
      '/about': 'BLAB — About',
      '/contact': 'BLAB — Contact Us',
      '/setup': 'BLAB — Setup',
      '/topic': 'BLAB — Getting Topic...',
      '/recording': 'BLAB — Recording...',
      '/feedback': 'BLAB — Your Results',
      '/leaderboard': 'BLAB — The Board'
    }
    document.title = titles[location.pathname] || 'BLAB'
  }, [location.pathname])

  const [userData, setUserData] = useState(() => {
    const loaded = loadUserData()
    const checked = checkStreak(loaded)
    if (checked.currentStreak !== loaded.currentStreak) {
      saveUserData(checked)
    }
    return checked
  })
  const [rankUp, setRankUp] = useState(null)

  // ── AUTHENTICATION STATE ───────────────────────────────────────────
  const [user, setUser] = useState(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showAccountModal, setShowAccountModal] = useState(false)

  const mergeSessionHistory = (local, cloud) => {
    const map = {}
    local.forEach(s => {
      const key = `${s.date}_${s.topic}`
      map[key] = s
    })
    cloud.forEach(s => {
      const key = `${s.date}_${s.topic}`
      if (!map[key] || s.score > map[key].score) {
        map[key] = s
      }
    })
    return Object.values(map).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 20)
  }

  const syncUserData = useCallback(async (currentUser) => {
    if (!currentUser) return
    const localData = checkStreak(loadUserData())
    const cloudData = checkStreak(currentUser.user_metadata?.blab_user_data || {})
    
    const merged = {
      totalXP: Math.max(localData.totalXP || 0, cloudData.totalXP || 0),
      sessionsPlayed: Math.max(localData.sessionsPlayed || 0, cloudData.sessionsPlayed || 0),
      currentStreak: Math.max(localData.currentStreak || 0, cloudData.currentStreak || 0),
      lastSessionDate: localData.lastSessionDate || cloudData.lastSessionDate || null,
      sessionHistory: mergeSessionHistory(localData.sessionHistory || [], cloudData.sessionHistory || [])
    }
    
    const checkedMerged = checkStreak(merged)
    
    setUserData(checkedMerged)
    saveUserData(checkedMerged)
    
    await supabase.auth.updateUser({
      data: { blab_user_data: checkedMerged }
    })
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        syncUserData(session.user)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const currentUser = session?.user ?? null
      setUser(currentUser)
      if (event === 'SIGNED_IN' && currentUser) {
        syncUserData(currentUser)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [syncUserData])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    localStorage.removeItem('blabUsername')
    setUserData(loadUserData())
    setShowAccountModal(false)
  }


  // ── SESSION STATE ───────────────────────────────────────────────────
  const [language, setLanguage] = useState('')
  const [level, setLevel] = useState('')
  const [mode, setMode] = useState('normal')
  const [topic, setTopic] = useState('')
  const [transcript, setTranscript] = useState('')
  const [fillerCounts, setFillerCounts] = useState({})
  const [feedbackData, setFeedbackData] = useState(null)

  // ── BROWSER HISTORY / PERSISTENCE ───────────────────────────────────
  useEffect(() => {
    const screenMap = {
      '/': 'LANDING',
      '/about': 'ABOUT',
      '/contact': 'CONTACT',
      '/setup': 'SETUP',
      '/topic': 'TOPIC',
      '/recording': 'RECORDING',
      '/feedback': 'FEEDBACK',
      '/leaderboard': 'LEADERBOARD'
    }
    const currentScreen = screenMap[location.pathname] || 'LANDING'

    // Push state for back button (Requirement)
    window.history.pushState({ screen: currentScreen }, '', '')
  }, [location.pathname])

  // ── POPSTATE LISTENER (Back Button Edge Case 10) ────────────────────
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  
  useEffect(() => {
    const handlePopState = (e) => {
      const screenMap = {
        '/': 'LANDING',
        '/about': 'ABOUT',
        '/setup': 'SETUP',
        '/topic': 'TOPIC',
        '/recording': 'RECORDING',
        '/feedback': 'FEEDBACK',
        '/leaderboard': 'LEADERBOARD'
      }
      const currentScreen = screenMap[location.pathname]

      if (currentScreen === 'RECORDING') {
        // Prevent immediate navigation
        window.history.pushState({ screen: 'RECORDING' }, '', '')
        setShowLeaveConfirm(true)
      } else if (e.state?.screen) {
        // Find path for screen
        const paths = {
          'LANDING': '/',
          'ABOUT': '/about',
          'CONTACT': '/contact',
          'SETUP': '/setup',
          'TOPIC': '/topic',
          'RECORDING': '/recording',
          'FEEDBACK': '/feedback',
          'LEADERBOARD': '/leaderboard'
        }
        if (paths[e.state.screen]) navigate(paths[e.state.screen])
      }
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [location.pathname, navigate])



  // ── LOGIC HANDLERS ──────────────────────────────────────────────────
  const handleStart = useCallback(() => {
    navigate('/setup')
  }, [navigate])

  const handleSetupDone = useCallback(async () => {
    if (!language || !level || !mode) return // Guard (Requirement)
    try {
      const generatedTopic = getRandomTopic(mode, level)
      let finalTopic = generatedTopic
      if (language.toLowerCase() !== 'english') {
        try {
          const res = await fetch("http://localhost:3002/translate-topic", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ topic: generatedTopic, language })
          })
          if (res.ok) {
            const { translatedTopic } = await res.json()
            if (translatedTopic && translatedTopic !== generatedTopic) {
              finalTopic = `${translatedTopic}\n(${generatedTopic})`
            }
          }
        } catch (e) {
          console.error("Translation error:", e)
        }
      }
      setTopic(finalTopic)
      navigate('/topic')
    } catch (err) {
      console.error('Topic selection failed:', err)
    }
  }, [language, level, mode, navigate])

  const handleTopicReady = useCallback((t) => {
    setTopic(t)
    navigate('/recording')
  }, [navigate])

  const handleRecordingDone = useCallback((t, counts) => {
    setTranscript(t)
    setFillerCounts(counts || {})
    navigate('/feedback')
  }, [navigate])

  const handleRestart = useCallback(() => {
    setTopic('')
    setTranscript('')
    setFeedbackData(null)
    setFillerCounts({})
    navigate('/setup')
  }, [navigate])

  const handleFeedbackReceived = useCallback(async (data) => {
    setFeedbackData(data)
    const oldRank = getRank(userData.totalXP)
    const newXP = userData.totalXP + (data.xp || 0)
    const newRank = getRank(newXP)
    const now = new Date().toISOString().split('T')[0]
    
    const newSession = {
      date: now,
      language, level, mode, topic,
      score: data.score,
      xp: data.xp
    }

    const updated = {
      ...userData,
      totalXP: newXP,
      sessionsPlayed: userData.sessionsPlayed + 1,
      lastSessionDate: now,
      currentStreak: userData.lastSessionDate === getYesterday() 
        ? userData.currentStreak + 1 
        : (userData.lastSessionDate === now ? userData.currentStreak : 1),
      sessionHistory: [newSession, ...userData.sessionHistory].slice(0, 20)
    }
    setUserData(updated)
    saveUserData(updated)

    if (user) {
      try {
        await supabase.auth.updateUser({
          data: { blab_user_data: updated }
        })
      } catch (err) {
        console.error("Failed to sync stats to cloud:", err)
      }
    }

    if (newRank.name !== oldRank.name) {
      setRankUp(newRank.name)
      setTimeout(() => setRankUp(null), 3000)
    }
  }, [userData, language, level, mode, topic, user])

  return (
    <div className={location.pathname === '/' ? 'app app--landing' : 'app'}>


      {/* Leave Confirmation Overlay (Edge Case 10) */}
      {showLeaveConfirm && (
        <div className="leave-confirm-overlay">
          <div className="leave-confirm-box">
            <h2 className="leave-confirm-title">Leave this session?</h2>
            <p className="leave-confirm-sub">Your recording will be lost.</p>
            <div className="leave-confirm-btns">
              <button className="leave-confirm-btn leave-confirm-btn--outline" onClick={() => setShowLeaveConfirm(false)}>STAY</button>
              <button className="leave-confirm-btn leave-confirm-btn--solid" onClick={() => {
                setShowLeaveConfirm(false)
                handleRestart()
              }}>LEAVE</button>
            </div>
          </div>
        </div>
      )}

      <GlobalNav
        onStart={handleStart}
        isAnalyzing={location.pathname === '/feedback' && !feedbackData}
        user={user}
        userData={userData}
        onOpenAuth={() => setShowAuthModal(true)}
        onOpenAccount={() => setShowAccountModal(true)}
      />
      
      <Routes>
        <Route path="/" element={<Landing userData={userData} onStart={handleStart} />} />
        <Route path="/about" element={<About onStart={handleStart} />} />
        <Route path="/contact" element={<Contact onStart={handleStart} />} />
        <Route path="/setup" element={
          <Setup
            language={language} setLanguage={setLanguage}
            level={level} setLevel={setLevel}
            mode={mode} setMode={setMode}
            onDone={handleSetupDone}
          />
        } />
        <Route path="/topic" element={
          <TopicGeneration
            language={language} level={level} mode={mode}
            topic={topic}
            onReady={handleTopicReady}
          />
        } />
        <Route path="/recording" element={
          <Recording topic={topic} language={language} onDone={handleRecordingDone} />
        } />
        <Route path="/feedback" element={
          <Feedback
            language={language} level={level} topic={topic}
            transcript={transcript}
            fillerCounts={fillerCounts}
            userData={userData}
            onFeedback={handleFeedbackReceived}
            onRestart={handleRestart}
            feedbackData={feedbackData}
            user={user}
          />
        } />
        <Route path="/leaderboard" element={<Leaderboard onStart={handleStart} feedbackData={feedbackData} table="leaderboard" user={user} />} />
      </Routes>
      {rankUp && <RankUpOverlay rankName={rankUp} />}
      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
      {showAccountModal && <AccountModal user={user} userData={userData} onClose={() => setShowAccountModal(false)} onSignOut={handleSignOut} />}
    </div>
  )
}

function getYesterday() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().split('T')[0]
}
