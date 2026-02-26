import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserTable1771827980907 implements MigrationInterface {
  name = 'CreateUserTable1771827980907';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."user_role_enum" AS ENUM('ADMIN', 'WORKER', 'SUPERADMIN')`,
    );
    await queryRunner.query(
      `CREATE TABLE "user" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "username" character varying NOT NULL, "password" character varying NOT NULL, "firstName" character varying NOT NULL, "lastName" character varying NOT NULL, "email" character varying, "phoneNumber" character varying NOT NULL, "avatar" character varying, "role" "public"."user_role_enum" NOT NULL DEFAULT 'WORKER', "isActive" boolean NOT NULL DEFAULT true, "lastLoginAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_78a916df40e02a9deb1c4b75edb" UNIQUE ("username"), CONSTRAINT "UQ_e12875dfb3b1d92d7d7c5377e22" UNIQUE ("email"), CONSTRAINT "UQ_f2578043e491921209f5dadd080" UNIQUE ("phoneNumber"), CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f2578043e491921209f5dadd08" ON "user" ("phoneNumber") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e12875dfb3b1d92d7d7c5377e2" ON "user" ("email") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e12875dfb3b1d92d7d7c5377e2"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f2578043e491921209f5dadd08"`,
    );
    await queryRunner.query(`DROP TABLE "user"`);
    await queryRunner.query(`DROP TYPE "public"."user_role_enum"`);
  }
}
