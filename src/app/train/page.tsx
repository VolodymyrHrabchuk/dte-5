"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Flashcards, { FlashcardsContent } from "@/components/Flashcards";
import PrefetchTranscripts from "@/components/PrefetchTranscripts";
import { completeTrainMakeExecuteAvailable } from "@/lib/planProgress";

// утилита: распознаём видео-фон
const isVideoSrc = (src: string) => /\.mp4$|\.webm$|\.ogg$/i.test(src ?? "");

export default function TrainPage() {
  const router = useRouter();

  const [activeIndex, setActiveIndex] = useState(0);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});

  const hasCompletedRef = useRef(false);

  const bgAudioRef = useRef<HTMLAudioElement | null>(null);
  const bgUnlockedRef = useRef(false);
  const SOUND2_URL = "/sound-2.mp3";
  const SOUND3_URL = "/sound-3.mp3";

  const unlockAudio = async () => {
    const el = bgAudioRef.current;
    if (!el || bgUnlockedRef.current) return;
    try {
      el.muted = true;
      await el.play();
      el.pause();
      el.currentTime = 0;
      el.muted = false;
      bgUnlockedRef.current = true;
    } catch {
      /* ignore */
    }
  };

  // 1) audio (+субтитры), 2) timer, 3) input
  const flashcards: FlashcardsContent[] = useMemo(
    () => [
      {
        id: "f1",
        type: "audio",
        title: "",
        content: "",
        audioUrl: "/sound-1.mp3",
        backgroundImage: "/video-bg.png",
      },
      {
        id: "f2",
        type: "timer",
        title:
          "Use this time to slow your breathing and let your focus settle. ",
        content:
          "The goal isn’t to pause effort; it’s to return to it with clarity.",
        backgroundImage: "/video-bg.png",
      },
      {
        id: "f3",
        type: "input",
        title: "What signals tell you it’s time for a reset? ",
        content: "What would happen if you caught them earlier??",
        backgroundImage: "/video-bg.png",
      },
    ],
    []
  );

  const audioUrls = useMemo(
    () =>
      flashcards
        .filter((c) => c.type === "audio" && typeof c.audioUrl === "string")
        .map((c) => c.audioUrl!) as string[],
    [flashcards]
  );

  useEffect(() => setActiveIndex(0), []);
  
  const handleSlideChange = (index: number) => setActiveIndex(index);

  const handleComplete = () => {
    if (hasCompletedRef.current) return; // ⬅️ защита от даблклика
    hasCompletedRef.current = true;
    try {
      // Train -> completed, Execute -> available
      completeTrainMakeExecuteAvailable();
    } finally {
      // на дашборде твой эффект сам покажет модалку "Execute Section Unlocked!"
      router.replace("/dashboard");
    }
  };

  useEffect(() => {
    const activeId = flashcards[activeIndex]?.id;

    Object.entries(videoRefs.current).forEach(([id, el]) => {
      if (!el) return;

      const mute = () => {
        el.muted = true;
        el.defaultMuted = true;
        el.setAttribute("muted", "");
      };

      if (id === activeId) {
        try {
          el.muted = false;
          el.defaultMuted = false;
          el.removeAttribute("muted");
          el.volume = 1;
          el.play().catch(() => {
            mute();
            el.play().catch(() => {});
          });
        } catch {
          mute();
        }
      } else {
        mute();
        el.pause();
      }
    });

    return () => {
      Object.values(videoRefs.current).forEach((el) => {
        if (!el) return;
        try {
          el.pause();
          el.muted = true;
          el.defaultMuted = true;
          el.setAttribute("muted", "");
        } catch {}
      });
    };
  }, [activeIndex, flashcards]);

  useEffect(() => {
    const el = bgAudioRef.current;
    if (!el) return;

    const bgSrc =
      activeIndex === 1 ? SOUND2_URL : activeIndex === 2 ? SOUND3_URL : null;

    if (!bgSrc) {
      try {
        el.pause();
      } catch {}
      return;
    }

    (async () => {
      try {
        if (el.getAttribute("data-src") !== bgSrc) {
          el.pause();
          el.src = bgSrc;
          el.setAttribute("data-src", bgSrc);
        } else {
          el.currentTime = 0;
        }
        el.loop = false;
        el.volume = 0.35;
        await el.play();
      } catch {}
    })();
  }, [activeIndex]);

  useEffect(() => {
    const root = document.getElementById("train-root");
    if (!root) return;
    const h = () => unlockAudio();
    root.addEventListener("pointerdown", h, { passive: true });
    root.addEventListener("keydown", h);
    root.addEventListener("wheel", h, { passive: true });
    return () => {
      root.removeEventListener("pointerdown", h);
      root.removeEventListener("keydown", h);
      root.removeEventListener("wheel", h);
    };
  }, []);

  useEffect(() => {
    return () => {
      try {
        bgAudioRef.current?.pause();
      } catch {}
    };
  }, []);

  return (
    <div id='train-root' className='w-full h-full flex justify-center'>
      <PrefetchTranscripts urls={audioUrls} />

      <audio ref={bgAudioRef} preload='auto' />

      <div className='min-h-screen max-w-md relative overflow-hidden'>
        {/* Фоны */}
        <div className='absolute inset-0'>
          {flashcards.map((card) => {
            const src = card.backgroundImage || "/video-bg.png";
            const active = card.id === flashcards[activeIndex]?.id;
            const isVideo = isVideoSrc(src);

            return (
              <div
                key={card.id}
                aria-hidden
                className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                  active ? "opacity-100" : "opacity-0"
                } pointer-events-none`}
              >
                {isVideo ? (
                  <>
                    <video
                      ref={(el) => {
                        videoRefs.current[card.id] = el;
                      }}
                      className='absolute inset-0 w-full h-full object-cover blur-[10px] scale-110'
                      src={src}
                      autoPlay
                      muted
                      loop
                      playsInline
                    />
                    <div
                      className={`absolute inset-0 ${
                        active ? "bg-black/50" : "bg-black/30"
                      }`}
                    />
                  </>
                ) : (
                  <div
                    className='absolute inset-0 bg-cover bg-center bg-no-repeat'
                    style={{ backgroundImage: `url("${src}")` }}
                  />
                )}
              </div>
            );
          })}
        </div>

        <div className='relative z-10'>
          <div className='h-screen flex flex-col'>
            <Flashcards
              cards={flashcards}
              onComplete={handleComplete}
              onSlideChange={handleSlideChange}
              className='flex-1'
            />
          </div>
        </div>
      </div>
    </div>
  );
}
