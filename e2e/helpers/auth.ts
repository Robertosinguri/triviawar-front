import { Page } from '@playwright/test';

export interface TestUser {
  uid: string;
  email: string;
  username: string;
  name: string;
  picture?: string;
}

const CORS_HEADERS: Record<string, string> = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': '*',
  'access-control-max-age': '86400',
};

/**
 * Intercepta la llamada de login del frontend (`POST /api/auth/login`) y
 * responde con un usuario de prueba. Asi no hace falta Firebase real ni
 * credenciales para las pruebas de UI.
 *
 * El login del frontend (FirebaseAuthService.login) hace un POST JSON
 * cross-origin, por lo que tambien hay que responder el preflight OPTIONS.
 */
export async function stubLogin(page: Page, user: TestUser): Promise<void> {
  await page.route('**/api/auth/login', async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: CORS_HEADERS });
      return;
    }

    await route.fulfill({
      status: 200,
      headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
      body: JSON.stringify({ success: true, user }),
    });
  });
}

export function testUser(id: string): TestUser {
  return {
    uid: `pw-${id}-uid`,
    email: `${id}@playwright.local`,
    username: `${id}`,
    name: `Jugador ${id}`,
    picture: '',
  };
}
