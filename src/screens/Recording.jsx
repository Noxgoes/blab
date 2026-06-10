import { useState, useEffect, useRef, useCallback } from 'react'

const BAR_COUNT = 80
const MAX_TIME = 60
const AUTO_SUBMIT_AT = 60
const MAX_LINES = 5

const languageCodes = {
  'English': 'en', 'Spanish': 'es', 'French': 'fr', 'German': 'de', 'Italian': 'it',
  'Portuguese': 'pt', 'Japanese': 'ja', 'Korean': 'ko', 'Hindi': 'hi', 'Mandarin': 'zh', 'Arabic': 'ar'
}

const fillerWordMap = {
  'en': ['um','uh','like','you know','basically','actually','hmm','so'],
  'es': ['eh','este','pues','o sea','bueno','mmm','osea','entonces'],
  'fr': ['euh','bah','ben','enfin','voilà','donc','genre','quoi'],
  'de': ['äh','ähm','halt','also','quasi','irgendwie','sozusagen'],
  'it': ['eh','cioè','allora','tipo','praticamente','insomma','quindi'],
  'pt': ['é','né','tipo','então','basicamente','ahn','hm'],
  'ja': ['えー','あの','まあ','えっと','なんか','そのー','うーん'],
  'ko': ['음','어','그','뭐','그냥','아','이제'],
  'hi': ['matlab','yaani','bas','aur','toh','hmm','achha','woh'],
  'zh': ['那个','就是','然后','嗯','这个','对','呢'],
  'ar': ['يعني','اممم','هاه','بالضبط','اه','طب']
}

