const errorMessages: Record<string, string> = {
  'Invalid login credentials': '邮箱或密码不正确。',
  'Email not confirmed': '请先打开邮箱中的验证链接完成验证。',
  'User already registered': '这个邮箱已经注册，请直接登录。',
  'Password should be at least 6 characters': '密码至少需要 6 个字符。',
  'For security purposes, you can only request this after 60 seconds': '操作过于频繁，请稍后再试。',
  'Email rate limit exceeded': '邮件发送过于频繁，请稍后再试。',
};

export function toUserMessage(error: unknown): string {
  if (!(error instanceof Error)) return '操作失败，请稍后重试。';
  return errorMessages[error.message] ?? error.message;
}
