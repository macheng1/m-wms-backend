import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMiniappPostViews1780660000000 implements MigrationInterface {
  name = 'CreateMiniappPostViews1780660000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`miniapp_post_views\` (
        \`id\` varchar(36) NOT NULL,
        \`postId\` varchar(36) NOT NULL COMMENT '信息ID',
        \`memberId\` varchar(36) NULL COMMENT '浏览会员ID',
        \`ip\` varchar(80) NULL COMMENT '浏览IP',
        \`userAgent\` text NULL COMMENT '浏览客户端 UA',
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '最后更新时间',
        \`deletedAt\` datetime(6) NULL COMMENT '删除时间（伪删除标记）',
        PRIMARY KEY (\`id\`),
        INDEX \`IDX_miniapp_post_view_post_created\` (\`postId\`, \`createdAt\`),
        INDEX \`IDX_miniapp_post_view_member_created\` (\`memberId\`, \`createdAt\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `miniapp_post_views`');
  }
}
