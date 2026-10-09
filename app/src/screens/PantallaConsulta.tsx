/** Pantalla única de la primera prueba: consulta manual a la API. */
import { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import IndicadorCarga from '../components/IndicadorCarga';
import PanelJson from '../components/PanelJson';
import TarjetaInfoApi from '../components/TarjetaInfoApi';
import { API_BASE_URL } from '../config/api';
import { comprobarBackend, ejecutarConsulta } from '../services/consultaService';
import type { EstadoBackend, EstadoConsulta, RespuestaExito } from '../types/consulta';

const CONSULTA_DEFECTO = 'SELECT * LIMIT 20';

export default function PantallaConsulta() {
  const [query, setQuery] = useState(CONSULTA_DEFECTO);
  const [estado, setEstado] = useState<EstadoConsulta>('inicial');
  const [resultado, setResultado] = useState<RespuestaExito | null>(null);
  const [mensajeError, setMensajeError] = useState<string | null>(null);
  const [detalleError, setDetalleError] = useState<string | null>(null);
  const [backend, setBackend] = useState<EstadoBackend>({
    conectado: false,
    mensaje: 'Comprobando conexión con el backend…',
  });

  const comprobar = useCallback(async () => {
    setBackend({ conectado: false, mensaje: 'Comprobando conexión con el backend…' });
    setBackend(await comprobarBackend());
  }, []);

  useEffect(() => {
    comprobar();
  }, [comprobar]);

  const consultar = useCallback(async () => {
    setEstado('cargando');
    setResultado(null);
    setMensajeError(null);
    setDetalleError(null);

    const respuesta = await ejecutarConsulta(query.trim() || CONSULTA_DEFECTO);
    if (respuesta.estado === 'exito') {
      setResultado(respuesta);
      setEstado('exito');
    } else {
      setMensajeError(respuesta.mensaje);
      setDetalleError(respuesta.detalle ?? null);
      setEstado('error');
    }
  }, [query]);

  const hayErrorBackend = !backend.conectado;

  return (
    <SafeAreaView style={styles.seguro}>
      <ScrollView contentContainerStyle={styles.contenido}>
        <Text style={styles.titulo}>Prueba 1: conexión con datos.gov.co</Text>
        <Text style={styles.subtitulo}>
          Consulta manual al Registro de Prestadores de Servicios de Salud (REPS). Escribe o
          acepta la consulta SoQL y pulsa el botón para ver la respuesta real de la API en JSON.
        </Text>

        <View style={[styles.badge, backend.conectado ? styles.badgeOk : styles.badgeError]}>
          <Text style={styles.badgeTexto}>
            {backend.conectado ? '● ' : '○ '}
            {backend.conectado ? 'Backend conectado' : 'Backend desconectado'}
          </Text>
          <Pressable onPress={comprobar} style={styles.badgeBoton}>
            <Text style={styles.badgeBotonTexto}>Recomprobar</Text>
          </Pressable>
        </View>
        {!backend.conectado && <Text style={styles.avisoBackend}>{backend.mensaje}</Text>}

        <TarjetaInfoApi urlBackend={API_BASE_URL} />

        <View style={styles.tarjeta}>
          <Text style={styles.etiquetaCampo}>Consulta SoQL</Text>
          <TextInput
            style={styles.entrada}
            value={query}
            onChangeText={setQuery}
            multiline
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Ejemplo: SELECT * LIMIT 20"
            placeholderTextColor="#94a3b8"
            textAlignVertical="top"
          />
          <Pressable
            style={[styles.boton, (estado === 'cargando' || hayErrorBackend) && styles.botonDesactivado]}
            onPress={consultar}
            disabled={estado === 'cargando' || hayErrorBackend}
          >
            <Text style={styles.botonTexto}>
              {estado === 'cargando' ? 'Consultando…' : 'Ejecutar consulta'}
            </Text>
          </Pressable>
        </View>

        {estado === 'cargando' && <IndicadorCarga texto="Consultando la API de datos.gov.co…" />}

        {estado === 'error' && (
          <View style={styles.tarjetaError}>
            <Text style={styles.errorTitulo}>Error en la consulta</Text>
            <Text style={styles.errorMensaje}>{mensajeError}</Text>
            {detalleError && (
              <Text style={styles.errorDetalle} selectable>
                {detalleError}
              </Text>
            )}
          </View>
        )}

        {estado === 'exito' && resultado && (
          <View style={styles.tarjeta}>
            <Text style={styles.tituloResultado}>Respuesta de la API</Text>
            <View style={styles.estadisticas}>
              <Text style={styles.estadistica}>Filas: {resultado.filas}</Text>
              <Text style={styles.estadistica}>Tiempo: {resultado.tiempo_ms} ms</Text>
              {resultado.truncada && <Text style={styles.estadisticaAviso}>Respuesta truncada</Text>}
            </View>
            <PanelJson datos={resultado.datos} />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  seguro: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  contenido: {
    padding: 16,
    paddingBottom: 40,
    gap: 4,
  },
  titulo: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6,
  },
  subtitulo: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 14,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 6,
  },
  badgeOk: {
    backgroundColor: '#dcfce7',
  },
  badgeError: {
    backgroundColor: '#fee2e2',
  },
  badgeTexto: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  badgeBoton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeBotonTexto: {
    fontSize: 13,
    color: '#1d4ed8',
    fontWeight: '600',
  },
  avisoBackend: {
    fontSize: 13,
    color: '#b91c1c',
    marginBottom: 10,
    lineHeight: 18,
  },
  tarjeta: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  etiquetaCampo: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  entrada: {
    minHeight: 64,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    fontFamily: 'monospace',
    color: '#0f172a',
    backgroundColor: '#f8fafc',
    marginBottom: 12,
  },
  boton: {
    backgroundColor: '#1d4ed8',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  botonDesactivado: {
    backgroundColor: '#94a3b8',
  },
  botonTexto: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  tarjetaError: {
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorTitulo: {
    fontSize: 15,
    fontWeight: '700',
    color: '#b91c1c',
    marginBottom: 6,
  },
  errorMensaje: {
    fontSize: 14,
    color: '#7f1d1d',
    lineHeight: 20,
    marginBottom: 6,
  },
  errorDetalle: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#991b1b',
  },
  tituloResultado: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  estadisticas: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 10,
  },
  estadistica: {
    fontSize: 13,
    fontWeight: '600',
    color: '#166534',
  },
  estadisticaAviso: {
    fontSize: 13,
    fontWeight: '600',
    color: '#b45309',
  },
});
