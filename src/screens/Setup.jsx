import { useState } from 'react'

const LANGUAGES = [
  { name: 'English', native: 'English' },
  { name: 'Spanish', native: 'Español' },
  { name: 'French', native: 'Français' },
  { name: 'German', native: 'Deutsch' },
  { name: 'Italian', native: 'Italiano' },
  { name: 'Portuguese', native: 'Português' },
  { name: 'Korean', native: '한국어' },
  { name: 'Japanese', native: '日本語' },
  { name: 'Hindi', native: 'हिन्दी' },
  { name: 'Mandarin', native: '中文' },
  { name: 'Arabic', native: 'العربية' },
]

const LEVELS = [
  { key: 'Beginner', desc: 'Simple topics, short answers' },
  { key: 'Intermediate', desc: 'Opinions, reasoning, nuance' },
  { key: 'Advanced', desc: 'Arguments, debate, pressure' },
]

export default function Setup({ language, setLanguage, level, setLevel, mode, setMode, onDone }) {
  const [step, setStep] = useState(0)
  const [isRequestingMic, setIsRequestingMic] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [micError, setMicError] = useState('')

  const isNightmare = mode === 'nightmare'
  const canProceed = language && level && mode

  const handleSelectLanguage = (l) => {
    setLanguage(l)
    setStep(1)
  }

  const handleSelectLevel = (l) => {
    setLevel(l)
    setStep(2)
  }

  const handleSelectMode = (m) => {
    setMode(m)
  }

  const handleProceed = async () => {
    if (!canProceed) return
    setIsRequestingMic(true)
    setMicError('')

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Your browser does not support microphone access.')
      }

      if (navigator.permissions && navigator.permissions.query) {
        try {
          const status = await navigator.permissions.query({ name: 'microphone' })
          if (status.state === 'granted') {
            setIsRequestingMic(false)
            setIsGenerating(true)
            await onDone()
            return
          }
          if (status.state === 'denied') {
            throw new Error('Microphone access is blocked. Please enable it in browser settings.')
          }
        } catch (e) {
          if (e.message.includes('blocked')) throw e
        }
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach(track => track.stop())

      setIsRequestingMic(false)
      setIsGenerating(true)
      await onDone()
    } catch (err) {
      console.error('Proceed error:', err)
      setMicError(err.message || 'Error occurred. Please try again.')
      setIsRequestingMic(false)
      setIsGenerating(false)
    }
  }

  const ctaLabel = isGenerating
    ? 'GENERATING...'
    : isRequestingMic
      ? 'ALLOW MIC...'
      : isNightmare
        ? 'ENTER NIGHTMARE →'
        : 'FIND MY TOPIC →'

  return (
    <div className={`sp2${isNightmare ? ' sp2--nightmare' : ''}`}>

      {/* NAV — full width */}
      <nav className="sp2__nav">
        <div />
        <div className="sp2__step-indicator">
          <span className={`sp2__dot ${step >= 0 ? 'sp2__dot--done' : ''}`} />
          <span className="sp2__dot-line" />
          <span className={`sp2__dot ${step >= 1 ? 'sp2__dot--done' : ''}`} />
          <span className="sp2__dot-line" />
          <span className={`sp2__dot ${step >= 2 ? 'sp2__dot--done' : ''}`} />
        </div>
      </nav>

      {/* TWO COLUMNS */}
      <div className="sp2__columns">

        {/* LEFT — steps + CTA */}
        <div className="sp2__body">

          {/* STEP 0 — LANGUAGE */}
          <div className={`sp2__step ${step === 0 ? 'sp2__step--active' : step > 0 ? 'sp2__step--done' : ''}`}>
            <div className="sp2__step-header">
              <span className="sp2__step-num">01</span>
              <span className="sp2__step-label">
                {step > 0 ? `Speaking in ${language}` : 'Pick your language'}
              </span>
              {step > 0 && (
                <button className="sp2__edit-btn" onClick={() => setStep(0)}>CHANGE</button>
              )}
            </div>

            {step === 0 && (
              <div className="sp2__lang-grid">
                {LANGUAGES.map(l => (
                  <button
                    key={l.name}
                    className={`sp2__lang-card${language === l.name ? ' sp2__lang-card--on' : ''}`}
                    onClick={() => handleSelectLanguage(l.name)}
                  >
                    <span className="sp2__lang-name">{l.name}</span>
                    <span className="sp2__lang-native">{l.native}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* STEP 1 — LEVEL */}
          {step >= 1 && (
            <div className={`sp2__step sp2__step--slide ${step === 1 ? 'sp2__step--active' : step > 1 ? 'sp2__step--done' : ''}`}>
              <div className="sp2__step-header">
                <span className="sp2__step-num">02</span>
                <span className="sp2__step-label">
                  {step > 1 ? `Level: ${level}` : 'Pick your level'}
                </span>
                {step > 1 && (
                  <button className="sp2__edit-btn" onClick={() => setStep(1)}>CHANGE</button>
                )}
              </div>

              {step === 1 && (
                <div className="sp2__levels">
                  {LEVELS.map(l => {
                    const isOn = level === l.key
                    return (
                      <button
                        key={l.key}
                        className={`sp2__level-item${isOn ? ' sp2__level-item--on' : ''}`}
                        onClick={() => handleSelectLevel(l.key)}
                      >
                        <span className="sp2__level-name">{l.key}</span>
                        <span className="sp2__level-desc">{l.desc}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* STEP 2 — MODE */}
          {step >= 2 && (
            <div className="sp2__step sp2__step--slide sp2__step--active">
              <div className="sp2__step-header">
                <span className="sp2__step-num">03</span>
                <span className="sp2__step-label">Pick your mode</span>
              </div>

              <div className="sp2__modes">
                <button
                  className={`sp2__mode-card${mode === 'normal' ? ' sp2__mode-card--on' : ''}`}
                  onClick={() => handleSelectMode('normal')}
                >
                  <span className="sp2__mode-name">Normal</span>
                  <span className="sp2__mode-desc">Real topics. Real pressure. Real growth.</span>
                </button>
                <button
                  className={`sp2__mode-card sp2__mode-card--nightmare${mode === 'nightmare' ? ' sp2__mode-card--on sp2__mode-card--nightmare-on' : ''}`}
                  onClick={() => handleSelectMode('nightmare')}
                >
                  <span className="sp2__mode-name">Nightmare Mode</span>
                  <span className="sp2__mode-desc">Absurd prompts. No rules. Pure chaos.</span>
                  <span className="sp2__mode-warning">⚠ NOT FOR THE FAINT-HEARTED</span>
                </button>
              </div>
            </div>
          )}

          {/* CTA */}
          {micError && (
            <div className="sp2__mic-error">{micError}</div>
          )}
          <button
            className={`sp2__cta${isNightmare ? ' sp2__cta--nightmare' : ''}`}
            disabled={!canProceed || isRequestingMic || isGenerating}
            onClick={handleProceed}
          >
            {ctaLabel}
          </button>

        </div>{/* end sp2__body */}

        {/* RIGHT — artwork */}
        <div className="sp2__right">
          <img src="/images/tongue_mic.png" alt="" className="sp2__art" />
        </div>

      </div>{/* end sp2__columns */}
    </div>
  )
}
