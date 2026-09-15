SELECT
  `t`.`id` AS `id`,
  `t`.`member_id` AS `member_id`,
  `t`.`training_id` AS `training_id`,
  `t`.`status` AS `status`,
  `t`.`timestamp` AS `timestamp`,
  `t`.`entity_created_id` AS `created_by`,
  `t`.`expiration` AS `expiration`,
  `t`.`source` AS `source`,
  `t`.`entity_created_id` AS `entity_created_id`
FROM
  (
    `feuerwehr`.`member_training_logs` `t`
    JOIN (
      SELECT
        `feuerwehr`.`member_training_logs`.`member_id` AS `member_id`,
        `feuerwehr`.`member_training_logs`.`training_id` AS `training_id`,
        max(`feuerwehr`.`member_training_logs`.`timestamp`) AS `max_created`
      FROM
        `feuerwehr`.`member_training_logs`
      GROUP BY
        `feuerwehr`.`member_training_logs`.`member_id`,
        `feuerwehr`.`member_training_logs`.`training_id`
    ) `l` ON(
      `t`.`member_id` = `l`.`member_id`
      AND `t`.`training_id` = `l`.`training_id`
      AND `t`.`timestamp` = `l`.`max_created`
    )
  )
WHERE
  `t`.`status` = 'passed'
  OR `t`.`status` = 'attended'