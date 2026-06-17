import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('api_keys')
@Index(['keyHash'])
@Index(['isActive'])
export class ApiKeyEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Human-readable label for this key (e.g. "Frontend Production"). */
  @Column({ length: 100 })
  name: string;

  /** SHA-256 hash of the full raw key — never store plaintext. */
  @Column({ name: 'key_hash', unique: true, length: 64 })
  keyHash: string;

  /** First 12 characters of the raw key for safe display (e.g. "cv_a1b2c3d4e5"). */
  @Column({ name: 'key_prefix', length: 16 })
  keyPrefix: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  /** Optional hard expiry. Null = never expires. */
  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt: Date | null;

  @Column({ name: 'last_used_at', type: 'timestamptz', nullable: true })
  lastUsedAt: Date | null;

  @Column({ name: 'requests_count', default: 0 })
  requestsCount: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  get isExpired(): boolean {
    return this.expiresAt !== null && new Date() > this.expiresAt;
  }
}
