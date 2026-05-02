import { useI18n } from "@/lib/i18n";

export default function PhilosophySection() {
  const { t } = useI18n();
  return (
    <section className="bg-secondary">
      <div className="container-rhode py-24 grid md:grid-cols-2 gap-16 items-center">
        <img
          src="https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=1400&q=80"
          alt=""
          loading="lazy"
          decoding="async"
          className="aspect-[4/5] w-full object-cover"
        />
        <div>
          <div className="uppercase text-xs tracking-[0.3em] text-muted-foreground mb-6">
            {t("section.philosophy")}
          </div>
          <h2 className="font-display text-3xl md:text-5xl leading-tight mb-8">
            Тихий ритуал каждое утро и вечер.
          </h2>
          <p className="text-muted-foreground leading-relaxed max-w-md">
            {t("section.philosophy.text")}
          </p>
        </div>
      </div>
    </section>
  );
}
