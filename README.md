# YouTube Free PiP

A modern, open-source YouTube client built with React that enables Picture-in-Picture mode for any YouTube video, along with easy playlist management and video history tracking.

## Features

- 🎯 **Picture-in-Picture Support**: Watch YouTube videos in PiP mode while browsing other content
- 🔐 **Google Account Integration**: Access your YouTube playlists and watch history
- 📱 **Responsive Design**: Works on desktop and mobile browsers
- 🎯 **Zero Ads**: Clean, distraction-free video watching experience
- 📑 **Playlist Management**: Browse and play videos from your playlists
- 🕒 **Watch History**: Keep track of your viewing history
- 🔄 **Watch Later**: Manage your Watch Later list

## Getting Started

1. Visit [YouTube Free PiP](https://youtube-free-pip.netlify.app)
2. Sign in with your Google account
3. Paste a YouTube video URL or select from your playlists
4. Click the Picture-in-Picture button to watch in floating mode

## Development Setup

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Google Cloud Console account

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

3. Create a `.env` file from the example:
```bash
cp .env.example .env
```

4. Set up Google OAuth credentials:
   - Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   - Create a new project or select an existing one
   - Enable the YouTube Data API v3
   - Create OAuth 2.0 credentials
   - Add these authorized URIs:
     * JavaScript origins: `http://localhost:5173`
     * Redirect URIs: `http://localhost:5173/auth/callback`
   - Copy the credentials to your `.env` file:
     * `VITE_GOOGLE_CLIENT_ID`
     * `VITE_GOOGLE_CLIENT_SECRET`
     * `VITE_GOOGLE_API_KEY`

5. Start the development server:
```bash
npm run dev
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run Biome linter
- `npm run format` - Format code with Biome
- `npm run check` - Run Biome checks

## Project Structure

```
src/
├── components/           # React components
│   ├── auth/            # Authentication components
│   └── youtube/         # YouTube integration components
├── utils/               # Utility functions
└── App.tsx             # Main application component
```

## Contributing

We welcome contributions! Here's how you can help:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Make your changes
4. Run the linter: `npm run lint`
5. Commit your changes: `git commit -m 'Add some feature'`
6. Push to your branch: `git push origin feature/your-feature-name`
7. Create a Pull Request

### Code Style

We use [Biome](https://biomejs.dev/) for linting and formatting. Please ensure your code follows our style guide by running:

```bash
npm run format
npm run lint
```

### Documentation

- Comment your code where necessary
- Update the README if you add new features or change existing ones
- Add JSDoc comments for exported functions and components

## Technical Details

- Built with React 18 and TypeScript
- Uses Vite for fast development and building
- Styled with Tailwind CSS
- YouTube Data API v3 integration
- Google OAuth 2.0 authentication
- Picture-in-Picture Web API

## License

This project is open source and available under the MIT License.

## Acknowledgments

- [YouTube Data API](https://developers.google.com/youtube/v3)
- [Picture-in-Picture Web API](https://w3c.github.io/picture-in-picture/)
- [React](https://reactjs.org/)
- [Vite](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Biome](https://biomejs.dev/)