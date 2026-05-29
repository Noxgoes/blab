import dotenv from "dotenv";
dotenv.config();

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY not found in .env");
    return;
  }
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
  const data = await response.json();
  if (data.models) {
    console.log("Available Flash Models:");
    data.models
      .map(m => m.name)
      .filter(n => n.toLowerCase().includes("flash"))
      .forEach(n => console.log(n));
  } else {
    console.log("No models found:", data);
  }
}
listModels();
