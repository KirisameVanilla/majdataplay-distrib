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
  
      pathname = pathname.slice(1);
  
      try {
        const file = await env.ASSETS.fetch(request);
        if (file.status === 404) {
          return new Response("404 Not Found", { status: 404 });
        }
  
        const newHeaders = new Headers(file.headers);
        newHeaders.set('Content-Disposition', 'attachment');
  
        return new Response(file.body, {
          status: file.status,
          statusText: file.statusText,
          headers: newHeaders,
        });
  
      } catch (e) {
        return new Response('Internal Error', { status: 500 });
      }
    }
  }
  