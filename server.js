import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { rateLimit } from 'express-rate-limit';
import { getGroqClient, analyzeTranscript, translateTopic } from "./api/shared.js";
import { Resend } from "resend";
import { WebSocketServer, WebSocket } from "ws";

dotenv.config();

const app = express();

app.use(cors({
  origin: function (origin, callback) {
    // Restrict local development to exact Vite port
    if (!origin || origin === 'http://localhost:5173') {
      return callback(null, true);
    }
    const allowedOrigins = [
      'https://blab.app',
      'https://blab-speech.vercel.app'
    ];
    if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(new Error('Blocked by CORS policy'));
    }
  }
}));
app.use(express.json());

// RATE LIMITING
const analyzeLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 10,
  message: { error: "Slow down. BLAB is cooling its circuits." }
});

const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 30,
  message: { error: "Too many requests. Please try again later." }
});

const groq = getGroqClient(process.env.GROQ_API_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);

app.post("/send-email", generalLimiter, async (req, res) => {
  const { name, email, subject, message } = req.body;

  if (!name || !email || !subject || !message) {
    return res.status(400).json({ error: "All fields are required." });
  }

  try {
    const data = await resend.emails.send({
      from: "BLAB Contact Form <onboarding@resend.dev>",
      to: ["noxmps@gmail.com"],
      replyTo: email,
      subject: `[BLAB scoop] ${subject}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; line-height: 1.6; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 8px;">
          <h2 style="color: #cc2b2b; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-top: 0;">New Message from BLAB</h2>
          <p><strong>From:</strong> ${name} (&lt;<a href="mailto:${email}">${email}</a>&gt;)</p>
          <p><strong>Subject:</strong> ${subject}</p>
          <p><strong>Message:</strong></p>
          <div style="background: #f9f9f9; padding: 15px; border-radius: 4px; border-left: 4px solid #cc2b2b; white-space: pre-wrap;">${message}</div>
        </div>
      `
    });
    res.json({ success: true, data });
  } catch (err) {
    console.error("Resend send error:", err);
    res.status(500).json({ error: err.message || "Failed to send email." });
  }
});

// Keep the event loop busy
setInterval(() => { }, 1000000);

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
  process.exit(1);
});

// Kept for backwards-compat but no longer needed
app.get("/deepgram-token", (req, res) => res.json({ token: "proxy" }));

app.post("/translate-topic", generalLimiter, async (req, res) => {
  const { topic, language } = req.body;
  if (!topic || !language || language.toLowerCase() === 'english') {
    return res.json({ translatedTopic: topic });
  }

  try {
    const translated = await translateTopic(groq, { topic, language });
    res.json({ translatedTopic: translated });
  } catch (err) {
    console.error("Translate Error:", err);
    res.json({ translatedTopic: topic });
  }
});

app.post("/analyze", analyzeLimiter, async (req, res) => {
  const { transcript, fillerCounts, language, level, topic } = req.body;

  if (typeof transcript !== 'string' || transcript.length > 20000) {
    return res.status(400).json({ error: 'Transcript too long or invalid.' });
  }

  if (!transcript || transcript.trim().split(/\s+/).length < 10) {
    return res.status(400).json({ error: 'Not enough speech detected.' });
  }

  try {
    const feedback = await analyzeTranscript(groq, {
      transcript,
      language,
      level,
      topic,
      fillerCounts
    });
    res.json(feedback);
  } catch (err) {
    const wordCount = transcript?.trim().split(/\s+/).length || 0;
    console.error(`Groq Error (transcript: ${wordCount} words, lang: ${language}, level: ${level}):`, err.message);
    res.status(500).json({ error: err.message || 'Something broke on our end. Try again.' });
  }
});

const port = process.env.PORT || 3002;
const server = app.listen(port, () => {
  console.log(`BLAB API (Groq Mode) running on port ${port}`);
});

server.on('error', (err) => {
  console.error('SERVER ERROR EVENT:', err);
});

// ── DEEPGRAM WEBSOCKET PROXY ──────────────────────────────────────────
// Browser connects to ws://localhost:3002/stream?lang=en&model=nova-2
// Server forwards to Deepgram with Authorization header (browsers can't set WS headers)
const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  const url = new URL(request.url, 'http://localhost:3002');
  if (url.pathname !== '/stream') {
    socket.destroy();
    return;
  }

  wss.handleUpgrade(request, socket, head, (browserWs) => {
    const apiKey = process.env.VITE_DEEPGRAM_API_KEY;
    if (!apiKey) {
      browserWs.close(1011, 'Missing API key');
      return;
    }

    // Build Deepgram URL from query params the browser passes
    const lang = url.searchParams.get('lang') || 'en';
    const model = url.searchParams.get('model') || 'nova-2';
    const dgParams = new URLSearchParams({
      model, language: lang,
      filler_words: 'true', punctuate: 'true',
      interim_results: 'true', utterance_end_ms: '1000'
    });
    const dgUrl = `wss://api.deepgram.com/v1/listen?${dgParams}`;
    console.log('[WS Proxy] Opening Deepgram connection, lang:', lang);

    const dgWs = new WebSocket(dgUrl, {
      headers: { Authorization: `Token ${apiKey}` }
    });

    // Buffer audio that arrives before Deepgram is open
    const audioQueue = [];
    let audioBytesSent = 0;

    dgWs.on('open', () => {
      console.log('[WS Proxy] Connected to Deepgram, flushing', audioQueue.length, 'queued chunks');
      while (audioQueue.length > 0) {
        const { data, isBinary } = audioQueue.shift();
        dgWs.send(data, { binary: isBinary });
      }
    });

    // Relay browser audio → Deepgram
    browserWs.on('message', (data, isBinary) => {
      if (isBinary) {
        audioBytesSent += data.length || 0;
        if (audioBytesSent % 10000 < 5000) {
          console.log(`[WS Proxy] Audio sent to DG: ${audioBytesSent} bytes total`);
        }
      }
      if (dgWs.readyState === WebSocket.OPEN) {
        dgWs.send(data, { binary: isBinary });
      } else if (dgWs.readyState === WebSocket.CONNECTING) {
        audioQueue.push({ data, isBinary });
      }
    });

    // Relay Deepgram transcript → browser (JSON text must NOT be sent as binary)
    dgWs.on('message', (data, isBinary) => {
      if (!isBinary) {
        try {
          const msg = JSON.parse(data.toString());
          const transcript = msg?.channel?.alternatives?.[0]?.transcript;
          if (transcript) console.log('[WS Proxy] DG transcript:', transcript.slice(0, 80));
        } catch (_) {}
      }
      if (browserWs.readyState === WebSocket.OPEN) browserWs.send(data, { binary: isBinary });
    });

    dgWs.on('error', (err) => {
      console.error('[WS Proxy] Deepgram error:', err.message);
      browserWs.close(1011, 'Deepgram connection failed');
    });

    dgWs.on('close', (code, reason) => {
      console.log(`[WS Proxy] Deepgram closed: ${code}, reason: "${reason?.toString()}", audioBytesSent: ${audioBytesSent}`);
      if (browserWs.readyState === WebSocket.OPEN) browserWs.close(code, reason);
    });

    browserWs.on('close', (code, reason) => {
      console.log(`[WS Proxy] Browser disconnected: ${code}`);
      if (dgWs.readyState === WebSocket.OPEN) dgWs.close();
    });

    browserWs.on('error', (err) => {
      console.error('[WS Proxy] Browser WS error:', err.message);
      if (dgWs.readyState === WebSocket.OPEN) dgWs.close();
    });
  });

});
