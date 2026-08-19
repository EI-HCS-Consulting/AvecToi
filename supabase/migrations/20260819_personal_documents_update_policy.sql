-- personal_documents n'avait qu'une policy select/insert/delete (voir
-- 20260818_personal_documents.sql) : l'UPDATE utilise par downloadLetter en
-- mode edition (voir MyChecklist.tsx, editingDocumentId) etait donc filtre
-- par RLS et ne modifiait silencieusement aucune ligne (ni erreur ni effet),
-- ce qui laissait "Mes documents" avec les anciennes valeurs malgre
-- l'apercu a jour cote app.
create policy "public update personal documents"
  on public.personal_documents for update
  using (true)
  with check (true);
