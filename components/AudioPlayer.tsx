"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Play, Pause, RotateCcw } from "lucide-react";

interface AudioPlayerProps {
  audioUrl: string;
  chapterTitle: string;
}

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

export default function AudioPlayer({ audioUrl, chapterTitle }: AudioPlayerProps) {
  const t = useTranslations("book");
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [speed, setSpeed] = useState(1);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      setProgress(audio.duration ? (audio.currentTime / audio.duration) * 100 : 0);
    };
    const onLoadedMetadata = () => setDuration(audio.duration);
    const onEnded = () => setPlaying(false);

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      audio.play();
    }
    setPlaying(!playing);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    audio.currentTime = ratio * duration;
  };

  const cycleSpeed = () => {
    const nextIdx = (SPEEDS.indexOf(speed) + 1) % SPEEDS.length;
    const nextSpeed = SPEEDS[nextIdx];
    setSpeed(nextSpeed);
    if (audioRef.current) audioRef.current.playbackRate = nextSpeed;
  };

  const restart = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  };

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="sticky bottom-4 mx-4 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.95)] backdrop-blur-md shadow-xl p-4 z-30">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      <div className="flex items-center gap-3">
        {/* Restart */}
        <button
          onClick={restart}
          aria-label="Restart"
          className="p-2 rounded-full text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
        >
          <RotateCcw size={14} />
        </button>

        {/* Play/Pause */}
        <button
          id="audio-play-pause"
          onClick={togglePlay}
          aria-label={playing ? t("pauseAudio") : t("playAudio")}
          className="w-10 h-10 rounded-full bg-[hsl(var(--primary))] text-white flex items-center justify-center hover:bg-[hsl(var(--primary)/0.85)] transition-colors shrink-0 shadow-md"
        >
          {playing ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
        </button>

        {/* Progress */}
        <div className="flex-1 space-y-1">
          <p className="text-xs text-[hsl(var(--muted-foreground))] truncate max-w-[200px]">
            {chapterTitle}
          </p>
          <div
            className="h-1.5 bg-[hsl(var(--muted))] rounded-full cursor-pointer relative overflow-hidden"
            onClick={handleSeek}
          >
            <div
              className="absolute inset-y-0 left-0 bg-[hsl(var(--primary))] rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-[0.65rem] text-[hsl(var(--muted-foreground))]">
            <span>{fmt(currentTime)}</span>
            <span>{duration ? fmt(duration) : "--:--"}</span>
          </div>
        </div>

        {/* Speed */}
        <button
          id="audio-speed"
          onClick={cycleSpeed}
          aria-label={t("playbackSpeed")}
          className="px-2 py-1 rounded-md text-xs font-medium bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent))] transition-colors min-w-[3rem] text-center"
        >
          {speed}x
        </button>
      </div>
    </div>
  );
}
