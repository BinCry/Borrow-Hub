#!/usr/bin/env bash
set -e

echo "🚀 Bắt đầu quá trình Deploy Borrow Hub..."

# 1. Kéo code mới nhất từ nhánh main (giả định dùng git)
echo "📦 Đang kéo code mới nhất..."
git pull origin main || echo "⚠️ Không thể git pull, bỏ qua bước này..."

# 2. Cài đặt dependencies và chuẩn bị Prisma
echo "🔧 Đang cài đặt dependencies..."
pnpm install --frozen-lockfile

# 3. Tạo/Cập nhật file .env từ .env.example (nếu chưa có)
if [ ! -f .env ]; then
  echo "📄 Không tìm thấy .env, đang copy từ .env.example..."
  cp .env.example .env
fi

# 4. Chạy Prisma migrations
echo "🗄️ Đang apply database migrations..."
pnpm --filter toolshare-api prisma:generate
# Nếu production, nên dùng prisma migrate deploy thay vì db push, nhưng đây là môi trường staging:
pnpm --filter toolshare-api prisma:db:push --accept-data-loss || echo "⚠️ Database push failed, check your connection."

# 5. Build và khởi động lại Docker compose
echo "🐳 Đang khởi động Docker containers..."
docker-compose -f docker-compose.production.yml up -d --build

echo "✅ Deploy hoàn tất! Ứng dụng đang chạy ở cổng 3000."
