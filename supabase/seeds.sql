-- =========================================================================
-- ОБЛАКО — seeds.
-- Idempotent: re-running won't duplicate rows (uses ON CONFLICT DO NOTHING).
-- Portable: same SQL works on self-hosted Postgres (no Supabase-specific calls).
-- Run AFTER the schema migration.
-- =========================================================================

BEGIN;

-- Categories
INSERT INTO oblako.categories (id, name_ru, name_en, sort_order) VALUES ('skin', 'Уход за кожей', 'Skincare', 1) ON CONFLICT (id) DO NOTHING;
INSERT INTO oblako.categories (id, name_ru, name_en, sort_order) VALUES ('lip', 'Для губ', 'Lip Care', 2) ON CONFLICT (id) DO NOTHING;
INSERT INTO oblako.categories (id, name_ru, name_en, sort_order) VALUES ('body', 'Тело', 'Body', 3) ON CONFLICT (id) DO NOTHING;

-- Products
INSERT INTO oblako.products (id, slug, name_ru, name_en, tagline_ru, tagline_en, description_ru, description_en, price, stock, category_id, images) VALUES ('p_balm_peptide', 'peptide-lip-balm', 'Пептидный бальзам для губ', 'Peptide Lip Balm', 'Глубокое увлажнение и мягкий блеск', 'Deep moisture, soft sheen', 'Питательный бальзам с пептидами и маслом ши. Восстанавливает, разглаживает и придаёт губам здоровый блеск без липкости.', 'Nourishing balm with peptides and shea butter. Restores, smooths and adds a healthy sheen without stickiness.', 1490, 42, 'lip', ARRAY['https://images.unsplash.com/photo-1631214540242-3cd8c4b0b3b8?auto=format&fit=crop&fm=webp&w=800&q=70','https://images.unsplash.com/photo-1612817288484-6f916006741a?auto=format&fit=crop&fm=webp&w=800&q=70']::text[]) ON CONFLICT (id) DO NOTHING;
INSERT INTO oblako.products (id, slug, name_ru, name_en, tagline_ru, tagline_en, description_ru, description_en, price, stock, category_id, images) VALUES ('p_glaze_treatment', 'glazing-treatment', 'Глейзинг-уход для лица', 'Glazing Facial Treatment', 'Эффект отражённого света', 'Light-reflecting glow', 'Лёгкая сыворотка-вуаль с пантенолом и ниацинамидом. Создаёт стеклянный финиш и удерживает влагу до 24 часов.', 'Light veil serum with panthenol and niacinamide. Creates a glass finish and locks in moisture for 24 hours.', 3890, 18, 'skin', ARRAY['https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&fm=webp&w=800&q=70','https://images.unsplash.com/photo-1570194065650-d99fb4bedf0a?auto=format&fit=crop&fm=webp&w=800&q=70']::text[]) ON CONFLICT (id) DO NOTHING;
INSERT INTO oblako.products (id, slug, name_ru, name_en, tagline_ru, tagline_en, description_ru, description_en, price, stock, category_id, images) VALUES ('p_barrier_cream', 'barrier-restore-cream', 'Крем для восстановления барьера', 'Barrier Restore Cream', 'Комфорт и защита чувствительной кожи', 'Comfort and shield for sensitive skin', 'Богатый крем с керамидами и скваланом. Восстанавливает липидный барьер, снимает покраснения и сухость.', 'Rich cream with ceramides and squalane. Repairs the lipid barrier, soothes redness and dryness.', 4290, 25, 'skin', ARRAY['https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&fm=webp&w=800&q=70','https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&fm=webp&w=800&q=70']::text[]) ON CONFLICT (id) DO NOTHING;
INSERT INTO oblako.products (id, slug, name_ru, name_en, tagline_ru, tagline_en, description_ru, description_en, price, stock, category_id, images) VALUES ('p_cleanser_gel', 'soft-cleanser', 'Мягкий гель для умывания', 'Soft Cleanser', 'Очищение без ощущения стянутости', 'Cleansing without tightness', 'PH-сбалансированный гель с экстрактом овса. Бережно удаляет загрязнения и макияж, сохраняя комфорт.', 'PH-balanced gel with oat extract. Gently removes impurities and makeup while preserving comfort.', 2390, 60, 'skin', ARRAY['https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?auto=format&fit=crop&fm=webp&w=800&q=70','https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&fm=webp&w=800&q=70']::text[]) ON CONFLICT (id) DO NOTHING;
INSERT INTO oblako.products (id, slug, name_ru, name_en, tagline_ru, tagline_en, description_ru, description_en, price, stock, category_id, images) VALUES ('p_eye_cream', 'lifting-eye-cream', 'Лифтинг-крем для области глаз', 'Lifting Eye Cream', 'Свежий взгляд каждое утро', 'Fresh look every morning', 'Крем с кофеином и пептидами. Уменьшает отёчность, разглаживает мелкие морщины и тонизирует кожу.', 'Cream with caffeine and peptides. Reduces puffiness, smooths fine lines and tones the skin.', 3490, 33, 'skin', ARRAY['https://images.unsplash.com/photo-1631730486572-226d1f595b68?auto=format&fit=crop&fm=webp&w=800&q=70','https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?auto=format&fit=crop&fm=webp&w=800&q=70']::text[]) ON CONFLICT (id) DO NOTHING;
INSERT INTO oblako.products (id, slug, name_ru, name_en, tagline_ru, tagline_en, description_ru, description_en, price, stock, category_id, images) VALUES ('p_body_lotion', 'silk-body-lotion', 'Шёлковый лосьон для тела', 'Silk Body Lotion', 'Невесомое сияние', 'Weightless radiance', 'Лосьон с маслом жожоба и витамином E. Быстро впитывается и придаёт коже мягкое атласное сияние.', 'Lotion with jojoba oil and vitamin E. Absorbs quickly and gives skin a soft satin glow.', 2790, 47, 'body', ARRAY['https://images.unsplash.com/photo-1601049413317-3b86abc1a06a?auto=format&fit=crop&fm=webp&w=800&q=70','https://images.unsplash.com/photo-1556228841-7d0f8086e8e1?auto=format&fit=crop&fm=webp&w=800&q=70']::text[]) ON CONFLICT (id) DO NOTHING;
INSERT INTO oblako.products (id, slug, name_ru, name_en, tagline_ru, tagline_en, description_ru, description_en, price, stock, category_id, images) VALUES ('p_lip_tint', 'lip-tint-rose', 'Тинт для губ Rose', 'Lip Tint Rose', 'Естественный оттенок и уход', 'Natural tint with care', 'Ухаживающий тинт с маслами и тонким пигментом. Подчёркивает естественный оттенок губ и питает их.', 'Caring tint with oils and a delicate pigment. Enhances the natural lip tone while nourishing.', 1690, 80, 'lip', ARRAY['https://images.unsplash.com/photo-1599733589046-8f1f06c4f9c3?auto=format&fit=crop&fm=webp&w=800&q=70','https://images.unsplash.com/photo-1631214499876-2bc2c1a4a7c5?auto=format&fit=crop&fm=webp&w=800&q=70']::text[]) ON CONFLICT (id) DO NOTHING;
INSERT INTO oblako.products (id, slug, name_ru, name_en, tagline_ru, tagline_en, description_ru, description_en, price, stock, category_id, images) VALUES ('p_serum_glow', 'vitamin-c-serum', 'Сыворотка с витамином C', 'Vitamin C Serum', 'Сияние и ровный тон', 'Radiance and even tone', 'Стабилизированная сыворотка 10% витамина C. Выравнивает тон, осветляет пигментацию и придаёт сияние.', 'Stabilized 10% vitamin C serum. Evens tone, brightens pigmentation and adds radiance.', 4690, 22, 'skin', ARRAY['https://images.unsplash.com/photo-1620916297893-3a0b7d8b5b4e?auto=format&fit=crop&fm=webp&w=800&q=70','https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&fm=webp&w=800&q=70']::text[]) ON CONFLICT (id) DO NOTHING;
INSERT INTO oblako.products (id, slug, name_ru, name_en, tagline_ru, tagline_en, description_ru, description_en, price, stock, category_id, images) VALUES ('p_night_oil', 'night-recovery-oil', 'Ночное восстанавливающее масло', 'Night Recovery Oil', 'Регенерация во сне', 'Overnight regeneration', 'Сухое масло с шиповником и сквалановой основой. Восстанавливает упругость и эластичность за ночь.', 'Dry oil with rosehip and squalane base. Restores firmness and elasticity overnight.', 5290, 15, 'skin', ARRAY['https://images.unsplash.com/photo-1611080626919-7cf5a9dbab12?auto=format&fit=crop&fm=webp&w=800&q=70','https://images.unsplash.com/photo-1608571423901-e6c4a06aa3eb?auto=format&fit=crop&fm=webp&w=800&q=70']::text[]) ON CONFLICT (id) DO NOTHING;
INSERT INTO oblako.products (id, slug, name_ru, name_en, tagline_ru, tagline_en, description_ru, description_en, price, stock, category_id, images) VALUES ('p_body_scrub', 'smoothing-body-scrub', 'Разглаживающий скраб для тела', 'Smoothing Body Scrub', 'Мягкая полировка кожи', 'Soft skin polish', 'Скраб с сахаром и маслом миндаля. Деликатно отшелушивает и оставляет кожу мягкой и ухоженной.', 'Sugar and almond oil scrub. Gently exfoliates and leaves skin soft and cared for.', 2990, 38, 'body', ARRAY['https://images.unsplash.com/photo-1612817288484-6f916006741a?auto=format&fit=crop&fm=webp&w=800&q=70','https://images.unsplash.com/photo-1556228578-8c89e6adf883?auto=format&fit=crop&fm=webp&w=800&q=70']::text[]) ON CONFLICT (id) DO NOTHING;
INSERT INTO oblako.products (id, slug, name_ru, name_en, tagline_ru, tagline_en, description_ru, description_en, price, stock, category_id, images) VALUES ('p_hand_cream', 'soft-hand-cream', 'Мягкий крем для рук', 'Soft Hand Cream', 'Ежедневный комфорт', 'Everyday comfort', 'Нежирный крем с глицерином и аллантоином. Быстро впитывается, защищает и смягчает кожу рук.', 'Non-greasy cream with glycerin and allantoin. Absorbs quickly, protects and softens hands.', 1290, 95, 'body', ARRAY['https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&fm=webp&w=800&q=70','https://images.unsplash.com/photo-1556228852-80b6e5eeff06?auto=format&fit=crop&fm=webp&w=800&q=70']::text[]) ON CONFLICT (id) DO NOTHING;

