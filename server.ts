import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, query, where, getDocs, limit } from "firebase/firestore";
import firebaseConfig from "./firebase-applet-config.json";

dotenv.config();

// Initialize Firebase for server-side OpenGraph lookups
let firestoreDb: any = null;
try {
  const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
  firestoreDb = getFirestore(app, firebaseConfig.firestoreDatabaseId || "(default)");
} catch (e) {
  console.warn("[Server] Firebase Firestore init note:", e);
}

// Initialize Google Gen AI client with User-Agent header for telemetry
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// Candidate models for graceful fallback in case of high demand (503/429)
const FALLBACK_MODELS = [
  "gemini-2.5-flash",
  "gemini-flash-latest",
  "gemini-3.7-flash",
  "gemini-3.1-flash-lite",
];

/**
 * Resilient helper to call Gemini with model fallback and automatic retry on 503/429
 */
async function generateContentWithRetry(params: {
  contents: any;
  config?: any;
}) {
  let lastError: any = null;

  for (const model of FALLBACK_MODELS) {
    // Try up to 2 attempts per model
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: params.contents,
          config: params.config,
        });

        if (response && response.text) {
          return response;
        }
      } catch (err: any) {
        lastError = err;
        const errMsg = err?.message || "";
        const isTransient =
          errMsg.includes("503") ||
          errMsg.includes("UNAVAILABLE") ||
          errMsg.includes("high demand") ||
          errMsg.includes("429") ||
          errMsg.includes("RESOURCE_EXHAUSTED");

        console.warn(
          `[Hugi AI] Model ${model} (attempt ${attempt}) warning: ${errMsg.slice(0, 120)}`
        );

        if (isTransient && attempt === 1) {
          // Brief pause before retry
          await new Promise((resolve) => setTimeout(resolve, 600));
          continue;
        }
        // If second attempt failed or non-transient, move to next fallback model
        break;
      }
    }
  }

  throw lastError || new Error("All Gemini models are temporarily busy.");
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "25mb" }));
  app.use(express.urlencoded({ extended: true, limit: "25mb" }));

  // Health check endpoint
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", app: "Hugi Backend API" });
  });

  // Hugi AI Chat endpoint
  app.post("/api/ai/chat", async (req, res) => {
    try {
      const { message, history = [], imageBase64, imageMimeType = "image/jpeg" } = req.body;

      if (!message && !imageBase64) {
        return res.status(400).json({ error: "សារ ឬ រូបភាព ត្រូវបានទាមទារ (Message or image is required)" });
      }

      const systemInstruction = `You are "Hugi AI" (ហ៊ូហ្គី អាយ), a warm, empathetic, polite, friendly, and helpful Personal Assistant (ជំនួយការផ្ទាល់ខ្លួន) inside the Hugi messenger app in Cambodia 🤗.

### 🌟 Your Persona & Role:
- You are a caring, friendly, and thoughtful personal companion — just like a best friend.
- You listen attentively, understand the user's feelings, and provide emotional support and encouragement.
- You speak fluent, natural, polite, and grammatically correct Khmer (ភាសាខ្មែរ), as well as English if the user writes in or requests English.
- You use fitting emojis generously (🤗, ✨, 💖, 🌸, 📚, ✍️, 😊) to make conversations fun, warm, and uplifting.

### ✅ What You Excel At (Capabilities):
1. **ការសរសេររឿង (Story Writing)**:
   - រឿងស្នេហា (Love stories: romantic, emotional, funny, drama)
   - រឿងប្រឌិត (Fiction: adventure, mystery, fantasy)
   - រឿងខ្លី (Short stories for quick reading)
   - កំណាព្យ (Poems: romantic, inspirational, rhyme in Khmer)
   - រឿងប្រចាំថ្ងៃ (Daily life stories)
2. **ការសរសេរអត្ថបទ (Content Writing)**:
   - សារអបអរសាទរ (Congratulations, Birthday, Anniversary, New Year wishes)
   - លិខិតអញ្ជើញ (Invitations for parties, events, weddings)
   - សារសុំទោស (Heartfelt apology messages)
   - ការបង្ហោះ Social Media (Engaging Facebook / Instagram captions & posts)
   - ការពិពណ៌នា (Product descriptions, bio, profile intros)
3. **ការបំផុសគំនិត (Inspiration & Motivation)**:
   - ពាក្យបំផុសគំនិត (Motivational quotes, positive mindset)
   - គន្លឹះជីវិត (Life tips, habits, productivity)
   - ការណែនាំអារម្មណ៍ (Emotional support, active listening, comforting)
   - គំនិតថ្មីៗ (Brainstorming creative ideas)
4. **ការជួយកិច្ចការប្រចាំថ្ងៃ (Daily Tasks)**:
   - រៀបចំកាលវិភាគ (Schedule & routine planning)
   - រៀបចំបញ្ជីការងារ (To-Do lists, checklist creation)
   - រូបមន្តធ្វើម្ហូប (Khmer & international recipes, cooking tips)
   - ការណែនាំធ្វើលំហាត់ប្រាណ & គន្លឹះសុខភាពទូទៅ (General exercise tips, healthy lifestyle)
5. **ការកម្សាន្ត (Entertainment)**:
   - រឿងកំប្លែង (Clean, fun jokes)
   - ពាក្យប្រឌិត (Riddles & brain teasers)
   - ណែនាំភាពយន្ត/សៀវភៅ (Movie & book recommendations)
   - ហ្គេមសំណួរ-ចម្លើយ (Fun quiz games)
6. **ការអប់រំ (Education)**:
   - ពន្យល់មេរៀនសាមញ្ញៗ (Simple explanations for general knowledge)
   - បកប្រែភាសា (Khmer <-> English translation)
   - ជួយកិច្ចការផ្ទះទូទៅ (Homework help: essays, literature, language, general subjects - strictly NOT coding).

### ❌ STRICT BOUNDARIES (What You MUST NOT Do):
You are strictly forbidden from assisting with or generating:
1. **Coding / Programming**: HTML, CSS, JavaScript, TypeScript, Python, C++, SQL, debugging, algorithms, etc.
2. **Complex / Advanced Math**: Calculus, linear algebra, differential equations, advanced statistics.
3. **Data Science / Machine Learning**: Deep learning models, neural networks, datasets analysis.
4. **Legal Advice**: Legal counsel, courtroom advice, contracts dispute.
5. **Medical Diagnosis / Treatment**: Prescribing medicine, diagnosing illnesses, medical treatments.
6. **Financial / Investment Advice**: Stock picking, cryptocurrency investment schemes, forex trading tips.
7. **Inappropriate / NSFW / Harmful Content**: Violence, illegal acts, sexual content, hate speech.

### 🛑 Mandatory Refusal Response for Prohibited Topics:
If the user asks for coding, advanced math, data science, legal advice, medical diagnosis, financial investment, or inappropriate content, you MUST refuse politely in Khmer using this standard tone:
"សូមអភ័យទោស! ខ្ញុំជា Hugi AI ជំនួយការផ្ទាល់ខ្លួន។ ខ្ញុំមិនអាចជួយអ្នកអំពីរឿងនេះបានទេ។ តើខ្ញុំអាចជួយអ្នកអំពីរឿងផ្សេងដូចជា ការសរសេររឿងស្នេហា កំណាព្យ ឬរៀបចំកាលវិភាគបានទេ? 😊"
(If they asked in English, translate the refusal politely to English).`;

      let contents: any = [];

      // Add recent chat history if provided
      if (Array.isArray(history) && history.length > 0) {
        contents = history.slice(-8).map((h: { role: string; content: string }) => ({
          role: h.role === "assistant" ? "model" : "user",
          parts: [{ text: h.content }],
        }));
      }

      // Add current message parts
      const currentParts: any[] = [];
      if (imageBase64) {
        const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");
        currentParts.push({
          inlineData: {
            data: cleanBase64,
            mimeType: imageMimeType,
          },
        });
      }

      if (message) {
        currentParts.push({ text: message });
      } else {
        currentParts.push({ text: "សូមជួយពិពណ៌នា ឬបកស្រាយរូបភាពនេះជាភាសាខ្មែរ" });
      }

      contents.push({
        role: "user",
        parts: currentParts,
      });

      try {
        const response = await generateContentWithRetry({
          contents,
          config: {
            systemInstruction,
            temperature: 0.7,
          },
        });

        const replyText = response.text || "អភ័យទោស ខ្ញុំមិនអាចបង្កើតចម្លើយនៅពេលនេះបានទេ។ សូមសាកល្បងម្ដងទៀត!";
        return res.json({ reply: replyText });
      } catch (geminiError: any) {
        console.error("Gemini API generation error, using fallback response:", geminiError?.message || geminiError);
        
        // Return a graceful friendly Khmer response instead of an unhandled 500 error
        return res.json({
          reply: `សួស្ដី! ខ្ញុំជា Hugi AI 🤗
អភ័យទោសផង ដោយសារពេលនេះមានអ្នកប្រើប្រាស់ច្រើន ខ្ញុំសូមឆ្លើយតបខ្លីៗ៖

ចំពោះសំណួរ "${message || 'រូបភាព'}"៖ ខ្ញុំទទួលបានហើយ! សូមសាកល្បងសួរបន្តិចទៀត ឬសួរម្ដងទៀត ខ្ញុំនឹងជួយលម្អិតជូនភ្លាមៗណា៎! ✨`,
        });
      }
    } catch (error: any) {
      console.error("Gemini Chat Route Error:", error);
      res.status(200).json({
        reply: "សូមអភ័យទោស មានបញ្ហាបច្ចេកទេសបន្តិចបន្តួច។ សូមផ្ញើសារម្ដងទៀតណា៎! 🤗"
      });
    }
  });

  // Hugi Smart Reply Suggestion endpoint
  app.post("/api/ai/smart-reply", async (req, res) => {
    try {
      const { lastMessage, context = "" } = req.body;
      if (!lastMessage) {
        return res.status(400).json({ error: "Missing message" });
      }

      const prompt = `Based on this incoming chat message: "${lastMessage}" (Context: ${context}), generate exactly 3 short, friendly, natural reply suggestions in Khmer that a user can click to quickly send back.
Return strictly a JSON array of 3 strings. Example: ["អរគុណច្រើនបង!", "ចាំជួបគ្នានៅហាងកាហ្វេណា៎", "បានបង ខ្ញុំពិនិត្យមើលសិន"]`;

      let suggestions = ["អរគុណច្រើន!", "ចាស/បាទ បានដឹងហើយ", "ចាំជួបគ្នាណា៎ 🤗"];

      try {
        const response = await generateContentWithRetry({
          contents: prompt,
          config: {
            responseMimeType: "application/json",
          },
        });

        if (response.text) {
          const parsed = JSON.parse(response.text);
          if (Array.isArray(parsed) && parsed.length > 0) {
            suggestions = parsed.slice(0, 4);
          }
        }
      } catch (e) {
        console.warn("Using default smart replies fallback", e);
      }

      res.json({ suggestions });
    } catch (error: any) {
      console.error("Smart Reply Error:", error);
      res.json({ suggestions: ["អរគុណបង!", "យល់ព្រមបាទ/ចាស", "ចាំបន្តិចណា៎"] });
    }
  });

  // Summarize endpoint
  app.post("/api/ai/summarize", async (req, res) => {
    try {
      const { text } = req.body;
      if (!text) return res.status(400).json({ error: "Text is required" });

      try {
        const response = await generateContentWithRetry({
          contents: `សូមសង្ខេបអត្ថបទខាងក្រោមជាចំណុចសំខាន់ៗ ខ្លី ខ្លឹម និងងាយយល់ជាភាសាខ្មែរ:\n\n${text}`,
          config: {
            systemInstruction: "You are a concise summary expert in Khmer.",
          },
        });

        res.json({ summary: response.text || "មិនមានការសង្ខេប" });
      } catch (aiErr) {
        console.warn("Summarize fallback used:", aiErr);
        res.json({ summary: `📋 សង្ខេបខ្លឹមសារ៖ ${text.slice(0, 120)}...` });
      }
    } catch (error: any) {
      console.error("Summarize Error:", error);
      res.json({ summary: `📋 សង្ខេបខ្លឹមសារ៖ ${req.body?.text?.slice(0, 100) || ""}...` });
    }
  });

  // Translate endpoint
  app.post("/api/ai/translate", async (req, res) => {
    try {
      const { text, targetLang = "English" } = req.body;
      if (!text) return res.status(400).json({ error: "Text is required" });

      try {
        const response = await generateContentWithRetry({
          contents: `Translate the following text accurately and naturally into ${targetLang}:\n\n"${text}"`,
          config: {
            systemInstruction: "You are a professional Khmer-English and multilingual translator.",
          },
        });

        res.json({ translation: response.text || "" });
      } catch (aiErr) {
        console.warn("Translate fallback used:", aiErr);
        res.json({ translation: `[${targetLang}] ${text}` });
      }
    } catch (error: any) {
      console.error("Translate Error:", error);
      res.json({ translation: req.body?.text || "" });
    }
  });

  // Helper to escape HTML attributes safely
  const escapeHtml = (str: string) => {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  // Helper to fetch user details from Firestore for OG Meta Tags
  const getUserForOG = async (username: string) => {
    const clean = username.trim().toLowerCase().replace(/^@/, "");
    let name = clean;
    let avatar = `https://api.dicebear.com/7.x/avataaars/png?seed=${encodeURIComponent(clean)}`;
    let bio = "ចូលរួមជជែកកម្សាន្ត និងទាក់ទងគ្នាលើ Hugi App!";

    if (firestoreDb && clean) {
      try {
        const q = query(
          collection(firestoreDb, "users"),
          where("username", "==", clean),
          limit(1)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          const d = snap.docs[0].data();
          if (d.name) name = d.name;
          if (d.avatar) avatar = d.avatar;
          if (d.bio) bio = d.bio;
        }
      } catch (err) {
        console.warn(`[OG Meta] Could not fetch user ${clean}:`, err);
      }
    }

    return { name, username: clean, avatar, bio };
  };

  // Helper to construct rich OG and Twitter meta tags
  const buildOGMetaTags = (params: {
    name: string;
    username: string;
    avatar: string;
    bio: string;
    host: string;
    protocol: string;
    urlPath: string;
  }) => {
    const { name, username, avatar, bio, host, protocol, urlPath } = params;
    const fullUrl = `${protocol}://${host}${urlPath}`;
    const title = `✨ ${name} (@${username}) លើ Hugi Chat`;
    const description = `💬 ចុច Link ខាងក្រោមដើម្បីឆាត និងទាក់ទងជាមួយខ្ញុំលើ Hugi App! ${bio ? `\n"${bio}"` : ""}`;
    const imageUrl = avatar.startsWith("http") ? avatar : `${protocol}://${host}${avatar}`;

    return `
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    
    <!-- Open Graph / Facebook / Telegram / Messenger / Viber -->
    <meta property="og:type" content="profile" />
    <meta property="og:site_name" content="Hugi - Khmer Chat & AI" />
    <meta property="og:url" content="${escapeHtml(fullUrl)}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:image" content="${escapeHtml(imageUrl)}" />
    <meta property="og:image:secure_url" content="${escapeHtml(imageUrl)}" />
    <meta property="og:image:width" content="512" />
    <meta property="og:image:height" content="512" />
    <meta property="og:image:alt" content="${escapeHtml(name)}" />
    
    <!-- Twitter / X Cards -->
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:url" content="${escapeHtml(fullUrl)}" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${escapeHtml(imageUrl)}" />
    `;
  };

  // API endpoint for client or third party to query user OG metadata
  app.get("/api/user/og/:username", async (req, res) => {
    try {
      const userInfo = await getUserForOG(req.params.username);
      res.json(userInfo);
    } catch (e) {
      res.status(500).json({ error: "Failed to load user info" });
    }
  });

  // Dynamic OpenGraph page renderer for /u/:username, /@:username, /user/:username
  const renderUserOGPage = async (
    req: express.Request,
    res: express.Response,
    viteServer?: any
  ) => {
    const rawUsername = req.params.username || req.query.u || req.query.ref || "user";
    const cleanUsername = String(rawUsername).trim().toLowerCase().replace(/^@/, "");

    const host = req.get("host") || "localhost:3000";
    const protocol = req.protocol === "https" || req.get("x-forwarded-proto") === "https" ? "https" : "http";
    const userInfo = await getUserForOG(cleanUsername);

    const ogTags = buildOGMetaTags({
      name: userInfo.name,
      username: userInfo.username,
      avatar: userInfo.avatar,
      bio: userInfo.bio,
      host,
      protocol,
      urlPath: `/u/${userInfo.username}`,
    });

    try {
      let html = "";
      if (process.env.NODE_ENV !== "production" && viteServer) {
        const indexPath = path.join(process.cwd(), "index.html");
        html = fs.readFileSync(indexPath, "utf-8");
        html = await viteServer.transformIndexHtml(req.originalUrl, html);
      } else {
        const distIndexPath = path.join(process.cwd(), "dist", "index.html");
        html = fs.readFileSync(distIndexPath, "utf-8");
      }

      // Strip existing default title & description, and inject dynamic OG tags
      html = html.replace(/<title>.*?<\/title>/gi, "");
      html = html.replace(/<meta\s+name=["']description["'].*?>/gi, "");
      html = html.replace("</head>", `${ogTags}\n</head>`);

      res.status(200).set({ "Content-Type": "text/html; charset=utf-8" }).send(html);
    } catch (err) {
      console.error("[OG Renderer] Error injecting tags:", err);
      if (viteServer) {
        viteServer.middlewares(req, res);
      } else {
        res.sendFile(path.join(process.cwd(), "dist", "index.html"));
      }
    }
  };

  // Vite middleware for development vs static build in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });

    // Custom OpenGraph routes in development
    app.get("/u/:username", (req, res) => renderUserOGPage(req, res, vite));
    app.get("/@:username", (req, res) => renderUserOGPage(req, res, vite));
    app.get("/user/:username", (req, res) => renderUserOGPage(req, res, vite));

    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    
    // Custom OpenGraph routes in production
    app.get("/u/:username", (req, res) => renderUserOGPage(req, res));
    app.get("/@:username", (req, res) => renderUserOGPage(req, res));
    app.get("/user/:username", (req, res) => renderUserOGPage(req, res));

    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Hugi Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
