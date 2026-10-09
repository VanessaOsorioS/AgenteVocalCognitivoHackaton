/** Pantalla principal del agente conversacional: voz en vivo (STT) + respuesta hablada (TTS) con interrupciones. */
import { useEffect, useRef, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import BotonDeslizar from '../components/BotonDeslizar';
import EstadoEscuchando from '../components/EstadoEscuchando';
import PanelTranscripcion from '../components/PanelTranscripcion';
import RobotAvatar from '../components/RobotAvatar';
import { ENDPOINT_CONVERSACION_STREAM } from '../config/api';
import { iniciarCaptura, type CapturaMicrofono } from '../services/audioWeb';
import { crearReproductorTts, dividirEnOraciones, type ReproductorTts } from '../services/colasTts';
import { abrirSocketStt, type SocketStt } from '../services/sttSocket';
import type { EstadoLlamada, EventoConversacion, EventoStt, Intervencion } from '../types/agente';

const ANCHO_MAXIMO = 640;
/** Palabras mínimas en un parcial para considerar que el usuario está interrumpiendo. */
const PALABRAS_PARA_INTERRUMPIR = 2;

const TEXTO_ESTADO: Partial<Record<EstadoLlamada, string>> = {
  escuchando: 'Escuchando...',
  pensando: 'Consultando los datos...',
  hablando: 'El asistente responde...',
};

const SALUDO_INICIAL =
  'Hola, soy tu asistente para consultar el Registro Especial de Prestadores de Servicios de Salud de Colombia. ' +
  'Puedo responderte sobre departamentos, municipios, nombres y sedes de prestadores, y su capacidad instalada. ' +
  'No puedo dar diagnósticos médicos ni consultar datos personales. ¿Qué te gustaría saber?';

const hora = () =>
  new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

let contadorId = 0;
const nuevoId = () => `int-${Date.now()}-${contadorId++}`;

const cuentaPalabras = (texto: string) => texto.trim().split(/\s+/).filter(Boolean).length;

interface Props {
  /** Abre la pantalla de la Prueba 1 (conexión con la API). */
  onAbrirPrueba1: () => void;
}

export default function PantallaAgente({ onAbrirPrueba1 }: Props) {
  const [estadoLlamada, setEstadoLlamada] = useState<EstadoLlamada>('inicial');
  const [intervenciones, setIntervenciones] = useState<Intervencion[]>([]);
  const [parcial, setParcial] = useState('');
  const [errorVoz, setErrorVoz] = useState<string | null>(null);
  const { width } = useWindowDimensions();
  const anchoContenido = Math.min(width, ANCHO_MAXIMO) - 32;

  const capturaRef = useRef<CapturaMicrofono | null>(null);
  const socketRef = useRef<SocketStt | null>(null);
  const reproductorRef = useRef<ReproductorTts | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const turnoRef = useRef(0);
  const activoRef = useRef(false);
  const estadoRef = useRef<EstadoLlamada>('inicial');

  const cambiarEstado = (nuevo: EstadoLlamada) => {
    estadoRef.current = nuevo;
    setEstadoLlamada(nuevo);
  };

  const agregar = (intervencion: Intervencion) =>
    setIntervenciones((previas) => [...previas, intervencion]);

  /** Corta la respuesta en curso: stream HTTP, audio y cola de oraciones. */
  const interrumpirTurno = () => {
    turnoRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    reproductorRef.current?.detener();
    reproductorRef.current = null;
  };

  const detenerTodo = () => {
    activoRef.current = false;
    interrumpirTurno();
    socketRef.current?.cerrar();
    socketRef.current = null;
    capturaRef.current?.detener();
    capturaRef.current = null;
    setParcial('');
    cambiarEstado('inicial');
  };

  const procesarTurno = async (texto: string) => {
    interrumpirTurno();
    const turno = turnoRef.current;
    const vigente = () => turnoRef.current === turno && activoRef.current;

    setParcial('');
    agregar({ id: nuevoId(), hablante: 'usuario', texto, timestamp: hora() });
    cambiarEstado('pensando');

    const reproductor = crearReproductorTts();
    reproductorRef.current = reproductor;
    const controlador = new AbortController();
    abortRef.current = controlador;
    const idAsistente = nuevoId();
    let asistenteCreado = false;
    let hablando = false;

    const procesarEvento = (evento: EventoConversacion) => {
      if (!vigente()) return;
      if (evento.tipo === 'error') {
        throw new Error(evento.mensaje);
      }
      if (evento.tipo !== 'oracion') return;

      if (!asistenteCreado) {
        asistenteCreado = true;
        agregar({ id: idAsistente, hablante: 'asistente', texto: evento.texto, timestamp: hora() });
      } else {
        setIntervenciones((previas) =>
          previas.map((i) => (i.id === idAsistente ? { ...i, texto: `${i.texto} ${evento.texto}` } : i)),
        );
      }
      reproductor.encolar(evento.texto);
      if (!hablando) {
        hablando = true;
        cambiarEstado('hablando');
      }
    };

    try {
      const respuesta = await fetch(ENDPOINT_CONVERSACION_STREAM, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto }),
        signal: controlador.signal,
      });
      if (!respuesta.ok || !respuesta.body) {
        throw new Error(`El backend respondió con estado ${respuesta.status}.`);
      }

      const lector = respuesta.body.getReader();
      const decodificador = new TextDecoder();
      let resto = '';
      while (vigente()) {
        const { value, done } = await lector.read();
        if (done) break;
        resto += decodificador.decode(value, { stream: true });
        const lineas = resto.split('\n');
        resto = lineas.pop() ?? '';
        for (const linea of lineas) {
          if (linea.trim()) procesarEvento(JSON.parse(linea) as EventoConversacion);
        }
      }
      if (vigente() && resto.trim()) procesarEvento(JSON.parse(resto) as EventoConversacion);

      if (vigente()) {
        reproductor.finalizar();
        await reproductor.esperarFin();
      }
    } catch (error) {
      if (!vigente()) return;
      reproductor.detener();
      setErrorVoz(error instanceof Error ? error.message : 'Error al procesar la respuesta.');
    } finally {
      if (vigente()) {
        reproductorRef.current = null;
        abortRef.current = null;
        cambiarEstado('escuchando');
      }
    }
  };

  const manejarEvento = (evento: EventoStt) => {
    if (evento.tipo === 'parcial') {
      setParcial(evento.texto);
      if (estadoRef.current !== 'escuchando' && cuentaPalabras(evento.texto) >= PALABRAS_PARA_INTERRUMPIR) {
        interrumpirTurno();
        cambiarEstado('escuchando');
      }
    } else if (evento.tipo === 'final') {
      const texto = evento.texto.trim();
      if (!texto) return;
      if (estadoRef.current !== 'escuchando') {
        interrumpirTurno();
      }
      void procesarTurno(texto);
    } else if (evento.tipo === 'error') {
      setErrorVoz(evento.mensaje);
      detenerTodo();
    } else if (evento.tipo === 'desconexion' && activoRef.current) {
      void abrirSesion();
    }
  };

  const abrirSesion = async () => {
    socketRef.current?.cerrar();
    try {
      socketRef.current = await abrirSocketStt(manejarEvento);
      if (!capturaRef.current) {
        capturaRef.current = await iniciarCaptura((pcm) => socketRef.current?.enviarAudio(pcm));
      }
    } catch (error) {
      setErrorVoz(error instanceof Error ? error.message : 'No se pudo acceder al micrófono.');
      detenerTodo();
    }
  };

  const iniciarLlamada = async () => {
    setErrorVoz(null);
    activoRef.current = true;
    interrumpirTurno();
    const turno = turnoRef.current;
    const reproductor = crearReproductorTts();
    reproductorRef.current = reproductor;
    agregar({ id: nuevoId(), hablante: 'asistente', texto: SALUDO_INICIAL, timestamp: hora() });
    cambiarEstado('hablando');
    dividirEnOraciones(SALUDO_INICIAL).forEach((oracion) => reproductor.encolar(oracion));
    reproductor.finalizar();

    await abrirSesion();
    await reproductor.esperarFin();

    if (turnoRef.current === turno && activoRef.current) {
      reproductorRef.current = null;
      cambiarEstado('escuchando');
    }
  };

  useEffect(() => () => detenerTodo(), []);

  return (
    <SafeAreaView style={styles.seguro}>
      <ScrollView contentContainerStyle={styles.contenido}>
        <View style={styles.tarjetaPrincipal}>
          <RobotAvatar />
          <Text style={styles.titulo}>¡Bienvenido! Explora la información disponible en la fuente de datos conectada.</Text>
          <Text style={styles.descripcion}>
            Este agente te permitirá consultar la información de la fuente de datos mediante una
            conversación por voz. Desliza el botón para comenzar.
          </Text>

          {estadoLlamada === 'inicial' ? (
            <BotonDeslizar
              ancho={anchoContenido > 0 ? anchoContenido - 48 : undefined}
              onDeslizarCompleto={() => void iniciarLlamada()}
            />
          ) : (
            <EstadoEscuchando
              texto={TEXTO_ESTADO[estadoLlamada]}
              onDetener={detenerTodo}
            />
          )}

          {parcial ? <Text style={styles.parcial}>“{parcial}”</Text> : null}
          {errorVoz ? <Text style={styles.error}>{errorVoz}</Text> : null}
        </View>

        <PanelTranscripcion intervenciones={intervenciones} />

        <Pressable
          onPress={onAbrirPrueba1}
          style={styles.enlacePrueba}
          accessibilityRole="link"
          accessibilityLabel="Abrir la prueba 1 de conexión con la API"
          hitSlop={8}
        >
          <Text style={styles.textoEnlace}>Prueba 1: conexión con datos.gov.co →</Text>
        </Pressable>
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
    gap: 16,
    maxWidth: ANCHO_MAXIMO,
    width: '100%',
    alignSelf: 'center',
  },
  tarjetaPrincipal: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 16,
  },
  titulo: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
    lineHeight: 28,
  },
  descripcion: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 20,
  },
  parcial: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#334155',
    textAlign: 'center',
  },
  error: {
    fontSize: 13,
    color: '#b91c1c',
    textAlign: 'center',
  },
  enlacePrueba: {
    alignSelf: 'center',
    padding: 8,
  },
  textoEnlace: {
    fontSize: 13,
    color: '#1d4ed8',
    fontWeight: '600',
  },
});
