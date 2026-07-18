// backend/utils/aiService.js
const DEFAULT_MODEL = 'qwen3:4b';
const OLLAMA_URL = 'http://127.0.0.1:11434/api/chat';

/**
 * Generic text generation helper that supports multiple providers:
 * 1. Gemini (if key provided)
 * 2. ChatGPT (if key provided)
 * 3. Ollama (local fallback)
 */
const generateText = async (prompt, systemPrompt = "You are a helpful assistant.", config = {}) => {
    const { geminiKey, chatgptKey } = config;

    // 1. Try Gemini
    if (geminiKey) {
        try {
            console.log('🤖 Using Gemini API');
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: `${systemPrompt}\n\n${prompt}` }] }]
                })
            });
            const data = await response.json();
            return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        } catch (e) { console.error('Gemini Error:', e.message); }
    }

    // 2. Try ChatGPT
    if (chatgptKey) {
        try {
            console.log('🤖 Using ChatGPT API');
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${chatgptKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-3.5-turbo',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: prompt }
                    ]
                })
            });
            const data = await response.json();
            return data.choices?.[0]?.message?.content || '';
        } catch (e) { console.error('ChatGPT Error:', e.message); }
    }

    // 3. Fallback to Ollama (Local)
    try {
        console.log('🤖 Using Ollama (Local)');
        const response = await fetch(OLLAMA_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: DEFAULT_MODEL,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: prompt }
                ],
                stream: false
            })
        });
        const data = await response.json();
        return data.message?.content || '';
    } catch (error) {
        if (!geminiKey && !chatgptKey) {
            throw new Error('Local AI (Ollama) is not running and no API keys found in Settings.');
        }
        throw error;
    }
};

/**
 * Vision: analyze a camera/screen frame. Needs a vision-capable provider —
 * Gemini (inline_data) or OpenAI (gpt-4o-mini image_url). The local Ollama
 * text model can't see, so with no cloud key we fail with a clear message.
 * @param {string} imageBase64 raw base64 (no data: prefix)
 * @param {string} mimeType e.g. image/jpeg
 * @param {string} prompt what to look for
 */
const analyzeImage = async (imageBase64, mimeType, prompt, config = {}) => {
    const { geminiKey, chatgptKey } = config;
    const instruction = prompt || 'Describe what you see in this image in 2-4 concise, useful sentences. If there is text, transcribe the important parts. If it looks like a workspace/screen, summarize what is being worked on.';

    if (geminiKey) {
        try {
            console.log('👁️ Vision via Gemini');
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            { text: instruction },
                            { inline_data: { mime_type: mimeType, data: imageBase64 } },
                        ],
                    }],
                }),
            });
            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) return text;
        } catch (e) { console.error('Gemini Vision Error:', e.message); }
    }

    if (chatgptKey) {
        try {
            console.log('👁️ Vision via OpenAI');
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${chatgptKey}` },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [{
                        role: 'user',
                        content: [
                            { type: 'text', text: instruction },
                            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
                        ],
                    }],
                    max_tokens: 400,
                }),
            });
            const data = await response.json();
            const text = data.choices?.[0]?.message?.content;
            if (text) return text;
        } catch (e) { console.error('OpenAI Vision Error:', e.message); }
    }

    throw new Error('Image analysis needs a Gemini or ChatGPT API key — add one in Settings → AI.');
};

/**
 * Specialized: Analyze a list of tasks for prioritization
 */
const analyzeTasks = async (tasks, config = {}) => {
    const taskList = tasks.map(t => `- [${t.priority}] ${t.title} (${t.area})`).join('\n');
    const prompt = `Analyze these tasks and suggest the top 3 priorities for today. Group them logically and provide a brief rationale for each priority.\n\nTasks:\n${taskList}`;

    return await generateText(prompt, "You are a productivity expert. Be concise and professional.", config);
};

/**
 * Specialized: Summarize long text
 */
const summarize = async (text, config = {}) => {
    const prompt = `Provide a concise TL;DR summary of the following text. Use bullet points if necessary.\n\nText:\n${text}`;

    return await generateText(prompt, "You are a skilled copywriter. Focus on key takeaways.", config);
};

/**
 * Specialized: Refine raw transcript from voice-to-text
 */
const refineTranscript = async (text, config = {}) => {
    const prompt = `Refine the following raw voice transcription. Remove filler words (uh, um, like), correct obvious mishearings, and add proper punctuation and capitalization to make it readable while keeping the original meaning and tone.\n\nRaw Transcript:\n${text}`;

    return await generateText(prompt, "You are an expert editor specializing in transcribing speech. Make the text polished and professional.", config);
};

/**
 * Specialized: Parse CV text into structured JSON
 */
const parseCv = async (text, config = {}) => {
    const prompt = `Extract structured information from the following CV text. Return ONLY a valid JSON object with this exact structure:
{
  "profile": {
    "currentRole": "string",
    "experienceYrs": number,
    "summary": "string",
    "linkedInUrl": "string"
  },
  "skills": [
    { "name": "string", "level": number, "category": "Technical" | "Soft" | "Domain" }
  ]
}

CV Text:
${text}`;

    const result = await generateText(prompt, "You are a specialized HR Data Parser. Output ONLY raw JSON. No markdown, no explanation.", config);
    try {
        // Remove markdown code blocks if present
        const cleanJson = result.replace(/```json|```/g, '').trim();
        return JSON.parse(cleanJson);
    } catch (e) {
        console.error("Failed to parse AI JSON response:", result);
        throw new Error("AI output was not valid JSON");
    }
};

/**
 * Specialized: Compare a job description against user skills
 */
const compareJob = async (jobDescription, userSkills, config = {}) => {
    const skillsList = userSkills.map(s => `${s.name} (${s.level}%)`).join(', ');
    const prompt = `Act as an expert Technical Recruiter. Compare this Job Description against the candidate's skills.

Candidate Skills: ${skillsList}

Job Description:
${jobDescription}

Return ONLY a valid JSON object with this structure:
{
  "matchScore": number, (0-100)
  "strengths": ["string"], (list of top 3 matching skills)
  "gaps": ["string"], (list of critical missing skills or keywords)
  "recommendations": ["string"], (3 specific learning actions to bridge the gap)
  "summary": "string" (1-2 sentence verdict)
}`;

    const result = await generateText(prompt, "You are a specialized Career Strategist. Output ONLY raw JSON.", config);
    try {
        const cleanJson = result.replace(/```json|```/g, '').trim();
        return JSON.parse(cleanJson);
    } catch (e) {
        console.error("Failed to parse Job Match JSON:", result);
        throw new Error("AI output was not valid JSON");
    }
};

module.exports = {
    generateText,
    analyzeImage,
    analyzeTasks,
    summarize,
    refineTranscript,
    parseCv,
    compareJob
};
