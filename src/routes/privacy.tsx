import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({ meta: [{ title: "Политика конфиденциальности — ОБЛАКО" }] }),
  component: Privacy,
});

function Privacy() {
  return (
    <div className="container-rhode py-16 max-w-3xl prose prose-neutral">
      <h1 className="font-display text-5xl mb-8">Политика конфиденциальности</h1>
      <div className="space-y-6 text-sm leading-relaxed text-foreground/80">
        <p>
          Настоящая политика регулирует обработку персональных данных пользователей сайта
          в соответствии с Федеральным законом № 152-ФЗ «О персональных данных».
        </p>
        <h2 className="font-display text-2xl mt-8">Какие данные мы собираем</h2>
        <p>Имя, email, телефон, адрес доставки, история заказов.</p>
        <h2 className="font-display text-2xl mt-8">Цели обработки</h2>
        <p>Оформление и доставка заказов, информирование о статусе заказа, обратная связь.</p>
        <h2 className="font-display text-2xl mt-8">Согласие</h2>
        <p>
          Оформляя заказ, пользователь даёт согласие на обработку персональных данных.
          Согласие фиксируется в системе с указанием даты.
        </p>
        <h2 className="font-display text-2xl mt-8">Удаление аккаунта</h2>
        <p>
          Пользователь вправе запросить удаление аккаунта и связанных персональных данных,
          написав на support@oblako.ru.
        </p>
      </div>
    </div>
  );
}
