# YouTube Integration Design

## Overview
Add Google/YouTube authentication and playlist management to enable users to access and play videos from their YouTube playlists.

## Technical Architecture

### 1. Authentication Flow
**STATUS: Not Implemented (By Design)**
- No user authentication required
- Works with public YouTube playlists only
- No API keys or OAuth setup needed

### 2. API Integration

#### Current API Source: Invidious
```typescript
// Multiple fallback instances for reliability
const invidiousInstances = [
  'https://invidious.snopyta.org',
  'https://invidious.kavin.rocks', 
  'https://vid.puffyan.us',
  'https://yt.artemislena.eu',
];
```

#### Implemented Endpoints
```typescript
interface InvidiousEndpoints {
  playlists: '/api/v1/playlists/{playlistId}'
  // Note: Only public playlist access, no user playlists
}
```

### 3. Data Models (Implemented)

#### Playlist Types
```typescript
interface YouTubeVideo {
  id: string;
  title: string;
  thumbnailUrl: string;
  channelTitle: string;
  lengthSeconds: number;
}

interface PlaylistData {
  title: string;
  author: string;
  videos: YouTubeVideo[];
}
```

### 4. Component Architecture (Implemented)

#### Current Components
```
src/
  components/
    youtube/
      PlaylistContext.tsx      # State management
      PlaylistDetector.tsx     # Auto URL detection
      PlaylistInput.tsx        # URL input component  
      SplitView.tsx           # Main layout
      VideoPlayer.tsx         # YouTube video player
      YouTubeService.ts       # API service layer
    auth/                     # Exists but unused
      AuthContext.tsx         
      GoogleAuthButton.tsx    
```

### 5. State Management (Implemented)

#### Playlist Context
```typescript
interface PlaylistContextType {
  currentPlaylist: PlaylistData | null;
  currentVideo: YouTubeVideo | null;
  videos: YouTubeVideo[];
  isLoading: boolean;
  error: string | null;
  watchedVideos: Set<string>;
  setCurrentVideo: (video: YouTubeVideo) => void;
  markVideoAsWatched: (videoId: string) => void;
  // ... other methods
}
```

## Implementation Status

### ✅ Completed Features
1. **URL-based Playlist Loading**
   - Support for multiple YouTube URL formats
   - Automatic playlist ID extraction
   - Local storage persistence

2. **Invidious API Integration**
   - Multiple fallback instances
   - CORS-free data access
   - Error handling and retries

3. **Video Player**
   - YouTube iframe integration
   - Picture-in-Picture support
   - Progress tracking and restoration

4. **State Management**
   - React Context for playlist data
   - Local storage for persistence
   - Watch state tracking

### ❌ Not Implemented (Authentication-Based Features)
1. **Google OAuth Integration**
   - User authentication flow
   - Access to private playlists
   - YouTube Data API v3 usage

2. **Personal YouTube Data**
   - User's private playlists
   - Watch history from YouTube
   - Personal recommendations

## Technical Trade-offs

### Advantages of Current Approach
- **No setup required**: Users can start immediately
- **Privacy-focused**: No personal data access
- **No API limits**: Invidious handles rate limiting
- **Simple deployment**: No OAuth credentials needed

### Limitations
- **Public playlists only**: Cannot access private/unlisted playlists
- **No user sync**: Watch progress only saved locally
- **Dependent on Invidious**: Relies on third-party API proxy
- **Limited metadata**: Less rich data than official YouTube API

## Future Migration Path

If Google OAuth integration is desired in the future:

### Required Changes
1. **Environment Setup**
   ```env
   VITE_GOOGLE_CLIENT_ID=your_client_id
   VITE_GOOGLE_API_KEY=your_api_key
   ```

2. **Component Updates**
   - Enable auth components in `src/components/auth/`
   - Add authentication flow to App.tsx
   - Implement YouTube Data API service

3. **State Management**
   - Extend context to handle authenticated state
   - Add user profile management
   - Implement token refresh logic

### Migration Benefits
- Access to private playlists
- Cross-device sync via Google account
- Official YouTube API support
- Rich metadata and features

## Current File Structure
```
src/
├── components/
│   ├── auth/              # Ready for OAuth (not used)
│   └── youtube/           # Current implementation
│       ├── PlaylistContext.tsx
│       ├── PlaylistDetector.tsx  
│       ├── PlaylistInput.tsx
│       ├── SplitView.tsx
│       ├── VideoPlayer.tsx
│       └── YouTubeService.ts
├── utils/
│   └── youtube.ts         # URL parsing & API utilities
└── App.tsx               # Login-less implementation
```

## Recommendations

1. **Keep current approach** for simplicity and privacy
2. **Add OAuth as optional enhancement** for power users
3. **Implement hybrid mode**: Support both authenticated and public access
4. **Consider Invidious reliability**: Monitor API availability

### 6. Implementation Phases

1. Authentication Setup
   - Configure Google Cloud Project
   - Implement OAuth flow
   - Add token management

2. API Integration
   - Create YouTube service
   - Implement API calls
   - Add error handling

3. UI Components
   - Build auth button
   - Create playlist selector
   - Implement video grid

4. State Management
   - Add auth context
   - Create YouTube context
   - Implement data caching

### 7. Security Considerations

1. Token Storage
   - Store refresh token in secure localStorage
   - Never store access tokens
   - Implement token rotation

2. API Security
   - Use environment variables for API keys
   - Implement rate limiting
   - Add request validation

3. Scope Management
   - Request minimal required scopes
   - Handle permission changes
   - Implement scope validation

### 8. Error Handling

```typescript
enum YouTubeError {
  AUTH_FAILED = 'Authentication failed',
  TOKEN_EXPIRED = 'Token expired',
  PLAYLIST_NOT_FOUND = 'Playlist not found',
  API_ERROR = 'YouTube API error',
  NETWORK_ERROR = 'Network error',
}

interface ErrorHandler {
  handleAuthError: (error: Error) => void;
  handleAPIError: (error: Error) => void;
  handleNetworkError: (error: Error) => void;
}
```

### 9. User Experience

1. Authentication Flow
   - One-click Google sign-in
   - Persistent authentication
   - Clear error messages

2. Playlist Management
   - Grid view of playlists
   - Search/filter capabilities
   - Playlist thumbnails

3. Video Selection
   - Thumbnail previews
   - Video details on hover
   - Quick play functionality

### 10. Environment Setup

```env
VITE_GOOGLE_CLIENT_ID=your_client_id
VITE_GOOGLE_API_KEY=your_api_key
VITE_YOUTUBE_API_BASE_URL=https://www.googleapis.com/youtube/v3
```

### 11. Testing Strategy

1. Unit Tests
   - Auth flow
   - API calls
   - State management

2. Integration Tests
   - Google OAuth flow
   - Playlist fetching
   - Video playback

3. E2E Tests
   - Complete user flow
   - Error scenarios
   - Token refresh

### 12. Performance Considerations

1. Data Caching
   - Cache playlist data
   - Implement pagination
   - Optimize thumbnail loading

2. API Usage
   - Batch requests
   - Implement rate limiting
   - Cache API responses

3. Load Times
   - Lazy load components
   - Optimize bundle size
   - Progressive loading

### 13. Future Enhancements

1. Features
   - Playlist search
   - Multiple accounts
   - Offline access

2. Performance
   - PWA support
   - Background updates
   - Video preloading

3. Integration
   - Share playlists
   - Custom playlists
   - Cross-device sync