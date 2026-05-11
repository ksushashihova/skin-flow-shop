import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { api } from "@/lib/api";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
  head: () => ({ meta: [{ title: "Восстановление пароля — ОБЛАКО" }] }),
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <div className="container-rhode py-24 max-w-md">
      <h1 className="font-display text-5xl mb-2">Забыли пароль?</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Введите email — пришлём ссылку для восстановления.
      </p>
      {sent ? (
        <div className="space-y-4">
          <p>Письмо отправлено на <b>{email}</b>. Проверьте почту.</p>
          <Link to="/account" className="text-xs uppercase tracking-widest hover-underline">
            Вернуться ко входу
          </Link>
        </div>
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setErr(null);
            setLoading(true);
            try {
              await api.requestPasswordReset(email);
              setSent(true);
            } catch (e) { setErr((e as Error).message); }
            finally { setLoading(false); }
          }}
          className="space-y-4"
        >
          <input
            type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="email@example.ru"
            className="w-full border-b border-border bg-transparent py-2 outline-none focus:border-foreground"
          />
          {err && <div className="text-sm text-destructive">{err}</div>}
          <button disabled={loading} className="w-full bg-foreground text-background py-4 text-xs uppercase tracking-[0.2em] disabled:opacity-50">
            {loading ? "Отправляем…" : "Отправить ссылку"}
          </button>
          <Link to="/account" className="block text-xs uppercase tracking-widest hover-underline">
            Назад
          </Link>
        </form>
      )}
    </div>
  );
}
