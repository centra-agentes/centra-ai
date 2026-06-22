import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitSchema1780000000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    // api_keys
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS api_keys (
        id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
        name            VARCHAR(100) NOT NULL,
        key_hash        VARCHAR(64)  NOT NULL UNIQUE,
        key_prefix      VARCHAR(16)  NOT NULL,
        is_active       BOOLEAN      NOT NULL DEFAULT true,
        expires_at      TIMESTAMPTZ  DEFAULT NULL,
        last_used_at    TIMESTAMPTZ  DEFAULT NULL,
        requests_count  INT          NOT NULL DEFAULT 0,
        created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash  ON api_keys (key_hash)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON api_keys (is_active)`);

    // vigilance_watches (incluye scheduled_check_at — AddScheduledCheckAt será no-op por IF NOT EXISTS)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS vigilance_watches (
        id                        UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
        api_key_id                UUID         NOT NULL,
        numero_radicado           VARCHAR(30)  NOT NULL,
        label                     VARCHAR(100) DEFAULT NULL,
        is_active                 BOOLEAN      NOT NULL DEFAULT true,
        last_checked_at           TIMESTAMPTZ  DEFAULT NULL,
        last_known_actuacion_id   BIGINT       DEFAULT NULL,
        consecutive_failures      INT          NOT NULL DEFAULT 0,
        next_check_at             TIMESTAMPTZ  DEFAULT NULL,
        scheduled_check_at        TIMESTAMPTZ  DEFAULT NULL,
        created_at                TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        updated_at                TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_vigilance_watches_api_key_id   ON vigilance_watches (api_key_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_vigilance_watches_active_next  ON vigilance_watches (is_active, next_check_at)`);

    // vigilance_alerts
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS vigilance_alerts (
        id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        watch_id         UUID        NOT NULL,
        api_key_id       UUID        NOT NULL,
        numero_radicado  VARCHAR(30) NOT NULL,
        id_proceso       BIGINT      NOT NULL,
        actuacion_id     BIGINT      NOT NULL,
        actuacion_data   JSONB       NOT NULL,
        is_read          BOOLEAN     NOT NULL DEFAULT false,
        created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_vigilance_alerts_api_key_read ON vigilance_alerts (api_key_id, is_read)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_vigilance_alerts_watch_id     ON vigilance_alerts (watch_id)`);

    // consultas_cache
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS consultas_cache (
        id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
        cache_key      VARCHAR(512) NOT NULL UNIQUE,
        resultado      JSONB        NOT NULL,
        tipo_consulta  VARCHAR(50)  NOT NULL,
        parametros     JSONB        NOT NULL,
        expira_en      TIMESTAMPTZ  NOT NULL,
        hits           INT          NOT NULL DEFAULT 0,
        creado_en      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        actualizado_en TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_consultas_cache_key    ON consultas_cache (cache_key)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_consultas_cache_expira ON consultas_cache (expira_en)`);

    // publicaciones_log
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS publicaciones_log (
        id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        departamento      TEXT        DEFAULT NULL,
        municipio         TEXT        DEFAULT NULL,
        despacho          TEXT        DEFAULT NULL,
        categoria         TEXT        DEFAULT NULL,
        fecha_inicio      DATE        DEFAULT NULL,
        fecha_fin         DATE        DEFAULT NULL,
        total_resultados  INT         NOT NULL DEFAULT 0,
        fecha_consulta    TIMESTAMPTZ NOT NULL,
        creado_en         TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_publicaciones_log_fecha     ON publicaciones_log (fecha_consulta)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_publicaciones_log_depto_mun ON publicaciones_log (departamento, municipio)`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS publicaciones_log`);
    await queryRunner.query(`DROP TABLE IF EXISTS consultas_cache`);
    await queryRunner.query(`DROP TABLE IF EXISTS vigilance_alerts`);
    await queryRunner.query(`DROP TABLE IF EXISTS vigilance_watches`);
    await queryRunner.query(`DROP TABLE IF EXISTS api_keys`);
  }
}
