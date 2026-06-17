import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VigilanceController } from './vigilance.controller';
import { VigilanceService } from './vigilance.service';
import { WatchService } from './watch.service';
import { AlertService } from './alert.service';
import { MonitoringService } from './monitoring.service';
import { VigWatchEntity } from './entities/vig-watch.entity';
import { VigAlertEntity } from './entities/vig-alert.entity';

@Module({
  imports: [TypeOrmModule.forFeature([VigWatchEntity, VigAlertEntity])],
  controllers: [VigilanceController],
  providers: [VigilanceService, WatchService, AlertService, MonitoringService],
  exports: [VigilanceService],
})
export class VigilanceModule {}
