-- KSK One - Thu hoi cac quyen mac dinh co the vuot ngoai RLS.
-- Chi giu cac thao tac ung dung can dung; RLS tiep tuc quyet dinh tung dong du lieu.

revoke all on table public.ksk_members from authenticated;
revoke all on table public.ksk_tasks from authenticated;
revoke all on table public.ksk_events from authenticated;
revoke all on table public.ksk_stars from authenticated;
revoke all on table public.ksk_inbox from authenticated;

grant select, insert, update, delete on table public.ksk_members to authenticated;
grant select, insert, update, delete on table public.ksk_tasks to authenticated;
grant select, insert, update, delete on table public.ksk_events to authenticated;
grant select, insert, update, delete on table public.ksk_stars to authenticated;
grant select, insert, update, delete on table public.ksk_inbox to authenticated;
