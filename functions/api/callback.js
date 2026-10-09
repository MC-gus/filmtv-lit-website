// 後台「用 GitHub 登入」第二步：GitHub 授權完成後回到這裡，換取登入權杖交給後台
export async function onRequest({ request, env }) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const savedState = (request.headers.get('Cookie') || '').match(/oauth_state=([^;]+)/)?.[1];

  if (!code || !state || state !== savedState) {
    return reply(url.origin, 'error', { message: '登入驗證失敗，請關閉此視窗後重新登入' });
  }

  const res = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'User-Agent': 'filmtv-cms' },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: `${url.origin}/api/callback`,
    }),
  });
  const data = await res.json().catch(() => ({}));

  if (!data.access_token) {
    return reply(url.origin, 'error', { message: data.error_description || '無法取得 GitHub 授權' });
  }
  return reply(url.origin, 'success', { token: data.access_token, provider: 'github' });
}

// 用 Decap CMS 規定的 postMessage 格式回傳結果
// 只回傳給「本站自己的後台頁面」，避免其他網站開這個視窗偷拿權杖
function reply(origin, status, content) {
  const message = JSON.stringify(`authorization:github:${status}:${JSON.stringify(content)}`);
  const text = status === 'success' ? '登入成功，視窗即將關閉…' : `登入失敗：${escapeHtml(content.message)}`;
  const html = `<!doctype html><html lang="zh-TW"><meta charset="utf-8"><body style="background:#0a0a0a;color:#f0ede8;font-family:sans-serif;padding:2rem">
<p>${text}</p>
<script>
  (function () {
    var allowed = ${JSON.stringify(origin)};
    function receive(e) {
      if (e.origin !== allowed) return;
      window.opener.postMessage(${message}, allowed);
      window.removeEventListener('message', receive, false);
    }
    window.addEventListener('message', receive, false);
    if (window.opener) window.opener.postMessage('authorizing:github', allowed);
  })();
</script></body></html>`;
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Set-Cookie': 'oauth_state=; Path=/api; HttpOnly; Secure; SameSite=Lax; Max-Age=0',
    },
  });
}

function escapeHtml(s = '') {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
