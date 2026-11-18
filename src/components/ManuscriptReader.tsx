import { useEffect } from 'react';
import { Download, X } from 'lucide-react';
import type { Chapter } from '../types/story';
import { AudioPlayer } from './AudioPlayer';
import { EditorialImage } from './EditorialImage';

interface ManuscriptReaderProps {
  chapters: Chapter[];
  isOpen: boolean;
  onClose: () => void;
}

export function ManuscriptReader({ chapters, isOpen, onClose }: ManuscriptReaderProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleExportMarkdown = () => {
    const markdown = chapters
      .map((ch) => {
        const meta = [ch.location, ch.era, ch.mood].filter(Boolean).join(' · ');
        const scoreNote = ch.soundtrack
          ? `\n\n*Soundtrack: ${ch.soundtrack.title} (${ch.soundtrack.model})*`
          : '';
        return `# ${ch.number}. ${ch.title}\n\n_${meta}_\n\n${ch.content}${scoreNote}`;
      })
      .join('\n\n---\n\n');

    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'my-story-manuscript.md';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Compiled Manuscript Reader"
      className="fixed inset-0 z-50 bg-[#FAF9F6] overflow-y-auto"
    >
      <div className="sticky top-0 z-10 bg-[#FAF9F6]/95 backdrop-blur-sm border-b border-[#E6E3DC]">
        <div className="max-w-[920px] mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <span className="font-serif text-lg font-semibold text-[#141413]">
              My Story — Complete Manuscript
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleExportMarkdown}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#141413] bg-white border border-[#DFDCD4] hover:border-[#141413] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Markdown</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close manuscript reader"
              className="p-2 rounded-lg text-[#55534E] hover:text-[#141413] hover:bg-[#EFECE5] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <article className="max-w-[740px] mx-auto px-6 py-14 space-y-20">
        <header className="pb-10 border-b border-[#E6E3DC] text-center">
          <p className="text-xs font-medium text-[#5F5D57] mb-3">
            Personal Anthology · {chapters.length} {chapters.length === 1 ? 'Chapter' : 'Chapters'}
          </p>
          <h1 className="font-serif text-4xl md:text-5xl font-semibold tracking-tight text-[#141413] text-balance">
            My Story
          </h1>
          <p className="mt-4 text-sm text-[#5F5D57]">
            Collected chapters and original chapter scores
          </p>
        </header>

        {chapters.map((chapter) => (
          <section key={chapter.id} className="space-y-6 pb-16 border-b border-[#E6E3DC] last:border-b-0">
            <div className="space-y-2">
              <p className="text-xs font-medium text-[#C83E2B]">
                Chapter {chapter.number}
              </p>
              <h2 className="font-serif text-3xl font-semibold tracking-tight text-[#141413]">
                {chapter.title}
              </h2>
              <p className="text-xs text-[#5F5D57]">
                {[chapter.location, chapter.era, chapter.mood].filter(Boolean).join(' · ')}
              </p>
            </div>

            {chapter.coverImage && (
              <div className="aspect-[16/10] w-full overflow-hidden rounded-xl bg-[#EFECE5]">
                <EditorialImage
                  src={chapter.coverImage}
                  alt={chapter.coverAlt}
                  fallbackLabel={chapter.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {chapter.soundtrack && (
              <AudioPlayer soundtrack={chapter.soundtrack} />
            )}

            <div className="font-serif text-[17px] leading-[1.85] text-[#22211F] whitespace-pre-line">
              {chapter.content || 'This chapter is awaiting its opening lines.'}
            </div>
          </section>
        ))}
      </article>
    </div>
  );
}
