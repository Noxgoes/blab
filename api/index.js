import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Groq from "groq-sdk";
import { rateLimit } from 'express-rate-limit';

dotenv.config();

const app = express();
app.use(cors({
  origin: '*'
}));
app.use(express.json());

const analyzeLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  message: { error: "Slow down. BLAB is cooling its circuits." }
});

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

async function analyzeTranscript(transcript, language, level, topic, fillerCounts) {
  const cleanTranscript = (transcript || '').replace(/<[^>]*>?/gm, '').trim().slice(0, 5000);

  const completion = await groq.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    max_tokens: 800,
    temperature: 0.7,
    messages: [
      {
        role: 'system',
        content: `You are BLAB, a brutally honest spoken language coach. You analyze transcripts and give direct, specific, no-sugarcoating feedback. Reference actual words the user said. Never be generic. You provide feedback in a strict JSON format. 
IMPORTANT: All text values and feedback strings in the JSON (including 'coach_line', 'feedback_breakdown' descriptions, 'sentence_analysis' observation/tip, 'grammar_notes', 'native_comparison', 'what_you_did_well', 'where_you_fell_apart', 'rewrite', 'frameworks' details, and 'next_focus') MUST be written entirely in the user's chosen language: ${language}. Keep the JSON keys and fixed categories (like 'vibe_analysis' or 'structure_type') in English.`
      },
      {
        role: 'user',
        content: `Language: ${language}
Level: ${level}
Topic: ${topic}
Transcript: ${cleanTranscript}
Detected fillers: ${JSON.stringify(fillerCounts)}

Score 0-100 using this formula (Internal):
- Filler penalty (0-25), Completion (0-25), Grammar (0-20), Confidence (0-15), Spontaneity (0-15).

Return ONLY valid JSON, no markdown:
{
  "score": <0-100>,
  "coach_line": "<brutal one liner quoting actual words>",
  "vibe_analysis": "<Hesitant/Confident/Scattered/Rushed/Frozen/Sharp>",
  "filler_breakdown": {
    "total": <number>,
    "verdict": "<Clean/Acceptable/Heavy/Excessive>"
  },
  "feedback_breakdown": {
    "fillers": "Direct advice on the specific fillers they used.",
    "completion": "Whether they explored the topic enough.",
    "grammar": "Point out one specific error and give a 'CORRECTED:' version.",
    "confidence": "Observation on their hesitation/pacing.",
    "spontaneity": "Depth of original thought vs generic phrases.",
    "pauses": "Observation on silence usage."
  },
  "sentence_analysis": {
    "structure_type": "<Simple/Complex/Run-on/Fragmented>",
    "observation": "One brutal observation about their sentence architecture.",
    "tip": "One specific architectural tip to improve."
  },
  "grammar_notes": "Technical notes on their grammar.",
  "grammatical_level": "A1-C2",
  "native_comparison": "2-3 sentences on how a native would differ.",
  "what_you_did_well": ["3-4 specific positive points"],
  "where_you_fell_apart": ["3-4 specific negative/improvement points"],
  "rewrite": "The full sentence they should have said instead.",
  "frameworks": [
    {"name": "STAR", "how": "how to use it here"},
    {"name": "PEEL", "how": "how to use it here"}
  ],
  "next_focus": "The single most important thing to fix next.",
  "rank": "Descriptive title based on performance",
  "score_breakdown": {
    "filler_penalty": <0-25>,
    "completion": <0-25>,
    "grammar": <0-20>,
    "confidence": <0-15>,
    "spontaneity": <0-15>
  },
  "xp": <number 20-100>
}`
      }
    ]
  });

  const text = completion.choices[0].message.content;
  const clean = text.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}

// Serverless API endpoints
app.post("/api/translate-topic", async (req, res) => {
  const { topic, language } = req.body;
  if (!topic || !language || language.toLowerCase() === 'english') {
    return res.json({ translatedTopic: topic });
  }

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      max_tokens: 200,
      temperature: 0.3,
      messages: [
        {
          role: 'system',
          content: `You are a precise translator. Translate the given English topic or question into natural, native ${language}. Return ONLY the translated string without quotes or extra commentary.`
        },
        {
          role: 'user',
          content: topic
        }
      ]
    });
    const translated = (completion.choices[0].message.content || '').replace(/^["']|["']$/g, '').trim();
    res.json({ translatedTopic: translated });
  } catch (err) {
    console.error("Translate Error:", err);
    res.json({ translatedTopic: topic });
  }
});

app.post("/api/analyze", analyzeLimiter, async (req, res) => {
  const { transcript, fillerCounts, language, level, topic } = req.body;

  if (!transcript || transcript.trim().split(/\s+/).length < 10) {
    return res.status(400).json({ error: 'Not enough speech detected.' });
  }

  try {
    const feedback = await analyzeTranscript(
      transcript,
      language,
      level,
      topic,
      fillerCounts
    );
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
