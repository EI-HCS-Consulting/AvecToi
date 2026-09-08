// Un visiteur qui devient co-admin ("⚙️ Paramètres Co-Administrateur" dans
// MyRelaisCommitments.tsx) doit atterrir sur une route précise du groupe
// (admin) (ex: "/(admin)/settings") AVANT que ce groupe n'existe côté
// navigation — son <Tabs> n'est pas encore monté, donc un simple
// router.push("/(admin)/settings") direct depuis (visitor) échoue : Expo
// Router ne peut pas résoudre ce chemin profond au tout premier montage des
// Tabs et retombe sur le premier onglet déclaré ("home"). Un contexte React
// est impossible ici puisque l'appelant est hors du périmètre
// AdminSpaceProvider — on mémorise donc la route désirée dans une variable
// module, et app/(admin)/_layout.tsx la consomme dès que ses <Tabs> sont
// montées et stables, via un vrai router.push() émis depuis L'INTÉRIEUR —
// seul cas qui fonctionne de façon fiable dans ce codebase (tous les autres
// boutons de navigation admin sont émis depuis un écran déjà monté dans les
// Tabs, jamais depuis l'extérieur du groupe).
let pending: string | null = null;

export function setPendingAdminRoute(path: string) {
  pending = path;
}

export function consumePendingAdminRoute(): string | null {
  const p = pending;
  pending = null;
  return p;
}
