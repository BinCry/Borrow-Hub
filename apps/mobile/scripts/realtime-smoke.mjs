import { io } from 'socket.io-client';

const apiUrl = process.env.API_URL ?? process.env.EXPO_PUBLIC_API_URL;
const identifier = process.env.ADMIN_IDENTIFIER ?? process.env.TEST_IDENTIFIER;
const password = process.env.ADMIN_PASSWORD ?? process.env.TEST_PASSWORD;

if (!apiUrl || !identifier || !password) {
  console.error(
    'Usage: API_URL=https://host/api/v1 ADMIN_IDENTIFIER=email ADMIN_PASSWORD=password pnpm smoke:realtime',
  );
  process.exit(1);
}

const baseUrl = new URL(apiUrl).origin;
const accessToken = await login();

await checkNotificationsRest(accessToken);
await Promise.all([
  checkSocket(`${baseUrl}/chat`, accessToken, 'chat'),
  checkSocket(`${baseUrl}/notifications`, accessToken, 'notifications'),
]);

console.log('Realtime smoke passed.');

async function login() {
  const response = await fetch(`${apiUrl.replace(/\/$/, '')}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password }),
  });

  if (!response.ok) {
    throw new Error(`Login failed with ${response.status}`);
  }

  const body = await response.json();
  const token = body?.tokens?.accessToken;

  if (typeof token !== 'string' || !token) {
    throw new Error('Login response did not include an access token');
  }

  return token;
}

async function checkNotificationsRest(token) {
  const response = await fetch(`${apiUrl.replace(/\/$/, '')}/notifications`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(`Notifications REST check failed with ${response.status}`);
  }
}

function checkSocket(url, token, label) {
  return new Promise((resolve, reject) => {
    const socket = io(url, {
      auth: { token },
      transports: ['websocket'],
      timeout: 8_000,
      reconnection: false,
    });
    const timer = setTimeout(() => {
      socket.disconnect();
      reject(new Error(`${label} socket timed out`));
    }, 10_000);

    socket.on('connect', () => {
      clearTimeout(timer);
      socket.disconnect();
      resolve();
    });
    socket.on(`${label === 'chat' ? 'chat' : 'notification'}.error`, (error) => {
      clearTimeout(timer);
      socket.disconnect();
      reject(new Error(`${label} socket rejected connection: ${JSON.stringify(error)}`));
    });
    socket.on('connect_error', (error) => {
      clearTimeout(timer);
      socket.disconnect();
      reject(error);
    });
  });
}
