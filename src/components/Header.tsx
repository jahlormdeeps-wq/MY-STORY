interface HeaderProps {
  onNewChapter: () => void;
  onOpenManuscript: () => void;
}

export function Header({ onNewChapter, onOpenManuscript }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-[#FAF9F6]/95 backdrop-blur-sm border-b border-[#E6E3DC]">
      <div className="max-w-[1280px] mx-auto px-6 md:px-10 h-16 flex items-center justify-between gap-8">
        <a
          href="#top"
          className="font-serif text-xl font-semibold tracking-tight text-[#141413] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#C83E2B] focus-visible:outline-offset-4 rounded-sm"
        >
          My Story
        </a>

        <nav aria-label="Primary" className="hidden md:flex items-center gap-7 text-sm font-medium text-[#55534E]">
          <a
            href="#chapters"
            className="hover:text-[#141413] hover:underline underline-offset-4 decoration-[#C83E2B]/60 transition-colors whitespace-nowrap shrink-0"
          >
            Chapters
          </a>
          <a
            href="#composer"
            className="hover:text-[#141413] hover:underline underline-offset-4 decoration-[#C83E2B]/60 transition-colors whitespace-nowrap shrink-0"
          >
            Composer
          </a>
          <a
            href="#soundtracks"
            className="hover:text-[#141413] hover:underline underline-offset-4 decoration-[#C83E2B]/60 transition-colors whitespace-nowrap shrink-0"
          >
            Soundtracks
          </a>
          <button
            type="button"
            onClick={onOpenManuscript}
            className="hover:text-[#141413] hover:underline underline-offset-4 decoration-[#C83E2B]/60 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Manuscript
          </button>
        </nav>

        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onNewChapter}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#141413] hover:bg-[#C83E2B] rounded-lg transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-[#C83E2B] focus-visible:outline-offset-2"
          >
            New Chapter
          </button>
        </div>
      </div>
    </header>
  );
}
