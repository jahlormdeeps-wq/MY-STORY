import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  Check,
  Feather,
  Loader2,
  Music,
  PenLine,
  Plus,
  Trash2,
} from 'lucide-react';
import { AudioPlayer } from './components/AudioPlayer';
import { EditorialImage } from './components/EditorialImage';
import { Header } from './components/Header';
import { LyriaStudio } from './components/LyriaStudio';
import { ManuscriptReader } from './components/ManuscriptReader';
import { COVER_GALLERY, HERO_IMAGE, INITIAL_CHAPTERS } from './data/initialChapters';
import type { Chapter, ChapterSoundtrack, StoryAssistMode } from './types/story';

const STORAGE_KEY = 'my-story-anthology-v1';

function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

function formatChapterNumber(index: number): string {
  return String(index + 1).padStart(2, '0');
}

export default function App() {
  const [chapters, setChapters] = useState<Chapter[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Chapter[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Fall back to starter anthology if storage is unavailable
    }
    return INITIAL_CHAPTERS;
  });

  const [activeChapterId, setActiveChapterId] = useState<string>(() => chapters[0]?.id || '');
  const [isManuscriptOpen, setIsManuscriptOpen] = useState(false);
  const [assistLoading, setAssistLoading] = useState<StoryAssistMode | null>(null);
  const [assistError, setAssistError] = useState<string | null>(null);
  const [savedIndicator, setSavedIndicator] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(chapters));
    } catch {
      try {
        const textOnly = chapters.map(({ soundtrack: _s, ...rest }) => rest);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(textOnly));
      } catch {
        // Ignore if storage is disabled
      }
    }
    setSavedIndicator(true);
    const timer = window.setTimeout(() => setSavedIndicator(false), 1200);
    return () => window.clearTimeout(timer);
  }, [chapters]);

  const activeChapter = useMemo(() => {
    return chapters.find((ch) => ch.id === activeChapterId) || chapters[0];
  }, [chapters, activeChapterId]);

  const totalWords = useMemo(
    () => chapters.reduce((sum, ch) => sum + countWords(ch.content), 0),
    [chapters]
  );

  const scoredChapters = useMemo(
    () => chapters.filter((ch) => Boolean(ch.soundtrack)),
    [chapters]
  );

  const activeWords = countWords(activeChapter.content);
  const readingMinutes = Math.max(1, Math.ceil(activeWords / 200));

  const updateChapter = (id: string, patch: Partial<Chapter>) => {
    const today = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    setChapters((prev) =>
      prev.map((ch) => (ch.id === id ? { ...ch, ...patch, updatedAt: today } : ch))
    );
  };

  const handleCreateChapter = () => {
    const nextIdx = chapters.length;
    const cover = COVER_GALLERY[nextIdx % COVER_GALLERY.length];
    const newChapter: Chapter = {
      id: `ch-${Date.now()}`,
      number: formatChapterNumber(nextIdx),
      title: 'Untitled Chapter',
      location: 'Personal Study',
      era: new Date().getFullYear().toString(),
      mood: 'Reflective',
      coverImage: cover.url,
      coverAlt: cover.alt,
      content: '',
      updatedAt: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
    };
    setChapters((prev) => [...prev, newChapter]);
    setActiveChapterId(newChapter.id);
    setAssistError(null);
    document.getElementById('chapters')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleDeleteChapter = (id: string) => {
    if (chapters.length <= 1) return;
    setChapters((prev) => {
      const filtered = prev.filter((ch) => ch.id !== id);
      const renumbered = filtered.map((ch, idx) => ({
        ...ch,
        number: formatChapterNumber(idx),
      }));
      if (activeChapterId === id && renumbered[0]) {
        setActiveChapterId(renumbered[0].id);
      }
      return renumbered;
    });
  };

  const handleAttachSoundtrack = (chapterId: string, soundtrack: ChapterSoundtrack) => {
    updateChapter(chapterId, { soundtrack });
  };

  const handleStoryAssist = async (mode: 'continue' | 'refine') => {
    setAssistError(null);
    setAssistLoading(mode);
    try {
      const response = await fetch('/api/story/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          title: activeChapter.title,
          location: activeChapter.location,
          era: activeChapter.era,
          content: activeChapter.content,
        }),
      });
      const data = (await response.json()) as { text?: string; error?: string };
      if (!response.ok || !data.text) {
        throw new Error(data.error || 'Could not update manuscript.');
      }

      if (mode === 'continue') {
        const separator = activeChapter.content.trim() ? '\n\n' : '';
        updateChapter(activeChapter.id, {
          content: `${activeChapter.content.trimEnd()}${separator}${data.text}`,
        });
      } else {
        updateChapter(activeChapter.id, {
          content: data.text,
        });
      }
    } catch (err) {
      setAssistError(err instanceof Error ? err.message : 'Unable to reach editorial assistant.');
    } finally {
      setAssistLoading(null);
    }
  };

  return (
    <div id="top" className="min-h-screen flex flex-col bg-[#FAF9F6] text-[#141413]">
      <Header
        onNewChapter={handleCreateChapter}
        onOpenManuscript={() => setIsManuscriptOpen(true)}
      />

      <main className="flex-1">
        {/* Hero Split Section */}
        <section className="pt-10 pb-12 md:pt-14 md:pb-16">
          <div className="max-w-[1280px] mx-auto px-6 md:px-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
              <div className="lg:col-span-6 flex flex-col justify-between py-2">
                <div>
                  <p className="text-xs font-medium text-[#5F5D57] mb-4">
                    Personal Anthology · Volume I
                  </p>
                  <h1 className="font-serif text-4xl sm:text-5xl lg:text-[54px] font-semibold tracking-tight leading-[1.08] text-[#141413] text-balance">
                    Every memory deserves its own score.
                  </h1>
                  <p className="mt-5 text-base leading-relaxed text-[#4F4D47] max-w-xl">
                    Draft personal chapters, memoirs, and quiet vignettes in a focused manuscript desk, then compose original 30-second vignettes or full-length soundtracks tailored to every scene.
                  </p>
                </div>

                <div className="mt-8 flex flex-wrap items-center gap-4">
                  <a
                    href="#chapters"
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#C83E2B] hover:bg-[#AE3221] rounded-lg transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#C83E2B] focus-visible:outline-offset-2"
                  >
                    <PenLine className="w-4 h-4" />
                    <span>Write a Chapter</span>
                  </a>

                  <a
                    href="#composer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-[#141413] bg-white border border-[#DFDCD4] hover:border-[#141413] rounded-lg transition-colors duration-150 whitespace-nowrap shrink-0"
                  >
                    <Music className="w-4 h-4 text-[#C83E2B]" />
                    <span>Open Composer</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => setIsManuscriptOpen(true)}
                    className="inline-flex items-center gap-1.5 px-2 py-2 text-sm font-medium text-[#55534E] hover:text-[#141413] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Read Manuscript</span>
                  </button>
                </div>
              </div>

              <div className="lg:col-span-6">
                <div className="h-full min-h-[280px] lg:min-h-[380px] overflow-hidden rounded-2xl bg-[#EFECE5] border border-[#E6E3DC]">
                  <EditorialImage
                    src={HERO_IMAGE}
                    alt="Writer desk with open clothbound journal, fountain pen, and vintage cassette tape recorder in morning light"
                    fallbackLabel="Writer's Study"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>

            {/* 4-Column Summary Strip Below Hero Split */}
            <div className="mt-10 pt-8 border-t border-[#E6E3DC] grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-xs text-[#5F5D57]">Chapters Drafted</p>
                <p className="mt-1 font-serif text-2xl font-semibold text-[#141413] tabular-nums">
                  {chapters.length}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#5F5D57]">Total Words</p>
                <p className="mt-1 font-serif text-2xl font-semibold text-[#141413] tabular-nums">
                  {totalWords.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#5F5D57]">Scored Chapters</p>
                <p className="mt-1 font-serif text-2xl font-semibold text-[#141413] tabular-nums">
                  {scoredChapters.length} / {chapters.length}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#5F5D57]">Latest Revision</p>
                <p className="mt-1 font-serif text-2xl font-semibold text-[#141413]">
                  {activeChapter.updatedAt}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Two-Pane Chapter & Manuscript Workspace */}
        <section id="chapters" className="py-14 border-t border-[#E6E3DC]">
          <div className="max-w-[1280px] mx-auto px-6 md:px-10">
            <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
              <div>
                <p className="text-xs font-medium text-[#5F5D57] mb-1.5">Manuscript Desk</p>
                <h2 className="font-serif text-3xl font-semibold tracking-tight text-[#141413]">
                  Chapters &amp; Prose
                </h2>
              </div>

              <div className="flex items-center gap-4 text-xs text-[#5F5D57]">
                {savedIndicator && (
                  <span className="inline-flex items-center gap-1 text-[#3D3B36]">
                    <Check className="w-3.5 h-3.5 text-[#C83E2B]" />
                    <span>Saved locally</span>
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleCreateChapter}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#141413] bg-white border border-[#DFDCD4] hover:border-[#141413] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Chapter</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Rail: Chapter Index */}
              <aside className="lg:col-span-4 space-y-2.5">
                {chapters.map((chapter) => {
                  const isActive = chapter.id === activeChapter.id;
                  const words = countWords(chapter.content);
                  return (
                    <div
                      key={chapter.id}
                      className={`group relative rounded-xl border transition-colors duration-150 ${
                        isActive
                          ? 'bg-white border-[#141413]'
                          : 'bg-[#F6F4EF] border-[#E6E3DC] hover:bg-white hover:border-[#CFCBC2]'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setActiveChapterId(chapter.id);
                          setAssistError(null);
                        }}
                        className="w-full text-left p-4 pr-10 cursor-pointer focus-visible:outline-2 focus-visible:outline-[#C83E2B] focus-visible:outline-offset-2 rounded-xl"
                      >
                        <div className="flex items-baseline gap-2.5">
                          <span
                            className={`font-mono text-xs tabular-nums ${
                              isActive ? 'text-[#C83E2B] font-medium' : 'text-[#5F5D57]'
                            }`}
                          >
                            {chapter.number}.
                          </span>
                          <span className="font-serif text-base font-medium text-[#141413] truncate">
                            {chapter.title || 'Untitled Chapter'}
                          </span>
                        </div>
                        <div className="mt-1.5 pl-6 flex flex-wrap items-center gap-1.5 text-xs text-[#5F5D57]">
                          <span className="tabular-nums">{words} words</span>
                          <span aria-hidden="true">·</span>
                          <span>{chapter.mood || 'Draft'}</span>
                          {chapter.soundtrack && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="text-[#C83E2B] font-medium">Scored</span>
                            </>
                          )}
                        </div>
                      </button>

                      {chapters.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteChapter(chapter.id)}
                          aria-label={`Delete chapter ${chapter.title}`}
                          className="absolute top-3.5 right-3 p-1.5 rounded-md text-[#7B7870] hover:text-[#C83E2B] opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </aside>

              {/* Main Editor Pane */}
              <div className="lg:col-span-8 bg-white border border-[#E6E3DC] rounded-xl p-6 md:p-8 space-y-6">
                {/* Chapter Metadata Inputs */}
                <div className="space-y-4 pb-6 border-b border-[#E6E3DC]">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#5F5D57]">
                    <span>Chapter {activeChapter.number}</span>
                    <span className="tabular-nums">
                      {activeWords} words · {readingMinutes} min read
                    </span>
                  </div>

                  <input
                    type="text"
                    value={activeChapter.title}
                    onChange={(e) => updateChapter(activeChapter.id, { title: e.target.value })}
                    aria-label="Chapter title"
                    placeholder="Chapter title..."
                    className="w-full font-serif text-2xl md:text-3xl font-semibold tracking-tight text-[#141413] bg-transparent border-0 p-0 focus:outline-none placeholder:text-[#A3A098]"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div>
                      <label htmlFor="chapter-location" className="block text-[11px] text-[#5F5D57] mb-1">
                        Setting / Place
                      </label>
                      <input
                        id="chapter-location"
                        type="text"
                        value={activeChapter.location}
                        onChange={(e) => updateChapter(activeChapter.id, { location: e.target.value })}
                        placeholder="e.g., Edinburgh"
                        className="w-full px-3 py-1.5 text-xs bg-[#FAF9F6] border border-[#E6E3DC] rounded-md text-[#141413] focus:outline-none focus:border-[#C83E2B]"
                      />
                    </div>
                    <div>
                      <label htmlFor="chapter-era" className="block text-[11px] text-[#5F5D57] mb-1">
                        Time / Era
                      </label>
                      <input
                        id="chapter-era"
                        type="text"
                        value={activeChapter.era}
                        onChange={(e) => updateChapter(activeChapter.id, { era: e.target.value })}
                        placeholder="e.g., Autumn 2018"
                        className="w-full px-3 py-1.5 text-xs bg-[#FAF9F6] border border-[#E6E3DC] rounded-md text-[#141413] focus:outline-none focus:border-[#C83E2B]"
                      />
                    </div>
                    <div>
                      <label htmlFor="chapter-mood" className="block text-[11px] text-[#5F5D57] mb-1">
                        Tone / Mood
                      </label>
                      <input
                        id="chapter-mood"
                        type="text"
                        value={activeChapter.mood}
                        onChange={(e) => updateChapter(activeChapter.id, { mood: e.target.value })}
                        placeholder="e.g., Reflective"
                        className="w-full px-3 py-1.5 text-xs bg-[#FAF9F6] border border-[#E6E3DC] rounded-md text-[#141413] focus:outline-none focus:border-[#C83E2B]"
                      />
                    </div>
                  </div>
                </div>

                {/* Cover Plate Picker */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs font-medium text-[#5F5D57]">Chapter Plate:</span>
                  <div className="flex flex-wrap items-center gap-2">
                    {COVER_GALLERY.map((plate) => {
                      const selected = activeChapter.coverImage === plate.url;
                      return (
                        <button
                          key={plate.url}
                          type="button"
                          onClick={() =>
                            updateChapter(activeChapter.id, {
                              coverImage: plate.url,
                              coverAlt: plate.alt,
                            })
                          }
                          className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                            selected
                              ? 'bg-[#141413] text-white border-[#141413]'
                              : 'bg-[#FAF9F6] text-[#45433E] border-[#E6E3DC] hover:border-[#141413]'
                          }`}
                        >
                          {plate.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Prose Editor */}
                <div>
                  <label htmlFor="chapter-prose" className="sr-only">
                    Chapter prose
                  </label>
                  <textarea
                    id="chapter-prose"
                    rows={12}
                    value={activeChapter.content}
                    onChange={(e) => updateChapter(activeChapter.id, { content: e.target.value })}
                    placeholder="Begin writing your scene here. Focus on a sensory memory, a quiet room, or a turning point..."
                    className="w-full font-serif text-[17px] leading-[1.8] text-[#1D1C1A] bg-[#FAF9F6] border border-[#E6E3DC] rounded-xl p-5 focus:outline-none focus:border-[#C83E2B] placeholder:text-[#9A978F] resize-y"
                  />
                </div>

                {assistError && (
                  <div
                    role="alert"
                    className="flex items-start gap-2.5 p-3.5 rounded-lg bg-[#FDF3F1] border border-[#E8C5BF] text-[#8E281B] text-xs"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{assistError}</span>
                  </div>
                )}

                {/* Editorial Writing Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#E6E3DC]">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => handleStoryAssist('continue')}
                      disabled={assistLoading !== null}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#141413] bg-[#F2EFE9] hover:bg-[#E7E3DA] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
                    >
                      {assistLoading === 'continue' ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <PenLine className="w-3.5 h-3.5 text-[#C83E2B]" />
                      )}
                      <span>{assistLoading === 'continue' ? 'Writing...' : 'Continue Scene'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleStoryAssist('refine')}
                      disabled={assistLoading !== null || !activeChapter.content.trim()}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#141413] bg-[#F2EFE9] hover:bg-[#E7E3DA] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
                    >
                      {assistLoading === 'refine' ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Feather className="w-3.5 h-3.5 text-[#C83E2B]" />
                      )}
                      <span>{assistLoading === 'refine' ? 'Refining...' : 'Refine Prose'}</span>
                    </button>
                  </div>

                  <a
                    href="#composer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#141413] hover:bg-[#C83E2B] rounded-lg transition-colors whitespace-nowrap shrink-0"
                  >
                    <Music className="w-3.5 h-3.5" />
                    <span>Score This Chapter</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Dedicated Lyria Music Generation Studio */}
        <LyriaStudio
          activeChapter={activeChapter}
          onAttachSoundtrack={handleAttachSoundtrack}
        />

        {/* Scored Soundtracks Archive */}
        <section id="soundtracks" className="py-16 border-t border-[#E6E3DC]">
          <div className="max-w-[1280px] mx-auto px-6 md:px-10">
            <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
              <div>
                <p className="text-xs font-medium text-[#5F5D57] mb-1.5">Anthology Folio</p>
                <h2 className="font-serif text-3xl font-semibold tracking-tight text-[#141413]">
                  Chapter Soundtracks
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsManuscriptOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-[#141413] bg-white border border-[#DFDCD4] hover:border-[#141413] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Open Full Manuscript</span>
              </button>
            </div>

            {scoredChapters.length === 0 ? (
              <div className="bg-white border border-[#E6E3DC] rounded-xl p-10 text-center max-w-2xl">
                <Music className="w-7 h-7 mx-auto text-[#8B8880] mb-3" strokeWidth={1.5} />
                <h3 className="font-serif text-xl font-medium text-[#141413]">
                  Your anthology score folio is empty
                </h3>
                <p className="mt-2 text-sm text-[#5F5D57]">
                  Select any chapter above and use the Soundtrack Studio to compose a 30-second clip or full-length original piece. Every track you generate appears here for listening and download.
                </p>
                <a
                  href="#composer"
                  className="mt-5 inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#C83E2B] hover:bg-[#AE3221] rounded-lg transition-colors"
                >
                  <span>Compose First Soundtrack</span>
                </a>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {scoredChapters.map((chapter) => (
                  <div
                    key={chapter.id}
                    className="bg-white border border-[#E6E3DC] rounded-xl p-6 space-y-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs text-[#5F5D57]">
                          Chapter {chapter.number} · {chapter.location}
                        </p>
                        <h3 className="font-serif text-xl font-medium text-[#141413] mt-0.5">
                          {chapter.title}
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveChapterId(chapter.id);
                          document.getElementById('chapters')?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="text-xs font-medium text-[#C83E2B] hover:underline underline-offset-4 whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        Edit Chapter
                      </button>
                    </div>

                    {chapter.soundtrack && (
                      <>
                        <p className="text-xs leading-relaxed text-[#55534E] line-clamp-2">
                          {chapter.soundtrack.prompt}
                        </p>
                        <AudioPlayer soundtrack={chapter.soundtrack} />
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      <footer className="border-t border-[#E6E3DC] py-8">
        <div className="max-w-[1280px] mx-auto px-6 md:px-10 flex flex-wrap items-center justify-between gap-4 text-xs text-[#5F5D57]">
          <span className="font-serif text-sm font-medium text-[#141413]">My Story</span>
          <div className="flex items-center gap-6">
            <a href="#chapters" className="hover:text-[#141413] transition-colors">
              Chapters
            </a>
            <a href="#composer" className="hover:text-[#141413] transition-colors">
              Composer
            </a>
            <button
              type="button"
              onClick={() => setIsManuscriptOpen(true)}
              className="hover:text-[#141413] transition-colors cursor-pointer"
            >
              Read Manuscript
            </button>
          </div>
        </div>
      </footer>

      <ManuscriptReader
        chapters={chapters}
        isOpen={isManuscriptOpen}
        onClose={() => setIsManuscriptOpen(false)}
      />
    </div>
  );
}
