import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);

function getGenAIClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured. Please attach an API key in Settings > Secrets.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function formatUpstreamError(error: unknown): { status: number; message: string; code?: string } {
  const errObj = error as { status?: number; message?: string; error?: { code?: number; message?: string; status?: string } };
  const rawMessage = errObj?.error?.message || errObj?.message || 'An unexpected error occurred.';
  const status = errObj?.status || errObj?.error?.code || 500;
  const statusStr = errObj?.error?.status || '';

  if (
    status === 403 ||
    statusStr === 'PERMISSION_DENIED' ||
    rawMessage.includes('API_KEY_INVALID') ||
    rawMessage.includes('API key not valid')
  ) {
    return {
      status: 403,
      code: 'API_KEY_ERROR',
      message: 'Access denied or invalid API key. Please check your Gemini API key in Settings > Secrets.',
    };
  }

  if (
    status === 429 ||
    statusStr === 'RESOURCE_EXHAUSTED' ||
    rawMessage.toLowerCase().includes('billing') ||
    rawMessage.toLowerCase().includes('quota') ||
    rawMessage.toLowerCase().includes('paid')
  ) {
    return {
      status: 429,
      code: 'BILLING_OR_QUOTA_REQUIRED',
      message:
        'Music generation with Lyria requires a billing-enabled Gemini API key or exceeded the current quota. Please select a paid API key in Settings > Secrets.',
    };
  }

  return {
    status: typeof status === 'number' && status >= 400 && status < 600 ? status : 500,
    message: rawMessage,
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.post('/api/story/assist', async (req, res) => {
    try {
      const { mode, title, location, era, content } = req.body as {
        mode?: 'continue' | 'refine' | 'music_prompt';
        title?: string;
        location?: string;
        era?: string;
        content?: string;
      };

      if (!mode || !['continue', 'refine', 'music_prompt'].includes(mode)) {
        res.status(400).json({ error: 'Invalid story assist mode.' });
        return;
      }

      const safeTitle = (title || 'Untitled Chapter').trim();
      const safeContext = [location, era].filter(Boolean).join(' · ');
      const safeContent = (content || '').trim();

      const ai = getGenAIClient();

      let systemInstruction = '';
      let prompt = '';

      if (mode === 'continue') {
        systemInstruction =
          'You are a literary co-editor helping an author continue a personal story or literary memoir. Write in restrained, vivid, sensory prose matching the author’s established tone and tense. Return only the next 2 concise paragraphs of narrative prose with no preamble, no quotes, and no meta-commentary.';
        prompt = `Chapter Title: ${safeTitle}\nSetting: ${safeContext || 'Unspecified'}\n\nExisting Manuscript:\n${safeContent || '(Opening scene — begin with an evocative first moment.)'}\n\nContinue the scene seamlessly:`;
      } else if (mode === 'refine') {
        systemInstruction =
          'You are a careful literary copyeditor. Tighten phrasing, elevate sensory detail, and preserve the author’s authentic voice and meaning. Return the polished passage directly with no preamble or bullet lists.';
        prompt = `Chapter Title: ${safeTitle}\nSetting: ${safeContext || 'Unspecified'}\n\nPassage to refine:\n${safeContent}`;
      } else {
        systemInstruction =
          'You are a film composer translating literary prose into a precise musical direction prompt for an AI music composer (Lyria). Describe concrete instrumentation, tempo (BPM feel), harmonic mood, dynamic arc, and acoustic texture in 2 to 3 evocative sentences under 65 words. Return only the musical prompt text.';
        prompt = `Chapter Title: ${safeTitle}\nSetting: ${safeContext || 'Unspecified'}\n\nStory Text:\n${safeContent || safeTitle}`;
      }

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          systemInstruction,
        },
      });

      const text = (response.text || '').trim();
      if (!text) {
        res.status(502).json({ error: 'The model returned an empty response.' });
        return;
      }

      res.json({ text });
    } catch (error) {
      const formatted = formatUpstreamError(error);
      res.status(formatted.status).json({ error: formatted.message, code: formatted.code });
    }
  });

  app.post('/api/music/generate', async (req, res) => {
    try {
      const { prompt, model, imageBase64, imageMimeType } = req.body as {
        prompt?: string;
        model?: string;
        imageBase64?: string;
        imageMimeType?: string;
      };

      const trimmedPrompt = (prompt || '').trim();
      if (!trimmedPrompt) {
        res.status(400).json({ error: 'Please provide a musical direction prompt before composing.' });
        return;
      }

      const selectedModel =
        model === 'lyria-3-pro-preview' ? 'lyria-3-pro-preview' : 'lyria-3-clip-preview';

      const ai = getGenAIClient();

      const contents =
        imageBase64 && imageMimeType
          ? {
              parts: [
                { text: trimmedPrompt },
                {
                  inlineData: {
                    data: imageBase64,
                    mimeType: imageMimeType,
                  },
                },
              ],
            }
          : trimmedPrompt;

      const stream = await ai.models.generateContentStream({
        model: selectedModel,
        contents,
      });

      const audioChunks: Buffer[] = [];
      let lyrics = '';
      let mimeType = 'audio/mpeg';

      for await (const chunk of stream) {
        const parts = chunk.candidates?.[0]?.content?.parts;
        if (!parts) continue;
        for (const part of parts) {
          if (part.inlineData?.data) {
            if (audioChunks.length === 0 && part.inlineData.mimeType) {
              mimeType = part.inlineData.mimeType;
            }
            audioChunks.push(Buffer.from(part.inlineData.data, 'base64'));
          }
          if (part.text) {
            lyrics += part.text;
          }
        }
      }

      if (audioChunks.length === 0) {
        res.status(502).json({
          error: 'No audio data was returned by Lyria. Please try adjusting your prompt.',
        });
        return;
      }

      const audioBase64 = Buffer.concat(audioChunks).toString('base64');
      const audioDataUrl = `data:${mimeType};base64,${audioBase64}`;

      res.json({
        audioDataUrl,
        lyrics: lyrics.trim(),
        mimeType,
        model: selectedModel,
      });
    } catch (error) {
      const formatted = formatUpstreamError(error);
      res.status(formatted.status).json({ error: formatted.message, code: formatted.code });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distDir)) {
      app.use(express.static(distDir));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distDir, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`My Story server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
