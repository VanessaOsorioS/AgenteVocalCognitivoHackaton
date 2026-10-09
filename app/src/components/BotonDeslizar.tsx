/** Botón deslizable estilo llamada de voz: "Iniciar llamada" (solo visual). */
import { useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, StyleSheet, Text, View } from 'react-native';

const ALTURA = 68;
const MARGEN = 6;
const TAMANIO_THUMB = ALTURA - MARGEN * 2;
const UMBRASEL_DESLIZ = 0.8;

interface Props {
  /** Se invoca al completar el deslizamiento hasta el final. */
  onDeslizarCompleto: () => void;
  /** Ancho disponible del botón; si no se pasa se mide con onLayout. */
  ancho?: number;
}

export default function BotonDeslizar({ onDeslizarCompleto, ancho }: Props) {
  const traslacion = useRef(new Animated.Value(0)).current;
  const startX = useRef(0);
  const [anchoPista, setAnchoPista] = useState(ancho ?? 0);

  const maxDesplazamiento = Math.max(0, anchoPista - TAMANIO_THUMB - MARGEN * 2);

  const animarA = (destino: number, alFinal?: () => void) => {
    Animated.spring(traslacion, {
      toValue: destino,
      friction: 8,
      tension: 80,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) alFinal?.();
    });
  };

  const responde = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_evento, gesto) =>
          maxDesplazamiento > 0 && Math.abs(gesto.dx) > 4,
        onPanResponderGrant: () => {
          startX.current = 0;
        },
        onPanResponderMove: (_evento, gesto) => {
          const x = Math.max(0, Math.min(maxDesplazamiento, startX.current + gesto.dx));
          traslacion.setValue(x);
        },
        onPanResponderRelease: (_evento, gesto) => {
          const x = Math.max(0, Math.min(maxDesplazamiento, startX.current + gesto.dx));
          if (maxDesplazamiento > 0 && x >= maxDesplazamiento * UMBRASEL_DESLIZ && gesto.dx > 0) {
            animarA(maxDesplazamiento, onDeslizarCompleto);
          } else {
            animarA(0);
          }
        },
        onPanResponderTerminate: () => animarA(0),
      }),
    [maxDesplazamiento, traslacion, onDeslizarCompleto],
  );

  const flechaOpacidad = traslacion.interpolate({
    inputRange: [0, maxDesplazamiento || 1],
    outputRange: [1, 0.2],
    extrapolate: 'clamp',
  });

  return (
    <View
      style={[styles.pista, ancho ? { width: ancho } : undefined]}
      onLayout={(evento) => {
        if (!ancho) setAnchoPista(evento.nativeEvent.layout.width);
      }}
    >
      <Text style={styles.textoPista} numberOfLines={1}>
        Iniciar llamada
      </Text>
      <Animated.View
        {...responde.panHandlers}
        style={[
          styles.thumb,
          { transform: [{ translateX: traslacion }] },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Iniciar llamada. Desliza hacia la derecha para cambiar al estado escuchando."
      >
        <Animated.Text style={[styles.flecha, { opacity: flechaOpacidad }]}>→</Animated.Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  pista: {
    height: ALTURA,
    borderRadius: ALTURA / 2,
    backgroundColor: '#22c55e',
    justifyContent: 'center',
    paddingHorizontal: ALTURA,
    overflow: 'hidden',
  },
  textoPista: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  thumb: {
    position: 'absolute',
    left: MARGEN,
    width: TAMANIO_THUMB,
    height: TAMANIO_THUMB,
    borderRadius: TAMANIO_THUMB / 2,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000000',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  flecha: {
    fontSize: 26,
    fontWeight: '800',
    color: '#15803d',
  },
});
