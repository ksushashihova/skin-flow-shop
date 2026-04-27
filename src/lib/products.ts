import type { Product } from "./api";

const img = (seed: string) =>
  `https://images.unsplash.com/${seed}?auto=format&fit=crop&w=1400&q=80`;

export const PRODUCTS: Product[] = [
  {
    id: "p_balm_peptide",
    slug: "peptide-lip-balm",
    name_ru: "Пептидный бальзам для губ",
    name_en: "Peptide Lip Balm",
    tagline_ru: "Глубокое увлажнение и мягкий блеск",
    tagline_en: "Deep moisture, soft sheen",
    description_ru:
      "Питательный бальзам с пептидами и маслом ши. Восстанавливает, разглаживает и придаёт губам здоровый блеск без липкости.",
    description_en:
      "Nourishing balm with peptides and shea butter. Restores, smooths and adds a healthy sheen without stickiness.",
    price: 1490,
    images: [img("photo-1631214540242-3cd8c4b0b3b8"), img("photo-1612817288484-6f916006741a")],
    stock: 42,
    category: "lip",
  },
  {
    id: "p_glaze_treatment",
    slug: "glazing-treatment",
    name_ru: "Глейзинг-уход для лица",
    name_en: "Glazing Facial Treatment",
    tagline_ru: "Эффект отражённого света",
    tagline_en: "Light-reflecting glow",
    description_ru:
      "Лёгкая сыворотка-вуаль с пантенолом и ниацинамидом. Создаёт стеклянный финиш и удерживает влагу до 24 часов.",
    description_en:
      "Light veil serum with panthenol and niacinamide. Creates a glass finish and locks in moisture for 24 hours.",
    price: 3890,
    images: [img("photo-1556228720-195a672e8a03"), img("photo-1570194065650-d99fb4bedf0a")],
    stock: 18,
    category: "skin",
  },
  {
    id: "p_barrier_cream",
    slug: "barrier-restore-cream",
    name_ru: "Крем для восстановления барьера",
    name_en: "Barrier Restore Cream",
    tagline_ru: "Комфорт и защита чувствительной кожи",
    tagline_en: "Comfort and shield for sensitive skin",
    description_ru:
      "Богатый крем с керамидами и скваланом. Восстанавливает липидный барьер, снимает покраснения и сухость.",
    description_en:
      "Rich cream with ceramides and squalane. Repairs the lipid barrier, soothes redness and dryness.",
    price: 4290,
    images: [img("photo-1620916566398-39f1143ab7be"), img("photo-1608248543803-ba4f8c70ae0b")],
    stock: 25,
    category: "skin",
  },
  {
    id: "p_cleanser_gel",
    slug: "soft-cleanser",
    name_ru: "Мягкий гель для умывания",
    name_en: "Soft Cleanser",
    tagline_ru: "Очищение без ощущения стянутости",
    tagline_en: "Cleansing without tightness",
    description_ru:
      "PH-сбалансированный гель с экстрактом овса. Бережно удаляет загрязнения и макияж, сохраняя комфорт.",
    description_en:
      "PH-balanced gel with oat extract. Gently removes impurities and makeup while preserving comfort.",
    price: 2390,
    images: [img("photo-1556228453-efd6c1ff04f6"), img("photo-1571781926291-c477ebfd024b")],
    stock: 60,
    category: "skin",
  },
  {
    id: "p_eye_cream",
    slug: "lifting-eye-cream",
    name_ru: "Лифтинг-крем для области глаз",
    name_en: "Lifting Eye Cream",
    tagline_ru: "Свежий взгляд каждое утро",
    tagline_en: "Fresh look every morning",
    description_ru:
      "Крем с кофеином и пептидами. Уменьшает отёчность, разглаживает мелкие морщины и тонизирует кожу.",
    description_en:
      "Cream with caffeine and peptides. Reduces puffiness, smooths fine lines and tones the skin.",
    price: 3490,
    images: [img("photo-1631730486572-226d1f595b68"), img("photo-1608248597279-f99d160bfcbc")],
    stock: 33,
    category: "skin",
  },
  {
    id: "p_body_lotion",
    slug: "silk-body-lotion",
    name_ru: "Шёлковый лосьон для тела",
    name_en: "Silk Body Lotion",
    tagline_ru: "Невесомое сияние",
    tagline_en: "Weightless radiance",
    description_ru:
      "Лосьон с маслом жожоба и витамином E. Быстро впитывается и придаёт коже мягкое атласное сияние.",
    description_en:
      "Lotion with jojoba oil and vitamin E. Absorbs quickly and gives skin a soft satin glow.",
    price: 2790,
    images: [img("photo-1601049413317-3b86abc1a06a"), img("photo-1556228841-7d0f8086e8e1")],
    stock: 47,
    category: "body",
  },
  {
    id: "p_lip_tint",
    slug: "lip-tint-rose",
    name_ru: "Тинт для губ Rose",
    name_en: "Lip Tint Rose",
    tagline_ru: "Естественный оттенок и уход",
    tagline_en: "Natural tint with care",
    description_ru:
      "Ухаживающий тинт с маслами и тонким пигментом. Подчёркивает естественный оттенок губ и питает их.",
    description_en:
      "Caring tint with oils and a delicate pigment. Enhances the natural lip tone while nourishing.",
    price: 1690,
    images: [img("photo-1599733589046-8f1f06c4f9c3"), img("photo-1631214499876-2bc2c1a4a7c5")],
    stock: 80,
    category: "lip",
  },
  {
    id: "p_serum_glow",
    slug: "vitamin-c-serum",
    name_ru: "Сыворотка с витамином C",
    name_en: "Vitamin C Serum",
    tagline_ru: "Сияние и ровный тон",
    tagline_en: "Radiance and even tone",
    description_ru:
      "Стабилизированная сыворотка 10% витамина C. Выравнивает тон, осветляет пигментацию и придаёт сияние.",
    description_en:
      "Stabilized 10% vitamin C serum. Evens tone, brightens pigmentation and adds radiance.",
    price: 4690,
    images: [img("photo-1620916297893-3a0b7d8b5b4e"), img("photo-1608571423902-eed4a5ad8108")],
    stock: 22,
    category: "skin",
  },
  {
    id: "p_night_oil",
    slug: "night-recovery-oil",
    name_ru: "Ночное восстанавливающее масло",
    name_en: "Night Recovery Oil",
    tagline_ru: "Регенерация во сне",
    tagline_en: "Overnight regeneration",
    description_ru:
      "Сухое масло с шиповником и сквалановой основой. Восстанавливает упругость и эластичность за ночь.",
    description_en:
      "Dry oil with rosehip and squalane base. Restores firmness and elasticity overnight.",
    price: 5290,
    images: [img("photo-1611080626919-7cf5a9dbab12"), img("photo-1608571423901-e6c4a06aa3eb")],
    stock: 15,
    category: "skin",
  },
  {
    id: "p_body_scrub",
    slug: "smoothing-body-scrub",
    name_ru: "Разглаживающий скраб для тела",
    name_en: "Smoothing Body Scrub",
    tagline_ru: "Мягкая полировка кожи",
    tagline_en: "Soft skin polish",
    description_ru:
      "Скраб с сахаром и маслом миндаля. Деликатно отшелушивает и оставляет кожу мягкой и ухоженной.",
    description_en:
      "Sugar and almond oil scrub. Gently exfoliates and leaves skin soft and cared for.",
    price: 2990,
    images: [img("photo-1612817288484-6f916006741a"), img("photo-1556228578-8c89e6adf883")],
    stock: 38,
    category: "body",
  },
  {
    id: "p_hand_cream",
    slug: "soft-hand-cream",
    name_ru: "Мягкий крем для рук",
    name_en: "Soft Hand Cream",
    tagline_ru: "Ежедневный комфорт",
    tagline_en: "Everyday comfort",
    description_ru:
      "Нежирный крем с глицерином и аллантоином. Быстро впитывается, защищает и смягчает кожу рук.",
    description_en:
      "Non-greasy cream with glycerin and allantoin. Absorbs quickly, protects and softens hands.",
    price: 1290,
    images: [img("photo-1556228720-195a672e8a03"), img("photo-1556228852-80b6e5eeff06")],
    stock: 95,
    category: "body",
  },
];
