import { useState } from 'react';
import { Text, View } from 'react-native';
import {
  editarPerfilSchema,
  MENSAJES_USUARIO,
  type EditarPerfilInput,
  type PerfilUsuario,
} from '@foodhub/shared';
import { AreaTexto } from '../../components/ui/AreaTexto';
import { Aviso } from '../../components/ui/Aviso';
import { Boton } from '../../components/ui/Boton';
import { CampoTexto } from '../../components/ui/CampoTexto';
import { useEditarPerfil } from '../../hooks/usePerfil';
import {
  useFormulario,
  type Formulario as FormularioDe,
} from '../../hooks/useFormulario';
import { mensajeDeError } from '../../lib/api';
import { TEXTOS_PERFIL } from '../../lib/textos';

/**
 * «Información del perfil» de PAN-GURP-01 — US-GURP-02.
 *
 * Solo los campos que RF088 declara editables: nombre, apellido y, para el
 * cocinero, su descripción pública. El correo no está: es la identidad de la
 * cuenta en Supabase Auth y cambiarlo exigiría un flujo de verificación que la
 * documentación no define.
 *
 * El botón queda inactivo mientras no haya cambios reales. Un «Guardar» que
 * dispara un PATCH idéntico al estado actual gasta una request y ensucia la
 * auditoría con una modificación que no modificó nada.
 */
export function FormularioDePerfil({ perfil }: { perfil: PerfilUsuario }) {
  const [exito, setExito] = useState(false);
  const guardado = useEditarPerfil();
  const esCocinero = perfil.tipo === 'COCINERO';

  const formulario = useFormulario(editarPerfilSchema, {
    nombre: perfil.nombre,
    apellido: perfil.apellido,
    descripcionPublica: perfil.descripcionPublica ?? '',
  });

  const cambios = calcularCambios(formulario.valores, perfil, esCocinero);
  const hayCambios = Object.keys(cambios).length > 0;

  function guardar() {
    formulario.revelarErrores();
    if (!formulario.esValido || !hayCambios) return;

    setExito(false);
    guardado.mutate(cambios, {
      onSuccess: () => {
        setExito(true);
      },
    });
  }

  return (
    <View className="mt-4 rounded-md border border-border bg-surface p-5">
      <Text className="mb-4 text-h3 font-bold text-text-primary">
        {TEXTOS_PERFIL.informacion}
      </Text>

      {exito ? (
        <Aviso
          className="mb-4"
          mensaje={MENSAJES_USUARIO.perfilActualizado}
          tono="exito"
        />
      ) : null}
      {guardado.error ? (
        <Aviso
          className="mb-4"
          mensaje={mensajeDeError(guardado.error)}
          tono="error"
        />
      ) : null}

      <CamposEditables
        esCocinero={esCocinero}
        formulario={formulario}
        onEscribir={() => {
          setExito(false);
        }}
      />

      <Boton
        cargando={guardado.isPending}
        className="mt-5"
        deshabilitado={!hayCambios}
        onPress={guardar}
        textoCargando={TEXTOS_PERFIL.guardando}
      >
        {TEXTOS_PERFIL.guardar}
      </Boton>
    </View>
  );
}

interface ValoresDePerfil {
  nombre: string;
  apellido: string;
  descripcionPublica: string;
}

/**
 * Los campos que RF088 declara editables.
 *
 * La descripción pública solo se dibuja para el cocinero: es el único rol que
 * tiene fila en `cocinero` y, por lo tanto, el único que tiene dónde guardarla.
 *
 * `onEscribir` limpia el cartel de guardado exitoso apenas se vuelve a tocar
 * algo: dejarlo puesto mientras hay cambios sin guardar diría algo que ya no es
 * cierto.
 */
function CamposEditables({
  formulario,
  esCocinero,
  onEscribir,
}: {
  formulario: FormularioDe<ValoresDePerfil, EditarPerfilInput>;
  esCocinero: boolean;
  onEscribir: () => void;
}) {
  return (
    <>
      <CampoTexto
        error={formulario.mensajeDe('nombre')}
        etiqueta={TEXTOS_PERFIL.nombre}
        mayusculas="words"
        nombre="nombre"
        obligatorio
        onChange={(valor) => {
          onEscribir();
          formulario.fijar('nombre', valor);
        }}
        valor={formulario.valores.nombre}
      />

      <CampoTexto
        className="mt-4"
        error={formulario.mensajeDe('apellido')}
        etiqueta={TEXTOS_PERFIL.apellido}
        mayusculas="words"
        nombre="apellido"
        obligatorio
        onChange={(valor) => {
          onEscribir();
          formulario.fijar('apellido', valor);
        }}
        valor={formulario.valores.apellido}
      />

      {esCocinero ? (
        <AreaTexto
          className="mt-4"
          error={formulario.mensajeDe('descripcionPublica')}
          etiqueta={TEXTOS_PERFIL.descripcionPublica}
          maximo={500}
          nombre="descripcionPublica"
          onChange={(valor) => {
            onEscribir();
            formulario.fijar('descripcionPublica', valor);
          }}
          valor={formulario.valores.descripcionPublica}
        />
      ) : null}
    </>
  );
}

/**
 * Arma el cuerpo del PATCH con lo que efectivamente cambió.
 *
 * `editarPerfilSchema` admite edición parcial, así que mandar solo los campos
 * tocados es lo que espera el contrato. La descripción se incluye únicamente
 * para el cocinero: para un cliente el servidor la rechaza con 403, porque no
 * tiene fila en `cocinero` donde guardarla.
 */
function calcularCambios(
  valores: { nombre: string; apellido: string; descripcionPublica: string },
  perfil: PerfilUsuario,
  esCocinero: boolean,
): { nombre?: string; apellido?: string; descripcionPublica?: string } {
  const cambios: {
    nombre?: string;
    apellido?: string;
    descripcionPublica?: string;
  } = {};

  if (valores.nombre.trim() !== perfil.nombre) {
    cambios.nombre = valores.nombre.trim();
  }
  if (valores.apellido.trim() !== perfil.apellido) {
    cambios.apellido = valores.apellido.trim();
  }
  if (
    esCocinero &&
    valores.descripcionPublica.trim() !== (perfil.descripcionPublica ?? '')
  ) {
    cambios.descripcionPublica = valores.descripcionPublica.trim();
  }

  return cambios;
}
