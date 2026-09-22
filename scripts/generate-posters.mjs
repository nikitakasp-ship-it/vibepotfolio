import {readdir, rm, stat} from 'node:fs/promises';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const portfolio = path.join(root, 'portfolio');
const ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg';

async function walk(dir) {
  const entries = await readdir(dir, {withFileTypes: true}).catch(error => {
    if (error.code === 'ENOENT') return [];
    throw error;
  });
  const files = [];
  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.isSymbolicLink()) continue;
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(file));
    else if (/\.(mp4|webm)$/i.test(entry.name)) files.push(file);
  }
  return files;
}

async function hasPoster(stem) {
  for (const extension of ['jpg', 'jpeg', 'png', 'webp']) {
    if (await stat(stem + '.' + extension).then(file => file.isFile()).catch(() => false)) return true;
  }
  return false;
}

function run(args) {
  return spawnSync(ffmpeg, args, {encoding: 'utf8', maxBuffer: 4 * 1024 * 1024});
}

const videos = await walk(portfolio);
const missing = [];
for (const video of videos) {
  const stem = video.slice(0, -path.extname(video).length);
  if (!await hasPoster(stem)) missing.push({video, poster: stem + '.jpg'});
}
if (missing.length === 0) {
  console.log(`All ${videos.length} videos already have covers.`);
  process.exit(0);
}

const check = run(['-version']);
if (check.error || check.status !== 0) {
  console.error(`FFmpeg was not found (${ffmpeg}). Install FFmpeg or set FFMPEG_PATH to ffmpeg.exe.`);
  process.exit(1);
}

for (const {video, poster} of missing) {
  const probe = run(['-hide_banner', '-i', video]);
  const details = `${probe.stderr || ''}\n${probe.stdout || ''}`;
  const durationMatch = details.match(/Duration:\s*(\d+):(\d+):([\d.]+)/);
  const duration = durationMatch
    ? Number(durationMatch[1]) * 3600 + Number(durationMatch[2]) * 60 + Number(durationMatch[3])
    : 0;
  const timestamp = duration > 0 ? Math.max(0, Math.min(duration * 0.18, duration - 0.05)) : 1;
  const args = seek => [
    '-hide_banner', '-loglevel', 'error', '-ss', String(seek), '-i', video,
    '-map', '0:v:0', '-frames:v', '1', '-vf', 'scale=w=min(640\\,iw):h=-2',
    '-q:v', '3', '-y', poster,
  ];

  let output = run(args(timestamp));
  if (output.error || output.status !== 0 || !await stat(poster).then(file => file.size > 0).catch(() => false)) {
    await rm(poster, {force: true});
    output = run(args(0));
  }
  if (output.error || output.status !== 0 || !await stat(poster).then(file => file.size > 0).catch(() => false)) {
    await rm(poster, {force: true});
    console.error(`Could not extract a frame from ${path.relative(portfolio, video)}\n${output.stderr || output.error || 'No video frame found.'}`);
    process.exit(1);
  }
  console.log(`Created ${path.relative(portfolio, poster)}`);
}
console.log(`Created ${missing.length} video covers.`);
