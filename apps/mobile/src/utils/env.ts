export const ENV = {
  USE_MOCKS: process.env.EXPO_PUBLIC_USE_MOCKS === 'true',
  API_URL: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api/v1',
};
