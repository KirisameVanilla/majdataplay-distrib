import { getAssetFromKV } from '@cloudflare/kv-asset-handler';

export default {
  async fetch(request, env, ctx) {
    try {
      // 尝试直接返回静态文件
      const asset = await getAssetFromKV({
        request,
        waitUntil: ctx.waitUntil.bind(ctx),
      });
      
      // 强制加下载头（让浏览器下载）
      const response = new Response(asset.body, asset);
      response.headers.set('Content-Disposition', 'attachment');

      return response;
    } catch (e) {
      // 如果没找到文件，返回404
      return new Response('404 Not Found', { status: 404 });
    }
  }
}
