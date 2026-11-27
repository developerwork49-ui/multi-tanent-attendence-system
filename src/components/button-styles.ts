/* Button looks, shared by the animated <Button>/<ButtonLink> and by plain links/buttons in Server Components. */

export const buttonStyles = {
  primary:
    "bg-metal-gold text-canvas shadow-gold hover:brightness-110 before:pointer-events-none before:absolute before:inset-0 before:-translate-x-full before:bg-gradient-to-r before:from-transparent before:via-[rgb(255_255_255/0.45)] before:to-transparent before:transition-transform before:duration-700 hover:before:translate-x-full",
  secondary:
    "border border-line bg-glass text-slate-800 backdrop-blur-md hover:border-blue-300 hover:bg-glass-strong hover:text-slate-900",
  danger:
    "bg-gradient-to-b from-red-400 to-red-600 text-canvas shadow-[inset_0_1px_0_rgb(255_255_255/0.35),0_10px_26px_-10px_rgb(239_68_68/0.65)] hover:brightness-110",
  success:
    "bg-gradient-to-b from-emerald-400 to-emerald-600 text-canvas shadow-[inset_0_1px_0_rgb(255_255_255/0.35),0_10px_26px_-10px_rgb(16_185_129/0.65)] hover:brightness-110",
} as const;

export type ButtonVariant = keyof typeof buttonStyles;

export const buttonBase =
  "relative inline-flex select-none items-center justify-center gap-2 overflow-hidden whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-bold tracking-tight transition-[filter,box-shadow,background-color,border-color,color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none";

export function buttonClass(variant: ButtonVariant = "primary", className = "") {
  return `${buttonBase} ${buttonStyles[variant]} ${className}`;
}
