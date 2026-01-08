import { useEffect, useState } from "react";

export const BackToTopButton: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 300);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTop = () =>
    window.scrollTo({ top: 0, behavior: "smooth" });

  if (!visible) return null;

  return (
    <button
      onClick={scrollToTop}
      aria-label="Back to top"
      className="
        fixed bottom-6 right-6 z-50
        flex items-center justify-center
        h-12 w-12 rounded-2xl

        bg-white/30 backdrop-blur-xl
        border border-emerald-200/40
        shadow-lg shadow-emerald-300/20

        text-emerald-700
        transition-all duration-300

        hover:bg-white/60 hover:shadow-emerald-300/40 hover:scale-105
        active:scale-95
      "
    >
      <svg
        xmlns='http://www.w3.org/2000/svg'
        className='h-6 w-6'
        viewBox='0 0 20 20'
        fill='currentColor'
      >
        <path
          fillRule='evenodd'
          d='M10 3a1 1 0 01.707.293l5 5a1 1 0 11-1.414 1.414L11 6.414V17a1 1 0 11-2 0V6.414L5.707 9.707A1 1 0 114.293 8.293l5-5A1 1 0 0110 3z'
          clipRule='evenodd'
        />
      </svg>
    </button>
  );
};
