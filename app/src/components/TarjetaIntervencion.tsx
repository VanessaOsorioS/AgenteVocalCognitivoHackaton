/** Tarjeta de una intervención de la transcripción (hablante + hora + texto). */
import { StyleSheet, Text, View } from 'react-native';
import type { Intervencion } from '../types/agente';

interface Props {
  intervencion: Intervencion;
}

const ES_USUARIO = (hablante: Intervencion['hablante']) => hablante === 'usuario';

export default function TarjetaIntervencion({ intervencion }: Props) {
  const esUsuario = ES_USUARIO(intervencion.hablante);
  const nombre = esUsuario ? 'Usuario' : 'Asistente';

  return (
    <View style={[styles.tarjeta, esUsuario ? styles.tarjetaUsuario : styles.tarjetaAsistente]}>
      <View style={styles.encabezado}>
        <View
          style={[styles.inicial, esUsuario ? styles.inicialUsuario : styles.inicialAsistente]}
        >
          <Text style={styles.textoInicial}>{esUsuario ? 'U' : 'A'}</Text>
        </View>
        <Text style={styles.nombre}>{nombre}</Text>
        {intervencion.timestamp ? (
          <Text style={styles.hora}>{intervencion.timestamp}</Text>
        ) : null}
      </View>
      <Text style={styles.texto}>{intervencion.texto}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tarjeta: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
  },
  tarjetaUsuario: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  tarjetaAsistente: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  encabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  inicial: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inicialUsuario: {
    backgroundColor: '#3b82f6',
  },
  inicialAsistente: {
    backgroundColor: '#22c55e',
  },
  textoInicial: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  nombre: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    flexShrink: 1,
  },
  hora: {
    fontSize: 12,
    color: '#64748b',
    marginLeft: 'auto',
  },
  texto: {
    fontSize: 14,
    color: '#1e293b',
    lineHeight: 20,
  },
});
