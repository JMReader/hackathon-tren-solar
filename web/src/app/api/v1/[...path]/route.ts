const TARGET = process.env.API_PROXY_TARGET ?? "http://localhost:8000"
const HOP_BY_HOP = new Set(["connection", "content-length", "host", "transfer-encoding"])

async function proxy(request: Request, path: string[]) {
  const url = new URL(request.url)
  const upstream = `${TARGET}/api/v1/${path.map(encodeURIComponent).join("/")}${url.search}`
  const headers = new Headers()
  for (const [name, value] of request.headers) {
    if (!HOP_BY_HOP.has(name.toLowerCase())) headers.set(name, value)
  }
  const hasBody = request.method !== "GET" && request.method !== "HEAD"
  const res = await fetch(upstream, {
    method: request.method,
    headers,
    body: hasBody ? await request.arrayBuffer() : undefined,
  })
  return new Response(res.body, {
    status: res.status,
    headers: { "content-type": res.headers.get("content-type") ?? "application/json" },
  })
}

export async function GET(request: Request, ctx: { params: Promise<{ path: string[] }> }) {
  return proxy(request, (await ctx.params).path)
}

export async function POST(request: Request, ctx: { params: Promise<{ path: string[] }> }) {
  return proxy(request, (await ctx.params).path)
}

export async function PUT(request: Request, ctx: { params: Promise<{ path: string[] }> }) {
  return proxy(request, (await ctx.params).path)
}

export async function PATCH(request: Request, ctx: { params: Promise<{ path: string[] }> }) {
  return proxy(request, (await ctx.params).path)
}

export async function DELETE(request: Request, ctx: { params: Promise<{ path: string[] }> }) {
  return proxy(request, (await ctx.params).path)
}
