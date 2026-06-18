import Groq from "groq-sdk";

export const getGroqClient = (apiKey) => new Groq({ apiKey });

export async function analyzeTranscript(groq, { transcript, language, level, topic, fillerCounts }) {
  const cleanTranscript = (transcript || '').replace(/<[^>]*>?/gm, '').trim().slice(0, 5000);

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    max_tokens: 1600,
    temperature: 0.7,
    response_format: { type: "json_object" },
    messages: [
      {
        role: 'system',
        content: `You are BLAB, a direct and constructive spoken language coach. Analyze transcripts and give actionable, specific feedback — always quote or reference actual words the user said. Never be vague, generic, or use jokes/roasts.

CRITICAL RULES:
1. 'what_you_did_well' MUST have 2-4 items. Even terrible speakers did SOMETHING — attempted the topic, used a correct word, formed a sentence, showed courage. Find it.
2. 'where_you_fell_apart' MUST have 2-4 items with specific, actionable improvement steps the user can practice today.
3. 'frameworks' MUST have exactly 2 items with non-empty 'how' fields.
4. 'next_focus' MUST be a single concrete, actionable sentence.
5. ALL text values (coach_line, feedback strings, observations, etc.) MUST be written in ${language}. Keep JSON keys in English.`
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
  "coach_line": "<candid, actionable one-liner quoting actual words>",
  "vibe_analysis": "<Hesitant/Confident/Scattered/Rushed/Frozen/Sharp>",
  "filler_breakdown": {
    "total": <number>,
    "verdict": "<Clean/Acceptable/Heavy/Excessive>"
  },
     "feedback_breakdown": {
    "fillers": "Direct advice on the specific fillers they used, as a plain sentence.",
    "completion": "Whether they explored the topic enough, as a plain sentence.",
    "grammar": "One specific error they made and how to fix it, written as a single plain sentence (e.g. 'You said X — say Y instead').",
    "confidence": "Observation on their hesitation/pacing, as a plain sentence.",
    "spontaneity": "Depth of original thought vs generic phrases, as a plain sentence.",
    "pauses": "Observation on silence usage, as a plain sentence."
  },
  "sentence_analysis": {
    "structure_type": "<Simple/Complex/Run-on/Fragmented>",
    "observation": "One clear, constructive observation about their sentence architecture.",
    "tip": "One specific architectural tip to improve."
  },
  "grammar_notes": "Technical notes on their grammar.",
  "grammatical_level": "A1-C2",
  "native_comparison": "2-3 sentences on how a native would differ.",
  "what_you_did_well": ["ALWAYS return 2-4 specific positive points. Even poor speakers attempt something — find it. Never return an empty array."],
  "where_you_fell_apart": ["ALWAYS return 2-4 specific improvement points grounded in what they actually said. Never return an empty array."],
  "rewrite": "The full sentence they should have said instead.",
  "frameworks": [
    {"name": "FRAMEWORK NAME", "how": "Specific instruction on how to apply it to THIS topic and what they said. MUST be non-empty."},
    {"name": "FRAMEWORK NAME", "how": "Specific instruction on how to apply it to THIS topic and what they said. MUST be non-empty."}
  ],
  "next_focus": "The single most important actionable thing to fix next session. MUST be a non-empty plain sentence.",
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

