import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/journal")({
  head: () => ({
    meta: [
      { title: "Журнал — ОБЛАКО" },
      { name: "description", content: "Заметки о ритуалах ухода, ингредиентах и философии бренда." },
    ],
  }),
  component: Journal,
});

const POSTS = [
  { title: "Утренний ритуал за пять минут", img: "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=1200&q=80", excerpt: "Минимальная последовательность для занятых утр." },
  { title: "Что такое керамиды и зачем они коже", img: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=1200&q=80", excerpt: "Разбираем основу здорового кожного барьера." },
  { title: "Глейзинг: эффект отражённого света", img: "https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?auto=format&fit=crop&w=1200&q=80", excerpt: "Как добиться ухоженного сияния без макияжа." },
];

function Journal() {
  return (
    <div className="container-rhode py-16">
      <h1 className="font-display text-5xl md:text-6xl mb-12">Журнал</h1>
      <div className="grid md:grid-cols-3 gap-x-6 gap-y-12">
        {POSTS.map((p) => (
          <article key={p.title} className="group cursor-pointer">
            <div className="aspect-[4/5] overflow-hidden bg-muted">
              <img src={p.img} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
            </div>
            <h2 className="font-display text-2xl mt-4">{p.title}</h2>
            <p className="text-sm text-muted-foreground mt-2">{p.excerpt}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
