# Soundstage Media Server

A self-hosted media server application for organizing, managing, and streaming your personal media collection to any device.

## Features

- **Media Library Management** - Scan folders and removable devices for media files
- **Video Streaming** - Stream movies and TV shows with transcoding support
- **Music Playback** - Organize and stream your music collection
- **Photo Gallery** - View and organize photos
- **Metadata Fetching** - Automatically fetch posters, descriptions, and cast information
- **Multi-User Support** - Create profiles with different access levels
- **Responsive Design** - Works on desktop, tablet, and mobile

## Tech Stack

- **Backend**: Node.js + Express
- **Frontend**: React + Vite + Tailwind CSS
- **Database**: SQLite
- **Transcoding**: FFmpeg
- **Desktop App**: Electron

## Prerequisites

- Node.js 18+
- FFmpeg (for transcoding)

### Installing FFmpeg

macOS:
```
brew install ffmpeg
```

Ubuntu/Debian:
```
sudo apt update && sudo apt install ffmpeg
```

Windows:
Download from https://ffmpeg.org/download.html

## Installation

1. Clone the repository:
```
git clone https://github.com/yourusername/soundstage.git
cd soundstage
```

2. Install dependencies:
```
npm install
cd client && npm install && cd ..
```

3. Start in development mode:
```
npm run dev
```

4. Open http://localhost:5173 in your browser

## Building the Desktop App

To build the macOS menu bar application:
```
npm run dist:mac
```

The built application will be available in the `dist-electron` folder.

## Usage

1. On first launch, create an admin profile
2. Add a media library by selecting a folder containing your media files
3. Soundstage will scan the folder and fetch metadata automatically
4. Browse your library and click any item to play or view it

## Configuration

Create a `.env` file in the root directory:

```
PORT=3001
JWT_SECRET=your-secret-key
TMDB_API_KEY=your-tmdb-api-key
```

## License

MIT
