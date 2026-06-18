import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { rateLimit } from 'express-rate-limit';
import { getGroqClient, analyzeTranscript, translateTopic, generateDeepgramToken } from "./shared.js";
import { Resend } from "resend";

dotenv.config();

const app = express();
app.set('trust proxy', 1);

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

const analyzeLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  message: { error: "Slow down. BLAB is cooling its circuits." }
});

const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  message: { error: "Too many requests. Please try again later." }
});

const groq = getGroqClient(process.env.GROQ_API_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);

app.post("/api/send-email", generalLimiter, async (req, res) => {
  if (!process.env.RESEND_API_KEY) {
    return res.status(500).json({ error: "RESEND_API_KEY is missing from environment variables." });
  }

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

app.get("/api/deepgram-token", generalLimiter, async (req, res) => {
  if (!process.env.VITE_DEEPGRAM_API_KEY) {
    return res.status(500).json({ error: "DEEPGRAM_API_KEY is missing from environment variables." });
  }
  try {
    const token = await generateDeepgramToken(process.env.VITE_DEEPGRAM_API_KEY);
    res.json({ token });
  } catch (err) {
    console.error("Deepgram Token Error:", err);
    res.status(500).json({ error: err.message || "Failed to generate token" });
  }
});

// Serverless API endpoints
app.post("/api/translate-topic", generalLimiter, async (req, res) => {
  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({ error: "GROQ_API_KEY is missing from Vercel environment variables." });
  }

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

app.post("/api/analyze", analyzeLimiter, async (req, res) => {
  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({ error: "GROQ_API_KEY is missing from Vercel environment variables." });
  }

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
    console.error('Groq Error:', err);
    res.status(500).json({ error: 'Something broke on our end. Try again.' });
  }
});
// Port listener for local fallback development
if (process.env.NODE_ENV !== 'production') {
  const port = process.env.PORT || 3002;
  app.listen(port, () => {
    console.log(`BLAB local serverless backend running on http://localhost:${port}`);
  });
}

export default app;
