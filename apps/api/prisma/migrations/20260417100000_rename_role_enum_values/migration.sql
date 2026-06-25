-- Fase 3 — Refactor del enum Role.
-- Documento: documentacion/Gestion-Socios-y-Roles.md §8.2.1 + §12 Fase 3.
--
-- Estrategia pragmática:
--   * Se renombran los valores distritales para dejar claro su alcance
--     (USER reemplaza PARTICIPANT, DISTRICT_SECRETARY reemplaza SECRETARY,
--     DISTRICT_RDR reemplaza RDR).
--   * `PRESIDENT` permanece en el enum como valor virtual: ya no se persiste
--     (se calcula en `JwtStrategy.validate` a partir de `Membership.isPresident`).
--     Un CHECK constraint en `User.role` impide que vuelva a escribirse.
--
-- Esta migración invalida JWTs vigentes cuando se combine con el bump de
-- `JWT_VERSION` en el código — los usuarios deben reloguearse.

-- 1. Normalizar: cualquier User con role='PRESIDENT' pasa a 'PARTICIPANT' (todavía
--    con el nombre viejo, antes del rename).
UPDATE "User" SET role = 'PARTICIPANT' WHERE role = 'PRESIDENT';

-- 2. Renombrar valores del enum.
ALTER TYPE "Role" RENAME VALUE 'PARTICIPANT' TO 'USER';
ALTER TYPE "Role" RENAME VALUE 'SECRETARY'   TO 'DISTRICT_SECRETARY';
ALTER TYPE "Role" RENAME VALUE 'RDR'         TO 'DISTRICT_RDR';

-- 3. CHECK: nunca persistir PRESIDENT en la tabla User.
ALTER TABLE "User"
  ADD CONSTRAINT "User_role_not_virtual_president"
  CHECK (role <> 'PRESIDENT');
