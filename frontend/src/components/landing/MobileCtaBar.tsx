export function MobileCtaBar({ onRequestDemo }: { onRequestDemo: () => void }) {
  return (
    <div className="fixed bottom-3 left-1/2 z-50 w-[calc(100%-1rem)] max-w-md -translate-x-1/2 rounded-2xl border border-white/45 bg-slate-950/80 p-2 backdrop-blur-xl md:hidden">
      <button onClick={onRequestDemo} className="btn-primary w-full">
        Request Demo
      </button>
    </div>
  );
}
