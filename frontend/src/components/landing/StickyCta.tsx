export function StickyCta({ visible, onRequestDemo }: { visible: boolean; onRequestDemo: () => void }) {
  if (!visible) return null;

  return (
    <div className="fixed right-5 bottom-6 z-40 hidden md:block">
      <button onClick={onRequestDemo} className="btn-primary px-5 py-2.5 text-sm shadow-2xl">
        Request Demo
      </button>
    </div>
  );
}
