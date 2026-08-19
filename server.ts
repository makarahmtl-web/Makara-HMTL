import express from "express";
import path from "path";
import fs from "fs";
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

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "25mb" }));
  app.use(express.urlencoded({ extended: true, limit: "25mb" }));

  // Health check endpoint
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", app: "Hugi Backend API" });
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
    const { createServer: createViteServer } = await import("vite");
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
