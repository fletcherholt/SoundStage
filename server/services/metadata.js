import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';

// Cache directory for transcoded segments
const CACHE_DIR = path.join(process.cwd(), 'data', 'cache', 'transcode');

export function getVideoMetadata(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        return reject(err);
      }

      const videoStream = metadata.streams.find(s => s.codec_type === 'video');
      const audioStream = metadata.streams.find(s => s.codec_type === 'audio');

      resolve({
        duration: Math.round(metadata.format.duration || 0),
        width: videoStream?.width,
        height: videoStream?.height,
        videoCodec: videoStream?.codec_name,
        audioCodec: audioStream?.codec_name,
        bitrate: metadata.format.bit_rate
      });
    });
  });
}

export function getAudioMetadata(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        return reject(err);
      }

      resolve({
        duration: Math.round(metadata.format.duration || 0),
        bitrate: metadata.format.bit_rate,
        title: metadata.format.tags?.title,
        artist: metadata.format.tags?.artist,
        album: metadata.format.tags?.album,
        track: metadata.format.tags?.track
      });
    });
  });
}

export function generateThumbnail(videoPath, outputPath, timestamp = '00:00:05') {
  return new Promise((resolve, reject) => {
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    ffmpeg(videoPath)
      .screenshots({
        timestamps: [timestamp],
        filename: path.basename(outputPath),
        folder: outputDir,
        size: '480x270'
      })
      .on('end', () => resolve(outputPath))
      .on('error', reject);
  });
}
