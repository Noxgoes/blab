const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3002' : '/api');

export async function analyzeSpeech(transcript, fillerCounts, language, level, topic) {
  try {
    const res = await fetch(`${API_URL}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript, fillerCounts, language, level, topic })
    });
    if (!res.ok) {
      let msg = `Server returned status ${res.status}`;
      try {
        const errJson = await res.json();
        if (errJson && errJson.error) msg = errJson.error;
      } catch (e) {}
      throw new Error(msg);
    }
    return await res.json();
  } catch (err) {
    if (err.name === 'TypeError' || err.message.toLowerCase().includes('fetch')) {
      throw new Error("Local backend server is offline. Run 'node server.js' to start it on port 3002.");
    }
    throw err;
  }
}

export function parseJSON(text) {
  // Strip markdown fences
  let cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '')
  cleaned = cleaned.trim()
  return JSON.parse(cleaned)
}