export default function Recording({ topic, language, onDone }) {
  const selectedLanguage = language || 'English'
  const initialLangCode = languageCodes[selectedLanguage] || 'en'
  const initialFillerList = fillerWordMap[initialLangCode] || fillerWordMap['en']
  const initialCounts = initialFillerList.reduce((acc, w) => ({ ...acc, [w]: 0 }), {})

  const [seconds, setSeconds] = useState(0)
  const [micError, setMicError] = useState(null)
  const [transcript, setTranscript] = useState('')
  const [lines, setLines] = useState([])
  const [bars, setBars] = useState(() => Array(BAR_COUNT).fill(4))
  const [fillerCounts, setFillerCounts] = useState(initialCounts)
  const [fallbackError, setFallbackError] = useState(false)
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [tabWarning, setTabWarning] = useState(null) // { msg: string, type: 'success' | 'error' }

  const socketRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const streamRef = useRef(null)
  const intervalRef = useRef(null)
  const waveIntervalRef = useRef(null)
  const finalTranscriptRef = useRef('')
  const lastInterimRef = useRef('')
  const fillerCountsRef = useRef(initialCounts)
  const stoppedRef = useRef(false)

  const buildLines = useCallback((fullText) => {
    if (!fullText) return []
    const words = fullText.split(' ').filter(Boolean)
    const chunks = []
    let chunk = []
    for (const word of words) {
      chunk.push(word)
      const endsPhrase = /[.,!?]$/.test(word)
      if (chunk.length >= 6 || endsPhrase) {
        chunks.push(chunk.join(' '))
        chunk = []
      }
    }
    if (chunk.length) chunks.push(chunk.join(' '))
    return chunks.map((text, i) => ({
      text,
      isInterim: i === chunks.length - 1 && !/[.,!?]$/.test(text)
    }))
  }, [])

  // ── TAB SWITCH HANDLING (Edge Case 9) ──────────────────────────────
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && !stoppedRef.current) {
        setTabWarning({ msg: "Connection restored. Still recording.", type: 'success' })
        setTimeout(() => setTabWarning(null), 3000)

        if (socketRef.current && socketRef.current.readyState !== WebSocket.OPEN) {
          setTabWarning({ msg: "Recording interrupted.", type: 'error' })
        }
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  // ── INITIALIZATION ─────────────────────────────────────────────────
  useEffect(() => {
    waveIntervalRef.current = setInterval(() => {
      setBars(prev => prev.map(() => Math.random() * 48 + 4))
    }, 80)

    let isCancelled = false
    const audioQueue = []

    const initDeepgram = async (codeToUse, isFallback = false) => {
      try {
        if (!streamRef.current) {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
          if (isCancelled) {
            stream.getTracks().forEach(t => t.stop())
            return
          }
          streamRef.current = stream
        }

        if (!intervalRef.current) {
          intervalRef.current = setInterval(() => {
            setSeconds(s => s + 1)
          }, 1000)
        }

        const mediaRecorder = new MediaRecorder(streamRef.current)
        mediaRecorderRef.current = mediaRecorder

        const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3002' : '');
        const proxyBase = API_URL.replace(/^http/, 'ws')
        const socket = new WebSocket(
          `${proxyBase}/stream?lang=${codeToUse}&model=nova-2`
        )
        socketRef.current = socket

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0 && socket.readyState === WebSocket.OPEN) {
            socket.send(e.data)
          }
        }

        socket.onopen = () => {
          if (isCancelled) { socket.close(); return }
          // Tiny delay to let hardware mic warm up after permissions are granted
          setTimeout(() => {
            if (!isCancelled && mediaRecorder.state === 'inactive') {
              mediaRecorder.start(250)
            }
          }, 300)
        }

        socket.onerror = (err) => {
          if (!isFallback && codeToUse !== 'en') {
            setFallbackError(true)
            if (socketRef.current && socketRef.current.readyState <= WebSocket.OPEN) socketRef.current.close()
            if (!isCancelled) initDeepgram('en', true)
          }
        }

        socket.onmessage = (message) => {
          const data = JSON.parse(message.data)
          if (data.channel && data.channel.alternatives && data.channel.alternatives.length > 0) {
            const transcriptChunk = data.channel.alternatives[0].transcript
            const isFinal = data.is_final
            if (transcriptChunk) {
              // Always track latest interim as backup in case DG closes before sending final
              lastInterimRef.current = transcriptChunk
            }
            if (isFinal && transcriptChunk) {
              lastInterimRef.current = '' // clear — captured in final
              const currentCounts = { ...fillerCountsRef.current }
              let countsChanged = false
              const activeLangCode = isFallback ? 'en' : codeToUse
              const fillerList = fillerWordMap[activeLangCode] || fillerWordMap['en']
              fillerList.forEach(word => {
                const regex = new RegExp('\\b' + word + '\\b', 'gi')
                const matches = transcriptChunk.match(regex)
                if (matches) {
                  currentCounts[word] = (currentCounts[word] || 0) + matches.length
                  countsChanged = true
                }
              })
              if (countsChanged) {
                fillerCountsRef.current = currentCounts
                setFillerCounts(currentCounts)
              }
              finalTranscriptRef.current += ' ' + transcriptChunk
            }
            const fullText = (finalTranscriptRef.current + ' ' + (isFinal ? '' : transcriptChunk)).trim()
            setTranscript(fullText)
            setLines(buildLines(fullText))
          }
        }
      } catch (err) {
        console.error('Mic Error:', err)
        setMicError(err.message || 'Microphone access denied or device not found.')
      }
    }

    initDeepgram(initialLangCode)

    return () => {
      isCancelled = true
      clearInterval(intervalRef.current)
      clearInterval(waveIntervalRef.current)
      if (mediaRecorderRef.current?.state !== 'inactive') mediaRecorderRef.current?.stop()
      socketRef.current?.close()
      streamRef.current?.getTracks().forEach(t => t.stop())
      streamRef.current = null // allow remount to get fresh mic access
    }
  }, [initialLangCode, buildLines])

  // ── STOP LOGIC ─────────────────────────────────────────────────────
  const handleStop = useCallback(() => {
    if (stoppedRef.current) return
    stoppedRef.current = true
    
    clearInterval(intervalRef.current)
    clearInterval(waveIntervalRef.current)
    if (mediaRecorderRef.current?.state !== 'inactive') mediaRecorderRef.current?.stop()
    socketRef.current?.close()
    streamRef.current?.getTracks().forEach(t => t.stop())

    // Wait 800ms for Deepgram to flush any in-flight final transcript for the last utterance
    setTimeout(() => {
      const best = finalTranscriptRef.current.trim()
        || (finalTranscriptRef.current.trim() + ' ' + lastInterimRef.current).trim()
        || transcript
        || '[No speech detected]'
      if (!hasSubmitted) {
        setHasSubmitted(true)
        onDone(best, fillerCountsRef.current)
      }
    }, 800)
  }, [transcript, onDone, hasSubmitted])

  useEffect(() => {
    if (seconds >= AUTO_SUBMIT_AT) {
      handleStop()
    }
  }, [seconds, handleStop])

  const visibleLines = lines.slice(-MAX_LINES)
  const activeFillers = Object.entries(fillerCounts).filter(([_, count]) => count > 0)
  
  const radius = 44
  const circumference = 2 * Math.PI * radius
  const autoTimeLeft = Math.max(0, MAX_TIME - seconds)
  const progress = autoTimeLeft / MAX_TIME
  const dashOffset = circumference * (1 - progress)

  // Trigger leave confirmation (Edge Case 10)
  const handleQuit = () => {
    window.history.back()
  }

  if (micError) {
    return (
      <div className="rec rec--error" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>Microphone Error</h2>
        <div style={{ background: '#ffeeee', color: '#cc0000', padding: '16px', borderRadius: '8px', marginBottom: '24px', maxWidth: '400px' }}>
          <p>{micError}</p>
          <p style={{ marginTop: '10px', fontSize: '14px' }}>Please ensure your browser has permission to use the microphone and that a device is connected.</p>
        </div>
        <button className="btn btn--solid" onClick={() => window.location.href = '/'}>GO BACK</button>
      </div>
    )
  }

  return (
    <div className="rec">
      {tabWarning && (
        <div className={`rec__tab-banner rec__tab-banner--${tabWarning.type}`}>
          {tabWarning.msg}
          {tabWarning.type === 'error' && <button onClick={() => window.location.reload()}>RESTART SESSION</button>}
        </div>
      )}



      <div className="rec__top-info">
        <div className="rec__topic">
          {topic && topic.includes('\n') ? (
            <>
              <span className="rec__topic-main">{topic.split('\n')[0]}</span>
              <span className="rec__topic-sub">{topic.split('\n')[1]}</span>
            </>
          ) : (
            <span className="rec__topic-main">{topic}</span>
          )}
        </div>
        {fallbackError && <div className="rec__err-msg">English fallback active</div>}
      </div>

      <div className="rec__center">
        <div className="rec__ring-wrap">
          <svg className="rec__ring-svg" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="3" />
            <circle
              cx="50" cy="50" r={radius} fill="none"
              stroke={autoTimeLeft <= 10 ? '#cc2b2b' : 'rgba(0,0,0,0.2)'}
              strokeWidth="3" strokeLinecap="round"
              strokeDasharray={circumference} strokeDashoffset={dashOffset}
              transform="rotate(-90 50 50)"
              style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }}
            />
          </svg>
          <div className="rec__ring-inner">
            <span className="rec__countdown-num" style={{ color: autoTimeLeft <= 10 ? '#cc2b2b' : 'inherit' }}>{autoTimeLeft}</span>
            <span className="rec__label" style={{ color: autoTimeLeft <= 10 ? '#cc2b2b' : undefined }}>SEC LEFT</span>
          </div>
        </div>

        <div className="rec__lines">
          {visibleLines.length === 0 && <p className="rec__prompt">Start speaking…</p>}
          {visibleLines.map((line, i) => {
            const age = visibleLines.length - 1 - i
            const opacity = Math.max(0.1, 1 - age * 0.2)
            const scale = 1 - age * 0.04
            const blur = age * 0.5
            return (
              <p key={i} className={`rec__line ${line.isInterim ? 'rec__line--interim' : ''}`}
                style={{ opacity, transform: `scale(${scale})`, filter: blur > 0 ? `blur(${blur}px)` : 'none' }}>
                {line.text}
              </p>
            )
          })}
        </div>
      </div>

      <div className="rec__waveform">
        <div className="rec__waveform-inner">
          {bars.map((h, i) => <div key={i} className="rec__bar" style={{ height: `${h}px` }} />)}
        </div>
      </div>

      {/* QUIT BUTTON (Requirement) - Manual submission removed */}
      <div className="rec__controls">
        <button className="rec__quit-btn" onClick={handleQuit}>QUIT SESSION</button>
      </div>

      <div className="rec__footer">
        <div className="rec__lang-pill">Speaking in {selectedLanguage}</div>
        <span className="rec__min" style={{ color: autoTimeLeft <= 10 ? '#cc2b2b' : undefined }}>
          Auto-submitting in {autoTimeLeft}s
        </span>
      </div>
    </div>
  )
}
