import { Stack } from 'expo-router';

/**
 * Pila de autenticación — PAN-AUT-00 a PAN-AUT-04.1.
 *
 * No lleva barra de tabs: quien está acá todavía no tiene rol, y una barra de
 * navegación que ofrece secciones a las que no puede entrar es ruido.
 *
 * Cada pantalla dibuja su propio encabezado con `EncabezadoPantalla`, que es el
 * de la maquetación (flecha de volver a la izquierda, título al lado). Por eso
 * el header nativo va apagado: dos encabezados apilados dejarían el título
 * repetido y comerían un tercio de la pantalla en un teléfono chico.
 */
export default function LayoutAutenticacion() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        // Deslizamiento lateral: es la transición que el usuario espera al
        // avanzar y retroceder dentro de un mismo flujo.
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="bienvenida" />
      <Stack.Screen name="registro-cliente" />
      <Stack.Screen name="registro-cocinero" />
      <Stack.Screen name="login" />
      <Stack.Screen name="recuperar" />
      {/* Se abre desde el enlace "términos y condiciones" del registro, por
          eso se anima como el resto del flujo de autenticación. */}
      <Stack.Screen name="terminos" />
      {/* Se abre por deep link desde el correo, nunca desde otra pantalla: no
          tiene sentido animarla como si viniera de la anterior. */}
      <Stack.Screen name="nueva-password" options={{ animation: 'fade' }} />
    </Stack>
  );
}
