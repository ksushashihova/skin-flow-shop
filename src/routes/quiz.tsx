import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api, type Product } from "@/lib/api";
import { useI18n, formatPrice } from "@/lib/i18n";

export const Route = createFileRoute("/quiz")({
  head: () => ({
    meta: [
      { title: "Подбор ухода — ОБЛАКО" },
      { name: "description", content: "Короткий тест: подберём ухаживающие средства под ваш тип кожи и цель." },
      { property: "og:title", content: "Подбор ухода — ОБЛАКО" },
      { property: "og:description", content: "3 вопроса — индивидуальный набор средств." },
    ],
  }),
  component: QuizPage,
});

type SkinType = "dry" | "oily" | "combo" | "sensitive";
type Concern = "dryness" | "acne" | "pigment" | "wrinkles";
type Texture = "light" | "rich";

interface Answers {
  skin?: SkinType;
  concern?: Concern;
  texture?: Texture;
}

const QUESTIONS: {
  key: keyof Answers;
  title: string;
  options: { value: string; label: string }[];
}[] = [
  {
    key: "skin", title: "Ваш тип кожи?",
    options: [
      { value: "dry", label: "Сухая" },
      { value: "oily", label: "Жирная" },
      { value: "combo", label: "Комбинированная" },
      { value: "sensitive", label: "Чувствительная" },
    ],
  },
  {
    key: "concern", title: "Главная задача?",
    options: [
      { value: "dryness", label: "Сухость и обезвоженность" },
      { value: "acne", label: "Высыпания" },
      { value: "pigment", label: "Пигментация" },
      { value: "wrinkles", label: "Возрастные изменения" },
    ],
  },
  {
    key: "texture", title: "Какие текстуры предпочитаете?",
    options: [
      { value: "light", label: "Лёгкие" },
      { value: "rich", label: "Питательные" },
    ],
  },
];

function recommend(a: Required<Answers>, products: Product[]): Product[] {
  const map: Record<string, string[]> = {
    "dry-dryness-rich": ["p_barrier_cream", "p_glaze_treatment", "p_balm_peptide"],
    "dry-dryness-light": ["p_glaze_treatment", "p_cleanser_gel", "p_balm_peptide"],
    "dry-wrinkles-rich": ["p_night_oil", "p_eye_cream", "p_barrier_cream"],
    "oily-acne-light": ["p_cleanser_gel", "p_serum_glow", "p_glaze_treatment"],
    "oily-pigment-light": ["p_serum_glow", "p_cleanser_gel", "p_glaze_treatment"],
    "combo-acne-light": ["p_cleanser_gel", "p_glaze_treatment", "p_serum_glow"],
    "combo-pigment-light": ["p_serum_glow", "p_glaze_treatment", "p_cleanser_gel"],
    "sensitive-dryness-rich": ["p_barrier_cream", "p_balm_peptide", "p_cleanser_gel"],
    "sensitive-dryness-light": ["p_barrier_cream", "p_glaze_treatment", "p_cleanser_gel"],
    "sensitive-wrinkles-rich": ["p_eye_cream", "p_barrier_cream", "p_night_oil"],
  };
  const key = `${a.skin}-${a.concern}-${a.texture}`;
  const ids = map[key] ?? ["p_glaze_treatment", "p_barrier_cream", "p_cleanser_gel"];
  return ids.map((id) => products.find((p) => p.id === id)).filter((p): p is Product => !!p);
}

function QuizPage() {
  const { lang } = useI18n();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [products, setProducts] = useState<Product[]>([]);
  const [added, setAdded] = useState(false);

  useEffect(() => { api.listProducts().then(setProducts); }, []);

  const total = QUESTIONS.length;
  const done = step >= total;
  const recs = done && answers.skin && answers.concern && answers.texture
    ? recommend(answers as Required<Answers>, products)
    : [];

  return (
    <div className="container-rhode py-16 md:py-24 max-w-2xl">
      <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-4">Подбор ухода</div>
      {!done && (
        <>
          <div className="flex items-center gap-2 mb-10">
            {QUESTIONS.map((_, i) => (
              <div key={i} className={`h-1 flex-1 ${i <= step ? "bg-foreground" : "bg-border"}`} />
            ))}
          </div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Вопрос {step + 1} из {total}</div>
          <h1 className="font-display text-4xl md:text-5xl mb-10">{QUESTIONS[step].title}</h1>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {QUESTIONS[step].options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  setAnswers({ ...answers, [QUESTIONS[step].key]: opt.value });
                  setStep(step + 1);
                }}
                className="text-left p-5 border border-border hover:border-foreground transition-colors"
              >
                <span className="font-display text-xl">{opt.label}</span>
              </button>
            ))}
          </div>
          {step > 0 && (
            <button onClick={() => setStep(step - 1)} className="mt-8 text-xs uppercase tracking-widest text-muted-foreground hover-underline">← Назад</button>
          )}
        </>
      )}

      {done && (
        <div>
          <h1 className="font-display text-4xl md:text-5xl mb-3">Ваш ритуал</h1>
          <p className="text-muted-foreground mb-10">Эти средства подобраны под ваш тип кожи и задачу.</p>
          <ul className="divide-y divide-border border-y border-border mb-10">
            {recs.map((p) => (
              <li key={p.id} className="flex items-center gap-4 py-5">
                <img src={p.images[0]} alt="" className="w-20 h-24 object-cover" />
                <div className="flex-1">
                  <Link to="/product/$slug" params={{ slug: p.slug }} className="font-display text-xl hover-underline">
                    {lang === "ru" ? p.name_ru : p.name_en}
                  </Link>
                  <div className="text-xs text-muted-foreground mt-1">{lang === "ru" ? p.tagline_ru : p.tagline_en}</div>
                </div>
                <div className="text-sm tabular-nums">{formatPrice(p.price, lang)}</div>
              </li>
            ))}
          </ul>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={async () => {
                for (const p of recs) await api.addToCart(p.id, 1).catch(() => {});
                setAdded(true);
                setTimeout(() => setAdded(false), 1500);
              }}
              className="flex-1 bg-foreground text-background py-4 text-xs uppercase tracking-[0.2em]"
            >
              {added ? "Добавлено в корзину" : "Добавить всё в корзину"}
            </button>
            <button
              onClick={() => { setAnswers({}); setStep(0); }}
              className="flex-1 border border-border py-4 text-xs uppercase tracking-[0.2em] hover:bg-secondary"
            >
              Пройти заново
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
