"use client";

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  Suspense,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import HiteSummaryCard from "@/components/dashboard/HiteSummaryCard";
import PlanStep from "@/components/dashboard/PlanStep";
import UnlockModal from "@/components/dashboard/UnlockModal";
import {
  PlanProgress,
  StepState,
  readPlanProgress,
  resetAllProgress,
  consumeJustFinishedFlag,
} from "@/lib/planProgress";

type StepAvail = Exclude<StepState, "locked">;

function DashboardDemoInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const showDiscoverOnly = searchParams.get("view") === "discover";

  const [hiteScore] = useState(952);
  const [level] = useState<"Rookie">("Rookie");
  const [activeStreak] = useState(5);

  const [discoverState, setDiscoverState] = useState<StepAvail>("available");
  const [trainState, setTrainState] = useState<StepState>("locked");
  const [executeState, setExecuteState] = useState<StepState>("locked");

  const [modalVisible, setModalVisible] = useState(false);
  const [modalFor, setModalFor] = useState<"train" | "execute" | null>(null);

  // Покажем «All Done» один раз после завершения Execute
  const [showAllDoneOnce, setShowAllDoneOnce] = useState(false);

  const prevDiscoverRef = useRef<string | null>(null);
  const prevTrainRef = useRef<string | null>(null);

  useEffect(() => {
    if (consumeJustFinishedFlag()) {
      setShowAllDoneOnce(true);
      setTimeout(() => {
        resetAllProgress();
      }, 120);
    }
  }, []);

  const syncFromStorage = useCallback(() => {
    if (showDiscoverOnly) {
      setDiscoverState("available");
      setTrainState("locked");
      setExecuteState("locked");
      return;
    }

    const p: PlanProgress = readPlanProgress();

    const d: StepAvail = p.discover === "completed" ? "completed" : "available";
    const t: StepState =
      p.discover === "completed"
        ? p.train === "completed"
          ? "completed"
          : "available"
        : "locked";
    const e: StepState =
      p.execute === "completed"
        ? "completed"
        : p.execute === "available"
        ? "available"
        : "locked";

    setDiscoverState(d);
    setTrainState(t);
    setExecuteState(e);

    // Попапы «unlock» при обычном заходе на дашборд (без view=discover), но только один раз за сессию
    const prevD = prevDiscoverRef.current;
    const prevT = prevTrainRef.current;

    if (
      !showAllDoneOnce &&
      !showDiscoverOnly &&
      prevD !== "completed" &&
      d === "completed"
    ) {
      const SEEN_KEY = "__train_popup_once";
      if (sessionStorage.getItem(SEEN_KEY) !== "1") {
        setModalFor("train");
        setModalVisible(true);
        sessionStorage.setItem(SEEN_KEY, "1");
      }
    }

    if (
      !showAllDoneOnce &&
      !showDiscoverOnly &&
      prevT !== "completed" &&
      t === "completed"
    ) {
      const SEEN_KEY = "__execute_popup_once";
      if (sessionStorage.getItem(SEEN_KEY) !== "1") {
        setModalFor("execute");
        setModalVisible(true);
        sessionStorage.setItem(SEEN_KEY, "1");
      }
    }

    prevDiscoverRef.current = d;
    prevTrainRef.current = t;
  }, [showDiscoverOnly, showAllDoneOnce]);

  // Модалка «Go to Train» при возврате с Discover (?view=discover), один раз за сессию
  useEffect(() => {
    if (!showDiscoverOnly || showAllDoneOnce) return;
    const p = readPlanProgress();
    const shouldShow = p.discover === "completed" && p.train === "available";
    const SEEN_KEY = "__train_popup_once";
    if (shouldShow && sessionStorage.getItem(SEEN_KEY) !== "1") {
      setTimeout(() => {
        setModalFor("train");
        setModalVisible(true);
        sessionStorage.setItem(SEEN_KEY, "1");
      }, 60);
    }
  }, [showDiscoverOnly, showAllDoneOnce]);

  useEffect(() => {
    syncFromStorage();

    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key === "planProgress") syncFromStorage();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") syncFromStorage();
    };
    const onCustom = () => syncFromStorage();

    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("planprogress:updated", onCustom as EventListener);

    return () => {
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener(
        "planprogress:updated",
        onCustom as EventListener
      );
    };
  }, [syncFromStorage]);

  const onStartDiscover = () => router.push("/discover");
  const onStartTrain = () =>
    trainState === "available" && router.push("/train");
  const onStartExecute = () =>
    executeState === "available" && router.push("/execute");

  const onModalAction = () => {
    setModalVisible(false);
    if (modalFor === "train") router.push("/train");
    if (modalFor === "execute") router.push("/execute");
    setModalFor(null);
  };

  const shouldShowAllDoneCard =
    showAllDoneOnce ||
    (discoverState === "completed" &&
      trainState === "completed" &&
      executeState === "completed");

  return (
    <div className='absolute inset-0 flex items-center justify-center'>
      <div
        className='w-full max-w-[560px] h-full rounded-[28px] overflow-hidden flex flex-col py-6'
        style={{
          background:
            "linear-gradient(180deg, rgba(11,17,37,0.75), rgba(0,0,0,0.65))",
          border: "1px solid rgba(255,255,255,0.04)",
          boxShadow: "0 30px 60px rgba(0,0,0,0.75)",
        }}
      >
        <div className='flex-1 overflow-auto'>
          <div className='px-2 text-white'>
            <header className='flex items-center justify-between mb-6'>
              <h1 className='text-4xl font-extrabold'>Hi there!</h1>
              <div className='flex items-center gap-4'>
                <button
                  aria-label='notifications'
                  className='w-10 h-10 rounded-full bg-white/6 grid place-items-center'
                >
                  {/* ...icon... */}
                  <svg
                    width='18'
                    height='21'
                    viewBox='0 0 18 21'
                    fill='none'
                    xmlns='http://www.w3.org/2000/svg'
                  >
                    <path
                      d='M8.59888 0.774414L8.59895 0.0700662H8.59888V0.774414ZM16.3459 13.5908L17.0503 13.5909L17.0503 13.5908L16.3459 13.5908ZM13.1887 17.2939L13.2885 17.9912L13.2885 17.9912L13.1887 17.2939ZM8.5979 17.6992L8.59788 18.4036L8.5979 18.4036L8.5979 17.6992ZM4.00806 17.2939L3.90825 17.9912L3.90826 17.9912L4.00806 17.2939ZM0.85083 13.5908L0.146482 13.5908L0.146482 13.5909L0.85083 13.5908Z'
                      fill='white'
                      fillOpacity='0.8'
                    />
                    <path
                      d='M10.5547 19.166C10.1341 19.8261 9.41481 20.2612 8.59817 20.2612C7.78153 20.2612 7.06227 19.8261 6.64165 19.166'
                      stroke='white'
                      strokeOpacity='0.8'
                      strokeWidth='1.4087'
                      strokeLinecap='round'
                    />
                  </svg>
                </button>
                <button
                  aria-label='profile'
                  className='w-12 h-12 rounded-full bg-white/6 grid place-items-center'
                >
                  <svg width='26' height='26' viewBox='0 0 30 30' fill='none'>
                    <circle cx='15' cy='8.5' r='6' fill='#CFD2D9' />
                    <rect
                      x='3'
                      y='17'
                      width='24'
                      height='10'
                      rx='5'
                      fill='#CFD2D9'
                    />
                  </svg>
                </button>
              </div>
            </header>

            {/* Summary */}
            <section className='relative mb-8'>
              <HiteSummaryCard
                score={hiteScore}
                level={level}
                streakDays={activeStreak}
                weekLabel='This week'
                plansDone={2}
                plansTotal={4}
                timeSpent='1h 15m'
                onShowMore={() => {}}
              />
            </section>

            {/* Today’s Plan */}
            <section className='mb-8'>
              <h3 className='text-2xl font-bold mb-4'>Today&apos;s Plan</h3>

              {shouldShowAllDoneCard ? (
                <div
                  className='rounded-2xl p-8 flex flex-col items-center justify-center text-center'
                  style={{
                    background:
                      "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.00))",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <p className='text-white/80 mb-4'>
                    You&apos;re All Done For Today
                  </p>
                  <div className='w-20 h-20 grid place-items-center'>
                    <Image src='/check.png' alt='Done' width={80} height={80} />
                  </div>
                </div>
              ) : (
                <div className='relative'>
                  <div
                    className='absolute left-1 top-0 bottom-0 w-1 rounded-full bg-white/10'
                    style={{ transform: "translateX(-50%)" }}
                  />
                  <div className='space-y-4 pl-3'>
                    <PlanStep
                      title='Discover'
                      iconSrc='/Discover.png'
                      state={discoverState}
                      accent
                      onStart={() => router.push("/discover")}
                    />
                    <PlanStep
                      title='Train'
                      iconSrc='/Train.png'
                      state={trainState}
                      onStart={() =>
                        trainState === "available" && router.push("/train")
                      }
                    />
                    <PlanStep
                      title='Execute'
                      iconSrc='/Execute.png'
                      state={executeState}
                      onStart={() =>
                        executeState === "available" && router.push("/execute")
                      }
                    />
                  </div>
                </div>
              )}
            </section>

            {/* Coach's Corner */}
            <section style={{ marginBottom: 32 }}>
              <h3 className='text-2xl font-bold mb-4'>Coach&apos;s Corner</h3>
              <div
                className='rounded-2xl p-6 bg-gradient-to-br from-[#151029] to-[#2a1630] border border-white/10 shadow-lg'
                style={{ minHeight: 160 }}
              >
                <h4 className='text-lg font-semibold mb-2'>
                  Composure Under Pressure
                </h4>
                <p className='text-white/70 leading-relaxed mb-4'>
                  Staying calm in tough moments helps you think clearly, make
                  smart decisions, and avoid mistakes. When you&apos;re
                  composed, pressure doesn&apos;t shake you — it sharpens you.
                </p>
                <div className='flex items-center gap-3'>
                  <button className='px-4 py-2 rounded-full bg-white text-black'>
                    Coach Check-ins
                  </button>
                  <button className='px-4 py-2 rounded-full bg-transparent border border-white/10 text-white/80'>
                    Show more
                  </button>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>

      <UnlockModal
        open={modalVisible && !showAllDoneOnce}
        kind={modalFor}
        onClose={() => setModalVisible(false)}
        onAction={() => {
          setModalVisible(false);
          if (modalFor === "train") router.push("/train");
          if (modalFor === "execute") router.push("/execute");
          setModalFor(null);
        }}
      />
    </div>
  );
}

export default function DashboardDemo() {
  return (
    <Suspense fallback={<div className='text-white'>Loading...</div>}>
      <DashboardDemoInner />
    </Suspense>
  );
}
