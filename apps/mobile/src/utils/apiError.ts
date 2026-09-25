import { isAxiosError } from 'axios';

function getResponseMessage(error: unknown): string | undefined {
  if (!isAxiosError(error)) return undefined;
  // Production uses AllExceptionsFilter: { success: false, error: { message } }.
  const message: unknown = error.response?.data?.error?.message ?? error.response?.data?.message;
  if (typeof message === 'string' && message.trim()) return message;
  if (Array.isArray(message) && message.every((item) => typeof item === 'string')) {
    return message.join('\n') || undefined;
  }
  return undefined;
}

export function isMissingApiRoute(error: unknown, method: string, path: string): boolean {
  if (!isAxiosError(error) || error.response?.status !== 404) return false;
  const message = getResponseMessage(error);
  return !!message && message.startsWith(`Cannot ${method.toUpperCase()} `) && message.endsWith(path);
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  const message = getResponseMessage(error);
  if (message) {
    if (/^Cannot (DELETE|PATCH|POST|PUT) \//.test(message)) {
      return 'Chức năng này chưa khả dụng trên máy chủ. Vui lòng thử lại sau khi hệ thống được cập nhật.';
    }
    return message;
  }

  if (isAxiosError(error)) {
    const status = error.response?.status;
    if (status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
    if (status === 403) return 'Bạn không có quyền thực hiện thao tác này.';
    if (status === 404) return 'Không tìm thấy dữ liệu yêu cầu.';
    if (status === 429) return 'Bạn thao tác quá nhanh. Vui lòng chờ một chút rồi thử lại.';
    if (status && status >= 500) return 'Máy chủ đang gặp lỗi. Vui lòng thử lại sau.';
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return 'Máy chủ phản hồi quá lâu. Vui lòng thử lại.';
    }
  }
  return fallback;
}
