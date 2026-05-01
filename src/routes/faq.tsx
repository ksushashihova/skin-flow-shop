import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "Вопросы и ответы — ОБЛАКО" },
      { name: "description", content: "Часто задаваемые вопросы о доставке, оплате, бонусной программе и составе средств ОБЛАКО." },
    ],
  }),
  component: FaqPage,
});

const SECTIONS: { title: string; items: { q: string; a: string }[] }[] = [
  {
    title: "Заказ и оплата",
    items: [
      { q: "Какие способы оплаты доступны?", a: "Картой онлайн (Visa, MasterCard, МИР), СБП по QR-коду, картой или наличными при получении." },
      { q: "Можно ли изменить или отменить заказ?", a: "Да, отменить заказ можно в личном кабинете до момента отправки. После отгрузки отмена невозможна." },
      { q: "Приходит ли подтверждение заказа?", a: "После оформления вы получите письмо с номером заказа и составом на указанный email." },
    ],
  },
  {
    title: "Доставка",
    items: [
      { q: "В какие города доставляете?", a: "Курьером по Москве и МО, СДЭК и Почтой России — по всей территории РФ." },
      { q: "Сколько идёт доставка?", a: "Курьер — 1–2 дня, СДЭК — 2–5 дней, Почта России — 3–10 дней в зависимости от региона." },
      { q: "Есть ли самовывоз?", a: "Да, бесплатный самовывоз из шоурума по адресу: Москва, ул. Тверская 12." },
    ],
  },
  {
    title: "Бонусная программа",
    items: [
      { q: "Как работают бонусы ОБЛАКО?", a: "За каждый оплаченный заказ возвращаем 5% бонусами на ваш счёт. 1 бонус = 1 рубль." },
      { q: "Сколько бонусов можно списать?", a: "До 50% от стоимости товаров в заказе. Остаток оплачивается обычным способом." },
      { q: "Сгорают ли бонусы?", a: "Бонусы не сгорают. При отмене заказа использованные бонусы возвращаются, начисленные — списываются." },
    ],
  },
  {
    title: "Продукт",
    items: [
      { q: "Тестируете ли вы на животных?", a: "Нет. Все средства ОБЛАКО — cruelty-free. Мы не проводим тестов на животных и не сотрудничаем с лабораториями, которые их проводят." },
      { q: "Подходят ли средства для чувствительной кожи?", a: "Да, формулы разработаны для бережного ухода и протестированы дерматологами." },
      { q: "Где производятся средства?", a: "Производство и розлив — в России, на сертифицированном предприятии." },
    ],
  },
];

function FaqPage() {
  return (
    <div className="container-rhode py-16 md:py-24 max-w-3xl">
      <h1 className="font-display text-5xl md:text-6xl mb-4">Вопросы и ответы</h1>
      <p className="text-muted-foreground mb-12 max-w-xl">
        Самое важное о заказах, доставке, бонусах и наших средствах. Не нашли ответа — напишите на support@oblako.ru.
      </p>
      <div className="space-y-14">
        {SECTIONS.map((s) => (
          <section key={s.title}>
            <h2 className="font-display text-2xl mb-6 pb-3 border-b border-border">{s.title}</h2>
            <ul className="divide-y divide-border">
              {s.items.map((it) => <FaqItem key={it.q} q={it.q} a={it.a} />)}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <li>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex justify-between items-center py-5 text-left gap-6"
      >
        <span className="text-base md:text-lg">{q}</span>
        <span className={`text-2xl transition-transform shrink-0 ${open ? "rotate-45" : ""}`}>+</span>
      </button>
      {open && <p className="pb-5 text-muted-foreground leading-relaxed text-sm md:text-base">{a}</p>}
    </li>
  );
}
