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
  app.enableCors({ origin: process.env.FRONTEND_URL || '*' });

  // Global pipes & filters
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new AllExceptionsFilter());

  // API prefix
  app.setGlobalPrefix('api/v1');

  // Swagger docs
  const config = new DocumentBuilder()
    .setTitle('FinanzasApp API')
    .setDescription('Sistema de gestión financiera personal')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);
  
  // Run seed on startup in development
  if (process.env.NODE_ENV !== 'production') {
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