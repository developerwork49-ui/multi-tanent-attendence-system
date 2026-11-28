import { StudentPhoto } from "@/components/student-photo";

export type CardStudent = {
  id: number;
  fullName: string;
  studentCode: string;
  photoKey: string | null;
  className: string | null;
  qrSvg: string;
};

/**
 * Printable student ID card, the size of a bank card (85.6 × 54 mm).
 * The QR code holds only an opaque token.
 */
export function StudentCard({ s, schoolName }: { s: CardStudent; schoolName: string }) {
  return (
    <article
      className="student-card flex flex-col overflow-hidden rounded-[3mm] border border-zinc-300 bg-white text-zinc-900 shadow-sm print:shadow-none"
      style={{ width: "85.6mm", height: "54mm" }}
      aria-label={`ID card for ${s.fullName}`}
    >
      <header className="truncate bg-zinc-900 px-[3mm] py-[1.5mm] text-[3mm] font-semibold uppercase tracking-wide text-white" style={{ printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }}>
        {schoolName}
      </header>
      <div className="flex min-h-0 flex-1 items-center gap-[3mm] px-[3mm] py-[2mm]">
        <div className="flex min-w-0 flex-1 flex-col gap-[1.5mm]">
          <StudentPhoto student={s} size={64} className="!rounded-[2mm]" />
          <p className="line-clamp-2 text-[3.4mm] font-medium leading-tight">{s.fullName}</p>
          <dl className="space-y-[0.5mm] text-[2.6mm] leading-tight text-zinc-600">
            <div className="flex gap-[1mm]">
              <dt>ID:</dt>
              <dd className="truncate font-mono font-semibold text-zinc-900">{s.studentCode}</dd>
            </div>
            {s.className && (
              <div className="flex gap-[1mm]">
                <dt>Class:</dt>
                <dd className="truncate font-semibold text-zinc-900">{s.className}</dd>
              </div>
            )}
          </dl>
        </div>
        <div className="flex shrink-0 flex-col items-center gap-[0.5mm]">
          {/* Generated SVG from a random token (only [A-Za-z0-9_-] characters): safe to inline. */}
          <div className="[&>svg]:h-full [&>svg]:w-full" style={{ width: "30mm", height: "30mm" }} dangerouslySetInnerHTML={{ __html: s.qrSvg }} />
          <span className="text-[2.2mm] text-zinc-500">Scan for attendance</span>
        </div>
      </div>
    </article>
  );
}
