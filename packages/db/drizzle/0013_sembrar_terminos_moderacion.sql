-- US-RES-01 / RF080 y RF084: lista de terminos del filtro automatico de
-- moderacion que se aplica al comentario de una resena y a la respuesta del
-- cocinero.
--
-- POR QUE ES UN PARAMETRO Y NO UNA CONSTANTE DEL CODIGO
--
-- Los dos requisitos exigen "un filtro automatico de moderacion" y fijan el
-- mensaje que ve el usuario, pero NINGUNA fuente del proyecto enumera que
-- terminos hay que detectar. Hornear una lista en el codigo seria inventar un
-- requerimiento —lo que la regla 1 del proyecto prohibe— y ademas obligaria a
-- desplegar para corregir el vocabulario. Cargarla desde PAN-ADM-04 deja la
-- decision en el administrador y permite ajustarla en caliente.
--
-- ARRANCA VACIA A PROPOSITO. Con la lista vacia el filtro no bloquea ningun
-- comentario, que es el comportamiento correcto mientras el equipo no defina el
-- vocabulario: es preferible no filtrar a filtrar segun un criterio que nadie
-- acordo.
--
-- FORMATO: un termino por linea, en una unica fila de texto. Se elige el salto
-- de linea y no la coma porque el campo del panel es un textarea —una lista por
-- lineas es lo que el administrador ve y edita— y porque evita tener que
-- escapar comas dentro de un termino.
--
-- ON CONFLICT DO NOTHING, igual que la 0004: correr las migraciones dos veces
-- no puede pisar una lista que el administrador ya haya cargado.

INSERT INTO "configuracion_sistema" ("clave", "valor", "descripcion")
VALUES (
  'resena_terminos_moderacion',
  '',
  'Términos que el filtro automático de moderación detecta en el comentario de una reseña y en la respuesta del cocinero. Uno por línea. Vacío desactiva el filtro.'
)
ON CONFLICT ("clave") DO NOTHING;
