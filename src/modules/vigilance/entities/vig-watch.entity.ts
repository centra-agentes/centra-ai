import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('vigilance_watches')
@Index(['apiKeyId'])
@Index(['isActive', 'nextCheckAt'])
export class VigWatchEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** UUID of the ApiKeyEntity that owns this watch */
  @Column({ name: 'api_key_id', type: 'uuid' })
  apiKeyId: string;

  @Column({ name: 'numero_radicado', length: 30 })
  numeroRadicado: string;

  @Column({ length: 100, nullable: true, default: null })
  label: string | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  /** Null = never checked yet — first run establishes baseline, creates no alerts */
  @Column({ name: 'last_checked_at', type: 'timestamptz', nullable: true, default: null })
  lastCheckedAt: Date | null;

  /** idRegActuacion of the most recent actuacion seen at last successful check */
  @Column({ name: 'last_known_actuacion_id', type: 'int', nullable: true, default: null })
  lastKnownActuacionId: number | null;

  @Column({ name: 'consecutive_failures', default: 0 })
  consecutiveFailures: number;

  /** When this watch is eligible for its next poll */
  @Column({ name: 'next_check_at', type: 'timestamptz', nullable: true, default: null })
  nextCheckAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
