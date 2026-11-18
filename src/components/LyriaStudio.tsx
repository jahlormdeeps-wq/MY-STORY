import { useEffect, useRef, useState } from 'react';
import { AlertCircle, ImagePlus, Loader2, Music, Upload, X } from 'lucide-react';
import type { Chapter, ChapterSoundtrack, LyriaModel } from '../types/story';
import { AudioPlayer } from './AudioPlayer';
import { EditorialImage } from './EditorialImage';

interface LyriaStudioProps {
  activeChapter: Chapter;
  onAttachSoundtrack: (chapterId: string, soundtrack: ChapterSoundtrack) => void;
}

const STYLE_PRESETS = [
  {
    label: 'Solo Piano & Cello',
    direction: 'Intimate felt piano and warm solo cello, gentle rubato at 72 BPM, resonant wooden room acoustics.',
  },
  {
    label: 'Warm Tape Folk',
    direction: 'Fingerpicked acoustic guitar with analog tape warmth, subtle upright bass, nostalgic dusk atmosphere.',
  },
  {
    label: 'Rainy Jazz Trio',
    direction: 'Brushed snare drums, upright bass, and soft Rhodes piano chords in minor seventh voicings, late-night quiet.',
  },
  {
    label: 'Chamber Ambient',
    direction: 'Slow evolving string quartet harmonics with distant brass swells, spacious Nordic cinema score.',
  },
];

async function imageUrlToBase64(url: string): Promise<{ base64: string; mimeType: string }> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Could not read reference photograph.');
  }
  const blob = await response.blob();
  const mimeType = blob.type || 'image/jpeg';
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Failed to encode reference image.'));
        return;
      }
      const commaIndex = result.indexOf(',');
      resolve({
        base64: commaIndex >= 0 ? result.slice(commaIndex + 1) : result,
        mimeType,
      });
    };
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(blob);
  });
}

