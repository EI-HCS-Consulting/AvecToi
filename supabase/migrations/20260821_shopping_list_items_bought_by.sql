-- Trace qui a coché chaque article de la liste de courses (voir
-- components/ShoppingListModal.tsx), pour affichage "acheté par X" et pour
-- restreindre le cochage au seul preneur en charge du besoin (claimed_by_*
-- sur tasks) une fois que quelqu'un a cliqué "Je m'en occupe" — tant que
-- personne ne l'a pris en charge, la liste reste ouverte à tous.
alter table public.shopping_list_items
  add column if not exists bought_by_prenom text,
  add column if not exists bought_by_nom text;
