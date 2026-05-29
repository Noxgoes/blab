import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Contact({ onStart }) {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({ name: '', email: '', subject: 'Just saying hi! 💖', message: '' })
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    setLoading(true)
    // Carrier pigeon speed simulation
    setTimeout(() => {
      setLoading(false)
      setSubmitted(true)
    }, 1200)
  }

  return (
    <div className="contact-screen">
      <div className="contact__container">
        <header className="contact__header">
          <span className="contact__badge">✦ SOLO DEV PROJECT</span>
          <h1 className="contact__title">
            TALK IS CHEAP.<br />
            <em className="contact__title-accent">say hello</em><br />
            TO THE CREATOR.
          </h1>
          <p className="contact__subtitle">
            I built BLAB in my bedroom because I kept saying "um" and "like" during meetings. 
            Got some thoughts, found some bugs, or just want to tell me you love the clean fonts? Ping me!
          </p>
        </header>

        <div className="contact__grid">
          {/* Indie Contact Form */}
          <div className="contact__form-container" style={{ borderRadius: '16px', borderStyle: 'dashed' }}>
            {submitted ? (
              <div className="contact__success-state">
                <span className="contact__success-badge" style={{ background: 'var(--text-primary)', color: 'var(--bg)' }}>
                  🕊️ CARRIER PIGEON LAUNCHED
                </span>
                <h3 className="contact__success-title" style={{ fontFamily: 'var(--font-mono)', fontSize: '1.8rem' }}>
                  PING TRANSMITTED!
                </h3>
                <p className="contact__success-desc">
                  Your message has been dispatched successfully! Since I'm just a solo dev juggling coffee, code, and sleep, I'll review this as soon as my compiler finishes. Thanks for testing my creation!
                </p>
                <button className="btn btn--primary btn--small" style={{ marginTop: 24 }} onClick={() => setSubmitted(false)}>
                  SEND ANOTHER PING
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="contact__form">
                <div className="contact__form-group">
                  <label className="contact__label">👤 WHO ARE YOU?</label>
                  <input
                    type="text"
                    className="contact__input"
                    placeholder="e.g. Satoshi Nakamoto"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    required
                    disabled={loading}
                    style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}
                  />
                </div>

                <div className="contact__form-group">
                  <label className="contact__label">✉️ WHERE CAN I REPLY TO YOU?</label>
                  <input
                    type="email"
                    className="contact__input"
                    placeholder="e.g. you@earth.com"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    required
                    disabled={loading}
                    style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}
                  />
                </div>

                <div className="contact__form-group">
                  <label className="contact__label">🏷️ WHAT'S THE SCOOP?</label>
                  <select
                    className="contact__input contact__select"
                    value={formData.subject}
                    onChange={e => setFormData({ ...formData, subject: e.target.value })}
                    disabled={loading}
                    style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}
                  >
                    <option value="Just saying hi! 💖">JUST SAYING HI! 💖</option>
                    <option value="Found a bug... oops 🐛">FOUND A BUG... OOPS 🐛</option>
                    <option value="Feature idea! 🚀">FEATURE IDEA! 🚀</option>
                    <option value="Hire me / Collaborate 🤝">HIRE ME / COLLABORATE 🤝</option>
                    <option value="Other random stuff ☕️">OTHER RANDOM STUFF ☕️</option>
                  </select>
                </div>

                <div className="contact__form-group">
                  <label className="contact__label">📝 SPILL THE BEANS</label>
                  <textarea
                    className="contact__input contact__textarea"
                    placeholder="Type your message, advice, or tell me your favorite lofi tracks..."
                    rows={5}
                    value={formData.message}
                    onChange={e => setFormData({ ...formData, message: e.target.value })}
                    required
                    disabled={loading}
                    style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}
                  />
                </div>

                <button type="submit" className="contact__submit-btn" disabled={loading} style={{ borderRadius: '8px' }}>
                  {loading ? '🦅 DISPATCHING PIGEON...' : 'FIRE PIGEON 🚀'}
                </button>
              </form>
            )}
          </div>

          {/* Indie Dev Details */}
          <div className="contact__details" style={{ gap: '2rem' }}>
            <div className="contact__info-block" style={{ padding: '24px', background: 'rgba(255,255,255,0.3)', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '16px' }}>
              <span className="contact__info-label" style={{ borderBottomColor: 'rgba(0,0,0,0.1)' }}>☕️ DEV FUEL & METRICS</span>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8, fontFamily: 'var(--font-mono)', fontSize: 12, opacity: 0.8 }}>
                <div>☕️ <strong>Coffee consumed today:</strong> 4.5 cups</div>
                <div>🎧 <strong>Looping:</strong> Lo-Fi Beats to Cry/Code To</div>
                <div>🐛 <strong>Unresolved bugs:</strong> Let's not count</div>
                <div>🏠 <strong>Location:</strong> Coding in my pajamas, SF</div>
              </div>
            </div>

            <div className="contact__info-block" style={{ padding: '24px', background: 'rgba(255,255,255,0.3)', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '16px' }}>
              <span className="contact__info-label">⚡ DIRECT CHANNELS</span>
              <p className="contact__info-text" style={{ fontSize: 13 }}>
                Prefer simple email? Shoot one to my inbox:<br />
                <a href="mailto:noxmps@gmail.com" className="contact__info-link" style={{ fontWeight: 'bold' }}>noxmps@gmail.com</a>
              </p>
              <p className="contact__info-text" style={{ fontSize: 12, marginTop: 8 }}>
                Or, if you code, open a pull request/issue on my GitHub repos. Let's make this app awesome together!
              </p>
            </div>

            <div className="contact__info-block" style={{ textAlign: 'center', opacity: 0.6, fontSize: 11, fontFamily: 'var(--font-mono)' }}>
              <p>Built with ☕️, React, and pure curiosity.</p>
              <p>No sales reps. No corporate meetings. Just code.</p>
            </div>
          </div>
        </div>

        <footer className="contact__footer">
          <button className="contact__cta" onClick={onStart} style={{ borderRadius: '30px' }}>
            BACK TO SPEAKING ⚡
          </button>
        </footer>
      </div>
    </div>
  )
}
