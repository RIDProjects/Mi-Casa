import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as compression from 'compression';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { seed } from './seed';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security
  app.use(helmet());
  app.use(compression());

  const origin = process.env.NODE_ENV === 'production'
    ? (process.env.FRONTEND_URL ?? (() => { throw new Error('FRONTEND_URL is required in production'); })())
    : process.env.FRONTEND_URL || '*';
  app.enableCors({ origin, credentials: true });

  // Global pipes & filters
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new AllExceptionsFilter());

  // API prefix
  app.setGlobalPrefix('api/v1');

  // Swagger docs
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('FinanzasApp API')
      .setDescription('Sistema de gestión financiera personal')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = process.env.PORT || 3001;
  await app.listen(port);

  if (process.env.SEED === 'true') {
    try {
      await seed();
    } catch (e) {
      console.error('Seed error (can be ignored if data exists):', e.message);
    }
  }

  console.log(`🚀 API running at http://localhost:${port}/api/v1`);
  console.log(`📚 Swagger docs at http://localhost:${port}/api/docs`);
}

bootstrap();
