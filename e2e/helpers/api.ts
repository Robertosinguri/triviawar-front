import { APIRequestContext, expect } from '@playwright/test';
import { API_URL } from './env';

export interface RoomPlayer {
  id: string;
  nombre: string;
  esHost: boolean;
  configurado: boolean;
  tematica: string;
}

export interface Room {
  id?: string;
  roomCode?: string;
  nombre?: string;
  estado?: string;
  maxJugadores?: number;
  jugadores?: RoomPlayer[];
  ultimaActividad?: string;
  [key: string]: any;
}

export function roomCodeOf(room: Room): string {
  return room.roomCode || room.id || '';
}

export async function getActiveRooms(request: APIRequestContext): Promise<Room[]> {
  const res = await request.get(`${API_URL}/rooms`);
  expect(res.ok(), `GET /rooms respondio ${res.status()}`).toBeTruthy();
  return (await res.json()) as Room[];
}

export async function getRoom(request: APIRequestContext, code: string): Promise<Room | null> {
  const res = await request.get(`${API_URL}/rooms/${code}`);
  if (res.status() === 404) return null;
  expect(res.ok(), `GET /rooms/${code} respondio ${res.status()}`).toBeTruthy();
  return (await res.json()) as Room;
}

export async function isRoomListed(request: APIRequestContext, code: string): Promise<boolean> {
  const rooms = await getActiveRooms(request);
  return rooms.some((r) => roomCodeOf(r) === code);
}
