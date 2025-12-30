# Soundstage Media Server - Copilot Instructions

## Project Overview
Soundstage is a self-hosted media server application similar to Jellyfin/Plex. It allows users to organize, manage, and stream their personal media collection (movies, TV shows, music, photos) to any device.

## Tech Stack
- **Backend**: Node.js with Express
- **Frontend**: React with Vite
- **Database**: SQLite (via better-sqlite3)
- **Streaming**: HLS with ffmpeg for transcoding
- **Styling**: Tailwind CSS

## Key Features
- Media library scanning and organization
- Metadata fetching from TMDb/MusicBrainz
- Video/audio streaming with transcoding
- User profiles and authentication
- Responsive web interface
- Folder/removable device selection

## Project Structure
```
/server - Express backend
/client - React frontend
/data - SQLite database and cache
```

## Development Commands
- `npm run dev` - Start both frontend and backend in development mode
- `npm run server` - Start backend only
- `npm run client` - Start frontend only
- `npm run build` - Build for production
