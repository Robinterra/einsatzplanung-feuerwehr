INSERT INTO member_presence_logs (member_id, present)
    select id, 1 from members
    limit 40

