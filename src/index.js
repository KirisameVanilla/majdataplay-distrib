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
        <title>MajdataPlayUpdater 下载页</title>
      </head>
      <body>
        <h1>Majdata 分发页</h1>
        <p><a href="/MajdataPlayUpdater.Desktop.exe">点我下载最新版更新器</a></p>
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
        headers.set("Cache-Control", `public, max-age=${1 * 60 * 60}`); // version: 1 hour
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
