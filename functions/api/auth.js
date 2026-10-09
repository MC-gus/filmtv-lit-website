// 後台「用 GitHub 登入」第一步：把使用者導向 GitHub 授權頁
// 需要在 Cloudflare Pages 設定環境變數 GITHUB_CLIENT_ID、GITHUB_CLIENT_SECRET
export async function onRequest({ request, env }) {
  if (!env.GITHUB_CLIENT_ID) {
    return new Response('後台登入尚未設定：缺少 GITHUB_CLIENT_ID', { status: 500 });
  }
  const url = new URL(request.url);
  const state = crypto.randomUUID();

  const authorize = new URL('https://github.com/login/oauth/authorize');
  authorize.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
  authorize.searchParams.set('redirect_uri', `${url.origin}/api/callback`);
  authorize.searchParams.set('scope', 'public_repo,read:user');
  authorize.searchParams.set('state', state);

  return new Response(null, {
    status: 302,
    headers: {
      Location: authorize.href,
      'Set-Cookie': `oauth_state=${state}; Path=/api; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
    },
  });
}
