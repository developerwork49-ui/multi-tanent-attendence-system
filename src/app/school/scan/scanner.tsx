"use client";

import { useEffect, useRef, useState } from "react";
import { scanQr } from "./actions";
import type { ScanResult, ScannedStudent } from "./types";
import { motion } from "framer-motion";
import { Alert, Button, inputClass } from "@/components/ui";
import { icons } from "@/components/icons";
import { initials } from "@/lib/students";

type Shown = ScanResult | { kind: "network" };
type HistoryItem = { id: number; at: string; result: Shown };

/** Minimal typing for the browser's built-in QR detector (Chrome, Edge, Android). */
type Detector = { detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]> };
declare global {
  interface Window {
    BarcodeDetector?: new (opts: { formats: string[] }) => Detector;
  }
}

/** The same code is ignored for this long, so holding a card in front of the camera marks it once. */
const REPEAT_MS = 4000;

let audio: AudioContext | null = null;
function beep(kind: Shown["kind"]) {
  try {
    audio ??= new AudioContext();
    const tones = kind === "ok" ? [[880, 0.12]] : kind === "duplicate" ? [[520, 0.08], [520, 0.08]] : [[200, 0.35]];
    let t = audio.currentTime;
    for (const [freq, len] of tones) {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.frequency.value = freq;
      gain.gain.value = 0.15;
      osc.connect(gain).connect(audio.destination);
      osc.start(t);
      osc.stop(t + len);
      t += len + 0.06;
    }
    navigator.vibrate?.(kind === "ok" ? 80 : kind === "duplicate" ? [60, 60, 60] : 300);
  } catch {
    /* sound is optional */
  }
}

