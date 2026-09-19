#neu Member kommen an
INSERT INTO member_presence_logs (member_id, present)
select id, 1 from member_presence_view
where present = 0
limit 25;

#alle Member gehen
INSERT INTO member_presence_logs (member_id, present)
select id, 0 from members;

#Einteilung löschen
INSERT INTO feuerwehr.member_presence_logs (member_id, present, seat_id)
select member_presence_view.id, 1,null from member_presence_view
where present = 1;

#qualis checken
SELECT member_presence_view.first_name, member_presence_view.last_name, trainings.key
FROM member_presence_view JOIN member_trainings_view ON member_presence_view.id = member_trainings_view.member_id
    JOIN trainings ON member_trainings_view.training_id = trainings.id
WHERE `key` = "AGT";

#sitze finden
SELECT vehicles.opta, vehicle_seats.seat
FROM vehicles join vehicle_seats ON vehicles.id = vehicle_seats.vehicle_id
WHERE vehicle_seats.agt = 1;