import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PublicacionesController } from './publicaciones.controller';
import { PublicacionesService } from './publicaciones.service';
import { PublicacionLogEntity } from './entities/publicacion-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PublicacionLogEntity])],
  controllers: [PublicacionesController],
  providers: [PublicacionesService],
})
export class PublicacionesModule {}
