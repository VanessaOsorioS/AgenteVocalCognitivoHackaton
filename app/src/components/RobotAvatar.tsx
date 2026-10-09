/** Avatar ilustrado del robot con pulso sutil (sin dependencias externas). */
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

export default function RobotAvatar() {
  const pulso = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animacion = Animated.loop(
      Animated.sequence([
        Animated.timing(pulso, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulso, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    animacion.start();
    return () => animacion.stop();
  }, [pulso]);

  const escalaHalo = pulso.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] });
  const opacidadHalo = pulso.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.08] });

  return (
    <View style={styles.contenedor}>
      <Animated.View
        style={[styles.halo, { transform: [{ scale: escalaHalo }], opacity: opacidadHalo }]}
      />
      <View style={styles.circulo}>
        <Text style={styles.emoji} accessibilityElementsHidden>
          🤖
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    width: 128,
    height: 128,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  halo: {
    position: 'absolute',
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: '#1d4ed8',
  },
  circulo: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: '#e0e7ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#c7d2fe',
  },
  emoji: {
    fontSize: 56,
  },
});
