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

/**
 * AUTH MIDDLEWARE:
 * This ensures that only logged-in users (from your login.js)
 * can access protected features.
 */
const authenticateUser = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: "No token provided" });

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return res.status(401).json({ error: "Invalid session" });

    req.user = user; // Pass the user info to the next function
    next();
};

// --- 3. PILLAR 2: PROTECTED JOB MATCHING ---
// Now users MUST be logged in to use the AI
app.post('/api/jobs/match', authenticateUser, async (req, res) => {
    const { user_bio, language = "Amharic" } = req.body; 
    try {
        console.log(`🔍 AI Matching for User: ${req.user.email}`);
        
        const { data: jobs, error } = await supabase.from('jobs').select('*').limit(10); 
        if (error) throw error;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash", 
            contents: [{
                role: "user",
                parts: [{ 
                    text: `Act as the GETEDIL AI. Match User: "${user_bio}" to Jobs: ${JSON.stringify(jobs)}. Explain in ${language}.` 
                }]
            }]
        });

        res.json({ 
            success: true, 
            analysis: response.text,
            user: req.user.email // Confirms who is logged in
        });

    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// --- 4. PILLAR 1: DIRECTORY ---
app.post('/api/listings/add', async (req, res) => {
    // Logic for adding business listings
    const { name, category, location, description, phone } = req.body;
    const { data, error } = await supabase.from('listings').insert([
        { name, category, location, description, phone_number: phone }
    ]).select();
    
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, data });
});

// --- 5. START SERVER ---
app.listen(PORT, () => {
    console.log(`🚀 GETEDIL Backend LIVE on Port: ${PORT}`);
});
