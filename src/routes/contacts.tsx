import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/contacts")({
  head: () => ({
    meta: [
      { title: "Контакты и реквизиты — ОБЛАКО" },
      { name: "description", content: "Контактные данные и реквизиты продавца." },
    ],
  }),
  component: Contacts,
});

function Contacts() {
  return (
    <div className="container-rhode py-16 max-w-3xl">
      <h1 className="font-display text-5xl mb-8">Контакты и реквизиты</h1>
      <div className="grid sm:grid-cols-2 gap-10 text-sm leading-relaxed">
        <div>
          <div className="uppercase text-xs tracking-widest text-muted-foreground mb-3">
            Связаться с нами
          </div>
          <ul className="space-y-2">
            <li>email: support@oblako.ru</li>
            <li>тел.: [__________]</li>
            <li>Telegram: [__________]</li>
            <li>Часы работы: пн–пт 10:00–19:00 (МСК)</li>
          </ul>
        </div>
        <div>
          <div className="uppercase text-xs tracking-widest text-muted-foreground mb-3">
            Реквизиты продавца
          </div>
          <ul className="space-y-2 text-foreground/80">
            <li>[ИП / ООО «Наименование»]</li>
            <li>ИНН: [__________]</li>
            <li>ОГРН / ОГРНИП: [__________]</li>
            <li>КПП: [__________]</li>
            <li>Юр. адрес: [__________]</li>
            <li>Расч. счёт: [__________]</li>
            <li>Банк: [__________], БИК [__________]</li>
          </ul>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-10">
        Указанные реквизиты — шаблон. Замените на актуальные данные вашего
        юридического лица или ИП перед публикацией.
      </p>
    </div>
  );
}
