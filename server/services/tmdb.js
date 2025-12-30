import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { DATA_DIR } from '../db/init.js';

// Hardcoded TMDB API key
const TMDB_API_KEY = '4c40b23502f3348c1a2afb55be7c7fc9';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

// Cache directory for downloaded images
const CACHE_DIR = path.join(DATA_DIR, 'cache', 'images');
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

async function tmdbRequest(endpoint, params = {}) {
  const url = new URL(`${TMDB_BASE_URL}${endpoint}`);
  url.searchParams.set('api_key', TMDB_API_KEY);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, value);
    }
  });

  try {
    const response = await fetch(url.toString(), { timeout: 10000 });
    if (!response.ok) {
      console.error(`TMDB API error: ${response.status}`);
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error('TMDB request failed:', error.message);
    return null;
  }
}

async function downloadImage(imagePath, type = 'poster') {
  if (!imagePath) return null;

  const size = type === 'backdrop' ? 'w1280' : 'w500';
  const imageUrl = `${TMDB_IMAGE_BASE}/${size}${imagePath}`;
  const localFileName = `${type}_${imagePath.replace('/', '')}`;
  const localPath = path.join(CACHE_DIR, localFileName);

  // Check if already cached
  if (fs.existsSync(localPath)) {
    return `/cache/images/${localFileName}`;
  }

  try {
    const response = await fetch(imageUrl);
    if (!response.ok) return null;

    const buffer = await response.buffer();
    fs.writeFileSync(localPath, buffer);
    return `/cache/images/${localFileName}`;
  } catch (error) {
    console.error('Failed to download image:', error.message);
    return null;
  }
}

export async function searchMovie(title, year = null) {
  const params = { query: title };
  if (year) params.year = year;

  const data = await tmdbRequest('/search/movie', params);
  if (!data || !data.results || data.results.length === 0) {
    return null;
  }

  // Return the most relevant result
  return data.results[0];
}

export async function searchTVShow(title, year = null) {
  const params = { query: title };
  if (year) params.first_air_date_year = year;

  const data = await tmdbRequest('/search/tv', params);
  if (!data || !data.results || data.results.length === 0) {
    return null;
  }

  return data.results[0];
}

export async function getMovieDetails(tmdbId) {
  const data = await tmdbRequest(`/movie/${tmdbId}`, {
    append_to_response: 'credits,external_ids,videos'
  });

  if (!data) return null;

  // Download images
  const posterPath = await downloadImage(data.poster_path, 'poster');
  const backdropPath = await downloadImage(data.backdrop_path, 'backdrop');

  // Extract relevant info
  const directors = data.credits?.crew?.filter(c => c.job === 'Director').map(d => d.name) || [];
  const writers = data.credits?.crew?.filter(c => ['Writer', 'Screenplay'].includes(c.job)).map(w => w.name) || [];
  const cast = data.credits?.cast?.slice(0, 10).map(c => ({
    name: c.name,
    character: c.character,
    profile_path: c.profile_path ? `${TMDB_IMAGE_BASE}/w185${c.profile_path}` : null
  })) || [];

  return {
    tmdb_id: data.id,
    imdb_id: data.external_ids?.imdb_id || null,
    title: data.title,
    original_title: data.original_title,
    overview: data.overview,
    tagline: data.tagline,
    release_date: data.release_date,
    year: data.release_date ? parseInt(data.release_date.split('-')[0]) : null,
    runtime: data.runtime,
    rating: data.vote_average,
    vote_count: data.vote_count,
    poster_path: posterPath,
    backdrop_path: backdropPath,
    genres: data.genres?.map(g => g.name) || [],
    production_companies: data.production_companies?.map(c => c.name) || [],
    studio: data.production_companies?.[0]?.name || null,
    directors,
    writers,
    cast,
    status: data.status,
    budget: data.budget,
    revenue: data.revenue
  };
}

export async function getTVShowDetails(tmdbId) {
  const data = await tmdbRequest(`/tv/${tmdbId}`, {
    append_to_response: 'credits,external_ids,content_ratings'
  });

  if (!data) return null;

  // Download images
  const posterPath = await downloadImage(data.poster_path, 'poster');
  const backdropPath = await downloadImage(data.backdrop_path, 'backdrop');

  // Get content rating (TV-14, TV-MA, etc.)
  const usRating = data.content_ratings?.results?.find(r => r.iso_3166_1 === 'US');
  const contentRating = usRating?.rating || null;

  const creators = data.created_by?.map(c => c.name) || [];
  const cast = data.credits?.cast?.slice(0, 10).map(c => ({
    name: c.name,
    character: c.character,
    profile_path: c.profile_path ? `${TMDB_IMAGE_BASE}/w185${c.profile_path}` : null
  })) || [];

  return {
    tmdb_id: data.id,
    imdb_id: data.external_ids?.imdb_id || null,
    title: data.name,
    original_title: data.original_name,
    overview: data.overview,
    tagline: data.tagline,
    first_air_date: data.first_air_date,
    last_air_date: data.last_air_date,
    year: data.first_air_date ? parseInt(data.first_air_date.split('-')[0]) : null,
    end_year: data.last_air_date ? parseInt(data.last_air_date.split('-')[0]) : null,
    episode_runtime: data.episode_run_time?.[0] || null,
    rating: data.vote_average,
    vote_count: data.vote_count,
    poster_path: posterPath,
    backdrop_path: backdropPath,
    genres: data.genres?.map(g => g.name) || [],
    networks: data.networks?.map(n => n.name) || [],
    production_companies: data.production_companies?.map(c => c.name) || [],
    studio: data.networks?.[0]?.name || data.production_companies?.[0]?.name || null,
    creators,
    directors: creators,
    writers: creators,
    cast,
    status: data.status,
    season_count: data.number_of_seasons,
    episode_count: data.number_of_episodes,
    content_rating: contentRating,
    seasons: data.seasons?.map(s => ({
      season_number: s.season_number,
      name: s.name,
      episode_count: s.episode_count,
      air_date: s.air_date,
      poster_path: s.poster_path ? `${TMDB_IMAGE_BASE}/w300${s.poster_path}` : null
    })) || []
  };
}

export async function getTVSeasonDetails(tmdbId, seasonNumber) {
  const data = await tmdbRequest(`/tv/${tmdbId}/season/${seasonNumber}`);
  if (!data) return null;

  return {
    season_number: data.season_number,
    name: data.name,
    overview: data.overview,
    air_date: data.air_date,
    episodes: data.episodes?.map(e => ({
      episode_number: e.episode_number,
      name: e.name,
      overview: e.overview,
      air_date: e.air_date,
      runtime: e.runtime,
      still_path: e.still_path ? `${TMDB_IMAGE_BASE}/w300${e.still_path}` : null,
      rating: e.vote_average
    })) || []
  };
}

export async function fetchMovieMetadata(title, year = null) {
  const searchResult = await searchMovie(title, year);
  if (!searchResult) return null;

  return await getMovieDetails(searchResult.id);
}

export async function fetchTVShowMetadata(title, year = null) {
  const searchResult = await searchTVShow(title, year);
  if (!searchResult) return null;

  return await getTVShowDetails(searchResult.id);
}
