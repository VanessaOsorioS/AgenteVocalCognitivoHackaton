/** Indicador visual del estado "Escuchando..." con anillos pulsantes. */
import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';

interface Props {
  /** Se invoca al pulsar "Detener" para volver al estado inicial. */
  onDetener: () => void;
  /** Texto de estado; por defecto "Escuchando...". */
  texto?: string;
}

export default function EstadoEscuchando({ onDetener, texto = 'Escuchando...' }: Props) {
  const pulso = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animacion = Animated.loop(
      Animated.sequence([
        Animated.timing(pulso, {
          toValue: 1,
          duration: 900,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulso, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );
    animacion.start();
    return () => animacion.stop();
  }, [pulso]);

  const escalaAnillo = pulso.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.5] });
  const opacidadAnillo = pulso.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });

  return (
    <View style={styles.contenedor} accessibilityRole="text" accessibilityLabel="Estado: escuchando">
      <View style={styles.zonaAnillo}>
        <Animated.View
          style={[styles.anillo, { transform: [{ scale: escalaAnillo }], opacity: opacidadAnillo }]}
        />
        <View style={styles.puntoCentral} />
      </View>
      <Text style={styles.texto}>{texto}</Text>
      <Pressable
        onPress={onDetener}
        style={styles.botonDetener}
        accessibilityRole="button"
        accessibilityLabel="Detener y volver al estado inicial"
        hitSlop={8}
      >
        <Text style={styles.textoDetener}>Detener</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 10,
    backgroundColor: '#ecfdf5',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  zonaAnillo: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  anillo: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#22c55e',
  },
  puntoCentral: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#16a34a',
  },
  texto: {
    fontSize: 20,
    fontWeight: '800',
    color: '#14532d',
  },
  botonDetener: {
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  textoDetener: {
    fontSize: 14,
    fontWeight: '600',
    color: '#15803d',
    textDecorationLine: 'underline',
  },
});
