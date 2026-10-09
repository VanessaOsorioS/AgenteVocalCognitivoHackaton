import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import PantallaAgente from './src/screens/PantallaAgente';
import PantallaConsulta from './src/screens/PantallaConsulta';

type Vista = 'agente' | 'consulta';

export default function App() {
  const [vista, setVista] = useState<Vista>('agente');

  if (vista === 'consulta') {
    return (
      <View style={styles.contenedor}>
        <View style={styles.barraVolver}>
          <Pressable
            onPress={() => setVista('agente')}
            style={styles.botonVolver}
            accessibilityRole="button"
            accessibilityLabel="Volver a la pantalla del agente"
            hitSlop={8}
          >
            <Text style={styles.textoVolver}>← Volver al agente</Text>
          </Pressable>
        </View>
        <View style={styles.pantalla}>
          <PantallaConsulta />
        </View>
        <StatusBar style="dark" />
      </View>
    );
  }

  return (
    <>
      <PantallaAgente onAbrirPrueba1={() => setVista('consulta')} />
      <StatusBar style="dark" />
    </>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  barraVolver: {
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  botonVolver: {
    alignSelf: 'flex-start',
    padding: 6,
  },
  textoVolver: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1d4ed8',
  },
  pantalla: {
    flex: 1,
  },
});
