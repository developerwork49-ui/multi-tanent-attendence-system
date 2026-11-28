"use client";

import { useEffect, useRef, useState } from "react";
import { scanQr } from "./actions";
import type { ScanResult, ScannedStudent } from "./types";
import { Alert, Button, inputClass, inputBase } from "@/components/ui";
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
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-zinc-200 bg-zinc-950">
          <video ref={videoRef} muted playsInline className={`h-full w-full object-cover ${camera === "on" ? "" : "invisible"}`} />
          <canvas ref={canvasRef} className="hidden" />
          {camera === "on" ? (
            <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="relative aspect-square w-3/5 max-w-72">
                {/* corner guides: white, amber while a scan is being checked */}
                {["left-0 top-0 border-l-[3px] border-t-[3px] rounded-tl-md", "right-0 top-0 border-r-[3px] border-t-[3px] rounded-tr-md", "bottom-0 left-0 border-b-[3px] border-l-[3px] rounded-bl-md", "bottom-0 right-0 border-b-[3px] border-r-[3px] rounded-br-md"].map((c) => (
                  <span key={c} className={`absolute h-8 w-8 ${c} ${checking ? "border-amber-400" : "border-white"}`} />
                ))}
              </div>
            </div>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-zinc-50 p-6 text-center">
              <icons.scan width={32} height={32} className="text-zinc-400" />
              <p className="max-w-xs text-sm text-zinc-600">
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
            className={`${inputBase} block w-full`}
          />
          <Button type="submit" variant="secondary">Mark</Button>
        </form>
        <p className="text-xs text-zinc-500">
          USB/Bluetooth barcode scanners work too: click the box above and scan. Each student is marked once per day.
        </p>
      </div>

      <div className="space-y-4 lg:col-span-2">
        <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-5 py-4">
          <span className="text-sm text-zinc-500">Present today</span>
          <span className="text-4xl font-semibold tabular-nums tracking-tight text-zinc-950" aria-live="polite">
            {count}
          </span>
        </div>
        <div aria-live="assertive">{result ? <ResultPanel key={history[0]?.id ?? 0} r={result} /> : <ResultPlaceholder />}</div>
        {history.length > 0 && (
          <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
            <h2 className="border-b border-zinc-200 px-5 py-3 text-sm font-semibold text-zinc-950">This session</h2>
            <ul className="max-h-80 divide-y divide-zinc-100 overflow-y-auto text-sm">
              {history.map((h) => (
                <li key={h.id} className="flex items-center justify-between gap-3 px-5 py-2.5">
                  <span className="truncate font-medium text-zinc-900">{"student" in h.result ? h.result.student.fullName : LABEL[h.result.kind].title}</span>
                  <span className={`shrink-0 text-xs font-medium tabular-nums ${LABEL[h.result.kind].text}`}>{LABEL[h.result.kind].short} · {h.at}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

const LABEL: Record<Shown["kind"], { title: string; short: string; box: string; text: string }> = {
  ok: { title: "Marked present", short: "Present", box: "border-emerald-300 bg-emerald-50", text: "text-emerald-700" },
  duplicate: { title: "Already marked today", short: "Already", box: "border-amber-300 bg-amber-50", text: "text-amber-700" },
  inactive: { title: "Student is inactive", short: "Inactive", box: "border-red-300 bg-red-50", text: "text-red-700" },
  unknown: { title: "Card not recognised", short: "Unknown card", box: "border-red-300 bg-red-50", text: "text-red-700" },
  invalid: { title: "Not a student card", short: "Not a card", box: "border-red-300 bg-red-50", text: "text-red-700" },
  network: { title: "No connection", short: "Not saved", box: "border-red-300 bg-red-50", text: "text-red-700" },
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
    <div className={`rounded-lg border-2 p-5 ${l.box}`}>
      <p className={`text-lg font-semibold tracking-tight ${l.text}`}>
        {l.title}
        {"time" in r && r.kind === "duplicate" && ` at ${r.time}`}
        {"time" in r && r.kind === "ok" && ` · ${r.time}`}
      </p>
      {s ? (
        <div className="mt-3 flex items-center gap-4">
          {s.photoKey ? (
            // eslint-disable-next-line @next/next/no-img-element -- private, session-protected image
            <img src={`/school/students/${s.id}/photo?v=${encodeURIComponent(s.photoKey)}`} alt="" className="h-20 w-20 rounded-md object-cover ring-1 ring-black/10" />
          ) : (
            <span aria-hidden className="flex h-20 w-20 items-center justify-center rounded-md bg-white text-2xl font-semibold text-zinc-700 ring-1 ring-black/10">
              {initials(s.fullName)}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-2xl font-semibold tracking-tight text-zinc-950">{s.fullName}</p>
            <p className="text-sm text-zinc-600">
              {s.studentCode}
              {s.className && ` · ${s.className}`}
            </p>
          </div>
        </div>
      ) : (
        <p className="mt-2 text-sm text-zinc-700">{HELP[r.kind]}</p>
      )}
      {s && HELP[r.kind] && <p className="mt-3 text-sm text-zinc-700">{HELP[r.kind]}</p>}
    </div>
  );
}

function ResultPlaceholder() {
  return (
    <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500">
      The result of each scan appears here.
    </div>
  );
}
