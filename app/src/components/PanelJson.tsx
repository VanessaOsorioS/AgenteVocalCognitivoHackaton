/** Panel con el resultado JSON formateado (scroll horizontal y vertical). */
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { FilaDatos } from '../types/consulta';

interface Props {
  datos: FilaDatos[];
}

export default function PanelJson({ datos }: Props) {
  const json = JSON.stringify(datos, null, 2);
  return (
    <View style={styles.contenedor}>
      <ScrollView horizontal showsHorizontalScrollIndicator>
        <ScrollView showsVerticalScrollIndicator={false} nestedScrollEnabled>
          <Text style={styles.codigo} selectable>
            {json}
          </Text>
        </ScrollView>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    maxHeight: 380,
    minHeight: 160,
    padding: 12,
  },
  codigo: {
    color: '#e2e8f0',
    fontFamily: 'monospace',
    fontSize: 12,
    lineHeight: 18,
  },
});
