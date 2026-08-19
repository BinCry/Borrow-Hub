# Borrow Hub Database Runbook

## Nguyên tắc

- PostgreSQL không được publish ra Internet; service chỉ nằm trong network `data` nội bộ.
- Production chỉ dùng migration đã commit với `prisma migrate deploy`.
- Mỗi release có migration phải có backup và một lần restore thử nghiệm gần đây.
- File backup chứa dữ liệu cá nhân/KYC phải được mã hóa và giới hạn quyền truy cập.

## Kiểm tra trạng thái

```bash
cd /srv/borrow-hub/repo
docker compose -f docker-compose.production.yml ps postgres
docker compose -f docker-compose.production.yml exec postgres \
  pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"
docker compose -f docker-compose.production.yml run --rm migrate
```

Lệnh migrate có tính lặp lại: migration đã áp dụng sẽ không chạy lại.

## Tạo backup nhất quán

```bash
cd /srv/borrow-hub/repo
umask 077
BACKUP_FILE="/srv/borrow-hub/backups/borrowhub-$(date -u +%Y%m%dT%H%M%SZ).dump"
docker compose -f docker-compose.production.yml exec -T postgres \
  sh -ec 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc --no-owner --no-acl' \
  > "$BACKUP_FILE"
test -s "$BACKUP_FILE"
sha256sum "$BACKUP_FILE" > "$BACKUP_FILE.sha256"
```

Sao chép backup đã mã hóa sang một vị trí ngoài VPS. Backup chỉ nằm cùng VPS không bảo vệ được khi ổ đĩa hoặc máy chủ hỏng.

## Phục hồi vào môi trường kiểm thử

Không restore đè production để “thử backup”. Dùng database/stack kiểm thử cô lập:

```bash
sha256sum -c <BACKUP_FILE>.sha256
createdb borrowhub_restore_test
pg_restore --exit-on-error --no-owner --no-acl \
  --dbname=borrowhub_restore_test <BACKUP_FILE>
```

Sau restore, kiểm tra ít nhất:

```sql
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM assets;
SELECT COUNT(*) FROM rental_requests;
SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY finished_at DESC;
```

Khởi động một API staging trỏ vào database phục hồi rồi chạy health check và smoke test auth/rental/payment.

## Phục hồi production khi có sự cố

1. Ghi lại thời điểm sự cố và dừng API/Caddy để ngăn phát sinh ghi mới.
2. Tạo một snapshot cuối của database lỗi nếu còn đọc được.
3. Xác minh checksum và thời điểm của backup cần phục hồi.
4. Restore vào database mới, không ghi đè database cũ ngay từ đầu.
5. Chạy `prisma migrate deploy` của release sẽ khởi động.
6. Smoke test trên cổng nội bộ.
7. Chuyển connection string, khởi động API/Caddy và theo dõi log.
8. Giữ database lỗi ở chế độ chỉ đọc đến khi xác nhận không cần điều tra thêm.

## Chính sách lưu giữ gợi ý

- Backup hằng ngày: 7 bản.
- Backup hằng tuần: 4 bản.
- Backup hằng tháng: 3 bản.
- Kiểm tra checksum sau mỗi lần sao chép.
- Restore drill ít nhất mỗi tháng và trước thay đổi schema lớn.

Điều chỉnh thời gian lưu theo yêu cầu pháp lý và chính sách dữ liệu cá nhân của tổ chức.

## Migration an toàn

- Ưu tiên quy trình expand/migrate/contract cho thay đổi phá vỡ tương thích.
- Thêm cột nullable/default trước, deploy code tương thích, backfill theo batch, sau đó mới siết constraint.
- Tạo index lớn bằng chiến lược giảm lock phù hợp với PostgreSQL và kiểm tra query plan.
- Không sửa nội dung migration đã chạy ở production; tạo migration khắc phục mới.
- Không dùng `prisma migrate reset`, `prisma db push` hoặc seed development trên production.
