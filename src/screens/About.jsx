import { useNavigate } from 'react-router-dom'
import { RANKS } from '../utils/storage'

const RANK_DETAILS = [
  {
    name: 'MUTE',
    range: '0 – 199 XP',
    emoji: '🤐',
    desc: "You haven't really spoken yet. Every legend starts here. (welcome to the club)",
    color: '#888',
  },
  {
    name: 'MUMBLER',
    range: '200 – 499 XP',
    emoji: '😬',
    desc: 'Words are coming out... technically. Still swallowing half the syllables though.',
    color: '#b5a07a',
  },
  {
    name: 'RAMBLER',
    range: '500 – 999 XP',
    emoji: '🌀',
    desc: 'You can speak! But you also say seventeen things when two would do. We see you.',
    color: '#8b6fc7',
  },
  {
    name: 'SMOOTH TALKER',
    range: '1000 – 1799 XP',
    emoji: '🎙️',
    desc: "People actually pause to listen when you talk. That's rare. Don't blow it.",
    color: '#3ba8c4',
  },
  {
    name: 'GHOST SPEAKER',
    range: '1800+ XP',
    emoji: '👻',
    desc: 'You leave rooms quiet not because you stuttered, but because they were actually thinking. Elite.',
    color: '#1edb8c',
  },
]

const ARCHETYPES = [
  {
    name: 'MARCO THE RAMBLER',
    img: '/images/marco-the rambler.png',
    desc: "His brain moves 3x faster than his mouth. Currently hyperventilating. He needs to learn that silence isn't failure — it's punctuation.",
    signature: '“So basically what I\'m trying to say is...”'
  },
  {
    name: 'NADIA THE FREEZER',
    img: '/images/nadia - the freezer.png',
    desc: "Immaculate notes. Zero voice. Stares blankly at screens. She cannot bridge the gap between knowing something and saying it.",
    signature: '“Sorry, what was the question?”'
  },
  {
    name: 'DEV THE RUSHER',
    img: '/images/dev - the rusher.png',
    desc: "Speedrunning sentences to escape interaction. Breaths are optional. He barrels through sentences mistaking speed for confidence.",
    signature: 'Finishing a 60s answer with no idea what he said.'
  },
  {
    name: 'CAMILLE THE PRETENDER',
    img: '/images/camille the pretender.png',
    desc: "Immaculate vocabulary, emotionally hollow. Beautiful architectural sentences, but there's nothing actually inside them.",
    signature: 'Speaking for 2 mins, leaving everyone nodding but clueless.'
  },
  {
    name: 'AYO THE SPARKER',
    img: '/images/ayo-the spaker.png',
    desc: "A brilliant first hook followed by absolute smoke. A firework — spectacular for three seconds, then absolute quiet.",
    signature: '“...and yeah, so, I mean...”'
  },
  {
    name: 'LENA THE GHOST SPEAKER',
    img: '/images/lena the ghost speaker.png',
    desc: "Comfortable with silence in a way that makes others sweat. Speaks less than anyone else, but everyone remembers every word.",
    signature: 'Saying less, making it count.'
  }
]

