// app/execute/page.tsx
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Screen from "@/components/Screen";
import OptionButton from "@/components/OptionButton";
import TextArea from "@/components/ui/TextArea";
import Button from "@/components/ui/Button";
import BackButton from "@/components/ui/BackButton";
import { completeExecute } from "@/lib/planProgress";
import Image from "next/image";

export default function ExecutePage() {
  const router = useRouter();

  const [step, setStep] = useState<0 | 1>(0);
  const [answer, setAnswer] = useState("");

  const progress = useMemo(() => (step === 0 ? 50 : 100), [step]);
  const canSubmit = answer.trim().length > 0;

  const finish = () => {
    completeExecute();
    router.push("/score");
  };

  // --- STEP 0 (quiz) ---
  if (step === 0) {
    return (
      <Screen title='Execute' progress={progress} onBack={() => router.back()}>
        <p className='text-lg mt-6 mb-5'>
          What does a reset help you do during intense training or competition?
        </p>

        <div className='space-y-3'>
          {[
            "Pause your effort completely",
            "Come back to your focus with more clarity",
            "Avoid doing too much",
          ].map((opt) => (
            <OptionButton key={opt} align='left' onClick={() => setStep(1)}>
              {opt}
            </OptionButton>
          ))}
        </div>
      </Screen>
    );
  }

  // --- STEP 1 (TextArea + Submit, с фоном) ---
  return (
    <div className='min-h-[100dvh] relative text-white overflow-hidden'>
      {/* ФОН: z-0 (НЕ отрицательный), родитель relative */}
      <div className='absolute inset-0 z-0 pointer-events-none' aria-hidden>
        <Image
          src='/bg.png'
          alt=''
          fill
          priority
          sizes='100vw'
          className='object-cover blur-[10px] scale-110'
        />
      </div>

      {/* КОНТЕНТ: z-10 */}
      <div className='relative z-10 max-w-md mx-auto px-4'>
        <BackButton onClick={() => setStep(0)} className='mt-[1.5rem] mb-6' />

        <div className='flex flex-col gap-4 pb-[calc(env(safe-area-inset-bottom)+96px)]'>
          <h1 className='text-2xl font-medium leading-tight'>
            Why do you think mental resets help gain more control?
          </h1>

          <TextArea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder='Type your answer…'
          />
        </div>
      </div>

      {/* Submit только при вводе */}
      {canSubmit && (
        <div className='fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom,0px)+18px)] z-20'>
          <div className='mx-auto w-full max-w-md px-4'>
            <Button
              onClick={finish}
              variant='button'
              aria-label='Submit'
              className='w-full'
            >
              Submit
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
