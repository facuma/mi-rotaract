const { NestFactory } = require('@nestjs/core');
const { ValidationPipe } = require('@nestjs/common');
const { AppModule } = require('./dist/src/app.module');
const express = require('express');
const { ExpressAdapter } = require('@nestjs/platform-express');

const server = express();
let isReady = false;
let bootstrapPromise = null;

async function bootstrap() {
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server), {
    logger: ['error', 'warn'],
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  app.enableCors({
    origin: (process.env.CORS_ORIGIN || 'http://localhost:3000')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
    credentials: true,
  });
  await app.init();
  isReady = true;
}

module.exports = async (req, res) => {
  if (!bootstrapPromise) {
    bootstrapPromise = bootstrap();
  }
  if (!isReady) {
    await bootstrapPromise;
  }
  server(req, res);
};
