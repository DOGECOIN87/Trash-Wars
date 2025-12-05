import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

// Simple client-side rate limit tracking to prevent spamming the API when quota is exceeded
let isRateLimited = false;
let rateLimitResetTime = 0;

const isBlocked = () => {
    if (isRateLimited) {
        if (Date.now() < rateLimitResetTime) {
            return true;
        }
        isRateLimited = false; // Cooldown expired
    }
    return false;
};

const handleApiError = (error: any) => {
    // Detect 429 or Quota Exceeded errors
    const msg = error?.message || JSON.stringify(error);
    if (msg.includes('429') || msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED')) {
        if (!isRateLimited) {
            console.warn("Gemini API quota exceeded. Switching to offline mode for 1 minute.");
            isRateLimited = true;
            rateLimitResetTime = Date.now() + 60000; // 1 minute backoff
        }
    } else {
        console.warn("Gemini API Error (fallback used):", error);
    }
};

const TRASH_TALK_FALLBACKS = [
    "Get wrecked, scrub!",
    "You belong in the bin!",
    "Recycled!",
    "Literal trash.",
    "Composted.",
    "Not gonna make it.",
    "Zero utility.",
    "Rugged.",
    "Absolute garbage.",
    "Cleaned up."
];

export const generateTrashTalk = async (winner: string, loser: string): Promise<string> => {
  if (!apiKey || isBlocked()) {
      return TRASH_TALK_FALLBACKS[Math.floor(Math.random() * TRASH_TALK_FALLBACKS.length)];
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are a grouchy, trash-obsessed monster living in a landfill. 
      Write a VERY short (max 6 words), funny, insulting taunt from ${winner} to ${loser} after defeating them.
      Keep it related to garbage, trash, smells, or crypto/blockchain slang.`,
      config: {
        maxOutputTokens: 20,
      }
    });
    return response.text ? response.text.trim().replace(/^"|"$/g, '') : TRASH_TALK_FALLBACKS[0];
  } catch (error) {
    handleApiError(error);
    return TRASH_TALK_FALLBACKS[Math.floor(Math.random() * TRASH_TALK_FALLBACKS.length)];
  }
};

const MARKET_FALLBACKS = [
    "Gas fees spiking due to methane leak.",
    "Sector 7 landfill reaches capacity.",
    "$TRASH token moons after raccoon raid.",
    "Whale detected: It's just a fat rat.",
    "New governance proposal: More bananas.",
    "Bear market? No, just a bear eating trash.",
    "Dump it? We live here.",
    "Liquidity pool drained by seagulls."
];

export const generateMarketUpdate = async (): Promise<string> => {
  if (!apiKey || isBlocked()) {
      return MARKET_FALLBACKS[Math.floor(Math.random() * MARKET_FALLBACKS.length)];
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Generate a breaking news headline ticker for the 'Gorbagana' blockchain (a trash-themed crypto network). 
      It should be funny, satirical, and relate to garbage or Oscar the Grouch style lore. Max 1 sentence.`,
      config: {
        maxOutputTokens: 50,
      }
    });
    return response.text ? response.text.trim() : MARKET_FALLBACKS[0];
  } catch (error) {
    handleApiError(error);
    return MARKET_FALLBACKS[Math.floor(Math.random() * MARKET_FALLBACKS.length)];
  }
};