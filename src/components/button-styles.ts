/* Button looks, shared by <Button>/<ButtonLink> and by plain links/buttons in Server Components. */

export const buttonStyles = {
  primary: "bg-zinc-900 text-white shadow-xs hover:bg-zinc-800 active:bg-zinc-950",
  secondary: "bg-white text-zinc-900 shadow-xs ring-1 ring-inset ring-zinc-300 hover:bg-zinc-50 active:bg-zinc-100",
  danger: "bg-red-600 text-white shadow-xs hover:bg-red-500 active:bg-red-700",
  /** Quiet destructive action (first click of a confirm-then-click button). */
  dangerOutline: "bg-white text-red-600 shadow-xs ring-1 ring-inset ring-zinc-300 hover:bg-red-50 hover:ring-red-300",
  success: "bg-emerald-600 text-white shadow-xs hover:bg-emerald-500 active:bg-emerald-700",
  ghost: "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900",
} as const;

export type ButtonVariant = keyof typeof buttonStyles;

export const buttonBase =
  "inline-flex h-9 select-none items-center justify-center gap-2 whitespace-nowrap rounded-md px-3.5 text-sm font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:pointer-events-none disabled:opacity-50";

export function buttonClass(variant: ButtonVariant = "primary", className = "") {
  return `${buttonBase} ${buttonStyles[variant]} ${className}`;
}
