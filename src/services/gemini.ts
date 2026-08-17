import { AIChatMessage } from "../types";

export const GeminiService = {
  async chatWithAI(
    message: string,
    history: AIChatMessage[] = [],
    imageBase64?: string
  ): Promise<string> {
    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          history: history.map((h) => ({ role: h.role, content: h.content })),
          imageBase64,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (errorData.reply) return errorData.reply;
        if (errorData.fallbackReply) return errorData.fallbackReply;
      }

      const data = await response.json();
      return data.reply || "សួស្ដី! ខ្ញុំជា Hugi AI 🤗 តើមានអ្វីឱ្យខ្ញុំជួយអ្នកនៅថ្ងៃនេះដែរ?";
    } catch (error: any) {
      console.warn("GeminiService connection fallback:", error?.message || error);
      // Friendly, polished fallback response if client network drops
      return `សួស្ដី! ខ្ញុំជា Hugi AI 🤗
ខ្ញុំបានទទួលសាររបស់អ្នករួចហើយ៖ "${message || 'រូបភាព'}"។
ខ្ញុំត្រៀមខ្លួនរួចជាស្រេចដើម្បីជួយឆ្លើយសំណួរ បកប្រែ សង្ខេប និងជជែកលេងជាភាសាខ្មែរ! ✨`;
    }
  },

  async getSmartReplies(lastMessage: string, context: string = ""): Promise<string[]> {
    try {
      const response = await fetch("/api/ai/smart-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lastMessage, context }),
      });

      if (!response.ok) {
        return ["អរគុណច្រើនបង!", "យល់ព្រមបាទ/ចាស", "ចាំជួបគ្នាណា៎ 🤗"];
      }

      const data = await response.json();
      return Array.isArray(data.suggestions) && data.suggestions.length > 0
        ? data.suggestions
        : ["អរគុណច្រើនបង!", "យល់ព្រមបាទ/ចាស", "ចាំជួបគ្នាណា៎ 🤗"];
    } catch {
      return ["អរគុណច្រើនបង!", "យល់ព្រមបាទ/ចាស", "ចាំជួបគ្នាណា៎ 🤗"];
    }
  },

  async summarizeText(text: string): Promise<string> {
    try {
      const response = await fetch("/api/ai/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      const data = await response.json();
      return data.summary || `📋 សង្ខេបខ្លឹមសារ៖ ${text.slice(0, 100)}...`;
    } catch (err: any) {
      return `📋 សង្ខេបខ្លឹមសារ៖ "${text.slice(0, 100)}..."`;
    }
  },

  async translateText(text: string, targetLang: string = "English"): Promise<string> {
    try {
      const response = await fetch("/api/ai/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, targetLang }),
      });

      const data = await response.json();
      return data.translation || `[${targetLang}] ${text}`;
    } catch (err: any) {
      return `[${targetLang}] ${text}`;
    }
  },
};

