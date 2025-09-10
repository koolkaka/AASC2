import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  const configService = app.get(ConfigService);
  const port = configService.get('PORT') || 3000;

  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // CORS
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle('Bitrix24 Contact Management API')
    .setDescription('API để quản lý Contact với Bitrix24 integration')
    .setVersion('1.0')
    .addTag('Contacts', 'API quản lý contacts')
    .addTag('OAuth', 'API OAuth với Bitrix24')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  console.log(`🚀 Server running on http://localhost:${port}`);
  console.log(`📱 Install endpoint: http://localhost:${port}/install`);
  console.log(`📚 API Documentation: http://localhost:${port}/api`);
  console.log(`📋 Contacts API: http://localhost:${port}/contacts`);
  
  await app.listen(port);
}
bootstrap();
