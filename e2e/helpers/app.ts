import { Page, expect } from '@playwright/test';
import { APP_URL } from './env';
import { stubLogin, TestUser } from './auth';

export const TEST_PASSWORD = 'playwright-test';

/**
 * La pagina de login monta una encuesta modal (app-encuesta) que se abre en la
 * primera visita y tapa el formulario. Marcamos en localStorage que ya fue
 * respondida para que no interfiera con las pruebas.
 */
async function marcarEncuestaRespondida(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try {
      localStorage.setItem(
        'tw_encuesta_estado',
        JSON.stringify({ estado: 'completada', fecha: new Date().toISOString() }),
      );
    } catch {
      /* localStorage no disponible: no pasa nada */
    }
  });
}

/** Inicia sesion en la app con un usuario simulado (sin Firebase real). */
export async function loginAs(page: Page, user: TestUser): Promise<void> {
  await marcarEncuestaRespondida(page);
  await stubLogin(page, user);
  await page.goto(`${APP_URL}/#/login`);
  await page.getByPlaceholder('Email').fill(user.email);
  await page.getByPlaceholder('Contraseña').fill(TEST_PASSWORD);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await expect(page).toHaveURL(/#\/dashboard/, { timeout: 30_000 });
}

export function parseRoomCode(url: string): string {
  const match = url.match(/[?&]codigo=([A-Za-z0-9]+)/);
  if (!match) throw new Error(`No pude extraer el codigo de sala de la URL: ${url}`);
  return match[1].toUpperCase();
}

/** Flujo de UI: dashboard -> crear-sala -> lobby. Devuelve el codigo de sala. */
export async function createRoomThroughUi(
  page: Page,
  roomName: string,
  capacity: 2 | 3 | 4 | 5 | 6 = 2,
): Promise<string> {
  await page.getByRole('button', { name: 'Crear Sala' }).click();
  await expect(page).toHaveURL(/#\/crear-sala/);

  await page.getByPlaceholder(/Batalla de Genios/).fill(roomName);
  await page.getByRole('button', { name: `${capacity} Jugadores` }).click();
  await page.getByRole('button', { name: /Iniciar Sala/ }).click();

  await expect(page).toHaveURL(/#\/lobby\?/, { timeout: 30_000 });
  return parseRoomCode(page.url());
}

/** Clic en el boton "Unirse" de la tarjeta de la sala indicada (dashboard). */
export async function joinRoomFromDashboard(page: Page, roomName: string): Promise<void> {
  const tarjeta = page.locator(`div:has(> div > strong:text-is("${roomName}"))`);
  await expect(tarjeta.getByRole('button', { name: 'Unirse' })).toBeVisible({ timeout: 30_000 });
  await tarjeta.getByRole('button', { name: 'Unirse' }).click();
  await expect(page).toHaveURL(/#\/lobby\?/, { timeout: 30_000 });
}

/** Navega dentro de la SPA (sin recargar la pagina) para disparar ngOnDestroy. */
export async function goToDashboardViaNavbar(page: Page): Promise<void> {
  await page.getByRole('link', { name: 'Dashboard' }).first().click();
  await expect(page).toHaveURL(/#\/dashboard/);
}
