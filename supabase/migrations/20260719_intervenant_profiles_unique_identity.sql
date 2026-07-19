-- Empêche la création de plusieurs fiches intervenant pour la même
-- personne dans un même espace. Avant cette contrainte, la déduplication
-- reposait uniquement sur un check-then-insert côté client
-- (_layout.tsx handleSaveIdentity, commit 722e1f7), non atomique — une
-- session locale ayant échoué à ce rattachement (ex: profil supprimé
-- après coup, ou PIN saisi différent) pouvait finir par référencer un
-- intervenantProfileId local qui n'existe plus, ou un insert créer un
-- vrai doublon en base. Vérifié avant migration : aucun doublon existant
-- sur (space_id, prenom, nom) en prod.
create unique index if not exists idx_intervenant_profiles_unique_identity
  on public.intervenant_profiles (space_id, lower(prenom), lower(nom));
