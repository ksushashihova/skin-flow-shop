import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";

const KEY = "oblako-cookie-consent-v1";

export function CookieBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (!localStorage.getItem(KEY)) {
        const t = setTimeout(() => setShow(true), 600);
        return () => clearTimeout(t);
      }
    } catch {
      setShow(true);
    }
  }, []);

  const decide = (value: "accepted" | "rejected") => {
    try {
      localStorage.setItem(
        KEY,
        JSON.stringify({ value, at: new Date().toISOString() }),
      );
    } catch {
      /* ignore */
    }
    setShow(false);
  };

  if (!show) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Уведомление об использовании cookies"
      className="fixed inset-x-0 bottom-0 z-[80] px-4 pb-4 sm:px-6 sm:pb-6 pointer-events-none"
    >
      <div className="pointer-events-auto mx-auto max-w-3xl bg-background border border-border shadow-xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="text-sm leading-relaxed text-foreground/80 flex-1">
          Мы используем cookies и метрики для работы сайта и улучшения сервиса.
          Продолжая использовать сайт, вы соглашаетесь с обработкой данных
          согласно{" "}
          <Link to="/privacy" className="underline hover:no-underline">
            Политике конфиденциальности
          </Link>{" "}
          (152-ФЗ, 149-ФЗ).
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => decide("rejected")}
            className="px-4 py-2.5 text-[11px] uppercase tracking-[0.2em] border border-border hover:bg-secondary transition-colors"
          >
            Отклонить
          </button>
          <button
            onClick={() => decide("accepted")}
            className="px-4 py-2.5 text-[11px] uppercase tracking-[0.2em] bg-foreground text-background hover:opacity-90 transition-opacity"
          >
            Принять
          </button>
        </div>
      </div>
    </div>
  );
}