-- Banners
INSERT INTO oblako.banners (
  id,
  title,
  subtitle,
  image,
  cta_label,
  cta_href,
  text_color,
  enabled,
  sort_order
)
VALUES (
  'bn_hero',
  'Облако ухода для вашей кожи',
  'Чистые формулы, нежные текстуры, заметный результат',
  'https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?auto=format&fit=crop&w=1600&q=80',
  'Смотреть каталог',
  '/catalog',
  'light'::oblako.banner_text_color,  -- вот тут добавить oblako.
  true,
  1
)
ON CONFLICT (id) DO NOTHING;

-- Posts
INSERT INTO oblako.posts (slug, title, excerpt, cover, category, body, images) VALUES ('sample-article', 'Заголовок статьи — замените на свой', 'Краткое описание статьи в одну-две строки. Появляется в карточке журнала и в превью при шеринге.', 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=1400&q=80', 'Ритуалы', ARRAY['Это первый абзац типовой статьи. Здесь можно рассказать вступление: о чём текст, для кого он и какую пользу даст читателю. Замените содержимое через админку — раздел «Журнал».','Второй абзац — основная мысль. Каждый пустой перевод строки в админке создаёт новый абзац. Текст автоматически верстается в комфортной для чтения колонке.','Третий абзац — детали, примеры, советы. Под текстом можно добавить фотогалерею и встроенное видео — поля для них есть в форме редактирования статьи.','Заключение. Подведите итог и пригласите читателя к действию: попробовать продукт, прочитать ещё одну статью, оставить комментарий.']::text[], ARRAY['https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=1400&q=80','https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?auto=format&fit=crop&w=1400&q=80']::text[]) ON CONFLICT (slug) DO NOTHING;

-- Promo codes
INSERT INTO oblako.promos (code, percent, amount, description, uses_left) VALUES ('WELCOME10', 10, NULL, 'Скидка 10% за подписку на рассылку', NULL) ON CONFLICT (code) DO NOTHING;
INSERT INTO oblako.promos (code, percent, amount, description, uses_left) VALUES ('OBLAKO20', 20, NULL, 'Скидка 20% на первый заказ', 100) ON CONFLICT (code) DO NOTHING;

COMMIT;
