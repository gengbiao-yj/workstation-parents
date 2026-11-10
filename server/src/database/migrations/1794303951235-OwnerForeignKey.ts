import { MigrationInterface, QueryRunner } from "typeorm";

export class OwnerForeignKey1794303951235 implements MigrationInterface {
    name = 'OwnerForeignKey1794303951235'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`kids\` ADD CONSTRAINT \`FK_a3d815b0140390ffb823056aaec\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`books\` ADD CONSTRAINT \`FK_d2211ba79c9312cdcda4d7d5860\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`chats\` ADD CONSTRAINT \`FK_b6c92d818d42e3e298e84d94414\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`chat_messages\` ADD CONSTRAINT \`FK_5588b6cea298cedec7063c0d33e\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`events\` ADD CONSTRAINT \`FK_09f256fb7f9a05f0ed9927f406b\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`event_items\` ADD CONSTRAINT \`FK_013033fdbd204892cf2fd07a975\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`event_day_logs\` ADD CONSTRAINT \`FK_7affb0c8155194e9fbe72b54e29\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`exams\` ADD CONSTRAINT \`FK_2571a05d2f6d3474755677cc015\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`exam_items\` ADD CONSTRAINT \`FK_4a7f965e0970bb20bffa67cb6d6\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`habits\` ADD CONSTRAINT \`FK_652ea1f27d16800eca4259546a1\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`habit_checks\` ADD CONSTRAINT \`FK_07ce8d11c4d123dcd3260530d78\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`people\` ADD CONSTRAINT \`FK_e2bceeacac0dd5be3d8c37b068c\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`person_greetings\` ADD CONSTRAINT \`FK_4a41cedd362558ab3cc4ba0f084\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`skills\` ADD CONSTRAINT \`FK_b6037133328ed50f9b66cd547de\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`skill_steps\` ADD CONSTRAINT \`FK_12806d13c201f394b67e24dbfc2\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`growth_records\` ADD CONSTRAINT \`FK_3fb75fd7f5af52dd233c85a4f5f\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`journal_entries\` ADD CONSTRAINT \`FK_17b75f0f14fb4d037575c03174a\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`ability_records\` ADD CONSTRAINT \`FK_d50383c8d18156f232217a8800c\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`todos\` ADD CONSTRAINT \`FK_53511787e1f412d746c4bf223ff\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`todos\` DROP FOREIGN KEY \`FK_53511787e1f412d746c4bf223ff\``);
        await queryRunner.query(`ALTER TABLE \`ability_records\` DROP FOREIGN KEY \`FK_d50383c8d18156f232217a8800c\``);
        await queryRunner.query(`ALTER TABLE \`journal_entries\` DROP FOREIGN KEY \`FK_17b75f0f14fb4d037575c03174a\``);
        await queryRunner.query(`ALTER TABLE \`growth_records\` DROP FOREIGN KEY \`FK_3fb75fd7f5af52dd233c85a4f5f\``);
        await queryRunner.query(`ALTER TABLE \`skill_steps\` DROP FOREIGN KEY \`FK_12806d13c201f394b67e24dbfc2\``);
        await queryRunner.query(`ALTER TABLE \`skills\` DROP FOREIGN KEY \`FK_b6037133328ed50f9b66cd547de\``);
        await queryRunner.query(`ALTER TABLE \`person_greetings\` DROP FOREIGN KEY \`FK_4a41cedd362558ab3cc4ba0f084\``);
        await queryRunner.query(`ALTER TABLE \`people\` DROP FOREIGN KEY \`FK_e2bceeacac0dd5be3d8c37b068c\``);
        await queryRunner.query(`ALTER TABLE \`habit_checks\` DROP FOREIGN KEY \`FK_07ce8d11c4d123dcd3260530d78\``);
        await queryRunner.query(`ALTER TABLE \`habits\` DROP FOREIGN KEY \`FK_652ea1f27d16800eca4259546a1\``);
        await queryRunner.query(`ALTER TABLE \`exam_items\` DROP FOREIGN KEY \`FK_4a7f965e0970bb20bffa67cb6d6\``);
        await queryRunner.query(`ALTER TABLE \`exams\` DROP FOREIGN KEY \`FK_2571a05d2f6d3474755677cc015\``);
        await queryRunner.query(`ALTER TABLE \`event_day_logs\` DROP FOREIGN KEY \`FK_7affb0c8155194e9fbe72b54e29\``);
        await queryRunner.query(`ALTER TABLE \`event_items\` DROP FOREIGN KEY \`FK_013033fdbd204892cf2fd07a975\``);
        await queryRunner.query(`ALTER TABLE \`events\` DROP FOREIGN KEY \`FK_09f256fb7f9a05f0ed9927f406b\``);
        await queryRunner.query(`ALTER TABLE \`chat_messages\` DROP FOREIGN KEY \`FK_5588b6cea298cedec7063c0d33e\``);
        await queryRunner.query(`ALTER TABLE \`chats\` DROP FOREIGN KEY \`FK_b6c92d818d42e3e298e84d94414\``);
        await queryRunner.query(`ALTER TABLE \`books\` DROP FOREIGN KEY \`FK_d2211ba79c9312cdcda4d7d5860\``);
        await queryRunner.query(`ALTER TABLE \`kids\` DROP FOREIGN KEY \`FK_a3d815b0140390ffb823056aaec\``);
    }

}
