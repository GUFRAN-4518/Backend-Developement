import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.warn("WARNING: GEMINI_API_KEY is not defined in your environment variables.");
}

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;
const fileManager = apiKey ? new GoogleAIFileManager(apiKey) : null;

export const generateVideoMetadataAndTranscript = async (localFilePath, mimeType = "video/mp4") => {
    if (!genAI || !fileManager) {
        console.error("AI processing skipped: Gemini SDK is uninitialized.");
        return null;
    }

    try {
        // 1. Upload file to Gemini storage cluster
        const uploadResult = await fileManager.uploadFile(localFilePath, {
            mimeType,
            displayName: "Video Analysis Upload",
        });

        // 2. Await file compilation state
        let file = await fileManager.getFile(uploadResult.file.name);
        let attempts = 0;
        while (file.state === "PROCESSING" && attempts < 12) {
            await new Promise((resolve) => setTimeout(resolve, 5000));
            file = await fileManager.getFile(uploadResult.file.name);
            attempts++;
        }

        if (file.state !== "ACTIVE") {
            throw new Error(`Gemini file processing concluded with unexpected state: ${file.state}`);
        }

        // 3. Initialize model with JSON constraint
        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.5-flash",
            generationConfig: { responseMimeType: "application/json" }
        });

        const prompt = `
            Analyze this video carefully and return a structured JSON response containing:
            {
                "title": "An engaging, click-worthy, SEO-optimized title for the video based on its events",
                "description": "A comprehensive summary details of what happens in the video",
                "transcript": "A chronological textual transcription of all dialogues or spoken words in the video"
            }
        `;

        // 4. Generate content using the correct payload schema structure 🌟
        const result = await model.generateContent([
            {
                fileData: {
                    fileUri: uploadResult.file.uri,
                    mimeType: uploadResult.file.mimeType
                }
            },
            prompt
        ]);
        
        // 5. Run background structural storage cleanup
        await fileManager.deleteFile(uploadResult.file.name).catch(err => console.error("Cleanup error:", err));

        return JSON.parse(result.response.text());
    } catch (error) {
        console.error("❌ Gemini AI execution exception handled:", error.message);
        return null; 
    }
};

export const generateTextEmbedding = async (text) => {
    if (!genAI) {
        console.error("AI processing skipped: Gemini SDK is uninitialized.");
        return null;
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
        
        const result = await model.embedContent(text);
        
        return result.embedding.values; 
    } catch (error) {
        console.error("Gemini Embedding Error:", error.message);
        return null;
    }
};