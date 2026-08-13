# Descripción

<!-- Qué aporta este PR. Una o dos frases. -->

## Trazabilidad

<!-- Completar lo que corresponda; borrar el resto. -->

- **Módulo:**
- **Historia de usuario / Caso de uso:** US-XXX-00
- **Pantalla:** PAN-XXX-00
- **Estado de codificación:** No iniciado / En desarrollo / Codificado / Probado

## Tipo de cambio

- [ ] `feat` — nueva funcionalidad
- [ ] `fix` — corrección de un error
- [ ] `docs` — documentación
- [ ] `refactor` — refactorización sin cambio de comportamiento
- [ ] `test` — pruebas
- [ ] `chore` — configuración o mantenimiento

## Cómo se probó

<!-- Pasos concretos para reproducir lo que hiciste. Si hay pantallas nuevas,
     adjuntar captura. -->

## Checklist

- [ ] `pnpm lint` pasa sin errores ni advertencias
- [ ] `pnpm typecheck` pasa
- [ ] `pnpm test` pasa
- [ ] Los commits siguen la convención `tipo(modulo): descripción`
- [ ] Si cambié el schema, generé la migración con `pnpm db:generate` y la incluí
- [ ] No agregué secretos ni archivos `.env` al repositorio

---

Según el punto 1.2.4 del documento de proyecto, este PR requiere la aprobación
de al menos un integrante distinto del autor. La revisión técnica corresponde al
Líder de Desarrollo y la validación funcional al Analista de Calidad.
