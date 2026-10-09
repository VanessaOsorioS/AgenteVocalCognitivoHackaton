/** Indicador de carga con texto descriptivo. */
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

interface Props {
  texto: string;
}

export default function IndicadorCarga({ texto }: Props) {
  return (
    <View style={styles.contenedor}>
      <ActivityIndicator size="large" color="#1d4ed8" />
      <Text style={styles.texto}>{texto}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 12,
  },
  texto: {
    fontSize: 14,
    color: '#475569',
  },
});
