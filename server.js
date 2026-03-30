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

// 2026 SDK initialization
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// --- 2. MIDDLEWARE ---
app.use(cors());
app.use(express.json());

// --- 3. PILLAR 2: AI JOB MATCHING ---
app.post('/api/jobs/match', async (req, res) => {
    const { user_bio, language = "Amharic" } = req.body; 
    try {
        console.log("🔍 Running AI Match (Gemini 2.5 Flash)...");
        
        // Fetch jobs from Supabase
        const { data: jobs, error } = await supabase.from('jobs').select('*').limit(10); 
        if (error) throw error;
        if (!jobs || jobs.length === 0) return res.json({ success: true, message: "No jobs in DB." });

        const jobDataContext = JSON.stringify(jobs);

        // Call Gemini 2.5 Flash (Production Stable)
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash", 
            contents: [{
                role: "user",
                parts: [{ 
                    text: `Act as the GETEDIL AI Assistant. Match this user: "${user_bio}" to these jobs: ${jobDataContext}. Explain matches in ${language} with a match score.` 
                }]
            }]
        });

        // ✅ FIXED FOR MARCH 2026 SDK: .text is a property, not a function
        const aiText = response.text || "AI generated a response but no text was found.";

        res.json({ 
            success: true, 
            analysis: aiText,
            meta: { model: "gemini-2.5-flash", scanned: jobs.length }
        });

    } catch (err) {
        console.error("❌ AI Error:", err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// --- 4. PILLAR 1: DIRECTORY ---
app.post('/api/listings/add', async (req, res) => {
    const { name, category, location, description, phone } = req.body;
    try {
        const { data, error } = await supabase
            .from('listings')
            .insert([{ name, category, location, description, phone_number: phone }])
            .select();
        if (error) throw error;
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// --- 5. START SERVER ---
app.listen(PORT, () => {
    console.log(`
    ---------------------------------------------------
    🚀 GETEDIL Backend LIVE on Port: ${PORT}
    📡 Database: Connected
    🧠 AI: Gemini 2.5 (2026 Stable) Ready
    ---------------------------------------------------
    `);
});
