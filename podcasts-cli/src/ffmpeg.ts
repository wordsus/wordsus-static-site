import { spawn } from "child_process";
import { config } from "./config.js";
import { log } from "./logger.js";
import { ok, err, info } from "./ui.js";

const MAX_CROSSFADE_COPIES = 20;

export interface FFmpegProgress {
  seconds: number;
  totalSeconds: number;
}

export type ProgressCallback = (progress: FFmpegProgress) => void;

/**
 * Returns the duration of a media file in seconds using ffprobe.
 */
export async function getMediaDuration(filePath: string): Promise<number | null> {
  return new Promise((resolve) => {
    const ffprobe = spawn("ffprobe", [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1",
      filePath
    ]);

    let output = "";
    ffprobe.stdout.on("data", (data) => {
      output += data.toString();
    });

    ffprobe.on("close", (code) => {
      if (code === 0) {
        const duration = parseFloat(output.trim());
        resolve(isNaN(duration) ? null : duration);
      } else {
        resolve(null);
      }
    });

    ffprobe.on("error", () => resolve(null));
  });
}

function hexToFFmpegColor(hex: string): string {
  return "0x" + hex.replace("#", "").toUpperCase();
}

/**
 * Builds the filtergraph for the background crossfade loop.
 */
function buildBgCrossfadeChain(
  nCopies: number,
  videoDur: number,
  crossfadeDur: number,
  width: string,
  height: string
): string {
  const D = videoDur;
  const F = crossfadeDur;
  const parts: string[] = [];

  // Split input 0 into nCopies identical streams
  const splitOuts = Array.from({ length: nCopies }, (_, i) => `[_bv${i}]`).join("");
  parts.push(`[0:v]split=${nCopies}${splitOuts}`);

  // Chain xfade filters
  for (let i = 1; i < nCopies; i++) {
    const a = i === 1 ? "[_bv0]" : `[_xf${i - 1}]`;
    const b = `[_bv${i}]`;
    const out = `[_xf${i}]`;
    const offset = i * (D - F);
    parts.push(`${a}${b}xfade=transition=fade:duration=${F.toFixed(6)}:offset=${offset.toFixed(6)}${out}`);
  }

  const last = nCopies > 1 ? `[_xf${nCopies - 1}]` : "[_bv0]";
  parts.push(`${last}scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2[bg]`);

  return parts.join(";");
}

/**
 * Builds the full filtergraph with visualizer and glow effect.
 */
function buildVisualizerFiltergraph(options: {
  style: string;
  width: string;
  height: string;
  visHeight: string;
  visColor: string;
  fps: number;
  bgVideoDur: number | null;
  crossfadeDur: number;
  audioDur: number | null;
  isStaticImage: boolean;
}): string {
  const { style, width, height, visHeight, visColor, fps, bgVideoDur, crossfadeDur, audioDur, isStaticImage } = options;

  let bg: string;
  const useCrossfade = !isStaticImage && bgVideoDur !== null && crossfadeDur > 0 && audioDur !== null && bgVideoDur > crossfadeDur * 2 && audioDur > bgVideoDur;

  if (useCrossfade && bgVideoDur && audioDur) {
    const n = Math.max(2, Math.ceil((audioDur - crossfadeDur) / (bgVideoDur - crossfadeDur)));
    if (n <= MAX_CROSSFADE_COPIES) {
      bg = buildBgCrossfadeChain(n, bgVideoDur, crossfadeDur, width, height);
    } else {
      log("WARN", `Crossfade loop would require ${n} copies (max ${MAX_CROSSFADE_COPIES}). Falling back to simple loop.`);
      bg = `[0:v]scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2[bg]`;
    }
  } else {
    bg = `[0:v]scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2[bg]`;
  }

  const GLOW = "split[_a][_b];[_b]gblur=sigma=18[_g];[_a][_g]blend=all_mode=screen";
  const ox = "(W-w)/2";
  const oy = "H-h-20";

  let vis = "";
  let compose = "";

  switch (style) {
    case "wave":
      vis = `[1:a]showwaves=s=${width}x${visHeight}:mode=cline:rate=${fps}:colors=${visColor}[_vis_raw];[_vis_raw]${GLOW}[vis]`;
      compose = `[bg][vis]overlay=${ox}:${oy}[out]`;
      break;
    case "circle":
      vis = `[1:a]avectorscope=s=${visHeight}x${visHeight}:zoom=1.5:mode=lissajous_xy:draw=dot:scale=log[_vis_raw];[_vis_raw]${GLOW}[vis]`;
      compose = `[bg][vis]overlay=(W-w)/2:(H-h)/2[out]`;
      break;
    case "spectrum":
      vis = `[1:a]showcqt=s=${width}x${visHeight}:fps=${fps}:bar_g=3:bar_t=0.5:axis=0:csp=bt709[_vis_raw];[_vis_raw]${GLOW}[vis]`;
      compose = `[bg][vis]overlay=${ox}:${oy}[out]`;
      break;
    case "bars":
    default:
      vis = `[1:a]showfreqs=s=${width}x${visHeight}:mode=bar:fscale=log:ascale=log:colors=${visColor}:win_size=4096[_vis_raw];[_vis_raw]${GLOW}[vis]`;
      compose = `[bg][vis]overlay=${ox}:${oy}[out]`;
      break;
  }

  return `${bg};${vis};${compose}`;
}

