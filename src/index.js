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

    try
    {
      // 从 R2 bucket 读
      const object = await env.MAJDATA_BUCKET.get( pathname );
      if ( !object )
      {
        return new Response( "404 Not Found", { status: 404 } );
      }

      const headers = new Headers();
      headers.set( "Content-Type", object.httpMetadata?.contentType || "application/octet-stream" );
      headers.set( "Content-Disposition", "attachment" );

      return new Response( object.body, { headers } );

    } catch ( e )
    {
      return new Response( "Internal Error", { status: 500 } );
    }
  },
};
