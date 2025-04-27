export default {
  async fetch ( request, env, ctx )
  {
    const url = new URL( request.url );
    let pathname = url.pathname;

    if ( pathname === "/" )
    {
      return new Response( "Welcome! Append a file name to download.", {
        status: 200,
        headers: { "content-type": "text/plain" },
      } );
    }

    pathname = pathname.slice( 1 ); // 去掉最前面的 /

    // 这里：决定哪些路径用 R2
    const serveFromAsset = pathname === "Nightly.json" || pathname === "Stable.json";

    try
    {
      if ( !serveFromAsset )
      {
        // 从 R2 bucket 读
        const object = await env.MAJDATA_BUCKET.get( pathname ); // 这里 MY_BUCKET 是 wrangler.toml 绑定的名字
        if ( !object )
        {
          return new Response( "404 Not Found", { status: 404 } );
        }

        const headers = new Headers();
        headers.set( "Content-Type", object.httpMetadata?.contentType || "application/octet-stream" );
        headers.set( "Content-Disposition", "attachment" );

        return new Response( object.body, { headers } );
      } else
      {
        // 从原本的 ASSETS 读
        const manifest = JSON.parse( env.__STATIC_CONTENT_MANIFEST );
        const assetKey = manifest[pathname];

        if ( !assetKey )
        {
          return new Response( "404 Not Found", { status: 404 } );
        }

        const assetBody = await env.__STATIC_CONTENT.get( assetKey, { type: 'arrayBuffer' } );
        if ( !assetBody )
        {
          return new Response( "404 Not Found", { status: 404 } );
        }

        const headers = new Headers();
        headers.set( "Content-Type", getContentType( pathname ) );
        headers.set( "Content-Disposition", "attachment" );

        return new Response( assetBody, { headers } );
      }
    } catch ( e )
    {
      return new Response( "Internal Error", { status: 500 } );
    }
    function getContentType ( pathname )
    {
      if ( pathname.endsWith( ".json" ) )
      {
        return "application/json";
      }
      if ( pathname.endsWith( ".txt" ) )
      {
        return "text/plain";
      }
      if ( pathname.endsWith( ".html" ) )
      {
        return "text/html";
      }
      // 其他情况
      return "application/octet-stream";
    }
  },
};
