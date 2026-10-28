import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo.png"
      alt="Goodison Park Properties"
      className={cn("h-8 w-auto max-h-full object-contain rounded-sm shrink-0", className)}
    />
  );
}
