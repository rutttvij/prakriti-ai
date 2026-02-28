import { Button } from "../ui/Button";

export function BottomCTA({ onRequestDemo }: { onRequestDemo: () => void }) {
  return (
    <div className="fixed bottom-4 left-1/2 z-40 w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 rounded-2xl border border-emerald-200/70 bg-white/85 p-2 shadow-xl backdrop-blur-xl md:hidden">
      <Button className="w-full" onClick={onRequestDemo}>Request Demo</Button>
    </div>
  );
}
