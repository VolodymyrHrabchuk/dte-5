"use client";
import Counter from "./timer/Counter";
import { FlashcardsContent } from "./Flashcards";
import AudioIcon from "./icons/AudioIcon";
import SwipeIcon from "./icons/SwipeIcon";
import BackButton from "./ui/BackButton";
import BookmarkButton from "./ui/BookmarkButton";
import TextArea from "./ui/TextArea";
import Timer from "./timer/Timer";
import Swiper from "swiper";
import { useEffect, useMemo, useState } from "react";
import Button from "./ui/Button";
import { createPortal } from "react-dom";
import AudioWave from "./AudioWave";

type FlashcardSlideProps = {
  card: FlashcardsContent;
  isActive: boolean;
  index: number;
  cardsLength: number;
  userInput: string;
  onUserInputChange: (value: string) => void;
  swiper: Swiper | null;
  onComplete?: () => void;
  onBack?: () => void;
};

export default function FlashcardSlide({
  card,
  isActive,
  index,
  cardsLength,
  userInput,
  onUserInputChange,
  swiper,
  onComplete,
  onBack,
}: FlashcardSlideProps) {
  const [bookmarked, setBookmarked] = useState(false);

 
  const [timerFinished, setTimerFinished] = useState(false);
  const [timerHasStarted, setTimerHasStarted] = useState(false); 
  const [timerKey, setTimerKey] = useState(0);

  const hasTyped = useMemo(
    () => card.type === "input" && userInput.trim().length > 0,
    [card.type, userInput]
  );
  const isLastSlide = index === cardsLength - 1;

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isActiveNow = isActive || swiper?.activeIndex === index;


  useEffect(() => {
    if (!swiper || card.type !== "timer") return;
    const resetTimerOnSlideChange = () => {
      setTimerFinished(false);
      setTimerKey((k) => k + 1);
      
    };
    swiper.on("slideChange", resetTimerOnSlideChange);
    return () => {
      swiper.off("slideChange", resetTimerOnSlideChange);
    };
  }, [swiper, card.type]);

  const handleSubmit = () => {
    if (swiper && !isLastSlide) {
      swiper.slideTo(index + 1, 300);
    } else {
      onComplete?.();
    }
  };

  
  const showSwipeIcon =
    index === 0 || (card.type === "timer" && timerHasStarted);

  return (
    <div className='h-full flex flex-col'>
      <BackButton
        onClick={() => {
          if (onBack) return onBack();
          if (index > 0) swiper?.slidePrev();
        }}
        className='z-10 mt-[1.5rem] mb-6'
      />

      <div className='flex-1 flex flex-col justify-center items-center'>
        {/* VIDEO */}
        {card.type === "video" && (
          <div className='w-full h-full'>
            <Counter count={index} length={cardsLength} />
          </div>
        )}

        {/* TIMER */}
        {card.type === "timer" && (
          <div className='w-full h-full'>
            <div className='flex flex-col space-y-4 mb-12'>
              <Counter count={index} length={cardsLength} />
              {card.title && (
                <h1 className='text-2xl font-medium text-white leading-tight'>
                  {card.title}
                </h1>
              )}
              {card.content && <p className='text-white'>{card.content}</p>}
            </div>

            <div className='flex-col items-center justify-center'>
              <Timer
                key={timerKey}
                timer={90}
                className='mx-auto'
                onStart={() => setTimerHasStarted(true)} 
                onComplete={() => setTimerFinished(true)} 
              />
            </div>
          </div>
        )}

        {/* TEXT */}
        {card.type === "text" && (
          <div className='w-full h-full'>
            <div className='flex flex-col mt-14 w-full space-y-4'>
              <Counter count={index} length={cardsLength} />
              {card.title && (
                <h1 className='text-2xl font-medium text-white leading-tight'>
                  {card.title}
                </h1>
              )}
              {card.content && <p className='text-white'>{card.content}</p>}
              {card.audioUrl && (
                <div className='flex justify-center -mx-4'>
                  <AudioIcon />
                </div>
              )}
            </div>
          </div>
        )}

        {/* AUDIO */}
        {card.type === "audio" && (
          <div className='absolute inset-0'>
            <div className='pointer-events-none absolute z-10 left-0 right-0 top-[calc(env(safe-area-inset-top)+64px)] px-4 flex flex-col gap-3'>
              <Counter count={index} length={cardsLength} />
              {card.title && (
                <h1 className='text-2xl font-medium text-white leading-tight'>
                  {card.title}
                </h1>
              )}
              {card.content && <p className='text-white/90'>{card.content}</p>}
            </div>

            <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[100vw] z-10'>
              <AudioWave
                src={card.audioUrl ?? "/audio.m4a"}
                bgClass='bg-transparent !rounded-none'
                minFill={0.4}
                maxFill={0.7}
                samples={130}
                roundness={2.8}
                height={120}
              />
            </div>
          </div>
        )}

        {/* INPUT */}
        {card.type === "input" && (
          <div className='flex flex-col w-full h-full space-y-4'>
            <Counter count={index} length={cardsLength} />
            {card.title && (
              <h1 className='text-2xl font-medium text-white leading-tight'>
                {card.title}
              </h1>
            )}
            {card.content && <p className='text-white'>{card.content}</p>}
            <TextArea
              value={userInput}
              onChange={(e) => onUserInputChange(e.target.value)}
            />
          </div>
        )}
      </div>

      {showSwipeIcon && (
        <div className='flex justify-center mb-[4.125rem]'>
          <SwipeIcon />
        </div>
      )}

      {/* Submit */}
      {card.type === "input" && hasTyped && isActiveNow && mounted
        ? createPortal(
            <div className='fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom,0px)+18px)] z-[1000]'>
              <div className='mx-auto w-full max-w-md px-4'>
                <Button
                  onClick={handleSubmit}
                  variant='button'
                  aria-label='Submit'
                  className='w-full'
                >
                  Submit
                </Button>
              </div>
            </div>,
            document.body
          )
        : null}

      <BookmarkButton
        className='fixed z-30 bottom-[2.375rem] right-4'
        active={bookmarked}
        onClick={() => setBookmarked((b) => !b)}
        aria-label={bookmarked ? "Remove bookmark" : "Add bookmark"}
      />
    </div>
  );
}
