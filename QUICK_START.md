# 🚀 QUICK START GUIDE - Nexa AI Voice Assistant

## ⚡ 3-Step Setup (5 Minutes)

### 1️⃣ Install Dependencies
```bash
npm install
```

### 2️⃣ Configure API Key

Get a free API key:
- **OpenAI** (recommended): https://platform.openai.com/api-keys
- **Google Gemini** (free): https://makersuite.google.com/app/apikey

Create `.env` file:
```bash
cp .env.example .env
```

Edit `.env` and add ONE of these:
```env
# Option 1: OpenAI
OPENAI_API_KEY=sk-your-key-here

# Option 2: Google Gemini (Free)
GOOGLE_GENERATIVE_AI_API_KEY=your-key-here
```

### 3️⃣ Start Server
```bash
npm start
```

Open: http://localhost:3000

---

## 🎤 How to Use

1. Click the **purple floating orb** (bottom-right)
2. Say or type naturally:
   - "Hey Nexa, what tasks do I have?"
   - "What should I focus on?"
   - "Motivate me"
3. Nexa responds with voice + text!

---

## ✨ What's New

| Feature | Status |
|---------|--------|
| Natural conversation | ✅ Ready |
| Wake word ("Hey Nexa") | ✅ Ready |
| Task awareness | ✅ Ready |
| Live transcript | ✅ Ready |
| Chat history | ✅ Ready |
| Modern UI | ✅ Ready |
| Speech-to-text | ✅ Ready |
| Text-to-speech | ✅ Ready |
| OpenAI integration | ✅ Ready |
| Gemini integration | ✅ Ready |

---

## 📁 Key Files

```
✨ NEW/UPDATED FILES:

public/js/voiceAssistantAI.js        ← Main AI assistant (NEW)
routes/voiceAI.js                    ← Backend AI (UPDATED)
public/css/style.css                 ← UI styles (UPDATED)
public/pages/dashboard.html          ← Integration (UPDATED)
public/js/dashboard.js               ← Init code (UPDATED)
package.json                         ← Dependencies (UPDATED)
.env.example                         ← Config template (NEW)
NEXA_SETUP.md                        ← Full setup guide (NEW)
UPGRADE_SUMMARY.md                   ← Detailed summary (NEW)
```

---

## 🐛 Troubleshooting

**"Microphone not supported"**
→ Use Chrome, Edge, or Safari

**"AI service not configured"**
→ Check `.env` has API key, restart server

**"No response from Nexa"**
→ Check server logs, verify API key, check internet connection

**"Mic not working"**
→ Check browser permissions for microphone

---

## 💰 Costs

- **OpenAI**: ~$0.0001 per message (have $5 free)
- **Gemini**: Nearly free (free tier available)
- **Perfect for**: Light student/personal use

---

## 📚 Full Documentation

- **Setup Guide**: See `NEXA_SETUP.md`
- **Detailed Summary**: See `UPGRADE_SUMMARY.md`
- **API Config**: See `.env.example`

---

## 🎯 Next Steps

1. ✅ Install dependencies (`npm install`)
2. ✅ Add API key to `.env`
3. ✅ Start server (`npm start`)
4. ✅ Click purple orb and test!
5. 🚀 Deploy when ready!

---

**You're all set! Enjoy Nexa! 🎉**
