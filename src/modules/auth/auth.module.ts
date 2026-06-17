import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ApiKeyGuard } from './guards/api-key.guard';
import { MasterKeyGuard } from './guards/master-key.guard';
import { ApiKeyEntity } from './entities/api-key.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ApiKeyEntity])],
  controllers: [AuthController],
  providers: [AuthService, ApiKeyGuard, MasterKeyGuard],
  exports: [AuthService, ApiKeyGuard],
})
export class AuthModule {}
