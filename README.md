# MScribe: AI Lecture Notes

Upload a lecture recording and get back a **full transcript** and **structured study notes** (summary, topic headings, key points, key terms), generated in a single call to Google's Gemini API.

## Features
- Drag-and-drop audio upload (MP3, M4A, WAV, OGG, WEBM, up to 20 MB)
- One multimodal Gemini request transcribes **and** summarizes the audio
- **Structured output:** Gemini is constrained to a JSON schema (`{ transcript, notes }`), so responses parse reliably without string cleanup
- Notes rendered from Markdown and sanitized with DOMPurify before display
- Copy transcript/notes, or download notes as a `.md` file
- Input validation: audio-only file filter, size limit, clear 400/413 errors
- Temp files are always deleted after processing, including when the AI call fails

## Tech stack
Node.js · Express · Multer · Google Gemini API (`@google/genai`) · vanilla HTML/CSS/JS · marked · DOMPurify

## How it works
```
Browser (notes.html)
  └─ POST /process-audio (multipart, field "audio")
        ├─ Multer: validate type + size, save to uploads/ temporarily
        ├─ Gemini generateContent: [audio (base64 inline) + prompt]
        │     with responseMimeType=application/json + responseSchema
        ├─ return { transcript, notes }
        └─ delete temp file (finally block)
```

## Setup
```bash
git clone https://github.com/adeelrahman7/speechtotext_ai.git
cd speechtotext_ai
npm install
```
Create a `.env` file (it's git-ignored):
```
GEMINI_API_KEY=your_key_here
# optional
GEMINI_MODEL=gemini-2.5-flash
PORT=3000
```
Get a free key at https://aistudio.google.com/apikey

```bash
npm start
```
Open http://localhost:3000

## Limitations & next steps
- Audio is sent inline, so files are limited to ~20 MB (~40 min at 64 kbps). **Next:** use the Gemini Files API for long lectures.
- Processing is a single blocking request. **Next:** stream progress or run a background job queue.
- AI transcripts can contain errors; the notes are a study aid, not a replacement for the lecture.
- Planned: flashcard/quiz generation from the notes, speaker timestamps, saved note history.
