import { useEffect, useState } from "react";

/** Миниатюры баночек/тюбиков — крутятся в центре пока сайт грузится. */
const THUMBS = [
  "https://images.unsplash.com/photo-1631214540242-3cd8c4b0b3b8?auto=format&fit=crop&fm=webp&w=240&q=65",
  "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&fm=webp&w=240&q=65",
  "https://images.unsplash.com/photo-1570194065650-d99fb4bedf0a?auto=format&fit=crop&fm=webp&w=240&q=65",
  "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&fm=webp&w=240&q=65",
  "https://images.unsplash.com/photo-1612817288484-6f916006741a?auto=format&fit=crop&fm=webp&w=240&q=65",
  "https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?auto=format&fit=crop&fm=webp&w=240&q=65",
];

const SHOWN_KEY = "oblako-preloader-shown";
/** Минимальное и максимальное время показа прелоадера, мс. */
const MIN_MS = 1100;
const MAX_MS = 2400;

export function Preloader() {
  const [active, setActive] = useState(false);
  const [index, setIndex] = useState(0);
  const [hiding, setHiding] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Показываем один раз за сессию, чтобы не мешать при навигации.
    if (sessionStorage.getItem(SHOWN_KEY)) return;
    sessionStorage.setItem(SHOWN_KEY, "1");
    setActive(true);
    document.body.style.overflow = "hidden";

    // Сменяем миниатюры
    const tick = setInterval(() => {
      setIndex((i) => (i + 1) % THUMBS.length);
    }, 360);

    // Скрываем после window.load (или MAX_MS, что раньше),
    // но не быстрее MIN_MS, чтобы анимация была заметной.
    const start = performance.now();
    const finish = () => {
      const elapsed = performance.now() - start;
      const wait = Math.max(0, MIN_MS - elapsed);
      window.setTimeout(() => {
        setHiding(true);
        window.setTimeout(() => {
          setActive(false);
          document.body.style.overflow = "";
        }, 450);
      }, wait);
    };
    let done = false;
    const onLoad = () => { if (!done) { done = true; finish(); } };
    if (document.readyState === "complete") {
      onLoad();
    } else {
      window.addEventListener("load", onLoad, { once: true });
    }
    const safety = window.setTimeout(() => { if (!done) { done = true; finish(); } }, MAX_MS);

    return () => {
      clearInterval(tick);
      window.clearTimeout(safety);
      window.removeEventListener("load", onLoad);
      document.body.style.overflow = "";
    };
  }, []);

  if (!active) return null;

  return (
    <div
      className={`fixed inset-0 z-[200] flex items-center justify-center bg-background transition-opacity duration-[450ms] ${hiding ? "opacity-0" : "opacity-100"}`}
      aria-hidden
    >
      <div className="flex flex-col items-center gap-8">
        <div className="relative w-32 h-32 sm:w-40 sm:h-40">
          {THUMBS.map((src, i) => (
            <img
              key={i}
              src={src}
              alt=""
              className={`absolute inset-0 w-full h-full object-cover rounded-full shadow-soft transition-all duration-500 ease-out ${
                i === index ? "opacity-100 scale-100" : "opacity-0 scale-90"
              }`}
            />
          ))}
        </div>
        <div className="font-display text-2xl tracking-[0.25em] text-foreground">
          ОБЛАКО
        </div>
        <div className="flex gap-1.5">
          {THUMBS.map((_, i) => (
            <span
              key={i}
              className={`h-1 rounded-full transition-all duration-300 ${
                i === index ? "w-6 bg-foreground" : "w-1.5 bg-foreground/25"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
