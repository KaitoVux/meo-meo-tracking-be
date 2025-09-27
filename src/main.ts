import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Disposition', 'Content-Length', 'Content-Type'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger API Documentation
  const config = new DocumentBuilder()
    .setTitle('Business Expense Tracking API')
    .setDescription(
      `
      A comprehensive API for managing business expenses, vendors, categories, and workflow approvals.
      
      ## Features
      - **Expense Management**: Create, update, and track business expenses
      - **Vendor Management**: Manage vendor information and relationships
      - **Category Management**: Organize expenses by categories
      - **Workflow System**: Approval workflow with status transitions
      - **File Management**: Upload and manage invoice files
      - **Audit Trail**: Complete audit trail for all operations
      - **Notifications**: Real-time notifications for workflow events
      
      ## Authentication
      All endpoints require JWT authentication. Use the /auth/login endpoint to obtain a token.
      
      ## Foreign Key Relationships
      This API returns foreign key IDs alongside populated relations for optimal frontend integration:
      - \`submitterId\`: Direct access to submitter user ID
      - \`vendorId\`: Direct access to vendor ID
      - \`categoryEntityId\`: Direct access to category ID
      - \`invoiceFileId\`: Direct access to invoice file ID
    `,
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('Authentication', 'User authentication and profile management')
    .addTag('Expenses', 'Expense management and tracking')
    .addTag('Vendors', 'Vendor management')
    .addTag('Categories', 'Category management')
    .addTag('Files', 'File upload and management')
    .addTag('Notifications', 'Notification system')
    .addTag('Workflow', 'Expense approval workflow')
    .addTag('Reports', 'Reporting and analytics')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
    customSiteTitle: 'Expense Tracking API Documentation',
    customfavIcon: '/favicon.ico',
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info .title { color: #3b82f6 }
    `,
  });

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
