import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ExpenseModule } from './expenses/expense.module';
import config from './mikro-orm.config';

@Module({
  imports: [MikroOrmModule.forRoot(config), AuthModule, ExpenseModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
