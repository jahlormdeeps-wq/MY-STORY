import type { Chapter } from '../types/story';

export const HERO_IMAGE = '/src/assets/images/hero_story_desk_1794990115045.jpg';

export const COVER_GALLERY = [
  {
    url: '/src/assets/images/chapter_harbour_dawn_1794990114665.jpg',
    label: 'Harbour at Dawn',
    alt: 'Misty coastal wooden pier with a moored wooden boat at first light',
  },
  {
    url: '/src/assets/images/chapter_greenhouse_winter_1794990115201.jpg',
    label: 'Winter Conservatory',
    alt: 'Inside an iron-framed glass botanical conservatory with deep green ferns in winter',
  },
  {
    url: '/src/assets/images/hero_story_desk_1794990115045.jpg',
    label: 'Study & Tape Reel',
    alt: 'Open clothbound journal, fountain pen, and vintage tape recorder by a sunlit window',
  },
];

export const INITIAL_CHAPTERS: Chapter[] = [
  {
    id: 'ch-harbour-dawn',
    number: '01',
    title: 'The Harbour at First Light',
    location: 'Northumberland Coast',
    era: 'Autumn 2018',
    mood: 'Reflective',
    coverImage: '/src/assets/images/chapter_harbour_dawn_1794990114665.jpg',
    coverAlt: 'Misty coastal wooden pier with a moored wooden boat at first light',
    updatedAt: 'Nov 18, 2026',
    content: `We reached the pier twenty minutes before the ferry horn sounded across the inlet. Salt mist still clung to the tarred pilings, and the tide lay so flat against the hull of CN 42 that the boat seemed suspended between two identical grey skies.

My grandfather carried a thermos wrapped in tweed and a small notebook whose corners had softened from years in his coat pocket. Neither of us spoke while the gulls wheeled silently over the breakwater. Years later, whenever I try to locate the exact morning my childhood ended and something wider began, it always returns to the sound of water lapping softly under those wet oak planks.`,
  },
  {
    id: 'ch-winter-conservatory',
    number: '02',
    title: 'Glass Conservatory in January',
    location: 'Edinburgh Botanic Gardens',
    era: 'Winter 2021',
    mood: 'Wistful',
    coverImage: '/src/assets/images/chapter_greenhouse_winter_1794990115201.jpg',
    coverAlt: 'Inside an iron-framed glass botanical conservatory with deep green ferns in winter',
    updatedAt: 'Nov 18, 2026',
    content: `Outside, sleet ticked against the curved Victorian glass. Inside, the air smelled of damp terracotta, crushed fern fronds, and warm iron pipes ticking softly beneath the flagstones.

She walked three paces ahead down the stone aisle, pausing beside a row of tree ferns where condensation had traced narrow rivers down the pane. We had spent six months writing postcards from different time zones, yet standing beneath that vaulted roof of frost and evergreen, the silence felt completely unhurried—as if winter had agreed to wait at the door.`,
  },
  {
    id: 'ch-tape-reels',
    number: '03',
    title: 'Cassette Letters from the Attic',
    location: 'Clifton Study',
    era: 'Spring 2024',
    mood: 'Nostalgic',
    coverImage: '/src/assets/images/hero_story_desk_1794990115045.jpg',
    coverAlt: 'Open clothbound journal, fountain pen, and vintage tape recorder by a sunlit window',
    updatedAt: 'Nov 18, 2026',
    content: `In the bottom cedar drawer, beneath three ledgers of household receipts, sat four C-60 cassettes labeled only with months and cities. When I pressed play on the silver deck beside the window, the room filled first with tape hiss, then the distant rattle of a tram, and finally my mother’s voice laughing mid-sentence as rain drummed on a tin awning.

That afternoon I opened a fresh linen notebook and began transcribing every pause between her words. Some memories refuse to stay flat on paper; they ask for room tone, for timber and brass, for a melody that holds what ink leaves unsaid.`,
  },
];
