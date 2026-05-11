import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { api } from "@/lib/api";

export const Route = createFileRoute("/reset-password")({
  validateSearch: (s: Record<string, unknown>) => ({ token: (s.token as string) || "" }),
  component: ResetPasswordPage,
  head: () => ({ meta: [{ title: "Новый пароль — ОБЛАКО" }] }),
});

function ResetPasswordPage() {
  const { token } = Route.useSearch();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <div className="container-rhode py-24 max-w-md">
        <h1 className="font-display text-4xl mb-4">Ссылка недействительна</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Токен отсутствует. Запросите новое письмо для восстановления пароля.
        </p>
        <Link to="/forgot-password" className="text-xs uppercase tracking-widest hover-underline">
          Запросить заново
        </Link>
      </div>
    );
  }

  return (
    <div className="container-rhode py-24 max-w-md">
      <h1 className="font-display text-5xl mb-2">Новый пароль</h1>
      <p className="text-sm text-muted-foreground mb-8">Минимум 8 символов.</p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setErr(null);
          if (password.length < 8) return setErr("Пароль слишком короткий");
          if (password !== confirm) return setErr("Пароли не совпадают");
          setLoading(true);
          try {
            await api.resetPassword(token, password);
            navigate({ to: "/account" });
          } catch (e) { setErr((e as Error).message); }
          finally { setLoading(false); }
        }}
        className="space-y-4"
      >
        <input
          type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
          placeholder="Новый пароль"
          className="w-full border-b border-border bg-transparent py-2 outline-none focus:border-foreground"
        />
        <input
          type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)}
          placeholder="Повторите пароль"
          className="w-full border-b border-border bg-transparent py-2 outline-none focus:border-foreground"
        />
        {err && <div className="text-sm text-destructive">{err}</div>}
        <button disabled={loading} className="w-full bg-foreground text-background py-4 text-xs uppercase tracking-[0.2em] disabled:opacity-50">
          {loading ? "Сохраняем…" : "Сохранить"}
        </button>
      </form>
    </div>
  );
}
