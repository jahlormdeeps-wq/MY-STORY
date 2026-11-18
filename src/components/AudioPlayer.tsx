import { useEffect, useRef, useState } from 'react';
import { Download, FileText, Pause, Play, Volume2 } from 'lucide-react';
import type { ChapterSoundtrack } from '../types/story';

interface AudioPlayerProps {
  soundtrack: ChapterSoundtrack;
  compact?: boolean;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function AudioPlayer({ soundtrack, compact = false }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showNotes, setShowNotes] = useState(false);

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [soundtrack.id, soundtrack.audioDataUrl]);

  const togglePlayback = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      try {
        await audio.play();
        setIsPlaying(true);
      } catch {
        setIsPlaying(false);
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextTime = Number(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = nextTime;
      setCurrentTime(nextTime);
    }
  };

  const modelLabel =
    soundtrack.model === 'lyria-3-pro-preview' ? 'Full Track · Lyria Pro' : '30s Clip · Lyria Clip';

  return (
    <div className="bg-[#F5F3EE] border border-[#E6E3DC] rounded-xl p-4">
      <audio
        ref={audioRef}
        src={soundtrack.audioDataUrl}
        onTimeUpdate={() => {
          if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
        }}
        onLoadedMetadata={() => {
          if (audioRef.current && Number.isFinite(audioRef.current.duration)) {
            setDuration(audioRef.current.duration);
          }
        }}
        onEnded={() => setIsPlaying(false)}
        preload="metadata"
      />

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={togglePlayback}
          aria-label={isPlaying ? `Pause ${soundtrack.title}` : `Play ${soundtrack.title}`}
          className="w-10 h-10 rounded-full bg-[#C83E2B] hover:bg-[#AE3221] text-white flex items-center justify-center shrink-0 transition-colors duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-[#C83E2B] focus-visible:outline-offset-2"
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3 mb-1.5">
            <p className="font-serif text-sm font-medium text-[#141413] truncate">
              {soundtrack.title}
            </p>
            <span className="font-mono text-xs text-[#5F5D57] tabular-nums shrink-0">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <input
            type="range"
            min={0}
            max={duration || 1}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            aria-label="Seek audio position"
            className="editorial-scrubber w-full"
          />

          {!compact && (
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-[#5F5D57]">
              <div className="flex items-center gap-2 min-w-0">
                <Volume2 className="w-3.5 h-3.5 shrink-0 text-[#5F5D57]" />
                <span className="truncate">{modelLabel}</span>
                <span aria-hidden="true">·</span>
                <span className="shrink-0">{soundtrack.createdAt}</span>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {soundtrack.lyrics && (
                  <button
                    type="button"
                    onClick={() => setShowNotes((prev) => !prev)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-[#141413] hover:text-[#C83E2B] transition-colors cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>{showNotes ? 'Hide Notes' : 'Liner Notes'}</span>
                  </button>
                )}
                <a
                  href={soundtrack.audioDataUrl}
                  download={`${soundtrack.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.mp3`}
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#141413] hover:text-[#C83E2B] transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download MP3</span>
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      {!compact && showNotes && soundtrack.lyrics && (
        <div className="mt-3 pt-3 border-t border-[#E6E3DC] text-xs leading-relaxed text-[#45433E] whitespace-pre-line">
          {soundtrack.lyrics}
        </div>
      )}
    </div>
  );
}
