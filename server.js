require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Only PDF files are supported.'));
    }
    cb(null, true);
  }
});

function requireApiKey(res) {
  if (!OPENAI_API_KEY) {
    res.status(500).json({
      error: 'Server is missing OPENAI_API_KEY. Set it in your environment / Render dashboard.'
    });
    return false;
  }
  return true;
}

async function callOpenAI(messages, { json = false } = {}) {
  const body = {
    model: OPENAI_MODEL,
    messages,
    temperature: 0.4
  };
  if (json) body.response_format = { type: 'json_object' };

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI API error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// --- Chat endpoint ---
app.post('/api/chat', async (req, res) => {
  try {
    if (!requireApiKey(res)) return;
    const { message, history = [], role = null } = req.body || {};
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Missing "message" string in request body.' });
    }

    const systemPrompt = `You are Analyst Copilot, a friendly and practical career assistant focused on Business Analyst, Data Analyst, and Risk Analyst roles. You help with: job search strategy, resume and interview advice, explaining what these roles do, skill-building suggestions (SQL, Excel, Power BI, Tableau, Python, risk frameworks, etc.), and how to use LinkedIn effectively. Keep answers concise, concrete, and encouraging. Use short paragraphs or bullet points. If asked something totally unrelated to careers/analytics, answer briefly and steer back to how you can help with their job search.${role ? ` The user is currently focused on the "${role}" role track.` : ''}`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-10).map(h => ({ role: h.role === 'assistant' ? 'assistant' : 'user', content: h.content })),
      { role: 'user', content: message }
    ];

    const reply = await callOpenAI(messages);
    res.json({ reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Something went wrong.' });
  }
});

// --- Resume match score endpoint ---
app.post('/api/resume-score', upload.single('resume'), async (req, res) => {
  try {
    if (!requireApiKey(res)) return;
    if (!req.file) {
      return res.status(400).json({ error: 'Please upload a PDF resume.' });
    }
    const role = (req.body.role || 'Business Analyst').trim();
    const jobContext = (req.body.jobContext || '').trim().slice(0, 3000);

    const parsed = await pdfParse(req.file.buffer);
    const resumeText = parsed.text.slice(0, 8000);

    if (!resumeText || resumeText.trim().length < 30) {
      return res.status(400).json({ error: 'Could not extract readable text from that PDF. Try a text-based (not scanned) resume.' });
    }

    const systemPrompt = `You are an expert technical recruiter for analytics roles (Business Analyst, Data Analyst, Risk Analyst). Given a resume and a target role, evaluate the fit. Respond ONLY with a JSON object, no markdown, matching exactly this shape:
{"score": <integer 0-100>, "summary": "<2-3 sentence overall assessment>", "strengths": ["<short bullet>", "..."], "gaps": ["<short bullet>", "..."], "suggested_keywords": ["<keyword>", "..."]}`;

    const userPrompt = `Target role: ${role}
${jobContext ? `Job description / context provided by the user:\n${jobContext}\n` : ''}
Resume text:
"""
${resumeText}
"""`;

    const raw = await callOpenAI(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      { json: true }
    );

    let result;
    try {
      result = JSON.parse(raw);
    } catch (e) {
      return res.status(502).json({ error: 'Could not parse AI response. Try again.' });
    }

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Something went wrong.' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true, hasApiKey: Boolean(OPENAI_API_KEY) });
});

app.listen(PORT, () => {
  console.log(`Analyst Copilot running on port ${PORT}`);
});
