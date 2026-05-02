import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api, type Post } from "@/lib/api";

export const Route = createFileRoute("/journal")({
  head: () => ({
    meta: [
      { title: "Журнал — ОБЛАКО" },
      { name: "description", content: "Заметки о ритуалах ухода, ингредиентах и философии бренда." },
    ],
  }),
  component: Journal,
});

function Journal() {
  const [posts, setPosts] = useState<Post[]>([]);
  useEffect(() => {
    api.listPosts().then(setPosts);
    const i = setInterval(() => api.listPosts().then(setPosts), 2000);
    return () => clearInterval(i);
  }, []);
  return (
    <div className="container-rhode py-16">
      <h1 className="font-display text-5xl md:text-6xl mb-12">Журнал</h1>
      <div className="grid md:grid-cols-3 gap-x-6 gap-y-12">
        {posts.map((p) => (
          <Link
            key={p.slug}
            to="/journal/$slug"
            params={{ slug: p.slug }}
            className="group block"
          >
            <div className="aspect-[4/5] overflow-hidden bg-muted">
              <img src={p.cover} alt="" loading="lazy" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
            </div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground mt-4">{p.category}</div>
            <h2 className="font-display text-2xl mt-2">{p.title}</h2>
            <p className="text-sm text-muted-foreground mt-2">{p.excerpt}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
