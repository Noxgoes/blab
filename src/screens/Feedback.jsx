import { useState, useEffect, useRef, useCallback } from 'react'
import { analyzeSpeech } from '../utils/api'
import { getRank } from '../utils/storage'
import { supabase } from '../utils/supabase'
import html2canvas from 'html2canvas'

function WaveformSVG({ width = 200, color = 'rgba(0,0,0,0.12)', style = {} }) {
  const bars = Array.from({ length: 60 }, (_, i) => {
    const h = Math.sin(i * 0.4) * 6 + Math.sin(i * 1.1) * 3 + Math.random() * 4 + 2
    return Math.max(1, h)
  })
  return (
    <svg width={width} height="24" viewBox={`0 0 ${width} 24`} style={{ display: 'block', ...style }}>
      {bars.map((h, i) => (
        <rect key={i} x={i * (width / 60)} y={12 - h / 2} width={Math.max(1, width / 60 - 1)} height={h} fill={color} rx="0.5" />
      ))}
    </svg>
  )
}

const CHARACTERS = {
  rambler: { id: 'rambler', img: '/images/marco-the%20rambler.png', name: 'Marco', title: 'Rambler', desc: "Marco has never finished a sentence in his life. Not because he's stupid — because his brain moves at three times the speed of his mouth and he's already onto the next idea before the first one lands. He means well. He just needs to learn that silence isn't failure — it's punctuation.", signature: 'Starting with "So basically what I\'m trying to say is..." and never getting there.' },
  freezer: { id: 'freezer', img: '/images/nadia%20-%20the%20freezer.png', name: 'Nadia', title: 'Freezer', desc: "Nadia knows everything. Seriously — she reads, she prepares, she over-researches every topic she might ever need to discuss. But the moment someone looks at her expecting words, her mind goes completely white. She's not shy. She's not scared. She just cannot bridge the gap between knowing something and saying it out loud. Her notes are perfect. Her mouth disagrees.", signature: 'Opening her mouth, closing it, and saying "sorry, what was the question?"' },
  rusher: { id: 'rusher', img: '/images/dev%20-%20the%20rusher.png', name: 'Dev', title: 'Rusher', desc: "Dev discovered early that if he spoke fast enough, nobody could interrupt him. So he never stopped. He barrels through sentences like he's being chased, finishing thoughts before anyone can challenge them. He mistakes speed for confidence and volume for authority. Somewhere in there is a really good speaker. They just need to learn to breathe.", signature: 'Finishing a 60-second answer and having no idea what he just said.' },
  pretender: { id: 'pretender', img: '/images/camille%20the%20pretender.png', name: 'Camille', title: 'Pretender', desc: "Camille sounds incredible. Her vocabulary is immaculate, her accent is perfect, her sentences are architecturally beautiful. But spend 60 seconds with her words and you realize — there's nothing inside them. She learned language like she learned piano: technically flawless, emotionally hollow. She can discuss anything. She just has nothing to say about it.", signature: 'Speaking for two minutes and leaving everyone nodding but remembering nothing.' },
  sparker: { id: 'sparker', img: '/images/ayo-the%20spaker.png', name: 'Ayo', title: 'Sparker', desc: "Ayo's opening lines are legendary. He walks into every speaking moment with a hook that stops the room. The problem is he has absolutely no idea what comes after it. He's a firework — spectacular for three seconds, then smoke. He's been riding his opening lines his entire life and has never once been asked what happened next, because nobody waited around to find out.", signature: 'A brilliant first sentence followed by "...and yeah, so, I mean..."' },
  ghost: { id: 'ghost', img: '/images/lena%20the%20ghost%20speaker.png', name: 'Lena', title: 'Ghost Speaker', desc: "Nobody knows how Lena does it. She doesn't prepare more than anyone else. She doesn't speak louder or faster. She just opens her mouth and the room goes quiet — not because she demands it, but because every word she says feels like it was the only possible word. She's comfortable with silence in a way that makes other people uncomfortable. She arrived here by failing spectacularly, repeatedly, for years.", signature: 'Saying less than everyone else and being the only one people remember.' }
}

function getArchetype(data) {
  if (!data || !data.score_breakdown) return CHARACTERS.sparker
  
  const score = data.score || 0
  const confidence = data.score_breakdown?.confidence || 0
  const grammar = data.score_breakdown?.grammar || 0
  const spontaneity = data.score_breakdown?.spontaneity || 0
  const completion = data.score_breakdown?.completion || 0
  const fillers = data.filler_breakdown?.total || 0
  const fillerPenalty = data.score_breakdown?.filler_penalty || 0

  if (score >= 80) return CHARACTERS.ghost
  if (confidence <= 7 && completion <= 12) return CHARACTERS.freezer
  if (fillers >= 5 || fillerPenalty >= 10) return CHARACTERS.rusher
  if (grammar >= 15 && spontaneity <= 7) return CHARACTERS.pretender
  if (completion >= 15 && confidence <= 8) return CHARACTERS.rambler
  if (spontaneity >= 9 && completion <= 13) return CHARACTERS.sparker

  // Fallbacks
  if (fillers > 3) return CHARACTERS.rusher
  if (confidence < 10) return CHARACTERS.freezer
  return CHARACTERS.rambler
}

