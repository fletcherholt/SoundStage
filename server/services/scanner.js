import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/init.js';
import { getVideoMetadata } from './metadata.js';
import * as tmdb from './tmdb.js';

const VIDEO_EXTENSIONS = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v'];
const AUDIO_EXTENSIONS = ['.mp3', '.flac', '.m4a', '.aac', '.ogg', '.wav', '.wma'];
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];

export async function scanLibrary(libraryId) {
  const library = db.prepare('SELECT * FROM libraries WHERE id = ?').get(libraryId);
  
  if (!library) {
    throw new Error('Library not found');
  }

  console.log(`📂 Scanning library: ${library.name} (${library.path})`);

  // Clear existing media for this library
  db.prepare('DELETE FROM media WHERE library_id = ?').run(libraryId);

  const files = await scanDirectory(library.path, library.type);
  
  console.log(`Found ${files.length} media files`);

  for (const file of files) {
    try {
      await processMediaFile(file, library);
    } catch (error) {
      console.error(`Error processing ${file}:`, error.message);
    }
  }

  // Update last scan time
  db.prepare('UPDATE libraries SET last_scan = CURRENT_TIMESTAMP WHERE id = ?').run(libraryId);
  
  console.log(`✅ Scan complete for ${library.name}`);
}

async function scanDirectory(dirPath, type, files = []) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    // Skip hidden files/folders
    if (entry.name.startsWith('.')) continue;

    if (entry.isDirectory()) {
      await scanDirectory(fullPath, type, files);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      
      if (type === 'movies' || type === 'tvshows') {
        if (VIDEO_EXTENSIONS.includes(ext)) {
          files.push(fullPath);
        }
      } else if (type === 'music') {
        if (AUDIO_EXTENSIONS.includes(ext)) {
          files.push(fullPath);
        }
      } else if (type === 'photos') {
        if (IMAGE_EXTENSIONS.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  }

  return files;
}

async function processMediaFile(filePath, library) {
  const fileName = path.basename(filePath);
  const stats = fs.statSync(filePath);
  const mediaId = uuidv4();

  // Parse title from filename
  let title = parseTitle(fileName);
  let year = parseYear(fileName);
  let seasonNum = null;
  let episodeNum = null;

  // Check if it's a TV show episode
  if (library.type === 'tvshows') {
    const episodeInfo = parseEpisodeInfo(filePath);
    if (episodeInfo) {
      const showTitle = episodeInfo.showTitle;
      seasonNum = episodeInfo.season;
      episodeNum = episodeInfo.episode;

      // Check if show already exists
      let show = db.prepare(`
        SELECT id FROM media 
        WHERE library_id = ? AND title = ? AND type = 'tvshow'
      `).get(library.id, showTitle);

      if (!show) {
        // Create show entry with TMDB metadata
        const showId = uuidv4();
        let tmdbData = null;
        
        try {
          console.log(`🔍 Fetching TMDB data for TV show: ${showTitle}`);
          tmdbData = await tmdb.fetchTVShowMetadata(showTitle);
        } catch (e) {
          console.error(`Failed to fetch TMDB data for ${showTitle}:`, e.message);
        }

        if (tmdbData) {
          // Store seasons data
          if (tmdbData.seasons) {
            for (const season of tmdbData.seasons) {
              const seasonId = uuidv4();
              db.prepare(`
                INSERT OR REPLACE INTO seasons (id, media_id, season_number, name, overview, poster_path, episode_count, air_date)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
              `).run(
                seasonId,
                showId,
                season.season_number,
                season.name,
                season.overview,
                season.poster_path,
                season.episode_count,
                season.air_date
              );
            }
          }

          db.prepare(`
            INSERT INTO media (id, library_id, title, original_title, type, path, file_name, year, end_year, overview, tagline, poster_path, backdrop_path, rating, content_rating, genres, cast, directors, writers, studio, tmdb_id, imdb_id, season_count, episode_count, status)
            VALUES (?, ?, ?, ?, 'tvshow', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            showId,
            library.id,
            tmdbData.title || showTitle,
            tmdbData.original_title,
            path.dirname(filePath),
            showTitle,
            tmdbData.year,
            tmdbData.end_year,
            tmdbData.overview,
            tmdbData.tagline,
            tmdbData.poster_path,
            tmdbData.backdrop_path,
            tmdbData.rating,
            tmdbData.content_rating,
            tmdbData.genres ? JSON.stringify(tmdbData.genres) : null,
            tmdbData.cast ? JSON.stringify(tmdbData.cast) : null,
            tmdbData.directors ? JSON.stringify(tmdbData.directors) : null,
            tmdbData.writers ? JSON.stringify(tmdbData.writers) : null,
            tmdbData.studio,
            tmdbData.tmdb_id,
            tmdbData.imdb_id,
            tmdbData.season_count,
            tmdbData.episode_count,
            tmdbData.status
          );
        } else {
          db.prepare(`
            INSERT INTO media (id, library_id, title, type, path, file_name)
            VALUES (?, ?, ?, 'tvshow', ?, ?)
          `).run(showId, library.id, showTitle, path.dirname(filePath), showTitle);
        }
        
        show = { id: showId };
      }

      // Fetch episode metadata from TMDB
      let episodeTitle = title;
      let episodeOverview = null;
      let episodeStill = null;
      let episodeAirDate = null;
      let episodeRuntime = null;

      try {
        // Get show's TMDB ID
        const showData = db.prepare('SELECT tmdb_id FROM media WHERE id = ?').get(show.id);
        if (showData && showData.tmdb_id) {
          const seasonData = await tmdb.getTVSeasonDetails(showData.tmdb_id, seasonNum);
          if (seasonData && seasonData.episodes) {
            const ep = seasonData.episodes.find(e => e.episode_number === episodeNum);
            if (ep) {
              episodeTitle = ep.name || title;
              episodeOverview = ep.overview;
              episodeStill = ep.still_path;
              episodeAirDate = ep.air_date;
              episodeRuntime = ep.runtime;
            }
          }
        }
      } catch (e) {
        console.error(`Failed to fetch episode data:`, e.message);
      }

      // Add episode
      const episodeId = uuidv4();
      db.prepare(`
        INSERT INTO episodes (id, media_id, season_number, episode_number, title, overview, path, still_path, air_date, runtime)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(episodeId, show.id, seasonNum, episodeNum, episodeTitle, episodeOverview, filePath, episodeStill, episodeAirDate, episodeRuntime);

      return;
    }
  }

  // For movies, fetch TMDB metadata
  let tmdbData = null;
  if (library.type === 'movies') {
    try {
      console.log(`🔍 Fetching TMDB data for movie: ${title} (${year || 'unknown year'})`);
      tmdbData = await tmdb.fetchMovieMetadata(title, year);
    } catch (e) {
      console.error(`Failed to fetch TMDB data for ${title}:`, e.message);
    }
  }

  // Get video metadata (duration, etc.)
  let videoMeta = {};
  if (library.type === 'movies' || library.type === 'tvshows') {
    try {
      videoMeta = await getVideoMetadata(filePath);
    } catch (e) {
      // Ignore metadata errors
    }
  }

  // Determine media type
  let mediaType = 'movie';
  if (library.type === 'tvshows') mediaType = 'tvshow';
  else if (library.type === 'music') mediaType = 'album';
  else if (library.type === 'photos') mediaType = 'photo';

  // For music, group by album
  if (library.type === 'music') {
    const albumInfo = parseAlbumInfo(filePath);
    
    let album = db.prepare(`
      SELECT id FROM media 
      WHERE library_id = ? AND title = ? AND type = 'album'
    `).get(library.id, albumInfo.album);

    if (!album) {
      const albumId = uuidv4();
      db.prepare(`
        INSERT INTO media (id, library_id, title, type, path, file_name)
        VALUES (?, ?, ?, 'album', ?, ?)
      `).run(albumId, library.id, albumInfo.album, path.dirname(filePath), albumInfo.album);
      album = { id: albumId };
    }

    // Add track
    const trackId = uuidv4();
    db.prepare(`
      INSERT INTO tracks (id, media_id, title, track_number, path)
      VALUES (?, ?, ?, ?, ?)
    `).run(trackId, album.id, albumInfo.title, albumInfo.track, filePath);

    return;
  }

  // Insert media with TMDB data if available
  if (tmdbData) {
    db.prepare(`
      INSERT INTO media (id, library_id, title, original_title, type, path, file_name, file_size, year, overview, tagline, poster_path, backdrop_path, rating, content_rating, genres, cast, directors, writers, studio, tmdb_id, imdb_id, duration)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      mediaId,
      library.id,
      tmdbData.title || title,
      tmdbData.original_title,
      mediaType,
      filePath,
      fileName,
      stats.size,
      tmdbData.year || year,
      tmdbData.overview,
      tmdbData.tagline,
      tmdbData.poster_path,
      tmdbData.backdrop_path,
      tmdbData.rating,
      tmdbData.content_rating,
      tmdbData.genres ? JSON.stringify(tmdbData.genres) : null,
      tmdbData.cast ? JSON.stringify(tmdbData.cast) : null,
      tmdbData.directors ? JSON.stringify(tmdbData.directors) : null,
      tmdbData.writers ? JSON.stringify(tmdbData.writers) : null,
      tmdbData.studio,
      tmdbData.tmdb_id,
      tmdbData.imdb_id,
      videoMeta.duration || tmdbData.runtime || null
    );
  } else {
    db.prepare(`
      INSERT INTO media (id, library_id, title, type, path, file_name, file_size, year, duration, overview, poster_path, rating, genres)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      mediaId,
      library.id,
      title,
      mediaType,
      filePath,
      fileName,
      stats.size,
      year,
      videoMeta.duration || null,
      videoMeta.overview || null,
      videoMeta.poster || null,
      videoMeta.rating || null,
      videoMeta.genres ? JSON.stringify(videoMeta.genres) : null
    );
  }
}

function parseTitle(fileName) {
  // Remove extension
  let title = fileName.replace(/\.[^/.]+$/, '');
  
  // Remove common patterns
  title = title
    .replace(/\(\d{4}\)/g, '') // (2023)
    .replace(/\[\d{4}\]/g, '') // [2023]
    .replace(/\d{4}$/g, '')    // 2023 at end
    .replace(/S\d{2}E\d{2}/gi, '') // S01E01
    .replace(/\d+x\d+/gi, '')  // 1x01
    .replace(/720p|1080p|2160p|4k|HDR|BluRay|WEB-DL|HDTV|x264|x265|HEVC/gi, '')
    .replace(/\[.*?\]/g, '')   // [anything]
    .replace(/\(.*?\)/g, '')   // (anything)
    .replace(/\./g, ' ')       // dots to spaces
    .replace(/_/g, ' ')        // underscores to spaces
    .replace(/-/g, ' ')        // hyphens to spaces
    .replace(/\s+/g, ' ')      // multiple spaces
    .trim();

  return title || fileName;
}

function parseYear(fileName) {
  // Try to find year in filename
  const yearMatch = fileName.match(/[(\[]?(\d{4})[)\]]?/);
  if (yearMatch) {
    const year = parseInt(yearMatch[1]);
    if (year >= 1900 && year <= new Date().getFullYear() + 1) {
      return year;
    }
  }
  return null;
}

function parseEpisodeInfo(filePath) {
  const fileName = path.basename(filePath);
  const dirName = path.basename(path.dirname(filePath));
  
  // Try S01E01 format
  let match = fileName.match(/S(\d{1,2})E(\d{1,2})/i);
  if (match) {
    return {
      showTitle: parseTitle(fileName.split(/S\d{1,2}E\d{1,2}/i)[0]) || parseTitle(dirName),
      season: parseInt(match[1]),
      episode: parseInt(match[2])
    };
  }

  // Try 1x01 format
  match = fileName.match(/(\d{1,2})x(\d{1,2})/i);
  if (match) {
    return {
      showTitle: parseTitle(fileName.split(/\d{1,2}x\d{1,2}/i)[0]) || parseTitle(dirName),
      season: parseInt(match[1]),
      episode: parseInt(match[2])
    };
  }

  return null;
}

function parseAlbumInfo(filePath) {
  const fileName = path.basename(filePath);
  const dirName = path.basename(path.dirname(filePath));
  
  // Try to parse track number
  const trackMatch = fileName.match(/^(\d{1,2})/);
  
  return {
    album: dirName || 'Unknown Album',
    title: parseTitle(fileName),
    track: trackMatch ? parseInt(trackMatch[1]) : null
  };
}
