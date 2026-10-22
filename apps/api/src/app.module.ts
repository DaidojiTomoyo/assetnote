import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import applicationConfig from './common/config/application.config';
import { DatabaseModule } from './common/database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersHttpModule } from './modules/users/users-http.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [applicationConfig],
    }),
    DatabaseModule,
    AuthModule,
    UsersHttpModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
