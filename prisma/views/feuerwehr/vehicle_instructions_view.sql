SELECT
  `vil`.`id` AS `id`,
  `vil`.`vehicle_id` AS `vehicle_id`,
  `vil`.`member_id` AS `member_id`,
  `vil`.`created_at` AS `created_at`,
  `ae`.`member_id` AS `created_by`,
  `vil`.`suspended_until` AS `suspended_until`,
  `vil`.`created_by_entity_id` AS `entity_created_id`
FROM
  (
    (
      `feuerwehr`.`vehicle_instruction_logs` `vil`
      LEFT JOIN `feuerwehr`.`auth_entities` `ae` ON(`vil`.`created_by_entity_id` = `ae`.`id`)
    )
    JOIN (
      SELECT
        `feuerwehr`.`vehicle_instruction_logs`.`member_id` AS `member_id`,
        `feuerwehr`.`vehicle_instruction_logs`.`vehicle_id` AS `vehicle_id`,
        max(
          `feuerwehr`.`vehicle_instruction_logs`.`created_at`
        ) AS `max_created_at`
      FROM
        `feuerwehr`.`vehicle_instruction_logs`
      GROUP BY
        `feuerwehr`.`vehicle_instruction_logs`.`member_id`,
        `feuerwehr`.`vehicle_instruction_logs`.`vehicle_id`
    ) `latest` ON(
      `vil`.`member_id` = `latest`.`member_id`
      AND `vil`.`vehicle_id` = `latest`.`vehicle_id`
      AND `vil`.`created_at` = `latest`.`max_created_at`
    )
  )
WHERE
  `vil`.`instructed` = 1