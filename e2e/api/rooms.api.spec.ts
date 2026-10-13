import { test, expect } from '@playwright/test';
import { connectClient, waitFor, waitForError, waitUntil, Socket } from '../helpers/socket';
import { getActiveRooms, getRoom, isRoomListed, roomCodeOf, Room, RoomPlayer } from '../helpers/api';

/**
 * Pruebas de caja negra del backend de salas:
 *  - HTTP: GET /rooms, GET /rooms/:code
 *  - WebSocket: create_room, join_room, leave_room, heartbeat, error
 *
 * El backend corre en modo memoria (ver playwright.config.ts), asi que no se
 * toca Firestore real.
 */

let sockets: Socket[] = [];

async function openSocket(): Promise<Socket> {
  const socket = await connectClient();
  sockets.push(socket);
  return socket;
}

test.afterEach(async () => {
  for (const socket of sockets) {
    if (socket.connected) socket.disconnect();
  }
  sockets = [];
});

const uid = (label: string): string =>
  `pw-${label}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

const roomName = (label: string): string =>
  `PW ${label} ${Math.random().toString(36).slice(2, 7)}`.toUpperCase();

async function crearSala(
  socket: Socket,
  maxJugadores: number,
  hostId: string,
  nombre: string,
): Promise<Room> {
  const created = waitFor<Room>(socket, 'room_created');
  socket.emit('create_room', {
    nombre,
    maxJugadores,
    host: { id: hostId, nombre: 'Host E2E', tematica: '', dificultad: '' },
  });
  return await created;
}

function unirJugador(socket: Socket, code: string, playerId: string, nombre = 'Invitado E2E') {
  socket.emit('join_room', {
    roomCode: code,
    player: { id: playerId, nombre, tematica: '', dificultad: '' },
  });
}

test.describe('API/WebSocket de salas', () => {
  test('create_room respeta la capacidad elegida (2 a 6)', async ({ request }) => {
    for (const capacidad of [2, 3, 4, 5, 6]) {
      const host = await openSocket();
      const room = await crearSala(host, capacidad, uid('host'), roomName(`CAP${capacidad}`));

      expect(room.maxJugadores, `room_created.maxJugadores para capacidad ${capacidad}`).toBe(capacidad);
      expect(room.estado).toBe('esperando');
      expect(room.jugadores?.length).toBe(1);
      expect(room.jugadores?.[0].esHost).toBe(true);

      const persistida = await getRoom(request, roomCodeOf(room));
      expect(persistida?.maxJugadores, `maxJugadores persistido para capacidad ${capacidad}`).toBe(capacidad);
    }
  });

  test('si no se envia maxJugadores, el backend usa 4 por defecto (comportamiento legacy)', async ({}) => {
    const host = await openSocket();
    const created = waitFor<Room>(host, 'room_created');
    host.emit('create_room', {
      nombre: roomName('LEGACY'),
      host: { id: uid('host'), nombre: 'Host E2E', tematica: '', dificultad: '' },
    });
    const room = await created;
    expect(room.maxJugadores).toBe(4);
  });

  test('la sala creada aparece en GET /rooms con su capacidad real', async ({ request }) => {
    const host = await openSocket();
    const room = await crearSala(host, 2, uid('host'), roomName('LIST'));
    const code = roomCodeOf(room);

    const salas = await getActiveRooms(request);
    const encontrada = salas.find((r) => roomCodeOf(r) === code);

    expect(encontrada, `la sala ${code} deberia figurar en GET /rooms`).toBeTruthy();
    expect(encontrada!.maxJugadores).toBe(2);
    expect(encontrada!.jugadores?.length).toBe(1);
  });

  test('join_room agrega al jugador y notifica room_updated a 2/2', async ({}) => {
    const hostSocket = await openSocket();
    const hostId = uid('host');
    const room = await crearSala(hostSocket, 2, hostId, roomName('JOIN'));
    const code = roomCodeOf(room);

    const guestSocket = await openSocket();
    const guestId = uid('guest');

    const updatedOnHost = waitFor<Room>(hostSocket, 'room_updated');
    unirJugador(guestSocket, code, guestId);
    const updated = await updatedOnHost;

    expect(updated.jugadores?.length).toBe(2);
    expect(updated.maxJugadores).toBe(2);

    const guest: RoomPlayer | undefined = updated.jugadores?.find((p) => p.id === guestId);
    expect(guest, 'el invitado deberia estar en la sala').toBeTruthy();
    expect(guest!.esHost).toBe(false);
    expect(guest!.configurado).toBe(false);
  });

  test('unirse a una sala inexistente responde "Sala no encontrada"', async ({}) => {
    const socket = await openSocket();
    const error = waitForError(socket);
    unirJugador(socket, 'NOEXIS', uid('guest'));
    expect((await error).message).toContain('no encontrada');
  });

  test('unirse a una sala llena responde "Sala llena"', async ({}) => {
    const hostSocket = await openSocket();
    const room = await crearSala(hostSocket, 2, uid('host'), roomName('FULL'));
    const code = roomCodeOf(room);

    const guest1 = await openSocket();
    const lleno = waitFor<Room>(hostSocket, 'room_updated');
    unirJugador(guest1, code, uid('g1'), 'Invitado 1');
    await lleno;

    const guest2 = await openSocket();
    const error = waitForError(guest2);
    unirJugador(guest2, code, uid('g2'), 'Invitado 2');
    expect((await error).message).toContain('llena');
  });

  test('el host que sale en una sala vacia la elimina (no queda fantasma)', async ({ request }) => {
    const hostSocket = await openSocket();
    const hostId = uid('host');
    const room = await crearSala(hostSocket, 2, hostId, roomName('LEAVE'));
    const code = roomCodeOf(room);

    expect(await isRoomListed(request, code), 'la sala deberia existir antes de salir').toBe(true);

    hostSocket.emit('leave_room', { roomCode: code, userId: hostId });

    await waitUntil(async () => (await getRoom(request, code)) === null, {
      label: 'la sala se elimina tras salir el ultimo jugador',
    });
    expect(await isRoomListed(request, code)).toBe(false);
  });

  test('al salir el host con invitado, el liderazgo pasa al invitado y la sala sigue viva', async ({
    request,
  }) => {
    const hostSocket = await openSocket();
    const hostId = uid('host');
    const room = await crearSala(hostSocket, 2, hostId, roomName('LIDER'));
    const code = roomCodeOf(room);

    const guestSocket = await openSocket();
    const guestId = uid('guest');
    const joined = waitFor<Room>(hostSocket, 'room_updated');
    unirJugador(guestSocket, code, guestId);
    await joined;

    hostSocket.emit('leave_room', { roomCode: code, userId: hostId });

    await waitUntil(
      async () => {
        const actual = await getRoom(request, code);
        return actual !== null && actual.jugadores?.length === 1;
      },
      { label: 'la sala queda con un solo jugador (el invitado)' },
    );

    const finalRoom = await getRoom(request, code);
    expect(finalRoom).not.toBeNull();
    expect(finalRoom!.jugadores?.[0].id).toBe(guestId);
    expect(finalRoom!.jugadores?.[0].esHost, 'el invitado asume como host').toBe(true);
    expect(await isRoomListed(request, code), 'la sala debe seguir visible con 1/2').toBe(true);
  });

  test('heartbeat actualiza ultimaActividad y mantiene la sala activa', async ({ request }) => {
    const hostSocket = await openSocket();
    const room = await crearSala(hostSocket, 2, uid('host'), roomName('BEAT'));
    const code = roomCodeOf(room);

    const antes = (await getRoom(request, code))!.ultimaActividad;
    await new Promise((r) => setTimeout(r, 1100));

    hostSocket.emit('heartbeat', { roomCode: code });

    await waitUntil(
      async () => (await getRoom(request, code))?.ultimaActividad !== antes,
      { label: 'ultimaActividad actualizada por heartbeat' },
    );

    expect(await isRoomListed(request, code)).toBe(true);
  });
});
