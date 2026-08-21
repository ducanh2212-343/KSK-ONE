-- KSK One - Tai khoan TV khong duoc doc truc tiep bat ky bang goc nao.
-- TV chi nhan du lieu da loc qua public.ksk_get_display_feed().

drop policy if exists ksk_members_select on public.ksk_members;

create policy ksk_members_select
on public.ksk_members for select
to authenticated
using (
  (select ksk_private.is_parent_of(family_id))
  or (
    (select ksk_private.current_role()) = 'child'
    and id = (select ksk_private.current_member_id())
  )
);
