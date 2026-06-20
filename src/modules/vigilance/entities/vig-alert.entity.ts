import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('vigilance_alerts')
@Index(['apiKeyId', 'isRead'])
@Index(['watchId'])
export class VigAlertEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'watch_id', type: 'uuid' })
  watchId: string;

  @Column({ name: 'api_key_id', type: 'uuid' })
  apiKeyId: string;

  @Column({ name: 'numero_radicado', length: 30 })
  numeroRadicado: string;

  @Column({
    name: 'id_proceso',
    type: 'bigint',
    transformer: {
      to: (v: number) => v,
      from: (v: string) => Number(v),
    },
  })
  idProceso: number;

  /** idRegActuacion from the Rama Judicial API */
  @Column({
    name: 'actuacion_id',
    type: 'bigint',
    transformer: {
      to: (v: number) => v,
      from: (v: string) => Number(v),
    },
  })
  actuacionId: number;

  /** Full actuacion payload snapshot */
  @Column({ name: 'actuacion_data', type: 'jsonb' })
  actuacionData: Record<string, unknown>;

  @Column({ name: 'is_read', default: false })
  isRead: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
