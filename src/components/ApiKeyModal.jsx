import { useState } from 'react'

export default function ApiKeyModal({ onSave, onClose }) {
  const [key, setKey] = useState('')

  return (
    <div className="api-key-modal" onClick={onClose}>
      <div className="api-key-modal__box" onClick={e => e.stopPropagation()}>
        <h2 className="api-key-modal__title">API Key Required</h2>
        <p className="api-key-modal__desc">
          BLAB uses Claude to generate topics and analyze your speech.
          Enter your Anthropic API key to get started. It stays in your browser.
        </p>
        <input
          className="api-key-modal__input"
          type="password"
          placeholder="sk-ant-..."
          value={key}
          onChange={e => setKey(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && key.trim() && onSave(key.trim())}
          autoFocus
        />
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', justifyContent: 'center' }}>
          <button
            className="btn btn--primary btn--small"
            disabled={!key.trim()}
            onClick={() => onSave(key.trim())}
          >
            Save & Continue
          </button>
          <button className="btn btn--ghost btn--small" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