export function LyriaStudio({ activeChapter, onAttachSoundtrack }: LyriaStudioProps) {
  const [model, setModel] = useState<LyriaModel>('lyria-3-clip-preview');
  const [trackTitle, setTrackTitle] = useState(`${activeChapter.title} — Theme`);
  const [prompt, setPrompt] = useState(
    'Intimate felt piano and sustained cello harmonics, reflective coastal morning mood, gentle acoustic space.'
  );
  const [useChapterImage, setUseChapterImage] = useState(false);
  const [customImage, setCustomImage] = useState<{
    previewUrl: string;
    base64: string;
    mimeType: string;
    name: string;
  } | null>(null);

  const [isDeriving, setIsDeriving] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setTrackTitle(
      activeChapter.soundtrack?.title || `${activeChapter.title} — Score`
    );
    if (activeChapter.soundtrack?.prompt) {
      setPrompt(activeChapter.soundtrack.prompt);
    }
    setErrorMessage(null);
  }, [activeChapter.id, activeChapter.title, activeChapter.soundtrack]);

  const handleDerivePrompt = async () => {
    setErrorMessage(null);
    setIsDeriving(true);
    try {
      const response = await fetch('/api/story/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'music_prompt',
          title: activeChapter.title,
          location: activeChapter.location,
          era: activeChapter.era,
          content: activeChapter.content,
        }),
      });
      const data = (await response.json()) as { text?: string; error?: string };
      if (!response.ok || !data.text) {
        throw new Error(data.error || 'Could not derive musical direction from chapter.');
      }
      setPrompt(data.text);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Unable to analyze chapter mood.');
    } finally {
      setIsDeriving(false);
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please choose an image file (JPG, PNG, or WebP).');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        const commaIndex = result.indexOf(',');
        setCustomImage({
          previewUrl: result,
          base64: commaIndex >= 0 ? result.slice(commaIndex + 1) : result,
          mimeType: file.type,
          name: file.name,
        });
        setUseChapterImage(false);
        setErrorMessage(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCompose = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) {
      setErrorMessage('Enter a musical direction prompt before composing.');
      return;
    }

    setErrorMessage(null);
    setIsComposing(true);

    try {
      let imageBase64: string | undefined;
      let imageMimeType: string | undefined;

      if (customImage) {
        imageBase64 = customImage.base64;
        imageMimeType = customImage.mimeType;
      } else if (useChapterImage && activeChapter.coverImage) {
        const encoded = await imageUrlToBase64(activeChapter.coverImage);
        imageBase64 = encoded.base64;
        imageMimeType = encoded.mimeType;
      }

      const response = await fetch('/api/music/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          model,
          imageBase64,
          imageMimeType,
        }),
      });

      const data = (await response.json()) as {
        audioDataUrl?: string;
        lyrics?: string;
        mimeType?: string;
        model?: LyriaModel;
        error?: string;
      };

      if (!response.ok || !data.audioDataUrl) {
        throw new Error(data.error || 'Music generation failed.');
      }

      const soundtrack: ChapterSoundtrack = {
        id: `trk-${Date.now()}`,
        chapterId: activeChapter.id,
        title: trackTitle.trim() || `${activeChapter.title} — Score`,
        prompt: prompt.trim(),
        model: data.model || model,
        audioDataUrl: data.audioDataUrl,
        mimeType: data.mimeType || 'audio/mpeg',
        lyrics: data.lyrics || undefined,
        createdAt: new Date().toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
      };

      onAttachSoundtrack(activeChapter.id, soundtrack);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Unable to compose soundtrack.');
    } finally {
      setIsComposing(false);
    }
  };

  return (
    <section id="composer" className="py-16 border-t border-[#E6E3DC]">
      <div className="max-w-[1280px] mx-auto px-6 md:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Left column: Editorial context & active chapter pairing */}
          <div className="lg:col-span-4 space-y-6">
            <div>
              <p className="text-xs font-medium text-[#5F5D57] mb-2">
                Soundtrack Studio · Chapter {activeChapter.number}
              </p>
              <h2 className="font-serif text-3xl font-semibold tracking-tight text-[#141413] text-balance">
                Compose a score for this chapter
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-[#4F4D47]">
                Translate the atmosphere of <span className="font-medium text-[#141413]">{activeChapter.title}</span> into an original piece of music. Choose a 30-second vignette with Lyria Clip or a full-length arrangement with Lyria Pro.
              </p>
            </div>

            <div className="bg-white border border-[#E6E3DC] rounded-xl p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-[#5F5D57]">Selected Scene</p>
                  <h3 className="font-serif text-lg font-medium text-[#141413] mt-0.5">
                    {activeChapter.number}. {activeChapter.title}
                  </h3>
                  <p className="text-xs text-[#5F5D57] mt-1">
                    {activeChapter.location} · {activeChapter.mood}
                  </p>
                </div>
              </div>

              <div className="aspect-[4/3] w-full overflow-hidden rounded-lg bg-[#EFECE5]">
                <EditorialImage
                  src={activeChapter.coverImage}
                  alt={activeChapter.coverAlt}
                  fallbackLabel={activeChapter.title}
                  className="w-full h-full object-cover"
                />
              </div>

              {activeChapter.soundtrack ? (
                <div className="pt-1">
                  <p className="text-xs font-medium text-[#5F5D57] mb-2">Attached Score</p>
                  <AudioPlayer soundtrack={activeChapter.soundtrack} compact />
                </div>
              ) : (
                <p className="text-xs text-[#5F5D57]">
                  No soundtrack attached to this chapter yet. Compose below to score it.
                </p>
              )}
            </div>
          </div>

          {/* Right column: Lyria Composer Form & Output */}
          <div className="lg:col-span-8 bg-white border border-[#E6E3DC] rounded-xl p-6 md:p-8">
            <form onSubmit={handleCompose} className="space-y-6">
              {/* Format / Model Segmented Control */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E6E3DC]">
                <div>
                  <label className="block text-sm font-semibold text-[#141413]">
                    Composition Format
                  </label>
                  <p className="text-xs text-[#5F5D57] mt-0.5">
                    Short scene vignette (up to 30s) or full-length chapter track
                  </p>
                </div>

                <div
                  role="group"
                  aria-label="Music generation model"
                  className="inline-flex items-center p-1 bg-[#F2EFE9] rounded-lg shrink-0"
                >
                  <button
                    type="button"
                    onClick={() => setModel('lyria-3-clip-preview')}
                    className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      model === 'lyria-3-clip-preview'
                        ? 'bg-white text-[#141413] shadow-xs'
                        : 'text-[#55534E] hover:text-[#141413]'
                    }`}
                  >
                    30s Clip (Lyria Clip)
                  </button>
                  <button
                    type="button"
                    onClick={() => setModel('lyria-3-pro-preview')}
                    className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      model === 'lyria-3-pro-preview'
                        ? 'bg-white text-[#141413] shadow-xs'
                        : 'text-[#55534E] hover:text-[#141413]'
                    }`}
                  >
                    Full Track (Lyria Pro)
                  </button>
                </div>
              </div>

              {/* Track Title */}
              <div>
                <label htmlFor="track-title" className="block text-sm font-medium text-[#141413] mb-1.5">
                  Score Title
                </label>
                <input
                  id="track-title"
                  type="text"
                  value={trackTitle}
                  onChange={(e) => setTrackTitle(e.target.value)}
                  placeholder="e.g., First Light on the Pier"
                  className="w-full px-3.5 py-2.5 text-sm bg-[#FAF9F6] border border-[#DFDCD4] rounded-lg text-[#141413] placeholder:text-[#8B8880] focus:outline-none focus:border-[#C83E2B]"
                />
              </div>

              {/* Musical Direction Prompt */}
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <label htmlFor="music-prompt" className="text-sm font-medium text-[#141413]">
                    Musical Direction
                  </label>
                  <button
                    type="button"
                    onClick={handleDerivePrompt}
                    disabled={isDeriving || isComposing}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#141413] bg-[#F2EFE9] hover:bg-[#E7E3DA] rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
                  >
                    {isDeriving ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Music className="w-3.5 h-3.5 text-[#C83E2B]" />
                    )}
                    <span>{isDeriving ? 'Reading chapter...' : 'Derive Prompt from Chapter'}</span>
                  </button>
                </div>

                <textarea
                  id="music-prompt"
                  rows={3}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe instruments, tempo, mood, and acoustic space..."
                  className="w-full px-3.5 py-3 text-sm leading-relaxed bg-[#FAF9F6] border border-[#DFDCD4] rounded-lg text-[#141413] placeholder:text-[#8B8880] focus:outline-none focus:border-[#C83E2B]"
                />

                {/* Preset Direction Buttons */}
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-[#5F5D57] mr-1">Palettes:</span>
                  {STYLE_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setPrompt(preset.direction)}
                      className="px-2.5 py-1 text-xs font-medium text-[#45433E] bg-[#F5F3EE] hover:bg-[#EAE6DC] border border-[#E6E3DC] rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Optional Image Inspiration */}
              <div className="pt-2 border-t border-[#E6E3DC]">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <div>
                    <p className="text-sm font-medium text-[#141413]">Visual Inspiration (Optional)</p>
                    <p className="text-xs text-[#5F5D57]">
                      Pair a photograph with your prompt so Lyria scores its mood and lighting
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setUseChapterImage((prev) => !prev);
                        setCustomImage(null);
                      }}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        useChapterImage
                          ? 'bg-[#141413] text-white border-[#141413]'
                          : 'bg-white text-[#45433E] border-[#DFDCD4] hover:border-[#141413]'
                      }`}
                    >
                      <ImagePlus className="w-3.5 h-3.5" />
                      <span>{useChapterImage ? 'Using Chapter Plate' : 'Use Chapter Plate'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-white text-[#45433E] border border-[#DFDCD4] hover:border-[#141413] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Image</span>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </div>
                </div>

                {customImage && (
                  <div className="flex items-center justify-between gap-3 p-2.5 bg-[#FAF9F6] border border-[#E6E3DC] rounded-lg">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={customImage.previewUrl}
                        alt="Uploaded visual inspiration"
                        className="w-12 h-12 rounded-md object-cover shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-[#141413] truncate">{customImage.name}</p>
                        <p className="text-xs text-[#5F5D57]">Attached as visual reference</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCustomImage(null)}
                      aria-label="Remove uploaded reference image"
                      className="p-1.5 text-[#5F5D57] hover:text-[#141413] cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {errorMessage && (
                <div
                  role="alert"
                  className="flex items-start gap-3 p-4 rounded-lg bg-[#FDF3F1] border border-[#E8C5BF] text-[#8E281B] text-xs leading-relaxed"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Unable to compose soundtrack</p>
                    <p className="mt-0.5">{errorMessage}</p>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                <p className="text-xs text-[#5F5D57]">
                  Model: <span className="font-mono text-[#141413]">{model}</span> · MP3 output attached directly to Chapter {activeChapter.number}
                </p>

                <button
                  type="submit"
                  disabled={isComposing}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#C83E2B] hover:bg-[#AE3221] rounded-lg transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-[#C83E2B] focus-visible:outline-offset-2"
                >
                  {isComposing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Composing Soundtrack...</span>
                    </>
                  ) : (
                    <>
                      <Music className="w-4 h-4" />
                      <span>Compose Soundtrack</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {activeChapter.soundtrack && (
              <div className="mt-8 pt-6 border-t border-[#E6E3DC]">
                <p className="text-xs font-medium text-[#5F5D57] mb-3">
                  Current Score for Chapter {activeChapter.number}
                </p>
                <AudioPlayer soundtrack={activeChapter.soundtrack} />
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
