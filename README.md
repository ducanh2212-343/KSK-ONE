# KSK One

Web app quản lý lịch học, nhiệm vụ và sự phát triển của Khoai, Sắn và Kem.

## Trạng thái hiện tại

Giai đoạn 1 đang triển khai trên branch `codex/ksk-one-phase-1`:

- Màn hình bố mẹ responsive tại `/ksk/parent`.
- Tạo/sửa nhiệm vụ và sự kiện.
- Theo dõi việc chưa làm, con báo đã làm và việc đã xác nhận.
- Bố mẹ xác nhận hoàn thành, huỷ nhiệm vụ và trao Sao Xứng Đáng.
- Chế độ demo bằng `localStorage` để kiểm thử UI trước khi có Supabase project riêng.
- Migration Supabase cho các bảng `ksk_*`, RLS và Realtime.
- Cấu hình Cloudflare Workers Static Assets cho SPA.

Các route `/ksk/child/:slug` và `/ksk/display` mới là trang giữ chỗ, sẽ làm ở Giai đoạn 2.

## Công nghệ

- React + TypeScript + Vite.
- Supabase Auth, Postgres, RLS và Realtime.
- Cloudflare Workers Static Assets.
- Vitest cho kiểm thử logic quyền chuyển trạng thái.

## Chạy và kiểm tra

```text
npm install
npm run test
npm run build
npm run preview
```

Không cần Docker, WSL hay Supabase local để chạy giao diện demo.

## Kết nối Supabase

Sao chép `.env.example` thành `.env.local` rồi đặt:

```text
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
```

Frontend chỉ được dùng publishable key. Tuyệt đối không đặt `service_role`, secret key, mật khẩu Vinschool One hoặc LMS vào source code hay biến môi trường phía client.

Migration đầu tiên nằm trong `supabase/migrations/`. Migration này:

- Tạo `ksk_members`, `ksk_tasks`, `ksk_events`, `ksk_stars`, `ksk_inbox`.
- Bật RLS trên toàn bộ bảng.
- Cho bố mẹ quản lý dữ liệu trong đúng gia đình.
- Cho con chỉ xem dữ liệu của mình và chỉ đổi trạng thái nhiệm vụ sang `in_progress` hoặc `child_reported_done`.
- Chặn display user đọc trực tiếp bảng gốc; RPC TV chỉ trả dữ liệu đã loại bỏ trường nhạy cảm.
- Thêm các bảng nhiệm vụ, sự kiện và sao vào Supabase Realtime publication.

Migration chưa được áp dụng online vì chưa có Supabase project KSK One riêng và việc tạo project cần xác nhận organization/chi phí.

## Deploy preview

```text
npm run build
npx wrangler deploy --temporary
```

Preview tạm thời không dùng domain production. Khi Cloudflare account được kết nối, branch này sẽ được deploy thành môi trường preview ổn định trước khi merge.

