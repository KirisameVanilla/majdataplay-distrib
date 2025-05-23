export default {
  async fetch ( request, env, ctx )
  {
    const url = new URL( request.url );
    let pathname = url.pathname;

    if ( pathname === "/" ) {
      const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>Majdata工作2000</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(to bottom right, #eef2f3, #cfd9df);
      margin: 0;
      padding: 2rem;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
    }
    .container {
      background: white;
      padding: 2rem 3rem;
      border-radius: 16px;
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
      text-align: center;
      max-width: 500px;
      width: 100%;
    }
    h1 {
      color: #333;
    }
    a.button {
      display: inline-block;
      margin-top: 1rem;
      padding: 0.75rem 1.5rem;
      background-color: #0078D4;
      color: white;
      text-decoration: none;
      border-radius: 8px;
      font-size: 1.1rem;
      transition: background-color 0.3s ease;
    }
    a.button:hover {
      background-color: #005ea6;
    }
    .history-box {
      margin-top: 2rem;
      padding: 1rem;
      background-color: #f7f9fa;
      border: 1px solid #d1d5da;
      border-radius: 12px;
      text-align: left;
    }
    .history-box h2 {
      font-size: 1.1rem;
      margin-bottom: 0.5rem;
      color: #333;
    }
    .history-box ul {
      list-style: none;
      padding-left: 0;
    }
    .history-box li {
      margin: 0.5rem 0;
    }
    .history-box a {
      color: #0078D4;
      text-decoration: none;
    }
    .history-box a:hover {
      text-decoration: underline;
    }
    .footer {
      margin-top: 2rem;
      font-size: 0.9rem;
      color: #888;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>MajdataPlay更新器</h1>
    <p><a class="button" href="/MajdataPlayUpdater.Desktop.exe">点我下载最新版更新器</a></p>

    <div class="history-box">
      <h2>MajdataPlay历史版本</h2>
      <ul>
        <li><a href="/MajdataPlay-0.1.0-rc1-Release.7z">0.1.0-rc1</a></li>
      </ul>
    </div>

    <div class="footer">由 Cloudflare Worker 提供加速</div>
  </div>
</body>
</html>
`;


      const headers = new Headers();
      headers.set("Content-Type", "text/html; charset=UTF-8");
      headers.set("Cache-Control", "public, max-age=60");
      
      return new Response( html, {
        status: 200,
        headers,
      });
    }

    pathname = decodeURIComponent(pathname.slice( 1 )); // 去掉最前面的 /
    const forceRefresh = url.searchParams.get('refresh') === '1';

    const cache = caches.default;
    const cacheKey = new Request(url.origin + url.pathname, request);

    if (!forceRefresh) {
      const cachedResponse = await cache.match(cacheKey);
      if (cachedResponse) {
        return cachedResponse;
      }
    }

    try
    {
      // 从 R2 bucket 读
      const object = await env.MAJDATA_BUCKET.get( pathname );
      if ( !object ) {
        return new Response( "404 Not Found", { status: 404 } );
      }

      const headers = new Headers();
      headers.set( "Content-Type", object.httpMetadata?.contentType || "application/octet-stream" );
      headers.set( "Content-Disposition", "attachment" );

      if (pathname === "Nightly.json" || pathname === "Stable.json") {
        headers.set("Cache-Control", "no-store");
      } else if (pathname.startsWith("Stable/")) {
        headers.set("Cache-Control", `public, max-age=${25 * 24 * 60 * 60}`); // stable: 25 days
      } else if (pathname.startsWith("Nightly/")) {
        headers.set("Cache-Control", `public, max-age=${3 * 60 * 60}`); // nightly: 3 hours
      } else {
        headers.set("Cache-Control", "no-store");
      }

      const response = new Response(object.body, { headers });
      if (!forceRefresh) {
        ctx.waitUntil(cache.put(cacheKey, response.clone()));
      }
      
      return response;

    } catch ( e ) {
      return new Response( "Internal Error", { status: 500 } );
    }
  },
};
