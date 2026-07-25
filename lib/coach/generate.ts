import { GoogleGenerativeAI } from "@google/generative-ai";

const MODEL_NAME = "gemini-2.5-flash";
const API_KEY_ENV = "AIzaSyDOyM3m8F7Wr4O1e6Z-afQdyMaKTY8OOEQ";

/**
 * Sends a prompt to the configured LLM provider and returns the text response.
 * Throws if the API key is missing or the provi  der returns an error.
 *
 * All provider-specific details (model name, SDK, API key) are encapsulated
 * here so the provider can be swapped without modifying route logic.
 */
export async function generateCoachComment(
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const apiKey = process.env[API_KEY_ENV];

  if (!apiKey) {
    throw new Error(
      `${API_KEY_ENV} environment variable is not configured. ` +
        "Set it in .env.local to enable LLM coaching."
    );
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

  const result = await model.generateContent({
    systemInstruction: systemPrompt,
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
  });

  const text = result.response.text();
  return text;
}
