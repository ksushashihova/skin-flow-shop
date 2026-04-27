import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "О бренде — ОБЛАКО" },
      { name: "description", content: "Российский бренд минималистичного ухода за кожей. Наша философия и формулы." },
    ],
  }),
  component: About,
});

function About() {
  return (
    <div>
      <section className="container-rhode pt-24 pb-16 max-w-3xl">
        <div className="uppercase text-xs tracking-[0.3em] text-muted-foreground mb-6">О бренде</div>
        <h1 className="font-display text-5xl md:text-6xl leading-[1.05]">
          Чистая косметика, рождённая из тишины.
        </h1>
        <p className="mt-8 text-lg text-muted-foreground leading-relaxed">
          ОБЛАКО — российский бренд ухода за кожей. Мы создаём средства,
          которые упрощают рутину и возвращают коже её естественное состояние:
          мягкое, увлажнённое и сияющее.
        </p>
      </section>
      <img
        src="https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=2000&q=80"
        alt=""
        className="w-full aspect-[16/8] object-cover"
      />
      <section className="container-rhode py-24 grid md:grid-cols-3 gap-12 max-w-5xl">
        {[
          ["Формулы", "Каждое средство проходит дерматологический контроль и тестируется на чувствительной коже."],
          ["Ингредиенты", "Мы выбираем активы с подтверждённой эффективностью: пептиды, керамиды, ниацинамид."],
          ["Производство", "Локальное производство в России позволяет нам контролировать качество на каждом этапе."],
        ].map(([title, text]) => (
          <div key={title}>
            <div className="font-display text-2xl mb-3">{title}</div>
            <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
