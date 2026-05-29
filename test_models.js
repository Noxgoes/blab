import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function testModel(modelName) {
  try {
    const model = genAI.getGenerativeModel({ model: modelName });
    const res = await model.generateContent("Say 'hello'");
    console.log(`[SUCCESS] ${modelName}:`, res.response.text().trim());
  } catch (err) {
    console.log(`[ERROR] ${modelName}:`, err.status, err.message.split('\n')[0]);
  }
}

async function run() {
  await testModel("gemini-1.5-flash");
  await testModel("gemini-2.5-flash");
  await testModel("gemini-flash-latest");
  await testModel("gemini-2.0-flash");
}
run();
