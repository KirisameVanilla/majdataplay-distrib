export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    let pathname = url.pathname;

    if (pathname === "/") {
      return new Response("Welcome! Append a file name to download.", {
        status: 200,
        headers: { "content-type": "text/plain" },
      });
    }

    pathname = pathname.slice(1); // 去掉最前面的 /

    // 这里：决定哪些路径用 R2
    const serveFromR2 = pathname==="Nightly.json" || pathname==="Stable.json";

    try {
      if (!serveFromR2) {
        // 从 R2 bucket 读
        const object = await env.MAJDATA_BUCKET.get(pathname); // 这里 MY_BUCKET 是 wrangler.toml 绑定的名字
        if (!object) {
          return new Response("404 Not Found", { status: 404 });
        }

        const headers = new Headers();
        headers.set("Content-Type", object.httpMetadata?.contentType || "application/octet-stream");
        headers.set("Content-Disposition", "attachment");

        return new Response(object.body, { headers });
      } else {
        // 从原本的 ASSETS 读
        const file = await env.ASSETS.fetch(request);
        if (file.status === 404) {
          return new Response("404 Not Found", { status: 404 });
        }

        const newHeaders = new Headers(file.headers);
        newHeaders.set("Content-Disposition", "attachment");

        return new Response(file.body, {
          status: file.status,
          statusText: file.statusText,
          headers: newHeaders,
        });
      }
    } catch (e) {
      return new Response("Internal Error", { status: 500 });
    }
  },
};
