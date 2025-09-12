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


  const [hiteScore, setHiteScore] = useState<number>(952);
  const [level, setLevel] = useState<"Rookie" | "Starter">("Rookie");
  const [activeStreak, setActiveStreak] = useState<number>(5);

  const [discoverState, setDiscoverState] = useState<StepAvail>("available");
  const [trainState, setTrainState] = useState<StepState>("locked");
  const [executeState, setExecuteState] = useState<StepState>("locked");

  const [modalVisible, setModalVisible] = useState(false);
  const [modalFor, setModalFor] = useState<"train" | "execute" | null>(null);


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

  const readHiteFromStorage = useCallback(() => {
    try {
      const ls = localStorage;
      const base = parseInt(ls.getItem("hiteBase") || "952", 10);
      const streakDays = parseInt(ls.getItem("streakDays") || "5", 10);
      const storedLevel =
        (ls.getItem("xpLevel") as "Rookie" | "Starter" | null) || null;

      const score = Number.isFinite(base) ? base : 952;
      const streak = Number.isFinite(streakDays) ? streakDays : 5;
      const levelResolved: "Rookie" | "Starter" = storedLevel ?? "Rookie";

      setHiteScore(score);
      setLevel(levelResolved);
      setActiveStreak(streak);
    } catch {
      setHiteScore(952);
      setLevel("Rookie");
      setActiveStreak(5);
    }
  }, []);

  const syncFromStorage = useCallback(() => {
    if (showDiscoverOnly) {
      setDiscoverState("available");
      setTrainState("locked");
      setExecuteState("locked");
      readHiteFromStorage();
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


    readHiteFromStorage();


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
  }, [showDiscoverOnly, showAllDoneOnce, readHiteFromStorage]);

  
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

  useEffect(() => {
    if (!shouldShowAllDoneCard) return;

    const timer = window.setTimeout(() => {
      try {
        // Чистим только используемые ключи, не трогаем остальное
        localStorage.removeItem("planProgress");
        localStorage.removeItem("hiteBase");
        localStorage.removeItem("streakDays");
        localStorage.removeItem("xpLevel");
      } catch {
        // no-op
      }
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [shouldShowAllDoneCard]);

  return (
    <div className='absolute inset-0 flex items-center justify-center'>
      <div
        className='w-full max-w-[560px] h-full  overflow-hidden flex flex-col py-6'
        style={{
          background: "url('/bg.png') center/cover",
          border: "1px solid rgba(255,255,255,0.04)",
          boxShadow: "0 30px 60px rgba(0,0,0,0.75)",
        }}
      >
        <div className='flex-1 '>
          <div className='px-2 text-white'>
            <header className='flex items-center justify-between mb-6'>
              <h1 className='text-4xl font-extrabold'>Hi there!</h1>
              <div className='flex items-center gap-4'>
                <button
                  aria-label='notifications'
                  className='w-10 h-10 rounded-full bg-white/6 grid place-items-center'
                >
                  <svg
                    width='30'
                    height='30'
                    viewBox='0 0 30 30'
                    fill='none'
                    xmlns='http://www.w3.org/2000/svg'
                  >
                    <path
                      d='M15.5984 4.77441L15.5984 4.07007H15.5984V4.77441ZM21.781 10.957H22.4854V10.957L21.781 10.957ZM23.3455 17.5908L24.0498 17.5909V17.5908L23.3455 17.5908ZM20.1882 21.2939L20.288 21.9912L20.2881 21.9912L20.1882 21.2939ZM15.5974 21.6992L15.5974 22.4036H15.5974L15.5974 21.6992ZM11.0076 21.2939L10.9078 21.9912L10.9078 21.9912L11.0076 21.2939ZM7.85034 17.5908L7.14599 17.5908V17.5909L7.85034 17.5908ZM9.41577 10.957L8.71142 10.957V10.957H9.41577ZM15.5984 4.77441L15.5983 5.47876C18.6236 5.47899 21.0765 7.93181 21.0767 10.9571L21.781 10.957L22.4854 10.957C22.4852 7.15376 19.4016 4.07036 15.5984 4.07007L15.5984 4.77441ZM21.781 10.957H21.0767V13.077H21.781H22.4854V10.957H21.781ZM22.7487 15.537L22.1545 15.9152C22.4625 16.3991 22.6411 16.973 22.6411 17.5908L23.3455 17.5908L24.0498 17.5908C24.0498 16.6971 23.7905 15.862 23.3429 15.1588L22.7487 15.537ZM23.3455 17.5908L22.6411 17.5908C22.641 19.0931 21.5739 20.384 20.0884 20.5967L20.1882 21.2939L20.2881 21.9912C22.504 21.6738 24.0497 19.7563 24.0498 17.5909L23.3455 17.5908ZM20.1882 21.2939L20.0884 20.5967C18.6858 20.7975 16.9588 20.9948 15.5974 20.9949L15.5974 21.6992L15.5974 22.4036C17.0636 22.4035 18.8725 22.1938 20.288 21.9912L20.1882 21.2939ZM15.5974 21.6992L15.5974 20.9949C14.2362 20.9948 12.5099 20.7974 11.1074 20.5967L11.0076 21.2939L10.9078 21.9912C12.3232 22.1938 14.1313 22.4035 15.5974 22.4036L15.5974 21.6992ZM11.0076 21.2939L11.1074 20.5967C9.62179 20.3841 8.55476 19.0932 8.55469 17.5908L7.85034 17.5908L7.14599 17.5909C7.1461 19.7563 8.69158 21.674 10.9078 21.9912L11.0076 21.2939ZM7.85034 17.5908L8.55469 17.5908C8.55471 16.9727 8.73337 16.3986 9.04158 15.9145L8.44742 15.5362L7.85327 15.158C7.40546 15.8613 7.14602 16.6968 7.14599 17.5908L7.85034 17.5908ZM9.41577 13.0754H10.1201V10.957H9.41577H8.71142V13.0754H9.41577ZM9.41577 10.957L10.1201 10.9571C10.1203 7.93159 12.573 5.47876 15.5984 5.47876V4.77441V4.07007C11.7949 4.07007 8.71162 7.15365 8.71142 10.957L9.41577 10.957ZM8.44742 15.5362L9.04158 15.9145C9.50751 15.1826 10.1201 14.207 10.1201 13.0754H9.41577H8.71142C8.71142 13.7364 8.35003 14.3777 7.85327 15.158L8.44742 15.5362ZM21.781 13.077H21.0767C21.0767 14.2081 21.6888 15.1835 22.1545 15.9152L22.7487 15.537L23.3429 15.1588C22.8465 14.3788 22.4854 13.7377 22.4854 13.077H21.781Z'
                      fill='white'
                      fill-opacity='0.8'
                    />
                    <path
                      d='M17.5542 23.166C17.1336 23.8261 16.4143 24.2612 15.5977 24.2612C14.781 24.2612 14.0618 23.8261 13.6412 23.166'
                      stroke='white'
                      stroke-opacity='0.8'
                      stroke-width='1.4087'
                      stroke-linecap='round'
                    />
                    <circle
                      cx='20.294'
                      cy='6.88657'
                      r='3.28696'
                      fill='#FD521B'
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
                plansDone={3}
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
        onAction={onModalAction}
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
