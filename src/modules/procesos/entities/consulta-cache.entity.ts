import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('consultas_cache')
@Index(['cacheKey'])
@Index(['expiraEn'])
export class ConsultaCacheEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'cache_key', unique: true, length: 512 })
  cacheKey: string;

  @Column({ type: 'jsonb' })
  resultado: Record<string, any>;

  @Column({ name: 'tipo_consulta', length: 50 })
  tipoConsulta: string;

  @Column({ name: 'parametros', type: 'jsonb' })
  parametros: Record<string, any>;

  @Column({ name: 'expira_en', type: 'timestamptz' })
  expiraEn: Date;

  @Column({ name: 'hits', default: 0 })
  hits: number;

  @CreateDateColumn({ name: 'creado_en', type: 'timestamptz' })
  creadoEn: Date;

  @UpdateDateColumn({ name: 'actualizado_en', type: 'timestamptz' })
  actualizadoEn: Date;

  get estaVigente(): boolean {
    return new Date() < this.expiraEn;
  }
}
