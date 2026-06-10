import Groq from "groq-sdk";

export const getGroqClient = (apiKey) => new Groq({ apiKey });

export async function analyzeTranscript(groq, { transcript, language, level, topic, fillerCounts }) {
  const cleanTranscript = (transcript || '').replace(/<[^>]*>?/gm, '').trim().slice(0, 5000);

  const completion = await groq.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    max_tokens: 800,
    temperature: 0.7,
    response_format: { type: "json_object" },
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
    "grammar": <0-20>,
    "completion": <0-25>,
    "confidence": <0-15>,
    "spontaneity": <0-15>
  },
  "xp": <number 20-100>
}`
      }
    ]
  });

  const text = completion.choices[0].message.content;
  // Try to extract JSON even if Groq adds extra text around it
  let clean = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  // If it doesn't start with {, try to find the first { ... } block
  if (!clean.startsWith('{')) {
    const match = clean.match(/\{[\s\S]*\}/);
    if (match) clean = match[0];
  }
  try {
    return JSON.parse(clean);
  } catch (parseErr) {
    console.error('JSON parse failed. Raw Groq output (first 500 chars):', text.slice(0, 500));
    throw new Error('Groq returned invalid JSON: ' + parseErr.message);
  }
}

export async function translateTopic(groq, { topic, language }) {
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
  return (completion.choices[0].message.content || '').replace(/^["']|["']$/g, '').trim();
}

export async function generateDeepgramToken(apiKey) {
  try {
    // 1. Fetch available projects to discover the project ID dynamically
    const projectsRes = await fetch("https://api.deepgram.com/v1/projects", {
      headers: { "Authorization": `Token ${apiKey}` }
    });
    if (!projectsRes.ok) {
      throw new Error(`Failed to fetch Deepgram projects: ${projectsRes.statusText}`);
    }
    const projectsData = await projectsRes.json();
    if (!projectsData.projects || projectsData.projects.length === 0) {
      throw new Error("No Deepgram projects found for the provided API key.");
    }
    const projectId = projectsData.projects[0].project_id;

    // 2. Request a short-lived scoped key
    const tokenRes = await fetch(`https://api.deepgram.com/v1/projects/${projectId}/keys`, {
      method: "POST",
      headers: {
        "Authorization": `Token ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        comment: "BLAB Temporary Session Token",
        scopes: ["usage:write", "listen:streaming"],
        time_to_live_in_seconds: 300
      })
    });
    if (!tokenRes.ok) {
      throw new Error(`Failed to generate Deepgram project key: ${tokenRes.statusText}`);
    }
    const tokenData = await tokenRes.json();
    return tokenData.key;
  } catch (err) {
    console.error("Deepgram short-lived key generation failed:", err.message);
    throw new Error("Failed to generate secure session token.");
  }
}
