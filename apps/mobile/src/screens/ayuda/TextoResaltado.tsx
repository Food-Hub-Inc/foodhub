import { Text } from 'react-native';

/** Resalta coincidencias sin convertir el contenido de FAQ en HTML. */
export function TextoResaltado({
  texto,
  consulta,
  className,
}: {
  texto: string;
  consulta: string;
  className: string;
}) {
  const termino = consulta.trim();
  if (!termino) return <Text className={className}>{texto}</Text>;

  const segmentos: { texto: string; coincide: boolean }[] = [];
  const textoNormalizado = texto.toLocaleLowerCase('es-AR');
  const terminoNormalizado = termino.toLocaleLowerCase('es-AR');
  let cursor = 0;

  while (cursor < texto.length) {
    const inicio = textoNormalizado.indexOf(terminoNormalizado, cursor);
    if (inicio === -1) {
      segmentos.push({ texto: texto.slice(cursor), coincide: false });
      break;
    }
    if (inicio > cursor) {
      segmentos.push({ texto: texto.slice(cursor, inicio), coincide: false });
    }
    segmentos.push({
      texto: texto.slice(inicio, inicio + termino.length),
      coincide: true,
    });
    cursor = inicio + termino.length;
  }

  return (
    <Text className={className}>
      {segmentos.map((segmento, indice) => (
        <Text
          className={
            segmento.coincide
              ? 'bg-primary/15 font-semibold text-primary'
              : undefined
          }
          key={`${segmento.texto}-${String(indice)}`}
        >
          {segmento.texto}
        </Text>
      ))}
    </Text>
  );
}
