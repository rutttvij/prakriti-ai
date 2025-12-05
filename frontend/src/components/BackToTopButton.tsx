import { useEffect, useState } from "react";

export const BackToTopButton: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > 200);
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!visible) return null;

  return (
    <button
      onClick={scrollToTop}
      className="fixed bottom-5 right-5 rounded-full bg-emerald-500 p-3 text-white shadow-lg hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-400"
      aria-label="Back to top"
    >
      ↑
    </button>
  );
};