export async function runFFmpeg(params: {
  audioFile: string;
  backgroundFile: string;
  outputFile: string;
  isStaticImage: boolean;
  onProgress?: ProgressCallback;
}): Promise<void> {
  const { audioFile, backgroundFile, outputFile, isStaticImage, onProgress } = params;

  const audioDur = await getMediaDuration(audioFile);
  const bgVideoDur = isStaticImage ? null : await getMediaDuration(backgroundFile);
  
  const [width, height] = config.video.output.resolution.split("x");
  const fps = config.video.output.fps;
  
  const filtergraph = buildVisualizerFiltergraph({
    style: config.video.visualizer.style,
    width,
    height,
    visHeight: config.video.visualizer.height.toString(),
    visColor: hexToFFmpegColor(config.video.visualizer.color),
    fps,
    bgVideoDur,
    crossfadeDur: config.video.loop.crossfadeDuration,
    audioDur,
    isStaticImage,
  });

  const args = [
    "-y",
    ...(isStaticImage ? ["-loop", "1"] : (bgVideoDur && audioDur && audioDur > bgVideoDur && config.video.loop.crossfadeDuration > 0 && Math.ceil((audioDur - config.video.loop.crossfadeDuration) / (bgVideoDur - config.video.loop.crossfadeDuration)) <= MAX_CROSSFADE_COPIES ? [] : ["-stream_loop", "-1"])),
    "-i", backgroundFile,
    "-i", audioFile,
    "-filter_complex", filtergraph,
    "-map", "[out]",
    "-map", "1:a",
    ...(isStaticImage ? [] : ["-map", "-0:a"]),
    "-c:v", config.video.output.codec,
    "-crf", config.video.output.crf.toString(),
    "-r", fps.toString(),
    "-c:a", "aac",
    "-b:a", "192k",
    "-shortest",
    ...(audioDur ? ["-t", audioDur.toFixed(6)] : []),
    "-progress", "pipe:1",
    "-nostats",
    outputFile
  ];

  log("INFO", `Running FFmpeg for ${outputFile}`);
  log("DEBUG", `FFmpeg args: ${args.join(" ")}`);

  return new Promise((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", args);
    
    let stderr = "";
    ffmpeg.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    ffmpeg.stdout.on("data", (data) => {
      const lines = data.toString().split("\n");
      for (const line of lines) {
        if (line.startsWith("out_time_us=") && audioDur && onProgress) {
          const us = parseInt(line.split("=")[1]);
          const seconds = Math.min(audioDur, us / 1000000);
          onProgress({ seconds, totalSeconds: audioDur });
        }
      }
    });

    ffmpeg.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        log("ERROR", `FFmpeg failed with code ${code}\n${stderr}`);
        reject(new Error(`FFmpeg failed with code ${code}`));
      }
    });

    ffmpeg.on("error", (err) => {
      reject(err);
    });
  });
}
