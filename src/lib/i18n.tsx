import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "ru" | "en";

const dict = {
  ru: {
    "nav.shop": "Магазин",
    "nav.about": "бренд",
    "nav.journal": "Журнал",
    "nav.account": "Кабинет",
    "nav.cart": "Корзина",
    "nav.admin": "Админ",
    "nav.faq": "FAQ",
    "nav.quiz": "Подбор ухода",
    "nav.bundles": "Наборы",
    "nav.gift": "Сертификаты",
    "hero.title": "уход, уход уход",
    "hero.subtitle": "Минималистичная формула. Глубокое увлажнение. Эффект сияющей кожи.",
    "hero.cta": "Открыть магазин",
    "section.bestsellers": "Бестселлеры",
    "section.philosophy": "Философия",
    "section.philosophy.text":
      "Мы создаём средства, которые работают тихо и убедительно: чистые формулы, выверенные текстуры и уважение к коже каждый день.",
    "shop.title": "Магазин",
    "shop.search": "Поиск товаров",
    "product.add": "В корзину",
    "product.added": "Добавлено",
    "product.inCart": "В корзине",
    "product.removeHint": "Нажмите, чтобы убрать",
    "product.price": "Цена",
    "product.stock": "В наличии",
    "cart.title": "Корзина",
    "cart.empty": "Корзина пуста",
    "cart.subtotal": "Итого",
    "cart.checkout": "Оформить заказ",
    "checkout.title": "Оформление заказа",
    "checkout.city": "Город",
    "checkout.address": "Адрес",
    "checkout.postal": "Индекс",
    "checkout.consent":
      "Я согласен(на) на обработку персональных данных в соответствии с Политикой конфиденциальности",
    "checkout.submit": "Подтвердить заказ",
    "auth.login": "Вход",
    "auth.register": "Регистрация",
    "auth.email": "Email",
    "auth.password": "Пароль",
    "auth.name": "Имя",
    "auth.logout": "Выйти",
    "account.title": "Личный кабинет",
    "account.profile": "Профиль",
    "account.orders": "Мои заказы",
    "account.address": "Адреса",
    "admin.title": "Панель администратора",
    "admin.orders": "Заказы",
    "admin.users": "Пользователи",
    "footer.rights": "Все права защищены",
    "common.loading": "Загрузка",
    "common.back": "Назад",
  },
  en: {
    "nav.shop": "Shop",
    "nav.about": "About",
    "nav.journal": "Journal",
    "nav.account": "Account",
    "nav.cart": "Cart",
    "nav.admin": "Admin",
    "nav.faq": "FAQ",
    "nav.quiz": "Quiz",
    "nav.bundles": "Bundles",
    "nav.gift": "Gift cards",
    "hero.title": "Skincare that feels like a ritual",
    "hero.subtitle": "Minimal formulas. Deep hydration. A luminous, healthy glow.",
    "hero.cta": "Enter the shop",
    "section.bestsellers": "Bestsellers",
    "section.philosophy": "Philosophy",
    "section.philosophy.text":
      "We craft products that work quietly and convincingly: clean formulas, refined textures, and respect for the skin every day.",
    "shop.title": "Shop",
    "shop.search": "Search products",
    "product.add": "Add to cart",
    "product.added": "Added",
    "product.inCart": "In cart",
    "product.removeHint": "Click to remove",
    "product.price": "Price",
    "product.stock": "In stock",
    "cart.title": "Cart",
    "cart.empty": "Your cart is empty",
    "cart.subtotal": "Subtotal",
    "cart.checkout": "Checkout",
    "checkout.title": "Checkout",
    "checkout.city": "City",
    "checkout.address": "Address",
    "checkout.postal": "Postal code",
    "checkout.consent":
      "I agree to the processing of personal data in accordance with the Privacy Policy",
    "checkout.submit": "Place order",
    "auth.login": "Sign in",
    "auth.register": "Sign up",
    "auth.email": "Email",
    "auth.password": "Password",
    "auth.name": "Name",
    "auth.logout": "Sign out",
    "account.title": "Account",
    "account.profile": "Profile",
    "account.orders": "My orders",
    "account.address": "Addresses",
    "admin.title": "Admin panel",
    "admin.orders": "Orders",
    "admin.users": "Users",
    "footer.rights": "All rights reserved",
    "common.loading": "Loading",
    "common.back": "Back",
  },
} as const;

type Key = keyof (typeof dict)["ru"];

interface I18nCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (k: Key) => string;
}

const Ctx = createContext<I18nCtx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("ru");
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("lang") as Lang | null;
    if (saved === "ru" || saved === "en") setLang(saved);
  }, []);
  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("lang", lang);
  }, [lang]);
  const t = (k: Key) => dict[lang][k] ?? k;
  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useI18n must be used within I18nProvider");
  return c;
}

export function formatPrice(rub: number, lang: Lang) {
  return new Intl.NumberFormat(lang === "ru" ? "ru-RU" : "en-US", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(rub);
}
