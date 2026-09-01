-- Horodatage de la prise en charge, pour afficher "Pris en charge le
-- XX/XX/XXXX" sous "Publié le XX/XX/XXXX" dans Mon Compte > Entraide (voir
-- app/(admin)/account.tsx et app/(visitor)/account.tsx, renderTaskCategoryCard).
-- tasks.claimed_at couvre le "Je m'en occupe" classique ; shopping_list_items
-- .bought_at couvre la contribution "courses" sans claim explicite (cocher un
-- article coche seulement cet article, voir components/ShoppingListModal.tsx).
alter table public.tasks add column if not exists claimed_at timestamptz;
alter table public.shopping_list_items add column if not exists bought_at timestamptz;
