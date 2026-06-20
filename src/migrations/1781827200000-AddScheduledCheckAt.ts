import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddScheduledCheckAt1781827200000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE vigilance_watches
      ADD COLUMN IF NOT EXISTS scheduled_check_at TIMESTAMPTZ DEFAULT NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE vigilance_watches
      DROP COLUMN IF EXISTS scheduled_check_at
    `);
  }
}
