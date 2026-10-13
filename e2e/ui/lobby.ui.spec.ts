import { test, expect } from '@playwright/test';
import { testUser } from '../helpers/auth';
import {
  loginAs,
  createRoomThroughUi,
  joinRoomFromDashboard,
  goToDashboardViaNavbar,
} from '../helpers/app';
import { getRoom, isRoomListed } from '../helpers/api';
import { APP_URL } from '../helpers/env';

/**
 * Pruebas de caja negra sobre la UI real (Angular + Socket.io) usando Chrome.
 * El login se resuelve con un stub de POST /api/auth/login (ver helpers/auth.ts),
 * asi no hace falta Firebase ni credenciales.
 *
 * Se ejecutan en serie (workers: 1) para evitar interferencias entre salas.
 */
test.describe.configure({ mode: 'serial' });

const HOST = testUser('host');
const GUEST = testUser('guest');

const nuevoNombreSala = (prefijo: string): string =>
  `${prefijo}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 4)}`.toUpperCase().slice(0, 25);

test.describe('Lobby (E2E de UI)', () => {
  test('BUG 1: una sala de 2 jugadores se ve como 1/2 (no 1/4)', async ({ page, request }) => {
    await loginAs(page, HOST);

    const nombre = nuevoNombreSala('DOS');
    const code = await createRoomThroughUi(page, nombre, 2);

    // La cabecera del lobby debe usar la capacidad real elegida (2), no un 4 fijo.
    await expect(page.getByRole('heading', { name: /Jugadores \(1\/2\)/ })).toBeVisible();

    // Con capacidad 2 y 1 jugador dentro, debe haber UN solo slot libre.
    await expect(page.getByText('Esperando jugador...')).toHaveCount(1);

    // El backend confirma la misma capacidad.
    const room = await getRoom(request, code);
    expect(room?.maxJugadores).toBe(2);
    expect(room?.jugadores?.length).toBe(1);

    await goToDashboardViaNavbar(page);
  });

  test('BUG 2: abandonar el lobby por navegacion libera la sala (sin fantasmas)', async ({
    page,
    request,
  }) => {
    await loginAs(page, HOST);

    const nombre = nuevoNombreSala('ABA');
    const code = await createRoomThroughUi(page, nombre, 2);

    expect(await isRoomListed(request, code), 'la sala debe existir antes de abandonar').toBe(true);

    // Navegacion dentro de la SPA: dispara ngOnDestroy del lobby -> leave_room
    await goToDashboardViaNavbar(page);

    await expect
      .poll(() => isRoomListed(request, code), {
        message: 'la sala no deberia seguir listada tras abandonar el lobby',
        timeout: 15_000,
      })
      .toBe(false);

    expect(await getRoom(request, code), 'la sala fantasma deberia haber sido eliminada').toBeNull();
  });

  test('dos jugadores ven el lobby en 2/2 con la capacidad correcta', async ({ browser, request }) => {
    // serviceWorkers: 'block' evita el cuelgue al cerrar el contexto (la app registra sw.js).
    const hostContext = await browser.newContext({ baseURL: APP_URL, serviceWorkers: 'block' });
    const guestContext = await browser.newContext({ baseURL: APP_URL, serviceWorkers: 'block' });
    const hostPage = await hostContext.newPage();
    const guestPage = await guestContext.newPage();

    try {
      await loginAs(hostPage, HOST);
      const nombre = nuevoNombreSala('GENTE');
      const code = await createRoomThroughUi(hostPage, nombre, 2);

      await loginAs(guestPage, GUEST);
      await joinRoomFromDashboard(guestPage, nombre);

      await expect(hostPage.getByRole('heading', { name: /Jugadores \(2\/2\)/ })).toBeVisible({
        timeout: 30_000,
      });
      await expect(guestPage.getByRole('heading', { name: /Jugadores \(2\/2\)/ })).toBeVisible({
        timeout: 30_000,
      });

      const room = await getRoom(request, code);
      expect(room?.jugadores?.length).toBe(2);
      expect(room?.maxJugadores).toBe(2);

      // Una sala llena ya no se ofrece como disponible.
      expect(await isRoomListed(request, code)).toBe(false);
    } finally {
      await hostContext.close();
      await guestContext.close();
    }
  });
});
