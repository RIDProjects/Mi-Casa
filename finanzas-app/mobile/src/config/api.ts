// EXPO_PUBLIC_API_URL se lee en tiempo de compilación desde el archivo .env
// En emulador Android usar http://10.0.2.2:3001/api/v1
// En dispositivo físico usar la IP de la PC en la red local: http://192.168.x.x:3001/api/v1
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:3001/api/v1';
