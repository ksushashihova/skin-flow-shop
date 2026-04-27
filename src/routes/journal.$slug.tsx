import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { POSTS as SEED_POSTS } from "@/lib/posts";
import { useEffect, useState } from "react";
import { api, type Post } from "@/lib/api";

export const Route = createFileRoute("/journal/$slug")({
  loader: ({ params }) => {
    // SSR fallback uses seed posts; client refetches via api.
    const post = SEED_POSTS.find((p) => p.slug === params.slug);
    if (!post) throw notFound();
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

function PostPage() {
  const { post: initial } = Route.useLoaderData();
  const [post, setPost] = useState<Post>(initial);
  useEffect(() => {
    api.getPost(initial.slug).then((p) => { if (p) setPost(p); });
  }, [initial.slug]);
  return (
    <article>
      <div className="relative h-[60vh] min-h-[420px] w-full overflow-hidden">
        <img src={post.cover} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-foreground/30" />
        <div className="container-rhode relative h-full flex flex-col justify-end pb-16 text-background">
          <div className="text-xs uppercase tracking-[0.3em] mb-4">{post.category} · {post.date}</div>
          <h1 className="font-display text-4xl md:text-6xl max-w-3xl leading-tight">{post.title}</h1>
        </div>
      </div>
      <div className="container-rhode py-16 max-w-2xl">
        <div className="space-y-6 text-base leading-relaxed text-foreground/90">
          {post.body.map((p, i) => <p key={i}>{p}</p>)}
        </div>
        <div className="mt-16">
          <Link to="/journal" className="text-xs uppercase tracking-widest hover-underline">
            ← В журнал
          </Link>
        </div>
      </div>
    </article>
  );
}
