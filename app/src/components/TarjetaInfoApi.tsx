/** Tarjeta que muestra la información técnica identificada de la API. */
import { StyleSheet, Text, View } from 'react-native';

interface Props {
  urlBackend: string;
}

const LINEAS = (urlBackend: string) => [
  { etiqueta: 'API externa', valor: 'https://www.datos.gov.co/api/v3/views/s2ru-bqt6/query.json' },
  { etiqueta: 'Método HTTP', valor: 'POST' },
  { etiqueta: 'Header', valor: 'Content-Type: application/json' },
  { etiqueta: 'Cuerpo', valor: '{"query": "<consulta SoQL>"}' },
  { etiqueta: 'Backend intermedio', valor: `${urlBackend}/api/consulta` },
  { etiqueta: 'Dataset', valor: 'REPS — Prestadores de servicios de salud (41.427 filas)' },
];

export default function TarjetaInfoApi({ urlBackend }: Props) {
  return (
    <View style={styles.tarjeta}>
      <Text style={styles.titulo}>Información de la API</Text>
      {LINEAS(urlBackend).map((linea) => (
        <View key={linea.etiqueta} style={styles.fila}>
          <Text style={styles.etiqueta}>{linea.etiqueta}</Text>
          <Text style={styles.valor} selectable>
            {linea.valor}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  tarjeta: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  titulo: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 10,
  },
  fila: {
    marginBottom: 8,
  },
  etiqueta: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  valor: {
    fontSize: 13,
    color: '#1e293b',
    fontFamily: 'monospace',
    marginTop: 2,
  },
});
