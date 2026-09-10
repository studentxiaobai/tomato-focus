import { expect, test } from '@playwright/test';

test('renders the Chinese login screen', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: '欢迎回来' })).toBeVisible();
  await expect(page.getByLabel('邮箱')).toBeVisible();
  await expect(page.getByLabel('密码')).toBeVisible();
});

test('switches between registration and password recovery', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: '没有账号？注册' }).click();
  await expect(page.getByRole('heading', { name: '创建专注空间' })).toBeVisible();
  await page.getByRole('button', { name: '返回登录' }).click();
  await page.getByRole('button', { name: '忘记密码' }).click();
  await expect(page.getByRole('heading', { name: '找回密码' })).toBeVisible();
});
