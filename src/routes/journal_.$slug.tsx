import { createFileRoute, Link } from "@tanstack/react-router";
import { POSTS as SEED_POSTS } from "@/lib/posts";
import { useEffect, useState } from "react";
import { api, type Post } from "@/lib/api";

export const Route = createFileRoute("/journal_/$slug")({
  loader: ({ params }) => {
    // SSR fallback: ищем в seed; если нет — отдаём заглушку, клиент подтянет из api.
    const post =
      SEED_POSTS.find((p) => p.slug === params.slug) ??
      ({
        slug: params.slug,
        title: "Загрузка…",
        excerpt: "",
        cover: "",
        category: "",
        date: "",
        body: [],
      } as Post);
    return { post };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.post.title} — Журнал ОБЛАКО` },
          { name: "description", content: loaderData.post.excerpt },
          { property: "og:title", content: loaderData.post.title },
          { property: "og:description", content: loaderData.post.excerpt },
          { property: "og:image", content: loaderData.post.cover },
        ]
      : [],
  }),
  notFoundComponent: () => (
    <div className="container-rhode py-32 text-center">
      <h1 className="font-display text-4xl mb-4">Статья не найдена</h1>
      <Link to="/journal" className="text-sm hover-underline">Назад в журнал</Link>
    </div>
  ),
  component: PostPage,
});

/** Преобразует YouTube/Vimeo URL в embed-вариант, либо возвращает прямой mp4. */
function resolveVideo(url: string): { kind: "iframe" | "video"; src: string } | null {
  if (!url) return null;
  const u = url.trim();
  // YouTube watch / share / embed
  const yt = u.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{6,})/);
  if (yt) return { kind: "iframe", src: `https://www.youtube.com/embed/${yt[1]}` };
  // Vimeo
  const vm = u.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vm) return { kind: "iframe", src: `https://player.vimeo.com/video/${vm[1]}` };
  // Прямое видео
  if (/\.(mp4|webm|ogg)(\?|$)/i.test(u)) return { kind: "video", src: u };
  // По умолчанию пробуем как iframe
  return { kind: "iframe", src: u };
}

function PostPage() {
  const { post: initial } = Route.useLoaderData();
  const [post, setPost] = useState<Post>(initial);
  const [notFoundFlag, setNotFoundFlag] = useState(false);

  useEffect(() => {
    let alive = true;
    api.getPost(initial.slug).then((p) => {
      if (!alive) return;
      if (p) setPost(p);
      else if (!initial.body.length) setNotFoundFlag(true);
    });
    return () => { alive = false; };
  }, [initial.slug, initial.body.length]);

  if (notFoundFlag) {
    return (
      <div className="container-rhode py-32 text-center">
        <h1 className="font-display text-4xl mb-4">Статья не найдена</h1>
        <Link to="/journal" className="text-sm hover-underline">← Назад в журнал</Link>
      </div>
    );
  }

  const video = post.videoUrl ? resolveVideo(post.videoUrl) : null;

  return (
    <article>
      <div className="relative h-[60vh] min-h-[420px] w-full overflow-hidden">
        {post.cover && (
          <img src={post.cover} alt="" className="absolute inset-0 w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-foreground/30" />
        <div className="container-rhode relative h-full flex flex-col justify-end pb-16 text-background">
          <div className="text-xs uppercase tracking-[0.3em] mb-4">
            {post.category}{post.date ? ` · ${post.date}` : ""}
          </div>
          <h1 className="font-display text-4xl md:text-6xl max-w-3xl leading-tight">{post.title}</h1>
        </div>
      </div>

      <div className="container-rhode py-16 max-w-2xl">
        <div className="space-y-6 text-base leading-relaxed text-foreground/90">
          {post.body.map((p, i) => <p key={i}>{p}</p>)}
        </div>

        {video && (
          <div className="mt-12">
            {video.kind === "iframe" ? (
              <div className="relative w-full aspect-video bg-muted overflow-hidden">
                <iframe
                  src={video.src}
                  title={post.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full border-0"
                />
              </div>
            ) : (
              <video src={video.src} controls className="w-full bg-muted" />
            )}
          </div>
        )}

        {post.images && post.images.length > 0 && (
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {post.images.map((src, i) => (
              <img
                key={i}
                src={src}
                alt=""
                loading="lazy"
                className="w-full aspect-[4/5] object-cover bg-muted"
              />
            ))}
          </div>
        )}

        <div className="mt-16">
          <Link to="/journal" className="text-xs uppercase tracking-widest hover-underline">
            ← В журнал
          </Link>
        </div>
      </div>
    </article>
  );
}
