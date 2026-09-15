SELECT
  `m`.`id` AS `id`,
  `m`.`first_name` AS `first_name`,
  `m`.`last_name` AS `last_name`,
  `m`.`personnel_nr` AS `personnel_nr`,
  `m`.`gender` AS `gender`,
  `m`.`image_url` AS `image_url`,
  `m`.`department` AS `department`,
  `p`.`timestamp` AS `presence_timestamp`,
  coalesce(`p`.`present`, 0) AS `present`,
  `p`.`seat_id` AS `seat_id`
FROM
  (
    `feuerwehr`.`members` `m`
    LEFT JOIN (
      SELECT
        `feuerwehr`.`member_presence_logs`.`member_id` AS `member_id`,
        `feuerwehr`.`member_presence_logs`.`timestamp` AS `timestamp`,
        `feuerwehr`.`member_presence_logs`.`present` AS `present`,
        `feuerwehr`.`member_presence_logs`.`seat_id` AS `seat_id`,
        row_number() over (
          PARTITION by `feuerwehr`.`member_presence_logs`.`member_id`
          ORDER BY
            `feuerwehr`.`member_presence_logs`.`timestamp` DESC
        ) AS `rn`
      FROM
        `feuerwehr`.`member_presence_logs`
    ) `p` ON(
      `m`.`id` = `p`.`member_id`
      AND `p`.`rn` = 1
    )
  )