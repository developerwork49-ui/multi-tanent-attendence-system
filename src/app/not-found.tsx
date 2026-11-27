import { ButtonLink } from "@/components/ui";
import { Reveal } from "@/components/motion/motion-ui";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-24 text-center">
      <Reveal className="flex flex-col items-center gap-4">
        <p className="text-metal-gold text-8xl font-black leading-none tracking-tighter sm:text-9xl">404</p>
        <h1 className="text-headline text-3xl font-black tracking-tight">Page not found</h1>
        <p className="max-w-md text-sm text-slate-500">This page does not exist, or it belongs to another account.</p>
        <ButtonLink href="/" className="mt-3">
          Go to my dashboard
        </ButtonLink>
      </Reveal>
    </main>
  );
}
