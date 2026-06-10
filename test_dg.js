import dotenv from 'dotenv'; dotenv.config();
import { getGroqClient, analyzeTranscript } from './api/shared.js';
const groq = getGroqClient(process.env.GROQ_API_KEY);
try {
  const result = await analyzeTranscript(groq, {
    transcript: 'So I think like you know when people communicate they need to be um very clear and like direct with what they are trying to say',
    language: 'English', level: 'Intermediate', topic: 'Communication',
    fillerCounts: { 'um': 1, 'like': 2 }
  });
  console.log('SUCCESS score:', result.score);
  console.log('coach_line:', result.coach_line);
} catch (err) {
  console.error('FAILED:', err.message?.slice(0, 500));
}