export default function About({ onStart }) {
  const navigate = useNavigate()

  return (
    <div className="about-screen">
      <div className="about__container">
        <header className="about__header">
          <span className="about__badge">✦ THE BACKSTORY</span>
          <h1 className="about__title">
            I SPOKE TOO FAST.<br />
            <em className="about__title-accent">said "um" 400x</em><br />
            SO I BUILT THIS.
          </h1>
          <p className="about__subtitle">
            Hi, I'm the solo indie dev behind BLAB. This whole project started after I completely bombed a presentation 
            by stuttering and "uh-ing" my way through 15 slides of absolute silence. There is no backspace for spoken words—so I built a game to fix my mouth.
          </p>
        </header>

        {/* The Fun Features */}
        <div className="about__grid">
          <div className="about__card" style={{ borderRadius: '16px', borderStyle: 'dashed' }}>
            <div className="about__card-num">☕️</div>
            <h3 className="about__card-title">Vocal Laziness Exterminator</h3>
            <p className="about__card-desc">
              Instead of an expensive speech coach who nods politely, my code uses real-time vocal analysis to catch every single "uh", "like", "so basically", and "you know" that slips past your teeth. No filters, no sugarcoating.
            </p>
          </div>

          <div className="about__card" style={{ borderRadius: '16px', borderStyle: 'dashed' }}>
            <div className="about__card-num">🌶️</div>
            <h3 className="about__card-title">Absolute Nightmare Mode</h3>
            <p className="about__card-desc">
              For when you want to feel the genuine sweat. It speeds up the timers, gives you zero prep, and simulates the absolute heart-pumping panic of giving an elevator pitch to an executive board that has already checked out.
            </p>
          </div>

          <div className="about__card" style={{ borderRadius: '16px', borderStyle: 'dashed' }}>
            <div className="about__card-num">🎯</div>
            <h3 className="about__card-title">Instant organized thinking</h3>
            <p className="about__card-desc">
              You get random, weird, and highly controversial prompts designed to trip you up. The goal isn't to be politically correct or genius—it's to train your brain to form complete coherent thoughts instantly under pressure.
            </p>
          </div>
        </div>

        {/* Rank Showcase */}
        <section className="about__archetypes" style={{ borderBottom: 'none', paddingBottom: 0 }}>
          <h2 className="about__socials-title" style={{ fontFamily: 'var(--font-serif)', fontSize: '2.2rem' }}>
            THE RANK LADDER
          </h2>
          <p className="about__socials-sub" style={{ maxWidth: '600px', margin: '0 auto 3rem auto' }}>
            Earn XP every session. Climb from total silence to full ghost-mode. 
            Where are you right now?
          </p>

          <div className="about__ranks-list">
            {RANK_DETAILS.map((rank, i) => (
              <div key={rank.name} className="about__rank-row" style={{ '--rank-color': rank.color }}>
                <div className="about__rank-left">
                  <span className="about__rank-emoji">{rank.emoji}</span>
                  <div>
                    <div className="about__rank-name" style={{ color: rank.color }}>{rank.name}</div>
                    <div className="about__rank-range">{rank.range}</div>
                  </div>
                </div>
                <div className="about__rank-desc">{rank.desc}</div>
                {i < RANK_DETAILS.length - 1 && (
                  <div className="about__rank-arrow">↓</div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Speaker Archetypes Section */}
        <section className="about__archetypes" style={{ borderTop: '1px dashed rgba(0,0,0,0.1)', paddingTop: '5rem' }}>
          <h2 className="about__socials-title" style={{ fontFamily: 'var(--font-serif)', fontSize: '2.2rem' }}>
            SPEAKER ARCHETYPES
          </h2>
          <p className="about__socials-sub" style={{ maxWidth: '600px', margin: '0 auto 3rem auto' }}>
            Our speech analysis engine identifies your personal voice archetype. 
            Meet the six tragic twins and elite personalities we mapped.
          </p>

          <div className="about__archetypes-grid">
            {ARCHETYPES.map((arch) => (
              <div key={arch.name} className="about__archetype-card">
                <div className="about__avatar-wrapper">
                  <img src={arch.img} alt={arch.name} className="about__avatar-img" />
                </div>
                <h4 className="about__avatar-title">{arch.name}</h4>
                <p className="about__avatar-desc">{arch.desc}</p>
                <div className="about__avatar-signature">
                  <span className="about__sig-lbl">SIGNATURE</span>
                  <span className="about__sig-val">{arch.signature}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Fun Indie Footer info */}
        <section className="about__socials" style={{ borderTop: '1px dashed rgba(0, 0, 0, 0.1)', paddingTop: '5rem' }}>
          <h2 className="about__socials-title">LET'S CONNECT</h2>
          <p className="about__socials-sub">Follow my journey, drop a DM, or talk voice-tech with me on X.</p>
          
          <div className="about__socials-list" style={{ display: 'flex', justifyContent: 'center' }}>
            <a href="https://x.com/noma_exe" target="_blank" rel="noreferrer" className="about__social-item" style={{ maxWidth: '320px', width: '100%', borderRadius: '16px' }}>
              <span className="about__social-icon">𝕏</span>
              <span className="about__social-name">Twitter / X</span>
              <span className="about__social-handle">@noma_exe</span>
            </a>
          </div>
        </section>

        <footer className="about__footer">
          <button className="about__cta" onClick={onStart} style={{ borderRadius: '30px' }}>
            LET'S SPEAK NOW! ⚡
          </button>
        </footer>
      </div>
    </div>
  )
}
