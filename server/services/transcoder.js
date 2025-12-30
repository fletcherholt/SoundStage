import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';

const CACHE_DIR = path.join(process.cwd(), 'data', 'cache', 'transcode');

export async function transcodeVideo(inputPath, mediaId) {
  const outputDir = path.join(CACHE_DIR, mediaId);
  const playlistPath = path.join(outputDir, 'playlist.m3u8');

  // Create cache directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Check if already transcoded
  if (fs.existsSync(playlistPath)) {
    return fs.readFileSync(playlistPath, 'utf-8');
  }

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions([
        '-c:v libx264',
        '-c:a aac',
        '-b:v 2500k',
        '-b:a 128k',
        '-preset fast',
        '-f hls',
        '-hls_time 10',
        '-hls_list_size 0',
        '-hls_segment_filename', path.join(outputDir, 'segment%03d.ts')
      ])
      .output(playlistPath)
      .on('end', () => {
        const playlist = fs.readFileSync(playlistPath, 'utf-8');
        resolve(playlist);
      })
      .on('error', (err) => {
        console.error('Transcoding error:', err);
        reject(err);
      })
      .run();
  });
}

export async function transcodeAudio(inputPath, mediaId, format = 'mp3') {
  const outputDir = path.join(CACHE_DIR, mediaId);
  const outputPath = path.join(outputDir, `audio.${format}`);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  if (fs.existsSync(outputPath)) {
    return outputPath;
  }

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .audioCodec(format === 'mp3' ? 'libmp3lame' : 'aac')
      .audioBitrate('192k')
      .output(outputPath)
      .on('end', () => resolve(outputPath))
      .on('error', reject)
      .run();
  });
}

export function cleanTranscodeCache(mediaId) {
  const cacheDir = path.join(CACHE_DIR, mediaId);
  if (fs.existsSync(cacheDir)) {
    fs.rmSync(cacheDir, { recursive: true, force: true });
  }
}
