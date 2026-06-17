import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProcesosController } from './procesos.controller';
import { ProcesosService } from './procesos.service';
import { RamaJudicialHttpService } from './rama-judicial-http.service';
import { ConsultaCacheEntity } from './entities/consulta-cache.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ConsultaCacheEntity])],
  controllers: [ProcesosController],
  providers: [ProcesosService, RamaJudicialHttpService],
  exports: [ProcesosService, RamaJudicialHttpService],
})
export class ProcesosModule {}
