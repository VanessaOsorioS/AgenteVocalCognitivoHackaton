/** Sección "Transcripción de la conversación" con estado vacío. */
import { StyleSheet, Text, View } from 'react-native';
import TarjetaIntervencion from './TarjetaIntervencion';
import type { Intervencion } from '../types/agente';

interface Props {
  intervenciones: Intervencion[];
}

export default function PanelTranscripcion({ intervenciones }: Props) {
  return (
    <View style={styles.panel}>
      <Text style={styles.titulo}>Transcripción de la conversación</Text>
      {intervenciones.length === 0 ? (
        <View style={styles.vacio}>
          <Text style={styles.textoVacio}>
            La transcripción aparecerá aquí cuando se habilite la conversación por voz.
          </Text>
        </View>
      ) : (
        intervenciones.map((intervencion) => (
          <TarjetaIntervencion key={intervencion.id} intervencion={intervencion} />
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  titulo: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  vacio: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingVertical: 28,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  textoVacio: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },
});
