import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('publicaciones_log')
@Index(['fechaConsulta'])
@Index(['departamento', 'municipio'])
export class PublicacionLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  departamento: string;

  @Column({ nullable: true })
  municipio: string;

  @Column({ nullable: true })
  despacho: string;

  @Column({ nullable: true })
  categoria: string;

  @Column({ name: 'fecha_inicio', nullable: true, type: 'date' })
  fechaInicio: string;

  @Column({ name: 'fecha_fin', nullable: true, type: 'date' })
  fechaFin: string;

  @Column({ name: 'total_resultados', default: 0 })
  totalResultados: number;

  @Column({ name: 'fecha_consulta', type: 'timestamptz' })
  fechaConsulta: Date;

  @CreateDateColumn({ name: 'creado_en', type: 'timestamptz' })
  creadoEn: Date;
}
