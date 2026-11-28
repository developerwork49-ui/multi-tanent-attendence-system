import { ButtonLink } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-24 text-center">
      <p className="text-sm font-medium text-zinc-500">404</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">Page not found</h1>
      <p className="mt-2 max-w-md text-sm text-zinc-500">This page does not exist, or it belongs to another account.</p>
      <ButtonLink href="/" className="mt-6">
        Go to my dashboard
      </ButtonLink>
    </main>
  );
}
