<p align="center">
  <img src="public/logo.svg" width="88" height="88" alt="YouTube Free PiP" />
</p>

<h1 align="center">YouTube Free PiP</h1>

[![CI](https://github.com/killerwolf/youtube-free-pip/actions/workflows/ci.yml/badge.svg)](https://github.com/killerwolf/youtube-free-pip/actions/workflows/ci.yml)

A modern, open-source YouTube playlist viewer with Picture-in-Picture support. No authentication required - just paste a YouTube playlist URL and start watching.

## Features

- 🎯 **Picture-in-Picture Support**: Watch YouTube videos in PiP mode while browsing other content
- 🔗 **No Login Required**: Just paste any public YouTube playlist URL
- 📱 **Responsive Design**: Works on desktop and mobile browsers
- 🎯 **Zero Ads**: Clean, distraction-free video watching experience
- 📑 **Playlist Management**: Browse and play videos from public playlists
- 🕒 **Watch Progress**: Track video progress with visual indicators
- 💾 **Local Storage**: Your playlist preference is saved locally
- 📲 **Resume on Another Device**: Share a link that reopens the playlist on the
  video you were watching, at the second you stopped

## Switching Devices

While a video is playing, the share button in the playlist header produces a
link that carries the playlist, the current video, and the playback position:

```
https://free-yt-pip.netlify.app/?list=PLAYLIST_ID&v=VIDEO_ID&t=304
```

Send it over WhatsApp (or anything else) and opening it on another device picks
playback back up at 5:04 of that video. On mobile the button opens the native
share sheet directly; elsewhere it copies the link to the clipboard.

The `t` parameter is optional — a link without it just opens on that video from
where that device had last left it (or from the start).

## Getting Started

1. Visit [YouTube Free PiP](https://free-yt-pip.netlify.app)
2. Paste a YouTube playlist URL (e.g., `https://www.youtube.com/playlist?list=PLxxxxxx`)
3. Browse the video grid and click any video to start watching
4. Use the Picture-in-Picture button to watch in floating mode

## Supported URL Formats

- Playlist URLs: `https://www.youtube.com/playlist?list=PLAYLIST_ID`
- Video in playlist: `https://www.youtube.com/watch?v=VIDEO_ID&list=PLAYLIST_ID`
- Playlist ID only: `PLxxxxxx`

The app's own share links additionally accept `?v=VIDEO_ID` to open on a
specific video and `?t=SECONDS` to start it at a given position.

## Development Setup

### Prerequisites

- Node.js (see `.nvmrc` for the exact version — currently the latest LTS)
- npm or yarn

### Local Development

1. Clone the repository:
```bash
git clone https://github.com/killerwolf/youtube-free-pip.git
cd youtube-free-pip
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production (includes type checking)
- `npm run preview` - Preview production build
- `npm run lint` - Run Biome checks
- `npm run format` - Format code with Biome
- `npm run type-check` - Run TypeScript type checking
- `npm run ci` - Run all checks (types, lint, build)

## Project Structure

```
src/
├── components/
│   ├── DebugConsole.tsx           # Debug logging panel (?debug=1)
│   └── youtube/
│       ├── PlaylistContext.tsx    # State management
│       ├── PlaylistDetector.tsx   # Selection-based URL detection
│       ├── PlaylistHeader.tsx     # Playlist title, share, clear
│       ├── PlaylistInput.tsx      # URL input component
│       ├── PlaylistRouter.tsx     # /playlist/:id routing
│       ├── SplitView.tsx          # Main layout
│       └── VideoPlayer.tsx        # YouTube video player
├── utils/
│   ├── debugLog.ts           # console.log gated behind import.meta.env.DEV
│   └── youtube.ts            # YouTube API utilities
└── App.tsx                   # Main application component
```

## Technical Implementation

- **Data Source**: Uses the [Invidious](https://invidious.io/) API as a CORS-free proxy to YouTube
- **No API Keys**: No authentication or API keys required
- **Local Storage**: Playlist URLs saved locally for persistence
- **Progress Tracking**: Video watch progress saved per device

## Contributing

We welcome contributions! Here's how you can help:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Make your changes
4. Run all checks: `npm run ci`
5. Commit your changes: `git commit -m 'Add some feature'`
6. Push to your branch: `git push origin feature/your-feature-name`
7. Create a Pull Request

### Code Style

We use [Biome](https://biomejs.dev/) for linting and formatting. Please ensure your code follows our style guide by running:

```bash
npm run format
npm run lint
```

## Technical Details

- Built with React 19 and TypeScript
- Uses Vite for fast development and building
- Styled with Tailwind CSS and Lucide React icons
- Invidious API integration for YouTube data
- Picture-in-Picture Web API
- Local storage for playlist persistence

## License

This project is open source and available under the MIT License.

## Acknowledgments

- [Invidious](https://invidious.io/) - Privacy-focused YouTube frontend
- [Picture-in-Picture Web API](https://w3c.github.io/picture-in-picture/)
- [React](https://reactjs.org/)
- [Vite](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Biome](https://biomejs.dev/)