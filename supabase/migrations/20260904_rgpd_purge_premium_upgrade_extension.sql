-- RGPD — étend automatiquement la date de purge au passage Freemium → Premium
--
-- Depuis le 04/09/2026, la purge RGPD est différenciée par plan (voir
-- PRD_AvecToi_v1_4.md §3.12/§10bis, lib/rgpd.ts) : 30 jours en Freemium,
-- 60 jours + 30 jours de prolongation (renouvelable) en Premium. La création
-- d'espace (components/PatientOnboarding.tsx) et le bouton "Prolonger"
-- (lib/rgpd.ts prolongSpace) sont déjà à jour côté app. Mais le passage
-- premium=false → true lui-même se fait hors de cette app (webhook Stripe du
-- site avectoi.care, écrivant directement en base) : sans ce trigger,
-- purge_scheduled_at resterait calé sur la fenêtre Freemium (30 jours) et un
-- espace pourrait être purgé avant d'avoir bénéficié de la fenêtre Premium.
--
-- Écart volontairement traité en +30 jours relatifs (delta entre les deux
-- fenêtres) plutôt qu'en recalcul absolu depuis end_date/last_activity_at :
-- préserve telle quelle une éventuelle prolongation déjà appliquée avant
-- l'upgrade, au lieu de l'écraser.

CREATE OR REPLACE FUNCTION extend_purge_on_premium_upgrade()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.premium IS DISTINCT FROM TRUE AND NEW.premium IS TRUE THEN
    NEW.purge_scheduled_at := NEW.purge_scheduled_at + INTERVAL '30 days';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_extend_purge_on_premium_upgrade ON patient_spaces;

CREATE TRIGGER trg_extend_purge_on_premium_upgrade
  BEFORE UPDATE ON patient_spaces
  FOR EACH ROW
  EXECUTE FUNCTION extend_purge_on_premium_upgrade();
