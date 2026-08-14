# Capítulo 08 · Glosario y trazabilidad

---

## Nomenclatura de códigos

| Prefijo | Qué identifica      | Ejemplo      | Dónde se define    |
| ------- | ------------------- | ------------ | ------------------ |
| `RF`    | requisito funcional | `RF002`      | punto 2.2.1.2      |
| `US`    | historia de usuario | `US-AUT-01`  | punto 2.2.1.3      |
| `PAN`   | pantalla            | `PAN-AUT-01` | PDF de maquetación |
| `REP`   | reporte             | `REP-01`     | PDF de maquetación |
| `CU`    | caso de uso         | `CU-05`      | punto 2.2.1.1      |
| `PRU`   | prueba documentada  | `PRU-01`     | Etapa 6            |

Los códigos de módulo son los mismos en `US-`, `PAN-` y en el scope del commit:

`AUT` · `PUB` · `EXP` · `PED` · `NOT` · `DASH` · `ADM` · `CFG` · `AYU` · `MSG` ·
`RES` · `GURP` · `AUD`

---

## Cadena de trazabilidad

La Etapa 6 exige una matriz consolidada que enlace todo:

```
Módulo → Funcionalidad → CU/US → Entidad → Pantalla → Estado de codificación
```

Estados posibles: **No iniciado** · **En desarrollo** · **Codificado** ·
**Probado**.

Se actualiza en cada control semanal. La plantilla de pull request pide estos
campos justamente para que la matriz se pueda armar desde el historial de PRs y
no reconstruyéndola a mano al final.

---

## Glosario del dominio

| Término                       | Significado                                                          |
| ----------------------------- | -------------------------------------------------------------------- |
| **Cocinero**                  | usuario que publica platos y recibe pedidos                          |
| **Cliente**                   | usuario que explora y realiza pedidos                                |
| **Publicación**               | plato ofrecido, con imagen, precio, categoría y disponibilidad       |
| **Disponibilidad**            | `DISPONIBLE`, `ULTIMAS_UNIDADES` o `NO_DISPONIBLE`                   |
| **Carrito**                   | ítems seleccionados de **un solo** cocinero, previos a confirmar     |
| **Pedido**                    | transacción con estado, ítems congelados e historial de transiciones |
| **Snapshot**                  | copia de nombre, precio e imagen guardada en el ítem al confirmar    |
| **Reseña**                    | calificación del cliente hacia el cocinero, pública                  |
| **Calificación del cocinero** | calificación del cocinero hacia el cliente, no pública               |
| **Feed**                      | listado dinámico de publicaciones recientes cercanas                 |
| **Evento de seguridad**       | login fallido o acceso denegado por rol                              |
| **Registro de auditoría**     | alta, baja o modificación de una entidad de negocio                  |

---

## Reglas del proyecto

### Ramas

```
main      producción · solo recibe merges desde develop, aprobados
develop   integración · destino de todas las features
feature/* desde develop, vuelve por pull request
fix/*     desde develop, para correcciones
```

Nadie commitea directo a `main`.

### Commits

```
tipo(modulo): descripción breve en minúsculas
```

Tipos válidos: `feat` `fix` `docs` `refactor` `test` `chore`.
El scope (módulo) es **obligatorio**; el hook `commit-msg` rechaza lo que no
cumpla.

```
feat(auth): agregar pantalla de registro de cocinero
fix(pedidos): corregir transición de estado listo a completado
```

### Pull requests

- Todo merge a `develop` requiere PR.
- Aprobación de al menos un integrante **distinto del autor**.
- Revisión técnica: Líder de Desarrollo. Validación funcional: Analista de Calidad.
- No se mergea con conflictos sin resolver.
- El merge de `develop` a `main` requiere aprobación del PM más un integrante, y
  solo ocurre ante hitos evaluativos o versiones acordadas.

---

## Roles del equipo

| Integrante         | Roles                                  |
| ------------------ | -------------------------------------- |
| Aguilar, Ezequiel  | DBA · Backend 1                        |
| Blangetti, Facundo | UX/UI Lead · Frontend 1                |
| Cáceres, Felipe    | Project Manager · Analista funcional 1 |
| Ocampo, Nicolás    | Líder de Desarrollo · Frontend 2       |
| Pacci, Facundo     | QA 1 · Backend 2                       |
| Telo, Matías       | Analista funcional 2 · QA 2            |

**Directores:** Moralejo, Raúl (Adjunto) · Manino, Gustavo (JTP) ·
Casas, Malena (Ay. 1ª).

---

## Metodología

Enfoque híbrido: etapas macro secuenciales (Planificación, Requerimientos,
Diseño, Desarrollo, Documentación) con **sprints de dos semanas** dentro de la
etapa de Desarrollo.

Cada sprint: planificación al inicio, check-in diario asincrónico por Discord
(qué hice / qué haré / bloqueos) y cierre con demo interna y retrospectiva.

Seguimiento en un tablero Kanban de Notion (Backlog · En progreso · En revisión ·
Completado).

### Indicadores

| KPI                               | Meta                       |
| --------------------------------- | -------------------------- |
| Índice de cumplimiento del sprint | > 0.85                     |
| Cobertura de la guía didáctica    | = 1.00 en cada evaluación  |
| Tasa de avance del tablero Kanban | > 0.80 al cierre de sprint |
