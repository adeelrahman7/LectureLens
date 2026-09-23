# LectureLens

**Turn lecture recordings into study notes.** Upload an audio file and LectureLens returns a full transcript and structured Markdown notes (summary, topic headings, key points and key terms). Both come from a single call to Google's Gemini API.

<!-- Add a screenshot: save it as docs/screenshot.png and uncomment the line below -->
<!-- ![LectureLens screenshot](docs/screenshot.png) -->

## Why I built it
Rewatching a one-hour lecture to find the one thing you missed is slow. LectureLens gives you a searchable transcript and ready-to-review notes in about a minute.

## Features
- **Audio in, notes out:** drag and drop an MP3, M4A, WAV, OGG or WEBM file (up to 20 MB)
- **One multimodal AI call:** Gemini listens to the audio directly, so transcription and summarization happen in one step with no separate speech-to-text service
- **Reliable structured output:** responses are constrained to a JSON schema (`{ transcript, notes }`), so there's no fragile string parsing
- **Safe rendering:** AI-generated Markdown is parsed with `marked` and sanitized with `DOMPurify` before it reaches the page
- **Input validation:** audio-only file filter, size limit, and clear `400` / `413` error messages
- **Clean temp handling:** uploaded files are always deleted after processing, even if the AI call fails
- **Export:** copy the transcript or notes, or download the notes as a `.md` file
- **Works offline (except the AI call):** the frontend libraries are served locally, with no CDN dependency

## Tech stack
| Layer | Tools |
|---|---|
| Backend | Node.js, Express, Multer |
| AI | Google Gemini API (`@google/genai`), default model `gemini-2.5-flash` |
| Frontend | HTML, CSS, vanilla JavaScript |
| Rendering and security | marked, DOMPurify |

## How it works
```
Browser (notes.html)
   │  POST /process-audio  (multipart form, field: "audio")
   ▼
Express server (server.js)
   ├─ Multer: check file type + size, save temporarily to uploads/
   ├─ Gemini generateContent: [audio (base64) + prompt]
   │     responseMimeType: application/json
   │     responseSchema:   { transcript: string, notes: string }
   ├─ Return { transcript, notes } to the browser
   └─ finally: delete the temp file
   ▼
Browser renders notes (marked → DOMPurify) and shows the transcript
```

## Getting started

### Prerequisites
- Node.js 18+
- A free Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey)

### Install
```bash
git clone https://github.com/adeelrahman7/lecturelens.git
cd lecturelens
npm install
```

### Configure
Create a `.env` file in the project root (it's already git-ignored):
```env
GEMINI_API_KEY=your_api_key_here

# Optional
GEMINI_MODEL=gemini-2.5-flash
PORT=3000
```

### Run
```bash
npm start
```
Open **http://localhost:3000**, upload a lecture recording, and click **Process Audio**.

## API
### `POST /process-audio`
| | |
|---|---|
| Body | `multipart/form-data` with an `audio` file field |
| `200` | `{ "transcript": "...", "notes": "...", "model": "gemini-2.5-flash" }` |
| `400` | No file, or the file isn't audio |
| `413` | File larger than 20 MB |
| `502` | The Gemini request failed (for example, an invalid API key) |

## Project structure
```
lecturelens/
├── server.js          # Express server, upload validation, Gemini call
├── notes.html         # Frontend: upload UI, notes + transcript view
├── package.json
├── .env               # your API key (not committed)
└── uploads/           # temporary files (not committed, auto-cleaned)
```

## Limitations
- Audio is sent inline, so files are capped at about 20 MB (roughly 40 minutes at 64 kbps).
- Processing is one blocking request, with no live progress.
- AI transcripts can contain mistakes. The notes are a study aid, not a replacement for the lecture.

## Roadmap
- [ ] Support longer lectures with the Gemini Files API
- [ ] Generate flashcards and practice quizzes from the notes
- [ ] Add timestamps to the transcript and link notes back to them
- [ ] Save past lectures and notes

## Author
**Adeel Rahman** · CS @ Texas State University · [GitHub](https://github.com/adeelrahman7)
