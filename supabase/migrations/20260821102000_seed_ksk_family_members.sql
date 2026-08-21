-- KSK One - Khoi tao ho so gia dinh. Tai khoan Auth se duoc gan rieng,
-- khong luu email hoac mat khau trong migration/source code.

with family as (
  select gen_random_uuid() as family_id
)
insert into public.ksk_members (
  family_id,
  role,
  child_slug,
  display_name,
  full_name,
  color
)
select
  family.family_id,
  member.role::public.ksk_member_role,
  member.child_slug,
  member.display_name,
  member.full_name,
  member.color
from family
cross join (
  values
    ('parent', null, 'Bố mẹ', null, '#2563eb'),
    ('display', null, 'KSK TV', null, '#0f172a'),
    ('child', 'khoai', 'Khoai', 'Trần Lưu Trí Dương', '#f97316'),
    ('child', 'san', 'Sắn', 'Trần Lưu Quốc Bảo', '#0f9f78'),
    ('child', 'kem', 'Kem', 'Trần Lưu Quốc Vũ', '#6d5bd0')
) as member(role, child_slug, display_name, full_name, color);
