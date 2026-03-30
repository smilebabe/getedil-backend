// server.js - GETEDIL SUPER-APP BACKEND (MARCH 2026)
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenAI } = require("@google/genai"); 
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8000;

// --- 1. INITIALIZE CLIENTS ---
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// --- 2. MIDDLEWARE ---
app.use(cors());
app.use(express.json());

// --- 3. AUTHENTICATION PILLAR (Awaiting your logic) ---

app.post('/api/auth/signup', async (req, res) => {
    // I will update this once you provide your code
    res.status(501).json({ message: "Signup logic being updated..." });
});

app.post('/api/auth/login', async (req, res) => {
    // I will update this once you provide your code
    res.status(501).json({ message: "Login logic being updated..." });
});

// --- 4. JOB MATCHING PILLAR (Verified Working ✅) ---
app.post('/api/jobs/match', async (req, res) => {
    const { user_bio, language = "Amharic" } = req.body; 
    try {
        const { data: jobs, error } = await supabase.from('jobs').select('*').limit(10); 
        if (error) throw error;
        if (!jobs || jobs.length === 0) return res.json({ success: true, message: "No jobs in DB." });

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash", 
            contents: [{
                role: "user",
                parts: [{ 
                    text: `Act as the GETEDIL AI Assistant. Match this user: "${user_bio}" to these jobs: ${JSON.stringify(jobs)}. Explain matches in ${language} with a match score.` 
                }]
            }]
        });

        res.json({ success: true, analysis: response.text, meta: { model: "gemini-2.5-flash" } });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// --- 5. START SERVER ---
app.listen(PORT, () => {
    console.log(`🚀 GETEDIL LIVE | Port: ${PORT} | Mode: 2026 Stable`);
});
