import { useState, useRef, useEffect, useCallback } from "react";
import config from "../utils/config.js";
import { getCookie, deleteCookie } from "../utils/cookies.js";
import {
  trackEpisodePlay,
  trackEpisodePause,
  trackEpisodeComplete,
  trackSpeedChange,
  trackSubtitleToggle,
} from "../utils/analytics.js";

export default function usePlayer() {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(null);
  const [playingEp, setPlayingEp] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [speed, setSpeedState] = useState(() => {
    const saved = localStorage.getItem("playback_speed") || getCookie("playback_speed");
    if (saved) { deleteCookie("playback_speed"); localStorage.setItem("playback_speed", saved); }
    return saved ? parseFloat(saved) : config.default_speed;
  });
  const [showSubs, setShowSubs] = useState(() => {
    const saved = localStorage.getItem("cc") || getCookie("cc");
    if (saved) { deleteCookie("cc"); localStorage.setItem("cc", saved); }
    return saved ? saved === "on" : config.default_cc;
  });
  const [duration, setDuration] = useState(0);
  const completeFiredRef = useRef(false);
  const playingEpRef = useRef(null);
  const onEndedRef = useRef(null);

  // Initialize audio element
  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.playbackRate = speed;

    // Migrate cookies to localStorage
    for (const key of ["last_episode", "last_timestamp"]) {
      const v = getCookie(key);
      if (v) { localStorage.setItem(key, v); deleteCookie(key); }
    }
    // Resume last episode if saved
    const lastEp = localStorage.getItem("last_episode");
    const lastTime = localStorage.getItem("last_timestamp");
    if (lastEp) {
      audioRef.current._resumeEpisodeId = parseInt(lastEp, 10);
      audioRef.current._resumeTime = lastTime ? parseFloat(lastTime) : 0;
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Attach audio event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      if (
        audio.duration > 0 &&
        audio.currentTime / audio.duration >= 0.95 &&
        !completeFiredRef.current
      ) {
        completeFiredRef.current = true;
        if (playingEpRef.current) trackEpisodeComplete(playingEpRef.current);
      }
    };

    const onDurationChange = () => {
      setDuration(audio.duration || 0);
    };

    const onEnded = () => {
      setIsPlaying(false);
      if (!completeFiredRef.current) {
        completeFiredRef.current = true;
        if (playingEpRef.current) trackEpisodeComplete(playingEpRef.current);
      }
      if (onEndedRef.current) onEndedRef.current();
    };

    const onBeforeUnload = () => {
      if (playing && audio.currentTime > 0) {
        localStorage.setItem("last_episode", String(playing));
        localStorage.setItem("last_timestamp", String(audio.currentTime));
      }
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("durationchange", onDurationChange);
    audio.addEventListener("ended", onEnded);
    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("durationchange", onDurationChange);
      audio.removeEventListener("ended", onEnded);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [playing]);

  const playEpisode = useCallback(
    (ep) => {
      const audio = audioRef.current;
      if (!audio) return;

      if (playing === ep.id) {
        // Same episode: toggle play/pause
        if (audio.paused) {
          audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
        } else {
          audio.pause();
          setIsPlaying(false);
          const pct = audio.duration > 0 ? (audio.currentTime / audio.duration) * 100 : 0;
          trackEpisodePause(ep, pct);
        }
        return;
      }

      // New episode
      completeFiredRef.current = false;
      audio.src = `/${ep.audioFile}`;
      audio.playbackRate = speed;

      const lastEpId = localStorage.getItem("last_episode");
      const lastTime = localStorage.getItem("last_timestamp");
      if (lastEpId && parseInt(lastEpId, 10) === ep.id && lastTime) {
        audio.currentTime = parseFloat(lastTime);
      } else {
        audio.currentTime = 0;
      }

      setPlaying(ep.id);
      setPlayingEp(ep);
      playingEpRef.current = ep;
      localStorage.setItem("last_episode", String(ep.id));
      const path = `/${ep.id}`;
      const link = document.querySelector('link[rel="canonical"]');
      if (link) link.setAttribute("href", `${window.location.origin}${path}`);
      window.history.replaceState(null, "", path);
      setCurrentTime(audio.currentTime);
      audio.play().then(() => {
        setIsPlaying(true);
        trackEpisodePlay(ep, speed);
      }).catch(() => setIsPlaying(false));
    },
    [playing, speed],
  );

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    } else {
      audio.pause();
      setIsPlaying(false);
      if (playingEpRef.current) {
        const pct = audio.duration > 0 ? (audio.currentTime / audio.duration) * 100 : 0;
        trackEpisodePause(playingEpRef.current, pct);
      }
    }
  }, []);

  const setSpeed = useCallback((s) => {
    const audio = audioRef.current;
    if (audio) {
      audio.playbackRate = s;
    }
    setSpeedState(s);
    localStorage.setItem("playback_speed", String(s));
    trackSpeedChange(s, playingEpRef.current);
  }, []);

  const toggleSubs = useCallback(() => {
    setShowSubs((prev) => {
      const next = !prev;
      localStorage.setItem("cc", next ? "on" : "off");
      trackSubtitleToggle(next);
      return next;
    });
  }, []);

  const seek = useCallback((time) => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  const skipBack = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      const t = Math.max(0, audio.currentTime - 15);
      audio.currentTime = t;
      setCurrentTime(t);
    }
  }, []);

  const skipForward = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      const t = Math.min(audio.duration || 0, audio.currentTime + 15);
      audio.currentTime = t;
      setCurrentTime(t);
    }
  }, []);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return {
    playing,
    isPlaying,
    currentTime,
    duration,
    speed,
    showSubs,
    playingEp,
    togglePlay,
    playEpisode,
    setSpeed,
    toggleSubs,
    seek,
    skipBack,
    skipForward,
    progress,
    onEndedRef,
  };
}
