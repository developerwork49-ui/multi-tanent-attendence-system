import { initials } from "@/lib/students";

/** Student photo, or their initials in a circle when there is none. */
export function StudentPhoto({
  student,
  size = 40,
  className = "",
}: {
  student: { id: number; fullName: string; photoKey: string | null };
  size?: number;
  className?: string;
}) {
  const style = { width: size, height: size };
  if (student.photoKey) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- private, session-protected image
      <img
        src={`/school/students/${student.id}/photo?v=${encodeURIComponent(student.photoKey)}`}
        alt=""
        width={size}
        height={size}
        style={style}
        className={`shrink-0 rounded-full bg-zinc-100 object-cover ring-1 ring-black/5 ${className}`}
      />
    );
  }
  return (
    <span
      aria-hidden
      style={{ ...style, fontSize: Math.max(10, size * 0.36) }}
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-zinc-100 font-medium text-zinc-600 ${className}`}
    >
      {initials(student.fullName)}
    </span>
  );
}
