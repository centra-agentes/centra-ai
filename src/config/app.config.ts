import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  name: process.env.APP_NAME || 'rama-judicial-api',
  // Required to use POST /auth/keys, GET /auth/keys, DELETE /auth/keys/*
  // TODO: Set a strong random value in your .env (e.g. openssl rand -hex 32)
  masterApiKey: process.env.MASTER_API_KEY || '',
}));