export function Scanner({ initialCount, schoolTimeZone }: { initialCount: number; schoolTimeZone: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const last = useRef<{ text: string; at: number } | null>(null);
  const inFlight = useRef(false);
  const seq = useRef(0);
  const manualRef = useRef<HTMLInputElement>(null);

  const [camera, setCamera] = useState<"off" | "starting" | "on">("off");
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [result, setResult] = useState<Shown | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [count, setCount] = useState(initialCount);
  const [checking, setChecking] = useState(false);

  async function handle(text: string) {
    const now = Date.now();
    if (inFlight.current) return;
    if (last.current && last.current.text === text && now - last.current.at < REPEAT_MS) return;
    last.current = { text, at: now };
    inFlight.current = true;
    setChecking(true);
    let r: Shown;
    try {
      r = await scanQr(text);
    } catch {
      r = { kind: "network" };
      last.current = null; // allow an immediate retry
    }
    inFlight.current = false;
    setChecking(false);
    setResult(r);
    beep(r.kind);
    if (r.kind === "ok") setCount((c) => c + 1);
    const at = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: schoolTimeZone }).format(new Date());
    setHistory((h) => [{ id: ++seq.current, at, result: r }, ...h].slice(0, 30));
  }

  async function start(which = facing) {
    setCameraError(null);
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setCameraError("The camera only works on a secure (https://) address or on localhost. You can still type or use a handheld scanner below.");
      return;
    }
    setCamera("starting");
    try {
      stopStream();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: which }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      const v = videoRef.current;
      if (v) {
        v.srcObject = stream;
        await v.play();
      }
      setCamera("on");
    } catch (e) {
      const name = e instanceof DOMException ? e.name : "";
      setCameraError(
        name === "NotAllowedError"
          ? "Camera permission was refused. Allow camera access for this site in the browser settings, then press Start camera."
          : name === "NotFoundError" || name === "OverconstrainedError"
            ? "No camera was found on this device."
            : name === "NotReadableError"
              ? "The camera is being used by another app. Close it and try again."
              : "The camera could not be started.",
      );
      setCamera("off");
    }
  }

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  function stop() {
    stopStream();
    setCamera("off");
  }

  // Turn the camera off when leaving the page.
  useEffect(() => stopStream, []);

  // Decode loop: ~8 checks per second while the camera is on.
  useEffect(() => {
    if (camera !== "on") return;
    let stopped = false;
    let raf = 0;
    let lastTick = 0;
    let busy = false;
    const detector = window.BarcodeDetector ? new window.BarcodeDetector({ formats: ["qr_code"] }) : null;
    let jsqr: ((d: Uint8ClampedArray, w: number, h: number, o?: { inversionAttempts: "dontInvert" }) => { data: string } | null) | null = null;
    if (!detector) import("jsqr").then((m) => (jsqr = m.default));

    const tick = async (t: number) => {
      if (stopped) return;
      raf = requestAnimationFrame(tick);
      if (busy || t - lastTick < 120) return;
      lastTick = t;
      const v = videoRef.current;
      if (!v || v.readyState < 2 || !v.videoWidth) return;
      busy = true;
      try {
        let text: string | undefined;
        if (detector) {
          text = (await detector.detect(v))[0]?.rawValue;
        } else if (jsqr) {
          const c = canvasRef.current!;
          const scale = Math.min(1, 640 / v.videoWidth);
          c.width = Math.round(v.videoWidth * scale);
          c.height = Math.round(v.videoHeight * scale);
          const ctx = c.getContext("2d", { willReadFrequently: true })!;
          ctx.drawImage(v, 0, 0, c.width, c.height);
          const img = ctx.getImageData(0, 0, c.width, c.height);
          text = jsqr(img.data, img.width, img.height, { inversionAttempts: "dontInvert" })?.data;
        }
        if (text) await handle(text);
      } catch {
        /* a frame that can't be read is simply skipped */
      } finally {
        busy = false;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handle() only uses refs and setters
  }, [camera]);

  async function onManual(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const input = manualRef.current;
    const text = input?.value.trim();
    if (!input || !text) return;
    input.value = "";
    last.current = null; // typed/handheld scans are always processed
    await handle(text);
    input.focus();
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
      <div className="space-y-4 lg:col-span-3">
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl bg-[#030605] shadow-card ring-1 ring-[rgb(255_255_255/0.08)]">
          <video ref={videoRef} muted playsInline className={`h-full w-full object-cover ${camera === "on" ? "" : "invisible"}`} />
          <canvas ref={canvasRef} className="hidden" />
          {camera === "on" ? (
            <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_center,transparent_34%,rgb(0_0_0/0.55)_75%)]">
              <div className="relative aspect-square w-3/5 max-w-72">
                {/* gold corner brackets */}
                {["left-0 top-0 border-l-4 border-t-4 rounded-tl-2xl", "right-0 top-0 border-r-4 border-t-4 rounded-tr-2xl", "bottom-0 left-0 border-b-4 border-l-4 rounded-bl-2xl", "bottom-0 right-0 border-b-4 border-r-4 rounded-br-2xl"].map((c) => (
                  <span key={c} className={`absolute h-10 w-10 ${c} ${checking ? "border-amber-400" : "border-[#e5c07b]"} drop-shadow-[0_0_8px_rgb(229_192_123/0.8)]`} />
                ))}
                <motion.span
                  className="absolute inset-x-3 h-0.5 rounded-full bg-gradient-to-r from-transparent via-[#f6e2ad] to-transparent shadow-[0_0_14px_2px_rgb(229_192_123/0.7)]"
                  initial={{ top: "8%" }}
                  animate={{ top: ["8%", "92%", "8%"] }}
                  transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
                />
              </div>
            </div>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[radial-gradient(circle_at_50%_40%,rgb(229_192_123/0.12),transparent_60%)] p-6 text-center">
              <motion.span
                className="bg-metal-gold flex h-16 w-16 items-center justify-center rounded-2xl text-canvas shadow-gold"
                animate={{ scale: [1, 1.06, 1] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
              >
                <icons.scan width={30} height={30} strokeWidth={2.2} />
              </motion.span>
              <p className="max-w-xs text-sm font-medium text-slate-500">
                {camera === "starting" ? "Starting camera…" : "Point the camera at a student’s QR card."}
              </p>
              {camera === "off" && (
                <Button type="button" onClick={() => start()}>
                  Start camera
                </Button>
              )}
            </div>
          )}
        </div>
        {cameraError && <Alert tone="warning">{cameraError}</Alert>}
        {camera === "on" && (
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={stop}>Stop camera</Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                const next = facing === "environment" ? "user" : "environment";
                setFacing(next);
                start(next);
              }}
            >
              Switch camera
            </Button>
          </div>
        )}
        <form onSubmit={onManual} className="flex gap-2">
          <label htmlFor="manual" className="sr-only">Scanned or typed code</label>
          <input
            id="manual"
            ref={manualRef}
            autoComplete="off"
            maxLength={200}
            placeholder="Handheld scanner or typed code…"
            className={`${inputClass} mt-0`}
          />
          <Button type="submit" variant="secondary">Mark</Button>
        </form>
        <p className="text-xs text-slate-500">
          USB/Bluetooth barcode scanners work too: click the box above and scan. Each student is marked once per day.
        </p>
      </div>

      <div className="space-y-4 lg:col-span-2">
        <div className="glass relative flex items-center justify-between overflow-hidden rounded-3xl px-6 py-5">
          <span aria-hidden className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-[rgb(52_211_153/0.18)] blur-3xl" />
          <span className="relative flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-canvas shadow-mint-glow">
              <icons.userCheck width={19} height={19} strokeWidth={2.1} />
            </span>
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Present today</span>
          </span>
          <motion.span
            key={count}
            initial={{ scale: 1.35, opacity: 0.4 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 380, damping: 18 }}
            className="text-headline relative text-5xl font-black tabular-nums"
            aria-live="polite"
          >
            {count}
          </motion.span>
        </div>
        <div aria-live="assertive">{result ? <ResultPanel key={history[0]?.id ?? 0} r={result} /> : <ResultPlaceholder />}</div>
        {history.length > 0 && (
          <div className="glass overflow-hidden rounded-3xl">
            <h2 className="border-b border-line px-5 py-3.5 text-[15px] font-extrabold tracking-tight text-slate-900">This session</h2>
            <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto text-sm">
              {history.map((h) => (
                <motion.li
                  key={h.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center justify-between gap-3 px-5 py-2.5"
                >
                  <span className="truncate font-semibold text-slate-800">{"student" in h.result ? h.result.student.fullName : LABEL[h.result.kind].title}</span>
                  <span className={`shrink-0 text-xs font-bold ${LABEL[h.result.kind].text}`}>{LABEL[h.result.kind].short} · {h.at}</span>
                </motion.li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

const LABEL: Record<Shown["kind"], { title: string; short: string; box: string; text: string }> = {
  ok: { title: "Marked present", short: "Present", box: "bg-emerald-50 ring-emerald-400 shadow-[0_0_48px_-12px_rgb(52_211_153/0.75)]", text: "text-emerald-700" },
  duplicate: { title: "Already marked today", short: "Already", box: "bg-amber-50 ring-amber-400 shadow-[0_0_48px_-12px_rgb(251_146_60/0.7)]", text: "text-amber-700" },
  inactive: { title: "Student is inactive", short: "Inactive", box: "bg-red-50 ring-red-400 shadow-[0_0_48px_-12px_rgb(248_113_113/0.7)]", text: "text-red-700" },
  unknown: { title: "Card not recognised", short: "Unknown card", box: "bg-red-50 ring-red-400 shadow-[0_0_48px_-12px_rgb(248_113_113/0.7)]", text: "text-red-700" },
  invalid: { title: "Not a student card", short: "Not a card", box: "bg-red-50 ring-red-400 shadow-[0_0_48px_-12px_rgb(248_113_113/0.7)]", text: "text-red-700" },
  network: { title: "No connection", short: "Not saved", box: "bg-red-50 ring-red-400 shadow-[0_0_48px_-12px_rgb(248_113_113/0.7)]", text: "text-red-700" },
};

const HELP: Record<Shown["kind"], string> = {
  ok: "",
  duplicate: "",
  inactive: "This student has been deactivated. Check with the office.",
  unknown: "This card is not valid for your school, or it was replaced by a new card.",
  invalid: "This QR code is not an attendance card from this system.",
  network: "The scan was NOT saved. Check the internet connection and scan again.",
};

function ResultPanel({ r }: { r: Shown }) {
  const l = LABEL[r.kind];
  const s: ScannedStudent | null = "student" in r ? r.student : null;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 360, damping: 22 }}
      className={`rounded-3xl p-5 ring-2 backdrop-blur-md ${l.box}`}
    >
      <p className={`text-xl font-black tracking-tight ${l.text}`}>
        {l.title}
        {"time" in r && r.kind === "duplicate" && ` at ${r.time}`}
        {"time" in r && r.kind === "ok" && ` · ${r.time}`}
      </p>
      {s ? (
        <div className="mt-3 flex items-center gap-4">
          {s.photoKey ? (
            // eslint-disable-next-line @next/next/no-img-element -- private, session-protected image
            <img src={`/school/students/${s.id}/photo?v=${encodeURIComponent(s.photoKey)}`} alt="" className="h-20 w-20 rounded-2xl object-cover ring-2 ring-[rgb(255_255_255/0.15)]" />
          ) : (
            <span aria-hidden className="flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-100 text-2xl font-black text-blue-700 ring-1 ring-blue-300/60">
              {initials(s.fullName)}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-2xl font-black tracking-tight text-slate-900">{s.fullName}</p>
            <p className="text-sm text-slate-600">
              {s.studentCode}
              {s.className && ` · ${s.className}`}
            </p>
          </div>
        </div>
      ) : (
        <p className="mt-2 text-sm text-slate-700">{HELP[r.kind]}</p>
      )}
      {s && HELP[r.kind] && <p className="mt-3 text-sm text-slate-700">{HELP[r.kind]}</p>}
    </motion.div>
  );
}

function ResultPlaceholder() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl border-2 border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
      <icons.scan width={26} height={26} className="text-blue-500" />
      The result of each scan appears here.
    </div>
  );
}
