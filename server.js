import express from "express";
import multer from "multer";
import cors from "cors";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const MAX_FILE_MB = 20; // Gemini inline audio requests are capped at ~20 MB

if (!process.env.GEMINI_API_KEY) {
  console.error("Missing GEMINI_API_KEY. Add it to a .env file (see README).");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const app = express();
app.use(cors());
app.use(express.json());

// Serve the frontend so the app runs from one URL: http://localhost:3000
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "notes.html")));
// Serve the Markdown renderer + sanitizer from node_modules (works offline, no CDN)
app.get("/vendor/marked.min.js", (req, res) =>
  res.sendFile(path.join(__dirname, "node_modules/marked/marked.min.js")));
app.get("/vendor/purify.min.js", (req, res) =>
  res.sendFile(path.join(__dirname, "node_modules/dompurify/dist/purify.min.js")));

// Accept audio files only, up to MAX_FILE_MB. Files are stored temporarily and deleted after processing.
const upload = multer({
  dest: path.join(__dirname, "uploads"),
  limits: { fileSize: MAX_FILE_MB * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("audio/")) return cb(null, true);
    cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", "audio"));
  },
});

// Forces Gemini to return exactly { transcript, notes } instead of free text we have to clean up.
const responseSchema = {
  type: Type.OBJECT,
  properties: {
    transcript: { type: Type.STRING, description: "Full verbatim transcript of the audio" },
    notes: { type: Type.STRING, description: "Structured study notes in Markdown" },
  },
  required: ["transcript", "notes"],
};

const PROMPT = `You are a lecture assistant. Listen to this audio and produce:
1. transcript: a full verbatim transcript.
2. notes: clean study notes in Markdown with a short summary, headings for each main topic,
   bullet points for key ideas, and a "Key Terms" section with brief definitions.`;

/**
 * POST /process-audio
 * Upload audio -> Gemini transcribes and summarizes it in one call -> returns { transcript, notes }
 */
app.post("/process-audio", upload.single("audio"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No audio file uploaded (form field name must be 'audio')." });
  }

  try {
    const audioData = (await fs.readFile(req.file.path)).toString("base64");

    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [
        {
          parts: [
            { inlineData: { mimeType: req.file.mimetype, data: audioData } },
            { text: PROMPT },
          ],
        },
      ],
      config: { responseMimeType: "application/json", responseSchema },
    });

    const { transcript = "", notes = "" } = JSON.parse(response.text);
    res.json({ transcript, notes, model: MODEL });
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: "AI processing failed: " + err.message });
  } finally {
    // Always delete the temp file, even if the AI call failed
    await fs.unlink(req.file.path).catch(() => {});
  }
});

// Turn upload errors (wrong type, too big) into clear 4xx responses
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const msg =
      err.code === "LIMIT_FILE_SIZE"
        ? `File too large. Max size is ${MAX_FILE_MB} MB.`
        : "Only audio files are allowed (MP3, M4A, WAV, OGG, WEBM).";
    return res.status(err.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({ error: msg });
  }
  console.error(err);
  res.status(500).json({ error: "Server error" });
});

app.listen(PORT, () => {
  console.log(`LectureLens running on http://localhost:${PORT} (model: ${MODEL})`);
});