function AnalyzingScreen({ transcript }) {
  const [step, setStep] = useState(0)
  const [checklistStep, setChecklistStep] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setStep(s => (s < 4 ? s + 1 : s))
    }, 1800)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      setChecklistStep(s => (s < 4 ? s + 1 : s))
    }, 800)
    return () => clearInterval(timer)
  }, [])

  const subtitles = [
    "ANALYZING FLUENCY...",
    "MAPPING GRAMMAR & CADENCE...",
    "EVALUATING CONFIDENCE...",
    "MEASURING PACE & PAUSES...",
    "FINALIZING REPORT..."
  ]

  const rightSteps = [
    "FILLER PATTERN DETECTED",
    "CONFIDENCE MAPPED",
    "HESITATION POINTS LOGGED",
    "SPEAKER TYPE IDENTIFIED"
  ]

  const bottomLabels = ["FLUENCY", "GRAMMAR", "CONFIDENCE", "PACE", "SPONTANEITY"]

  const bars = Array.from({ length: 90 }, (_, i) => {
    const dist = Math.abs(i - 45) / 45
    const baseH = (1 - dist) * 160
    const noise = Math.sin(i * 0.8) * 35 + Math.cos(i * 1.7) * 25
    return Math.max(8, baseH + noise)
  })

  return (
    <div className="analyzing">
      <div className="analyzing__bg-container">
        <svg className="analyzing__bg-wave" viewBox="0 0 1200 300" preserveAspectRatio="none">
          {bars.map((h, i) => {
            const x = i * (1200 / 90) + 5
            const y = 150 - h / 2
            return (
              <rect key={i} x={x} y={y} width="2" height={h} fill="rgba(0,0,0,0.06)" rx="1" />
            )
          })}
        </svg>
      </div>

      <div className="analyzing__eyebrow">BLAB IS READING YOUR SPEECH</div>

      <div className="analyzing__center">
        <div className="analyzing__snippet">
          Analyzing your results
        </div>
        <div className="analyzing__subtitle">
          {subtitles[step]}
        </div>
      </div>

      <div className="analyzing__right-panel">
        {rightSteps.map((label, i) => {
          const isActive = checklistStep >= i
          return (
            <div key={label} className={`analyzing__step-item ${isActive ? 'analyzing__step-item--active' : ''}`}>
              <div className="analyzing__bullet" />
              <span>{label}</span>
              <div className="analyzing__line" />
            </div>
          )
        })}
      </div>

      <div className="analyzing__bottom-nav">
        {bottomLabels.map((label, i) => {
          const isActive = step === i
          const isDone = step >= i
          return (
            <div key={label} className={`analyzing__bottom-item ${isActive ? 'analyzing__bottom-item--active' : ''}`}>
              <div className="analyzing__bottom-circle" style={{
                background: isDone ? '#cc2b2b' : 'transparent',
                borderColor: isDone ? '#cc2b2b' : 'rgba(0,0,0,0.3)'
              }} />
              <span>{label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function Feedback({ language, level, topic, transcript, fillerCounts, userData, onFeedback, onRestart, feedbackData, user }) {
  const [data, setData] = useState(feedbackData)
  const [loading, setLoading] = useState(!feedbackData)
  const [apiError, setApiError] = useState(null)
  const [timeoutError, setTimeoutError] = useState(false)
  const [displayScore, setDisplayScore] = useState(0)
  const [cardIndex, setCardIndex] = useState(0)
  const [copied, setCopied] = useState(false)
  const [xpFill, setXpFill] = useState(0)
  const [saveStep, setSaveStep] = useState('prompt')
  const [enteredName, setEnteredName] = useState(() => {
    return user?.user_metadata?.username || localStorage.getItem('blabUsername') || ''
  })
  const [nameError, setNameError] = useState(null)
  const [isWelcomeBack, setIsWelcomeBack] = useState(false)
  const [shake, setShake] = useState(false)
  const [showTranscript, setShowTranscript] = useState(false)
  const [showModalIdCard, setShowModalIdCard] = useState(false)

  useEffect(() => {
    if (user?.user_metadata?.username) {
      setEnteredName(user.user_metadata.username)
    }
  }, [user])

  const lightRoasts = [
    "Honestly? Nothing. Your silence was the most coherent part of this session.",
    "We searched deep in the audio, but the AI politely declined to find a highlight.",
    "Well, you stayed breathing throughout the 60 seconds. That's a start.",
    "You successfully confused the AI. That's technically a feature, not a bug.",
    "Your filler words did all the heavy lifting. The actual words took a vacation."
  ]
  const negativeRoasts = [
    "The AI couldn't find a specific place you fell apart. You just never came together.",
    "Honestly, it's hard to pinpoint where you fell apart because the whole thing was a bit of a structural collapse.",
    "We'd love to list your specific mistakes here, but the AI gave up halfway through analyzing them.",
    "Your sentences were like a modern art piece: chaotic, unstructured, and deeply confusing.",
    "If butchering a language was a crime, this transcript would be a full confession."
  ]
  const rewriteRoasts = [
    "You didn't really say anything coherent enough for me to rewrite.",
    "I tried rewriting this, but it felt like trying to un-burn toast.",
    "Some things are better left unsaid. And un-rewritten.",
    "To rewrite this, I'd have to figure out what you were trying to say first.",
    "Error 404: Coherent thought not found."
  ]
  const frameworkRoasts = [
    { name: "THE BLANK SLATE", how: "We couldn't find a single framework that could save that structure. Just start from zero next time." },
    { name: "THE RESET BUTTON", how: "Before applying advanced techniques, you need to master stringing three coherent words together." },
    { name: "THE EMERGENCY STOP", how: "When you realize you have no idea where your sentence is going, just stop. Silence is better than whatever that was." }
  ]
  const focusRoasts = [
    "Focus on having an actual point before you open your mouth.",
    "Try completing one single thought before abandoning it for the next.",
    "Your next focus: mastering the art of the period. Stop your sentences before they bleed to death.",
    "Next time, decide what you want to say before you start saying it.",
    "Breathe. You're talking like you're being chased by the alphabet."
  ]
  const roastIndex = (topic ? topic.length : 0) % lightRoasts.length
  const selectedRoast = lightRoasts[roastIndex]
  const selectedNegativeRoast = negativeRoasts[roastIndex]
  const selectedRewriteRoast = rewriteRoasts[roastIndex]
  const selectedFrameworkRoast = frameworkRoasts[roastIndex % frameworkRoasts.length]
  const selectedFocusRoast = focusRoasts[roastIndex % focusRoasts.length]
  
  useEffect(() => {
    const saved = localStorage.getItem('blabUsername')
    if (saved) {
      setEnteredName(saved)
      setIsWelcomeBack(true)
    }
  }, [])
  
  const hasCalledRef = useRef(false)
  const shareRef = useRef(null)
  const inputRef = useRef(null)
  const hasAnimatedRef = useRef(false)
  const abortControllerRef = useRef(null)

  const goNext = () => setCardIndex(i => Math.min(i + 1, TOTAL_CARDS - 1))
  const goPrev = () => setCardIndex(i => Math.max(i - 1, 0))

  const isTooShort = !transcript || transcript.trim().split(/\s+/).filter(Boolean).length < 10
  const TOTAL_CARDS = 9

  // ── ANALYSIS LOGIC (Edge Case 3 & 4) ───────────────────────────────
  const runAnalysis = useCallback(async () => {
    if (feedbackData || hasCalledRef.current) return
    hasCalledRef.current = true
    setLoading(true)
    setTimeoutError(false)
    setApiError(false)

    const controller = new AbortController()
    abortControllerRef.current = controller
    
    const timeout = setTimeout(() => {
      controller.abort()
      setTimeoutError(true)
      setLoading(false)
    }, 30000)

    try {
      const parsed = await analyzeSpeech(transcript, fillerCounts, language, level, topic, controller.signal)
      clearTimeout(timeout)
      parsed.xp = Math.round(parsed.xp || (parsed.score || 50) * 0.5)
      setData(parsed)
      onFeedback(parsed)
      setLoading(false)
    } catch (err) {
      clearTimeout(timeout)
      if (err.name === 'AbortError') {
        setTimeoutError(true)
      } else {
        setApiError(err.message || 'Unknown API Error')
        // Fallback to local if truly broken
        const local = generateLocalData(err.message)
        setData(local)
        onFeedback(local)
      }
      setLoading(false)
    }
  }, [transcript, fillerCounts, language, level, topic, feedbackData, onFeedback])

  useEffect(() => {
    if (!isTooShort) runAnalysis()
  }, [isTooShort, runAnalysis])

  // Cleanup on leave
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') goNext()
      if (e.key === 'ArrowLeft') goPrev()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort()
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [cardIndex]) // Re-bind so goNext/goPrev use current cardIndex

  // ── SCORE ANIMATION ────────────────────────────────────────────────
  useEffect(() => {
    if (!data || data.score === 0 || hasAnimatedRef.current) return
    hasAnimatedRef.current = true
    const target = data.score || 0, duration = 1400, start = Date.now()
    const anim = () => {
      const p = Math.min((Date.now() - start) / duration, 1)
      setDisplayScore(Math.round((1 - Math.pow(1 - p, 3)) * target))
      if (p < 1) requestAnimationFrame(anim)
    }
    requestAnimationFrame(anim)
    setTimeout(() => {
      const ri = getRank ? getRank(userData?.totalXP || 0) : null
      setXpFill(ri?.progress ? ri.progress * 100 : 60)
    }, 1200)
  }, [data, userData])

  // ── SAVE SCORE (Edge Case 6) ───────────────────────────────────────
  const [leaderboardSubmitted, setLeaderboardSubmitted] = useState(false)

  const handleSaveScore = async () => {
    const name = user 
      ? (user.user_metadata?.username || user.email?.split('@')[0] || enteredName.trim().toLowerCase())
      : enteredName.trim().toLowerCase()
    
    if (!name || saveStep === 'submitting') return
    setSaveStep('submitting')
    setNameError(null)

    const deviceId = user ? `auth:${user.id}` : localStorage.getItem('blabDeviceId')
    const currentScore = data?.score || 0

    try {
      // ── STEP 3: CHECK IF USERNAME EXISTS ───────────────────────────
      const { data: existingByName, error: fetchErr } = await supabase
        .from('leaderboard')
        .select('*')
        .eq('username', name)
        .maybeSingle()

      if (existingByName) {
        // Username exists — check if same device OR if user is authenticated and matches this username
        const canClaim = user && (user.user_metadata?.username === name || user.email?.split('@')[0] === name)

        if (existingByName.device_id !== deviceId && !canClaim) {
          // Different device trying to use same name
          setSaveStep('prompt')
          setNameError('taken')
          setShake(true)
          setTimeout(() => setShake(false), 400)
          return
        }

        // Same device OR claiming own authenticated username — check if score improved
        if (currentScore > existingByName.score || canClaim) {
          const { error } = await supabase
            .from('leaderboard')
            .update({
              score: Math.max(currentScore, existingByName.score || 0),
              previous_score: existingByName.score,
              speaker_type: data?.rank || 'Mumbler',
              language: language || 'English',
              level: level || 'Intermediate',
              filler_count: data?.filler_breakdown?.total || 0,
              sessions_count: (existingByName.sessions_count || 1) + 1,
              device_id: deviceId, // Lock under auth:${user.id} now
              updated_at: new Date().toISOString()
            }, { headers: { 'x-device-id': deviceId } })
            .eq('username', name)

          if (!error) {
            setLeaderboardSubmitted(true)
            setSaveStep('confirmed')
            localStorage.setItem('blabUsername', name)
            setTimeout(() => setSaveStep('xp'), 2200)
          } else { throw error }
        } else {
          // Same device, score not better
          setLeaderboardSubmitted(true)
          setSaveStep('no-improvement')
          setTimeout(() => setSaveStep('xp'), 2200)
        }
      } else {
        // New username — insert fresh entry
        const { error } = await supabase
          .from('leaderboard')
          .insert({
            username: name,
            score: currentScore,
            speaker_type: data?.rank || 'Mumbler',
            language: language || 'English',
            level: level || 'Intermediate',
            filler_count: data?.filler_breakdown?.total || 0,
            device_id: deviceId,
            sessions_count: 1
          })

        if (!error) {
          setLeaderboardSubmitted(true)
          setSaveStep('confirmed')
          localStorage.setItem('blabUsername', name)
          setTimeout(() => setSaveStep('xp'), 2200)
        } else { throw error }
      }
    } catch (err) { 
      console.error(err)
      setSaveStep('prompt')
    }
  }

  // ── DOWNLOAD ───────────────────────────────────────────────────────
  const handleDownloadPNG = async () => {
    if (!shareRef.current) return
    try {
      setCopied(true)
      const canvas = await html2canvas(shareRef.current, { scale: 2, backgroundColor: '#F2EDE4', useCORS: true, logging: false })
      const link = document.createElement('a')
      link.download = `blab-id.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      navigator.clipboard.writeText(`BLAB Score: ${Math.round(data.score)}\nblab.app`)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleShareX = () => {
    const scoreVal = Math.round(data?.score ?? 0)
    const type = getArchetype(data)?.title ?? 'Speaker'
    const tweetText = `I scored ${scoreVal} on BLAB and identified as a "${type}" speaking type. Rate my fluency. Try it here: https://blab.app`
    const url = `https://x.com/intent/tweet?text=${encodeURIComponent(tweetText)}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const generateLocalData = (errorMsg) => {
    const words = transcript.trim().split(/\s+/).filter(Boolean)
    const fillerTotal = Object.values(fillerCounts).reduce((a, b) => a + b, 0)
    const baseScore = Math.max(20, 100 - (fillerTotal * 5))
    return {
      score: baseScore,
      coach_line: "The API went quiet, but your voice shouldn't. Here is your local analysis.",
      filler_breakdown: { ...fillerCounts, total: fillerTotal, verdict: fillerTotal > 5 ? 'Heavy' : 'Clean' },
      xp: Math.round(baseScore * 0.5),
      rank: "Brave Speaker",
      isLocal: true,
      score_breakdown: { completion: 15, grammar: 15, confidence: 15, spontaneity: 15 }
    }
  }

  // ── RENDER STATES ──────────────────────────────────────────────────
  if (loading) return <AnalyzingScreen transcript={transcript} />

  if (timeoutError) return (
    <div className="screen timeout-screen">
      <p className="timeout__label">Analysis timed out.</p>
      <div className="timeout__actions">
        <button className="timeout__btn timeout__btn--retry" onClick={() => { hasCalledRef.current = false; runAnalysis(); }}>RETRY ANALYSIS</button>
        <button className="timeout__btn timeout__btn--start" onClick={onRestart}>START OVER</button>
      </div>
    </div>
  )

  if (isTooShort || !data) return (
    <div className="screen error-screen">
      <p className="error-text">We didn't catch enough speech.<br/>Try again — speak clearly and continuously.</p>
      <button className="error-btn" onClick={onRestart}>TRY AGAIN</button>
    </div>
  )

  const archetype = getArchetype(data)
  const rankName = getRank ? getRank(userData?.totalXP || 0).name : (data.rank || 'Mumbler')
  const scoreColor = data.score >= 70 ? '#1a1a1a' : data.score >= 45 ? '#d97008' : '#cc2b2b'
  const breakdownEntries = [
    { label: 'Fillers', text: data.feedback_breakdown?.fillers || `${data.filler_breakdown?.total || 0} fillers detected.` },
    { label: 'Grammar', text: data.feedback_breakdown?.grammar || "Watch your sentence structure." },
    { label: 'Pauses', text: data.feedback_breakdown?.pauses || `${data.pauses_inferred || 0} long pauses detected.` },
    { label: 'Completion', text: data.feedback_breakdown?.completion || "Try to expand on your reasons." },
    { label: 'Confidence', text: data.feedback_breakdown?.confidence || "Speak with more certainty." },
    { label: 'Spontaneity', text: data.feedback_breakdown?.spontaneity || "Try to be more expressive." },
  ].filter(b => b.text)

  const idCardContent = (
    <>
      <div className="sc3__top">
        <div className="sc3__logo">BLAB</div>
        <div className="sc3__id-tag">ID: {archetype.id?.toUpperCase() || 'SPARKER'}</div>
      </div>
      <div className="sc3__id-body">
        <div className="sc3__id-photo-wrap"><img src={archetype.img} alt={archetype.name} /></div>
        <div className="sc3__id-info">
          <div className="sc3__id-title">SPEAKER TYPE</div>
          <div className="sc3__id-name">{archetype.name}</div>
          <div className="sc3__id-rank">RANK: {rankName.toUpperCase()}</div>
        </div>
      </div>
      <div className="sc3__score-section">
        <div className="sc3__score-left">
          <div className="sc3__score-label">FLUENCY SCORE</div>
          <svg className="sc3__waveform" viewBox="0 0 200 28" preserveAspectRatio="none">
            {Array.from({ length: 36 }).map((_, idx) => {
              const h = Math.max(1, Math.sin(idx * 0.7) * 10 + Math.cos(idx * 1.4) * 6 + 14)
              const isRed = idx >= 24 && idx <= 28
              return <rect key={idx} x={idx * 5.6} y={14 - h / 2} width="2" height={h} rx="1" fill={isRed ? "#cc2b2b" : "rgba(255,255,255,0.12)"} />
            })}
          </svg>
        </div>
        <div className="sc3__score-right">
          <span className="sc3__score-val">{Math.round(data.score)}</span>
          <span className="sc3__score-max">/100</span>
        </div>
      </div>
      <div className="sc3__stats-row">
        <div className="sc3__stat-col">
          <div className="sc3__col-lbl">FILLERS</div>
          <div className="sc3__col-val sc3__col-val--red">{data.filler_breakdown?.total || 0}</div>
          <div className="sc3__col-sub">{(data.filler_breakdown?.total || 0) > 5 ? 'HIGH' : 'LOW'}</div>
        </div>
        <div className="sc3__stat-col">
          <div className="sc3__col-lbl">PACE</div>
          <div className="sc3__col-val">{(data.score_breakdown?.confidence || 10) > 12 ? 'DYNAMIC' : (data.score_breakdown?.confidence || 10) > 8 ? 'GOOD' : 'STEADY'}</div>
          <div className="sc3__col-sub">OPTIMAL</div>
        </div>
        <div className="sc3__stat-col">
          <div className="sc3__col-lbl">XP EARNED</div>
          <div className="sc3__col-val sc3__col-val--red">{data.xp || 0}</div>
          <div className="sc3__col-sub">PTS</div>
        </div>
        <div className="sc3__stat-col sc3__stat-col--last">
          <div className="sc3__col-lbl">VIBE</div>
          <div className="sc3__col-val">{data.vibe_analysis?.toUpperCase() || 'SCATTERED'}</div>
          <div className="sc3__col-sub">UNCLEAR</div>
        </div>
      </div>
      <div className="sc3__quote-area">
        <span className="sc3__quote-mark">“</span>
        <p className="sc3__quote-text">"{data.coach_line}"</p>
      </div>
      <div className="sc3__footer">
        <button className="sc3__footer-link" onClick={() => setCardIndex(0)}>VIEW BREAKDOWN →</button>
        <button className="sc3__footer-link sc3__footer-link--red" onClick={onRestart}>SPEAK AGAIN</button>
      </div>
    </>
  )

  const cards = [
    <div className="fbc fbc--cream" key="transcript" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', textAlign: 'left', padding: '36px 32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(0, 0, 0, 0.06)', paddingBottom: 16, marginBottom: 24 }}>
        <span className="fbc__eyebrow fbc__eyebrow--red" style={{ fontWeight: 700 }}>YOUR TRANSCRIPT</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.1em', background: 'rgba(0, 0, 0, 0.05)', padding: '4px 8px', borderRadius: 4, color: '#1a1a1a', textTransform: 'uppercase' }}>RECORDED</span>
      </div>
      <div className="fbc-sidebar-card__body" style={{ flex: 1, overflowY: 'auto', paddingRight: 8 }}>
        <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1.15rem', lineHeight: 1.6, color: '#1a1a1a', fontStyle: 'italic', margin: 0, whiteSpace: 'pre-wrap' }}>"{transcript}"</p>
      </div>
      <div style={{ borderTop: '1px solid rgba(0, 0, 0, 0.06)', paddingTop: 16, marginTop: 24 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em', color: '#888', textTransform: 'uppercase' }}>{language || 'English'} • {level || 'Intermediate'}</span>
      </div>
    </div>,
    <div className="fbc" key="verdict">
      <div className="fbc__inner">
        {data.isLocal && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 16 }}>
            <div className="fbc__eyebrow fbc__eyebrow--red">⚠️ LOCAL REVIEW (API ERROR)</div>
            {apiError && (
              <div style={{ 
                fontSize: '11px', 
                color: '#cc2b2b', 
                fontFamily: 'var(--font-mono)', 
                marginTop: 6, 
                background: 'rgba(204, 43, 43, 0.08)', 
                padding: '6px 12px', 
                borderRadius: 4,
                border: '1px solid rgba(204, 43, 43, 0.2)',
                textAlign: 'center',
                maxWidth: '90%'
              }}>
                {apiError}
              </div>
            )}
          </div>
        )}
        <div className="fbc__eyebrow" style={{ opacity: 0.6, letterSpacing: '0.24em' }}>FLUENCY SCORE</div>
        <div className="fbc__score-wrap"><div className="fbc__score" style={{ color: scoreColor }}>{displayScore}</div></div>
        <div className="fbc__coach-wrap fbc__coach-wrap--bottom" style={{ alignItems: 'center', textAlign: 'center' }}>
          <p className="fbc__coach-line" style={{ maxWidth: 320, textAlign: 'center' }}>"{data.coach_line}"</p>
          {data.vibe_analysis && <div className="fbc__vibe-pill fbc__vibe-pill--center">VIBE: {data.vibe_analysis.toUpperCase()}</div>}
        </div>
      </div>
    </div>,
    <div className="fbc fbc--dark" key="character">
      <div className="fbc__char-img-wrap">
        <img src={archetype.img} alt={archetype.name} className="fbc__char-img" />
        <div className="fbc__char-img-overlay">
          <p className="fbc__char-backstory">{archetype.desc}</p>
        </div>
      </div>
      <div className="fbc__char-info">
        <div className="fbc__eyebrow fbc__eyebrow--red">SPEAKER TYPE</div>
        <div className="fbc__char-name">{archetype.name}</div>
        <div className="fbc__char-title">THE {archetype.title.toUpperCase()}</div>
        <p className="fbc__char-sig">"{archetype.signature}"</p>
      </div>
    </div>,
    <div className="fbc fbc--cream" key="breakdown">
      <div className="fbc__inner fbc__inner--left">
        <div className="fbc__eyebrow">FEEDBACK BREAKDOWN</div>
        <div className="fbc__breakdown-list">
          {breakdownEntries.map((b, i) => (
            <div className="fbc__bd-item" key={b.label}>
              <div className="fbc__bd-label">{b.label.toUpperCase()}</div>
              <p className="fbc__bd-text">{b.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>,
    <div className="fbc fbc--cream" key="happened">
      <div className="fbc__split">
        <div className="fbc__split-half fbc__split-half--top">
          <div className="fbc__eyebrow" style={{ color: '#2a8a56' }}>✓ WHAT WORKED</div>
          {data.what_you_did_well && data.what_you_did_well.length > 0 ? (
            data.what_you_did_well.slice(0, 4).map((w, i) => (
              <div className="fbc__list-item" key={i}>
                <span className="fbc__icon fbc__icon--good">✓</span>
                <p className="fbc__list-text">{w}</p>
              </div>
            ))
          ) : (
            <div className="fbc__list-item" style={{ display: 'flex', alignItems: 'center' }}>
              <span className="fbc__icon fbc__icon--roast" style={{ fontSize: '15px' }}>🔥</span>
              <p className="fbc__list-text" style={{ fontStyle: 'italic', color: '#cc2b2b' }}>
                "{selectedRoast}"
              </p>
            </div>
          )}
        </div>
        <div className="fbc__split-divider" /><div className="fbc__split-half fbc__split-half--bottom">
          <div className="fbc__eyebrow" style={{ color: '#cc2b2b' }}>× WHERE YOU FELL APART</div>
          {data.where_you_fell_apart && data.where_you_fell_apart.length > 0 ? (
            data.where_you_fell_apart.slice(0, 4).map((w, i) => <div className="fbc__list-item" key={i}><span className="fbc__icon fbc__icon--bad">×</span><p className="fbc__list-text">{w}</p></div>)
          ) : (
            <div className="fbc__list-item" style={{ display: 'flex', alignItems: 'center' }}>
              <span className="fbc__icon fbc__icon--roast" style={{ fontSize: '15px' }}>💀</span>
              <p className="fbc__list-text" style={{ fontStyle: 'italic', color: '#cc2b2b' }}>
                "{selectedNegativeRoast}"
              </p>
            </div>
          )}
        </div>
      </div>
    </div>,
    <div className="fbc fbc--dark" key="architecture">
      <div className="fbc__inner">
        <div className="fbc__eyebrow fbc__eyebrow--red">SENTENCE ARCHITECTURE</div>
        <div className="fbc__arch-verdict">{data.sentence_analysis?.structure_type?.toUpperCase() || 'SIMPLE'}</div>
        <div className="fbc__divider fbc__divider--white" />
        <p className="fbc__arch-obs">"{data.sentence_analysis?.observation}"</p>
        <div className="fbc__arch-tip"><span className="fbc__eyebrow" style={{ fontSize: 8 }}>BUILDER TIP</span><p>{data.sentence_analysis?.tip}</p></div>
      </div>
    </div>,
    <div className="fbc fbc--red" key="rewrite">
      <div className="fbc__inner">
        <div className="fbc__eyebrow fbc__eyebrow--white">THE SENTENCE YOU SHOULD HAVE SAID</div>
        <div className="fbc__rewrite-quote">"{data.rewrite && data.rewrite.trim() !== '' && data.rewrite !== '...' ? data.rewrite : selectedRewriteRoast}"</div>
        {data.native_comparison && (
          <><div className="fbc__divider fbc__divider--white" /><div className="fbc__eyebrow fbc__eyebrow--white" style={{ opacity: 0.6, marginBottom: 12 }}>NATIVE COMPARISON</div><p className="fbc__native-text">{data.native_comparison}</p></>
        )}
      </div>
    </div>,
    <div className="fbc fbc--cream" key="playbook">
      <div className="fbc__inner fbc__inner--left" style={{ justifyContent: 'space-between', paddingBottom: 24 }}>
        <div className="fbc__eyebrow">USE THIS NEXT TIME</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
          {data.frameworks && data.frameworks.length > 0 ? (
            data.frameworks.slice(0, 2).map(f => <div className="fbc__fw-box" key={f.name} style={{ marginTop: 0 }}><div className="fbc__fw-name">{f.name}</div><p className="fbc__fw-how">{f.how}</p></div>)
          ) : (
            <div className="fbc__fw-box" style={{ marginTop: 0 }}>
              <div className="fbc__fw-name" style={{ color: '#cc2b2b' }}>{selectedFrameworkRoast.name}</div>
              <p className="fbc__fw-how" style={{ fontStyle: 'italic' }}>{selectedFrameworkRoast.how}</p>
            </div>
          )}
        </div>
        <div className="fbc__focus-box" style={{ width: '100%', marginTop: 0 }}>
          <div className="fbc__eyebrow fbc__eyebrow--red" style={{ marginBottom: 10 }}>FOCUS FOR NEXT SESSION</div>
          <p className="fbc__focus-text" style={{ fontStyle: (!data.next_focus || data.next_focus.trim() === '') ? 'italic' : 'normal', opacity: (!data.next_focus || data.next_focus.trim() === '') ? 0.8 : 1 }}>
            {data.next_focus && data.next_focus.trim() !== '' ? data.next_focus : selectedFocusRoast}
          </p>
        </div>
      </div>
    </div>,
    <div className="fbc fbc--cream fbc--share" key="share">
      <div className="fbc__share-actions" data-html2canvas-ignore="true">
        <div className="fbc__share-leaderboard">
          {leaderboardSubmitted ? (
            <div className="fbc__submitted">
              <p className="fbc__submitted-title">
                {saveStep === 'no-improvement' ? `Your best is still ${data.score}. Keep going.` : "You're on the board."}
              </p>
              <p className="fbc__submitted-sub">Speak again to improve your score.</p>
            </div>
          ) : (saveStep === 'prompt' || saveStep === 'submitting' ? (
            <div className="fbc__save-container">
              {user ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, width: '100%' }}>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#1a1a1a', opacity: 0.8, margin: 0 }}>Post score as <span style={{ fontWeight: 700 }}>{enteredName}</span>?</p>
                  <button className="fbc__save-btn fbc__save-btn--solid" onClick={handleSaveScore} disabled={saveStep === 'submitting'} style={{ width: '100%', borderRadius: 2 }}>
                    {saveStep === 'submitting' ? 'POSTING...' : 'POST TO LEADERBOARD'}
                  </button>
                </div>
              ) : (
                <>
                  <div className={`fbc__save-row ${shake ? 'fbc__save-row--shake' : ''}`} style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 10 }}>
                    <input ref={inputRef} className="fbc__save-input" type="text" placeholder="Your name" value={enteredName} 
                      onChange={e => { setEnteredName(e.target.value.slice(0, 20)); setNameError(null); setIsWelcomeBack(false); }} disabled={saveStep === 'submitting'}
                      onKeyDown={e => e.key === 'Enter' && handleSaveScore()} style={{ width: '100%', padding: '12px 14px', fontSize: '13px' }} />
                    <button className="fbc__save-btn fbc__save-btn--solid" onClick={handleSaveScore} disabled={saveStep === 'submitting' || !enteredName.trim()} style={{ width: '100%', padding: '12px', fontSize: '11px' }}>
                      {saveStep === 'submitting' ? 'POSTING...' : 'POST TO LEADERBOARD'}
                    </button>
                  </div>
                  
                  {isWelcomeBack && !nameError && (
                    <p className="fbc__welcome-back" style={{ marginTop: 4 }}>Welcome back, {enteredName}.</p>
                  )}

                  {nameError === 'taken' && (
                    <div className="fbc__name-error" style={{ marginTop: 8 }}>
                      <p className="fbc__error-main">That name is taken by someone else.</p>
                      <p className="fbc__error-sub">Try a different name.</p>
                      <p className="fbc__error-hint">Is this your name? Try adding a number: {enteredName}2</p>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : <p className="fbc__save-label">+{data.xp || 0} XP earned</p>)}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', marginTop: 8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, width: '100%' }}>
            <button className="fbc__copy-btn" onClick={handleDownloadPNG} style={{ margin: 0, width: '100%' }}>{copied ? 'DOWNLOADING...' : 'DOWNLOAD PNG'}</button>
            <a 
              className="fbc__copy-btn" 
              href={`https://x.com/intent/tweet?text=${encodeURIComponent(`I scored ${Math.round(data?.score ?? 0)} on BLAB and identified as a "${getArchetype(data)?.title ?? 'Speaker'}" speaking type. Rate my fluency. Try it here: https://blab.app`)}`}
              target="_blank" 
              rel="noopener noreferrer"
              style={{ margin: 0, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}
            >
              SHARE ON X
            </a>
          </div>
          <button className="fbc__copy-btn fbc__copy-btn--ghost" onClick={onRestart} style={{ margin: 0, width: '100%' }}>SPEAK AGAIN</button>
        </div>
      </div>
      <div className="sc3" ref={shareRef} title="Double-click to expand" onDoubleClick={() => setShowModalIdCard(true)} style={{ cursor: 'pointer', flexShrink: 0 }}>
        {idCardContent}
      </div>
    </div>,
  ]

  return (
    <div className="fbc-deck">
      <div className="fbc-deck__header">
        <span className="fbc-deck__counter">{cardIndex + 1} / {TOTAL_CARDS}</span>
        <button className="fbc-deck__close" onClick={onRestart} style={{ background: 'none', border: 'none', color: '#1a1a1a', fontSize: '28px', cursor: 'pointer', padding: '0 10px', marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>×</button>
      </div>

      <div className="fbc-deck__layout">
        {/* Center Deck Area */}
        <div className="fbc-deck__center-area">
          <div className="fbc-deck__viewport">
            {cards.map((card, i) => (
              <div key={i} className="fbc-deck__slide" style={{ transform: `translateX(${(i - cardIndex) * 100}%)` }}>{card}</div>
            ))}
          </div>
        </div>
      </div>

      <div className="fbc-deck__nav">
        <button className="fbc-deck__arrow" onClick={goPrev} disabled={cardIndex === 0}>←</button>
        <div className="fbc-deck__dots">
          {cards.map((_, i) => <button key={i} className={`fbc-deck__dot ${i === cardIndex ? 'fbc-deck__dot--active' : ''}`} onClick={() => setCardIndex(i)} />)}
        </div>
        <button className="fbc-deck__arrow" onClick={goNext} disabled={cardIndex === TOTAL_CARDS - 1}>→</button>
      </div>

      {showModalIdCard && (
        <div className="sc3-modal-overlay" onClick={() => setShowModalIdCard(false)}>
          <div className="sc3-modal-content" onClick={e => e.stopPropagation()}>
            <button className="sc3-modal-close" onClick={() => setShowModalIdCard(false)}>×</button>
            <div className="sc3" style={{ flexShrink: 0 }}>
              {idCardContent}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
