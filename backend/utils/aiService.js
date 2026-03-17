// backend/utils/aiService.js
const DEFAULT_MODEL = 'qwen3:4b';
const OLLAMA_URL = 'http://127.0.0.1:11434/api/chat';

/**
 * Generic text generation using Ollama
 */
const generateText = async (prompt, systemPrompt = "You are a helpful assistant.") => {
    try {
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

        if (!response.ok) {
            throw new Error(`Ollama error: ${response.statusText}`);
        }

        const data = await response.json();
        return data.message?.content || '';
    } catch (error) {
        console.error('[AiService] Error:', error.message);
        throw error;
    }
};

/**
 * Specialized: Analyze a list of tasks for prioritization
 */
const analyzeTasks = async (tasks) => {
    const taskList = tasks.map(t => `- [${t.priority}] ${t.title} (${t.area})`).join('\n');
    const prompt = `Analyze these tasks and suggest the top 3 priorities for today. Group them logically and provide a brief rationale for each priority.\n\nTasks:\n${taskList}`;

    return await generateText(prompt, "You are a productivity expert. Be concise and professional.");
};

/**
 * Specialized: Summarize long text
 */
const summarize = async (text) => {
    const prompt = `Provide a concise TL;DR summary of the following text. Use bullet points if necessary.\n\nText:\n${text}`;

    return await generateText(prompt, "You are a skilled copywriter. Focus on key takeaways.");
};

/**
 * Specialized: Refine raw transcript from voice-to-text
 */
const refineTranscript = async (text) => {
    const prompt = `Refine the following raw voice transcription. Remove filler words (uh, um, like), correct obvious mishearings, and add proper punctuation and capitalization to make it readable while keeping the original meaning and tone.\n\nRaw Transcript:\n${text}`;

    return await generateText(prompt, "You are an expert editor specializing in transcribing speech. Make the text polished and professional.");
};

/**
 * Specialized: Parse CV text into structured JSON
 */
const parseCv = async (text) => {
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

    const result = await generateText(prompt, "You are a specialized HR Data Parser. Output ONLY raw JSON. No markdown, no explanation.");
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
const compareJob = async (jobDescription, userSkills) => {
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

    const result = await generateText(prompt, "You are a specialized Career Strategist. Output ONLY raw JSON.");
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
    analyzeTasks,
    summarize,
    refineTranscript,
    parseCv,
    compareJob
};
