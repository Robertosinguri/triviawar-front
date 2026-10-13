import { io, Socket } from 'socket.io-client';
import { BACKEND_URL } from './env';

export type { Socket };

/** Abre un cliente socket.io contra el backend bajo prueba. */
export function connectClient(): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const socket = io(BACKEND_URL, {
      transports: ['websocket'],
      reconnection: false,
      timeout: 5000,
    });

    const onConnect = () => {
      cleanup();
      resolve(socket);
    };
    const onError = (err: Error) => {
      cleanup();
      reject(err);
    };
    const cleanup = () => {
      socket.off('connect', onConnect);
      socket.off('connect_error', onError);
    };

    socket.on('connect', onConnect);
    socket.on('connect_error', onError);
  });
}

/** Espera un unico evento del servidor con timeout. */
export function waitFor<T = any>(socket: Socket, event: string, timeoutMs = 5000): Promise<T> {
  return new Promise((resolve, reject) => {
    let timer: NodeJS.Timeout;
    const handler = (data: T) => {
      clearTimeout(timer);
      resolve(data);
    };
    timer = setTimeout(() => {
      socket.off(event, handler);
      reject(new Error(`Timeout esperando el evento "${event}" (${timeoutMs}ms)`));
    }, timeoutMs);
    socket.once(event, handler);
  });
}

export interface ServerError {
  message: string;
}

export function waitForError(socket: Socket, timeoutMs = 5000): Promise<ServerError> {
  return waitFor<ServerError>(socket, 'error', timeoutMs);
}

/** Espera a que se cumpla una condicion evaluada periodicamente. */
export async function waitUntil(
  predicate: () => Promise<boolean> | boolean,
  { timeoutMs = 5000, intervalMs = 150, label = 'condicion' } = {},
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await predicate()) return;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(`Timeout esperando: ${label}`);
}
