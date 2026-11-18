export type LyriaModel = 'lyria-3-clip-preview' | 'lyria-3-pro-preview';

export type StoryAssistMode = 'continue' | 'refine' | 'music_prompt';

export interface ChapterSoundtrack {
  id: string;
  chapterId: string;
  title: string;
  prompt: string;
  model: LyriaModel;
  audioDataUrl: string;
  mimeType: string;
  lyrics?: string;
  createdAt: string;
}

export interface Chapter {
  id: string;
  number: string;
  title: string;
  location: string;
  era: string;
  mood: string;
  coverImage: string;
  coverAlt: string;
  content: string;
  updatedAt: string;
  soundtrack?: ChapterSoundtrack;
}
