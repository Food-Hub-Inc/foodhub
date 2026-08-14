CREATE TYPE "public"."estado_cuenta" AS ENUM('ACTIVA', 'SUSPENDIDA', 'ELIMINADA');--> statement-breakpoint
CREATE TYPE "public"."estado_mensaje" AS ENUM('ENVIADO', 'ENTREGADO', 'LEIDO');--> statement-breakpoint
CREATE TYPE "public"."estado_pedido" AS ENUM('CREADO', 'ACEPTADO', 'LISTO', 'RECHAZADO', 'COMPLETADO');--> statement-breakpoint
CREATE TYPE "public"."estado_publicacion" AS ENUM('DISPONIBLE', 'ULTIMAS_UNIDADES', 'NO_DISPONIBLE');--> statement-breakpoint
CREATE TYPE "public"."estado_reporte" AS ENUM('PENDIENTE', 'APROBADO', 'RECHAZADO');--> statement-breakpoint
CREATE TYPE "public"."estado_resena" AS ENUM('VISIBLE', 'OCULTA_MODERACION', 'ELIMINADA_AUTOR');--> statement-breakpoint
CREATE TYPE "public"."estado_ticket" AS ENUM('ABIERTO', 'EN_PROCESO', 'CERRADO');--> statement-breakpoint
CREATE TYPE "public"."estado_version_terminos" AS ENUM('BORRADOR', 'VIGENTE', 'ARCHIVADA');--> statement-breakpoint
CREATE TYPE "public"."operacion_auditoria" AS ENUM('ALTA', 'BAJA', 'MODIFICACION');--> statement-breakpoint
CREATE TYPE "public"."origen_transicion" AS ENUM('CLIENTE', 'COCINERO', 'SISTEMA');--> statement-breakpoint
CREATE TYPE "public"."tipo_evento_seguridad" AS ENUM('LOGIN_FALLIDO', 'ACCESO_DENEGADO');--> statement-breakpoint
CREATE TYPE "public"."tipo_mensaje" AS ENUM('TEXTO', 'IMAGEN');--> statement-breakpoint
CREATE TYPE "public"."tipo_notificacion" AS ENUM('PEDIDO_CREADO', 'PEDIDO_ACEPTADO', 'PEDIDO_LISTO', 'PEDIDO_RECHAZADO', 'PEDIDO_COMPLETADO', 'MENSAJE_NUEVO', 'RESENA_RECIBIDA', 'PUBLICACION_ELIMINADA_ADMIN', 'AVISO_SISTEMA');--> statement-breakpoint
CREATE TYPE "public"."tipo_reaccion" AS ENUM('ME_GUSTA', 'NO_ME_GUSTA');--> statement-breakpoint
CREATE TYPE "public"."tipo_usuario" AS ENUM('CLIENTE', 'COCINERO', 'ADMINISTRADOR');--> statement-breakpoint
CREATE TABLE "categoria" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" varchar(80) NOT NULL,
	"descripcion" text,
	"imagen_predeterminada_url" text,
	"activo" boolean DEFAULT true NOT NULL,
	"fecha_creacion" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "configuracion_sistema" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clave" varchar(120) NOT NULL,
	"valor" text NOT NULL,
	"descripcion" text,
	"fecha_ultima_modificacion" timestamp with time zone DEFAULT now() NOT NULL,
	"admin_modificador_id" uuid,
	CONSTRAINT "configuracion_sistema_clave_unique" UNIQUE("clave")
);
--> statement-breakpoint
CREATE TABLE "motivo_cancelacion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" varchar(160) NOT NULL,
	"tipo_usuario_cancelacion_id" uuid NOT NULL,
	"activo" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rol_destino" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" varchar(60) NOT NULL,
	CONSTRAINT "rol_destino_nombre_unique" UNIQUE("nombre")
);
--> statement-breakpoint
CREATE TABLE "tipo_consulta" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre_tipo_consulta" varchar(80) NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	CONSTRAINT "tipo_consulta_nombre_tipo_consulta_unique" UNIQUE("nombre_tipo_consulta")
);
--> statement-breakpoint
CREATE TABLE "tipo_usuario_cancelacion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre_tipo_usuario_cancelacion" varchar(60) NOT NULL,
	CONSTRAINT "tipo_usuario_cancelacion_nombre_tipo_usuario_cancelacion_unique" UNIQUE("nombre_tipo_usuario_cancelacion")
);
--> statement-breakpoint
-- auth.users la administra GoTrue y ya existe en el proyecto de Supabase.
-- drizzle-kit la emite igual porque `schemaFilter` no aplica al comando
-- `generate` (solo a `push` e `introspect`), asi que el CREATE TABLE se borra a
-- mano. El snapshot 0000 si la conserva: las proximas migraciones la ven como
-- existente y no la recrean. La FK de `usuario` apunta a la tabla real.
CREATE TABLE "cocinero" (
	"usuario_id" uuid PRIMARY KEY NOT NULL,
	"descripcion_publica" varchar(500)
);
--> statement-breakpoint
CREATE TABLE "evento_seguridad" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tipo_evento" "tipo_evento_seguridad" NOT NULL,
	"email_intentado" varchar(255),
	"usuario_id" uuid,
	"recurso_solicitado" varchar(255),
	"ip_origen" varchar(45),
	"motivo" text,
	"fecha_hora" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usuario" (
	"id" uuid PRIMARY KEY NOT NULL,
	"nombre" varchar(60) NOT NULL,
	"apellido" varchar(60) NOT NULL,
	"email" varchar(255) NOT NULL,
	"tipo" "tipo_usuario" NOT NULL,
	"foto_perfil_url" text,
	"idioma_preferido" varchar(10) DEFAULT 'es-AR' NOT NULL,
	"ubicacion" geometry(point),
	"estado_cuenta" "estado_cuenta" DEFAULT 'ACTIVA' NOT NULL,
	"motivo_suspension" text,
	"terminos_aceptados" boolean DEFAULT false NOT NULL,
	"fecha_aceptacion_terminos" timestamp with time zone,
	"version_terminos_aceptada_id" uuid,
	"fecha_registro" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "usuario_cocinero_con_ubicacion" CHECK ("usuario"."tipo" <> 'COCINERO' or "usuario"."ubicacion" is not null)
);
--> statement-breakpoint
CREATE TABLE "version_terminos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"numero_version" integer NOT NULL,
	"tipo" varchar(40) NOT NULL,
	"contenido_html" text NOT NULL,
	"fecha_publicacion" timestamp with time zone DEFAULT now() NOT NULL,
	"admin_autor_id" uuid,
	"estado_version_terminos" "estado_version_terminos" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "carrito" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cliente_id" uuid NOT NULL,
	"cocinero_id" uuid NOT NULL,
	"fecha_creacion" timestamp with time zone DEFAULT now() NOT NULL,
	"fecha_ultima_modificacion" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "favorito_cocinero" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cliente_id" uuid NOT NULL,
	"cocinero_id" uuid NOT NULL,
	"fecha_creacion" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "favorito_publicacion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cliente_id" uuid NOT NULL,
	"publicacion_id" uuid NOT NULL,
	"fecha_creacion" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "item_carrito" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"carrito_id" uuid NOT NULL,
	"publicacion_id" uuid NOT NULL,
	"cantidad" integer DEFAULT 1 NOT NULL,
	"precio_unitario_snapshot" numeric(12, 2) NOT NULL,
	"nombre_plato_snapshot" varchar(120) NOT NULL,
	"imagen_snapshot" text,
	CONSTRAINT "item_carrito_cantidad_positiva" CHECK ("item_carrito"."cantidad" > 0)
);
--> statement-breakpoint
CREATE TABLE "publicacion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cocinero_id" uuid NOT NULL,
	"categoria_id" uuid NOT NULL,
	"nombre" varchar(120) NOT NULL,
	"descripcion" varchar(1000),
	"precio" numeric(12, 2) NOT NULL,
	"imagen_url" text,
	"estado_publicacion" "estado_publicacion" DEFAULT 'DISPONIBLE' NOT NULL,
	"tiempo_estimado_preparacion" integer,
	"motivo_eliminacion_admin" text,
	"eliminada_por_admin_id" uuid,
	"activo" boolean DEFAULT true NOT NULL,
	"fecha_creacion" timestamp with time zone DEFAULT now() NOT NULL,
	"fecha_ultima_edicion" timestamp with time zone,
	CONSTRAINT "publicacion_precio_positivo" CHECK ("publicacion"."precio" > 0),
	CONSTRAINT "publicacion_tiempo_preparacion_valido" CHECK ("publicacion"."tiempo_estimado_preparacion" is null or "publicacion"."tiempo_estimado_preparacion" > 0)
);
--> statement-breakpoint
CREATE TABLE "historial_estado_pedido" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pedido_id" uuid NOT NULL,
	"estado_pedido_anterior" "estado_pedido",
	"estado_pedido_actual" "estado_pedido" NOT NULL,
	"origen_transicion" "origen_transicion" NOT NULL,
	"usuario_responsable_id" uuid,
	"motivo" text,
	"fecha_transicion" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "historial_transicion_efectiva" CHECK ("historial_estado_pedido"."estado_pedido_anterior" is null or "historial_estado_pedido"."estado_pedido_anterior" <> "historial_estado_pedido"."estado_pedido_actual")
);
--> statement-breakpoint
CREATE TABLE "item_pedido" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pedido_id" uuid NOT NULL,
	"publicacion_id" uuid NOT NULL,
	"cantidad" integer NOT NULL,
	"precio_unitario_snapshot" numeric(12, 2) NOT NULL,
	"nombre_plato_snapshot" varchar(120) NOT NULL,
	"imagen_snapshot" text,
	CONSTRAINT "item_pedido_cantidad_positiva" CHECK ("item_pedido"."cantidad" > 0),
	CONSTRAINT "item_pedido_precio_positivo" CHECK ("item_pedido"."precio_unitario_snapshot" > 0)
);
--> statement-breakpoint
CREATE TABLE "pedido" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"numero_pedido" varchar(20) NOT NULL,
	"cliente_pedido_id" uuid NOT NULL,
	"cocinero_pedido_id" uuid NOT NULL,
	"estado_pedido_actual" "estado_pedido" DEFAULT 'CREADO' NOT NULL,
	"instrucciones_cliente" varchar(300),
	"tiempo_estimado_preparacion_min" integer,
	"tiempo_final_preparacion_min" integer,
	"origen_rechazo" "origen_transicion",
	"motivo_rechazo" text,
	"usuario_origen_rechazo_id" uuid,
	"motivo_cancelacion_id" uuid,
	"fecha_creacion" timestamp with time zone DEFAULT now() NOT NULL,
	"fecha_ultima_transicion" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pedido_numero_pedido_unique" UNIQUE("numero_pedido"),
	CONSTRAINT "pedido_rechazo_con_motivo" CHECK ("pedido"."estado_pedido_actual" <> 'RECHAZADO' or "pedido"."motivo_cancelacion_id" is not null),
	CONSTRAINT "pedido_partes_distintas" CHECK ("pedido"."cliente_pedido_id" <> "pedido"."cocinero_pedido_id")
);
--> statement-breakpoint
CREATE TABLE "calificacion_cocinero" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pedido_id" uuid NOT NULL,
	"cocinero_evaluador_id" uuid NOT NULL,
	"cliente_evaluado_id" uuid NOT NULL,
	"calificacion" integer NOT NULL,
	"comentario" varchar(1000),
	"tags" text[],
	"fecha_publicacion" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "calificacion_cocinero_pedido_id_unique" UNIQUE("pedido_id"),
	CONSTRAINT "calificacion_cocinero_rango" CHECK ("calificacion_cocinero"."calificacion" between 1 and 5)
);
--> statement-breakpoint
CREATE TABLE "reaccion_resena" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resena_id" uuid NOT NULL,
	"usuario_id" uuid NOT NULL,
	"tipo" "tipo_reaccion" NOT NULL,
	"fecha_reaccion" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reporte_resena" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resena_id" uuid NOT NULL,
	"usuario_reportante_id" uuid NOT NULL,
	"motivos" text[] NOT NULL,
	"detalle_adicional" varchar(500),
	"estado_reporte" "estado_reporte" DEFAULT 'PENDIENTE' NOT NULL,
	"admin_resolutor_id" uuid,
	"fecha_reporte" timestamp with time zone DEFAULT now() NOT NULL,
	"fecha_resolucion" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "resena" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pedido_id" uuid NOT NULL,
	"cliente_res_id" uuid NOT NULL,
	"cocinero_res_id" uuid NOT NULL,
	"calificacion" integer NOT NULL,
	"comentario" varchar(1000),
	"tags" text[],
	"foto_url" text,
	"estado_resena" "estado_resena" DEFAULT 'VISIBLE' NOT NULL,
	"editada" boolean DEFAULT false NOT NULL,
	"fecha_publicacion" timestamp with time zone DEFAULT now() NOT NULL,
	"fecha_ultima_edicion" timestamp with time zone,
	CONSTRAINT "resena_pedido_id_unique" UNIQUE("pedido_id"),
	CONSTRAINT "resena_calificacion_rango" CHECK ("resena"."calificacion" between 1 and 5)
);
--> statement-breakpoint
CREATE TABLE "respuesta_cocinero" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resena_id" uuid NOT NULL,
	"cocinero_id" uuid NOT NULL,
	"contenido" varchar(1000) NOT NULL,
	"editada" boolean DEFAULT false NOT NULL,
	"fecha_publicacion" timestamp with time zone DEFAULT now() NOT NULL,
	"fecha_edicion_limite" timestamp with time zone,
	CONSTRAINT "respuesta_cocinero_resena_id_unique" UNIQUE("resena_id")
);
--> statement-breakpoint
CREATE TABLE "conversacion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario1_id" uuid NOT NULL,
	"usuario2_id" uuid NOT NULL,
	"mensajes_no_leidos_usuario1" integer DEFAULT 0 NOT NULL,
	"mensajes_no_leidos_usuario2" integer DEFAULT 0 NOT NULL,
	"archivada_usuario1" boolean DEFAULT false NOT NULL,
	"archivada_usuario2" boolean DEFAULT false NOT NULL,
	"bloqueada_por_baja" boolean DEFAULT false NOT NULL,
	"fecha_creacion" timestamp with time zone DEFAULT now() NOT NULL,
	"fecha_ultimo_mensaje" timestamp with time zone,
	CONSTRAINT "conversacion_participantes_distintos" CHECK ("conversacion"."usuario1_id" <> "conversacion"."usuario2_id")
);
--> statement-breakpoint
CREATE TABLE "mensaje" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversacion_id" uuid NOT NULL,
	"remitente_id" uuid NOT NULL,
	"tipo" "tipo_mensaje" NOT NULL,
	"estado_mensaje" "estado_mensaje" DEFAULT 'ENVIADO' NOT NULL,
	"contenido" varchar(2000),
	"imagen_url" text,
	"pie_de_imagen" varchar(300),
	"fecha_envio" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mensaje_subtipo_consistente" CHECK (("mensaje"."tipo" = 'TEXTO' and "mensaje"."contenido" is not null and "mensaje"."imagen_url" is null)
       or ("mensaje"."tipo" = 'IMAGEN' and "mensaje"."imagen_url" is not null and "mensaje"."contenido" is null))
);
--> statement-breakpoint
CREATE TABLE "dispositivo_push" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"expo_push_token" text NOT NULL,
	"plataforma" varchar(20) NOT NULL,
	"dispositivo_info" text,
	"activo" boolean DEFAULT true NOT NULL,
	"fecha_registro" timestamp with time zone DEFAULT now() NOT NULL,
	"fecha_ultimo_uso" timestamp with time zone,
	CONSTRAINT "dispositivo_push_expo_push_token_unique" UNIQUE("expo_push_token")
);
--> statement-breakpoint
CREATE TABLE "notificacion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_destino_id" uuid NOT NULL,
	"tipo_notificacion" "tipo_notificacion" NOT NULL,
	"titulo" varchar(120) NOT NULL,
	"cuerpo" varchar(500) NOT NULL,
	"objeto_afectado_id" uuid,
	"leida" boolean DEFAULT false NOT NULL,
	"fecha_creacion" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "preferencia_notificacion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"tipo_notificacion" "tipo_notificacion" NOT NULL,
	"activa" boolean DEFAULT true NOT NULL,
	"modificable" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "adjunto_ticket" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" uuid NOT NULL,
	"archivo_url" text NOT NULL,
	"nombre_archivo" varchar(255) NOT NULL,
	"tipo_mime" varchar(100) NOT NULL,
	"tamano_bytes" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "capitulo_ayuda" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"titulo" varchar(160) NOT NULL,
	"rol_destino_id" uuid NOT NULL,
	"orden" integer DEFAULT 0 NOT NULL,
	"activo" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "faq" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pregunta" varchar(300) NOT NULL,
	"respuesta" text NOT NULL,
	"categoria" varchar(80),
	"rol_destino_id" uuid NOT NULL,
	"votos_util" integer DEFAULT 0 NOT NULL,
	"votos_no_util" integer DEFAULT 0 NOT NULL,
	"activo" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seccion_ayuda" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"capitulo_id" uuid NOT NULL,
	"titulo" varchar(160) NOT NULL,
	"contenido_html" text NOT NULL,
	"rol_destino_id" uuid NOT NULL,
	"orden" integer DEFAULT 0 NOT NULL,
	"habilitado" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ticket_soporte" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"tipo_consulta_id" uuid NOT NULL,
	"asunto" varchar(200) NOT NULL,
	"descripcion" text NOT NULL,
	"estado_ticket" "estado_ticket" DEFAULT 'ABIERTO' NOT NULL,
	"fecha_creacion" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "registro_auditoria" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid,
	"operacion" "operacion_auditoria" NOT NULL,
	"tipo_objeto" varchar(60) NOT NULL,
	"objeto_afectado_id" uuid,
	"ip_origen" varchar(45),
	"datos_adicionales" jsonb,
	"fecha_hora" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "motivo_cancelacion" ADD CONSTRAINT "motivo_cancelacion_tipo_usuario_cancelacion_id_tipo_usuario_cancelacion_id_fk" FOREIGN KEY ("tipo_usuario_cancelacion_id") REFERENCES "public"."tipo_usuario_cancelacion"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cocinero" ADD CONSTRAINT "cocinero_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evento_seguridad" ADD CONSTRAINT "evento_seguridad_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_id_users_id_fk" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "version_terminos" ADD CONSTRAINT "version_terminos_admin_autor_id_usuario_id_fk" FOREIGN KEY ("admin_autor_id") REFERENCES "public"."usuario"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carrito" ADD CONSTRAINT "carrito_cliente_id_usuario_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."usuario"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carrito" ADD CONSTRAINT "carrito_cocinero_id_cocinero_usuario_id_fk" FOREIGN KEY ("cocinero_id") REFERENCES "public"."cocinero"("usuario_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorito_cocinero" ADD CONSTRAINT "favorito_cocinero_cliente_id_usuario_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."usuario"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorito_cocinero" ADD CONSTRAINT "favorito_cocinero_cocinero_id_cocinero_usuario_id_fk" FOREIGN KEY ("cocinero_id") REFERENCES "public"."cocinero"("usuario_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorito_publicacion" ADD CONSTRAINT "favorito_publicacion_cliente_id_usuario_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."usuario"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorito_publicacion" ADD CONSTRAINT "favorito_publicacion_publicacion_id_publicacion_id_fk" FOREIGN KEY ("publicacion_id") REFERENCES "public"."publicacion"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_carrito" ADD CONSTRAINT "item_carrito_carrito_id_carrito_id_fk" FOREIGN KEY ("carrito_id") REFERENCES "public"."carrito"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_carrito" ADD CONSTRAINT "item_carrito_publicacion_id_publicacion_id_fk" FOREIGN KEY ("publicacion_id") REFERENCES "public"."publicacion"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publicacion" ADD CONSTRAINT "publicacion_cocinero_id_cocinero_usuario_id_fk" FOREIGN KEY ("cocinero_id") REFERENCES "public"."cocinero"("usuario_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publicacion" ADD CONSTRAINT "publicacion_categoria_id_categoria_id_fk" FOREIGN KEY ("categoria_id") REFERENCES "public"."categoria"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publicacion" ADD CONSTRAINT "publicacion_eliminada_por_admin_id_usuario_id_fk" FOREIGN KEY ("eliminada_por_admin_id") REFERENCES "public"."usuario"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "historial_estado_pedido" ADD CONSTRAINT "historial_estado_pedido_pedido_id_pedido_id_fk" FOREIGN KEY ("pedido_id") REFERENCES "public"."pedido"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "historial_estado_pedido" ADD CONSTRAINT "historial_estado_pedido_usuario_responsable_id_usuario_id_fk" FOREIGN KEY ("usuario_responsable_id") REFERENCES "public"."usuario"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_pedido" ADD CONSTRAINT "item_pedido_pedido_id_pedido_id_fk" FOREIGN KEY ("pedido_id") REFERENCES "public"."pedido"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_pedido" ADD CONSTRAINT "item_pedido_publicacion_id_publicacion_id_fk" FOREIGN KEY ("publicacion_id") REFERENCES "public"."publicacion"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedido" ADD CONSTRAINT "pedido_cliente_pedido_id_usuario_id_fk" FOREIGN KEY ("cliente_pedido_id") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedido" ADD CONSTRAINT "pedido_cocinero_pedido_id_cocinero_usuario_id_fk" FOREIGN KEY ("cocinero_pedido_id") REFERENCES "public"."cocinero"("usuario_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedido" ADD CONSTRAINT "pedido_usuario_origen_rechazo_id_usuario_id_fk" FOREIGN KEY ("usuario_origen_rechazo_id") REFERENCES "public"."usuario"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedido" ADD CONSTRAINT "pedido_motivo_cancelacion_id_motivo_cancelacion_id_fk" FOREIGN KEY ("motivo_cancelacion_id") REFERENCES "public"."motivo_cancelacion"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calificacion_cocinero" ADD CONSTRAINT "calificacion_cocinero_pedido_id_pedido_id_fk" FOREIGN KEY ("pedido_id") REFERENCES "public"."pedido"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calificacion_cocinero" ADD CONSTRAINT "calificacion_cocinero_cocinero_evaluador_id_cocinero_usuario_id_fk" FOREIGN KEY ("cocinero_evaluador_id") REFERENCES "public"."cocinero"("usuario_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calificacion_cocinero" ADD CONSTRAINT "calificacion_cocinero_cliente_evaluado_id_usuario_id_fk" FOREIGN KEY ("cliente_evaluado_id") REFERENCES "public"."usuario"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reaccion_resena" ADD CONSTRAINT "reaccion_resena_resena_id_resena_id_fk" FOREIGN KEY ("resena_id") REFERENCES "public"."resena"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reaccion_resena" ADD CONSTRAINT "reaccion_resena_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reporte_resena" ADD CONSTRAINT "reporte_resena_resena_id_resena_id_fk" FOREIGN KEY ("resena_id") REFERENCES "public"."resena"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reporte_resena" ADD CONSTRAINT "reporte_resena_usuario_reportante_id_usuario_id_fk" FOREIGN KEY ("usuario_reportante_id") REFERENCES "public"."usuario"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reporte_resena" ADD CONSTRAINT "reporte_resena_admin_resolutor_id_usuario_id_fk" FOREIGN KEY ("admin_resolutor_id") REFERENCES "public"."usuario"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resena" ADD CONSTRAINT "resena_pedido_id_pedido_id_fk" FOREIGN KEY ("pedido_id") REFERENCES "public"."pedido"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resena" ADD CONSTRAINT "resena_cliente_res_id_usuario_id_fk" FOREIGN KEY ("cliente_res_id") REFERENCES "public"."usuario"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resena" ADD CONSTRAINT "resena_cocinero_res_id_cocinero_usuario_id_fk" FOREIGN KEY ("cocinero_res_id") REFERENCES "public"."cocinero"("usuario_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "respuesta_cocinero" ADD CONSTRAINT "respuesta_cocinero_resena_id_resena_id_fk" FOREIGN KEY ("resena_id") REFERENCES "public"."resena"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "respuesta_cocinero" ADD CONSTRAINT "respuesta_cocinero_cocinero_id_cocinero_usuario_id_fk" FOREIGN KEY ("cocinero_id") REFERENCES "public"."cocinero"("usuario_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversacion" ADD CONSTRAINT "conversacion_usuario1_id_usuario_id_fk" FOREIGN KEY ("usuario1_id") REFERENCES "public"."usuario"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversacion" ADD CONSTRAINT "conversacion_usuario2_id_usuario_id_fk" FOREIGN KEY ("usuario2_id") REFERENCES "public"."usuario"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mensaje" ADD CONSTRAINT "mensaje_conversacion_id_conversacion_id_fk" FOREIGN KEY ("conversacion_id") REFERENCES "public"."conversacion"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mensaje" ADD CONSTRAINT "mensaje_remitente_id_usuario_id_fk" FOREIGN KEY ("remitente_id") REFERENCES "public"."usuario"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dispositivo_push" ADD CONSTRAINT "dispositivo_push_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notificacion" ADD CONSTRAINT "notificacion_usuario_destino_id_usuario_id_fk" FOREIGN KEY ("usuario_destino_id") REFERENCES "public"."usuario"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preferencia_notificacion" ADD CONSTRAINT "preferencia_notificacion_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adjunto_ticket" ADD CONSTRAINT "adjunto_ticket_ticket_id_ticket_soporte_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."ticket_soporte"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capitulo_ayuda" ADD CONSTRAINT "capitulo_ayuda_rol_destino_id_rol_destino_id_fk" FOREIGN KEY ("rol_destino_id") REFERENCES "public"."rol_destino"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "faq" ADD CONSTRAINT "faq_rol_destino_id_rol_destino_id_fk" FOREIGN KEY ("rol_destino_id") REFERENCES "public"."rol_destino"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seccion_ayuda" ADD CONSTRAINT "seccion_ayuda_capitulo_id_capitulo_ayuda_id_fk" FOREIGN KEY ("capitulo_id") REFERENCES "public"."capitulo_ayuda"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seccion_ayuda" ADD CONSTRAINT "seccion_ayuda_rol_destino_id_rol_destino_id_fk" FOREIGN KEY ("rol_destino_id") REFERENCES "public"."rol_destino"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_soporte" ADD CONSTRAINT "ticket_soporte_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_soporte" ADD CONSTRAINT "ticket_soporte_tipo_consulta_id_tipo_consulta_id_fk" FOREIGN KEY ("tipo_consulta_id") REFERENCES "public"."tipo_consulta"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registro_auditoria" ADD CONSTRAINT "registro_auditoria_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "categoria_nombre_activo_uq" ON "categoria" USING btree ("nombre") WHERE "categoria"."activo" = true;--> statement-breakpoint
CREATE INDEX "motivo_cancelacion_tipo_idx" ON "motivo_cancelacion" USING btree ("tipo_usuario_cancelacion_id");--> statement-breakpoint
CREATE INDEX "evento_seguridad_fecha_idx" ON "evento_seguridad" USING btree ("fecha_hora" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "evento_seguridad_tipo_idx" ON "evento_seguridad" USING btree ("tipo_evento","fecha_hora" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "evento_seguridad_email_idx" ON "evento_seguridad" USING btree ("email_intentado");--> statement-breakpoint
CREATE INDEX "evento_seguridad_ip_idx" ON "evento_seguridad" USING btree ("ip_origen");--> statement-breakpoint
CREATE INDEX "usuario_email_idx" ON "usuario" USING btree ("email");--> statement-breakpoint
CREATE INDEX "usuario_tipo_idx" ON "usuario" USING btree ("tipo");--> statement-breakpoint
CREATE INDEX "usuario_ubicacion_gix" ON "usuario" USING gist ("ubicacion") WHERE "usuario"."ubicacion" is not null;--> statement-breakpoint
CREATE INDEX "version_terminos_estado_idx" ON "version_terminos" USING btree ("estado_version_terminos");--> statement-breakpoint
CREATE INDEX "version_terminos_numero_idx" ON "version_terminos" USING btree ("tipo","numero_version");--> statement-breakpoint
CREATE UNIQUE INDEX "carrito_cliente_cocinero_uq" ON "carrito" USING btree ("cliente_id","cocinero_id");--> statement-breakpoint
CREATE UNIQUE INDEX "favorito_cocinero_uq" ON "favorito_cocinero" USING btree ("cliente_id","cocinero_id");--> statement-breakpoint
CREATE INDEX "favorito_cocinero_cliente_idx" ON "favorito_cocinero" USING btree ("cliente_id");--> statement-breakpoint
CREATE UNIQUE INDEX "favorito_publicacion_uq" ON "favorito_publicacion" USING btree ("cliente_id","publicacion_id");--> statement-breakpoint
CREATE INDEX "favorito_publicacion_cliente_idx" ON "favorito_publicacion" USING btree ("cliente_id");--> statement-breakpoint
CREATE UNIQUE INDEX "item_carrito_uq" ON "item_carrito" USING btree ("carrito_id","publicacion_id");--> statement-breakpoint
CREATE INDEX "publicacion_cocinero_idx" ON "publicacion" USING btree ("cocinero_id");--> statement-breakpoint
CREATE INDEX "publicacion_categoria_idx" ON "publicacion" USING btree ("categoria_id");--> statement-breakpoint
CREATE INDEX "publicacion_feed_idx" ON "publicacion" USING btree ("fecha_creacion" DESC NULLS LAST) WHERE "publicacion"."activo" = true;--> statement-breakpoint
CREATE INDEX "historial_pedido_idx" ON "historial_estado_pedido" USING btree ("pedido_id","fecha_transicion");--> statement-breakpoint
CREATE INDEX "item_pedido_pedido_idx" ON "item_pedido" USING btree ("pedido_id");--> statement-breakpoint
CREATE INDEX "pedido_cliente_idx" ON "pedido" USING btree ("cliente_pedido_id","estado_pedido_actual","fecha_creacion" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "pedido_cocinero_idx" ON "pedido" USING btree ("cocinero_pedido_id","estado_pedido_actual","fecha_creacion" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "pedido_expiracion_idx" ON "pedido" USING btree ("fecha_creacion") WHERE "pedido"."estado_pedido_actual" = 'CREADO';--> statement-breakpoint
CREATE INDEX "calificacion_cliente_idx" ON "calificacion_cocinero" USING btree ("cliente_evaluado_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reaccion_resena_uq" ON "reaccion_resena" USING btree ("resena_id","usuario_id");--> statement-breakpoint
CREATE INDEX "reaccion_resena_resena_idx" ON "reaccion_resena" USING btree ("resena_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reporte_resena_uq" ON "reporte_resena" USING btree ("resena_id","usuario_reportante_id");--> statement-breakpoint
CREATE INDEX "reporte_resena_pendientes_idx" ON "reporte_resena" USING btree ("fecha_reporte") WHERE "reporte_resena"."estado_reporte" = 'PENDIENTE';--> statement-breakpoint
CREATE INDEX "resena_cocinero_idx" ON "resena" USING btree ("cocinero_res_id","fecha_publicacion" DESC NULLS LAST) WHERE "resena"."estado_resena" = 'VISIBLE';--> statement-breakpoint
CREATE INDEX "resena_cliente_idx" ON "resena" USING btree ("cliente_res_id");--> statement-breakpoint
CREATE INDEX "respuesta_cocinero_idx" ON "respuesta_cocinero" USING btree ("cocinero_id");--> statement-breakpoint
CREATE UNIQUE INDEX "conversacion_par_uq" ON "conversacion" USING btree (least("usuario1_id", "usuario2_id"),greatest("usuario1_id", "usuario2_id"));--> statement-breakpoint
CREATE INDEX "conversacion_usuario1_idx" ON "conversacion" USING btree ("usuario1_id","fecha_ultimo_mensaje" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "conversacion_usuario2_idx" ON "conversacion" USING btree ("usuario2_id","fecha_ultimo_mensaje" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "mensaje_conversacion_idx" ON "mensaje" USING btree ("conversacion_id","fecha_envio" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "dispositivo_push_usuario_idx" ON "dispositivo_push" USING btree ("usuario_id") WHERE "dispositivo_push"."activo" = true;--> statement-breakpoint
CREATE INDEX "notificacion_usuario_idx" ON "notificacion" USING btree ("usuario_destino_id","fecha_creacion" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "notificacion_no_leidas_idx" ON "notificacion" USING btree ("usuario_destino_id") WHERE "notificacion"."leida" = false;--> statement-breakpoint
CREATE UNIQUE INDEX "preferencia_notificacion_uq" ON "preferencia_notificacion" USING btree ("usuario_id","tipo_notificacion");--> statement-breakpoint
CREATE INDEX "adjunto_ticket_idx" ON "adjunto_ticket" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "capitulo_ayuda_rol_idx" ON "capitulo_ayuda" USING btree ("rol_destino_id","orden");--> statement-breakpoint
CREATE INDEX "faq_rol_idx" ON "faq" USING btree ("rol_destino_id");--> statement-breakpoint
CREATE INDEX "seccion_ayuda_capitulo_idx" ON "seccion_ayuda" USING btree ("capitulo_id","orden");--> statement-breakpoint
CREATE INDEX "ticket_soporte_usuario_idx" ON "ticket_soporte" USING btree ("usuario_id");--> statement-breakpoint
CREATE INDEX "ticket_soporte_estado_idx" ON "ticket_soporte" USING btree ("estado_ticket","fecha_creacion" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "registro_auditoria_fecha_idx" ON "registro_auditoria" USING btree ("fecha_hora" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "registro_auditoria_usuario_idx" ON "registro_auditoria" USING btree ("usuario_id","fecha_hora" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "registro_auditoria_operacion_idx" ON "registro_auditoria" USING btree ("operacion","fecha_hora" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "registro_auditoria_objeto_idx" ON "registro_auditoria" USING btree ("tipo_objeto","objeto_afectado_id");