import type { ProInterest } from "@/portfolio/types"

const responses = new Set<ProInterest["response"]>(["interested", "not_now"])
const triggers = new Set<ProInterest["trigger"]>(["template", "palette", "customize"])
const priceBands = new Set(["none", "up_to_2000", "2000_5000", "5000_10000", "over_10000"])

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Partial<ProInterest> | null
  const valid =
    body &&
    responses.has(body.response as ProInterest["response"]) &&
    (body.trigger === undefined || triggers.has(body.trigger)) &&
    (body.price_band_ars_month == null || priceBands.has(body.price_band_ars_month))

  if (!valid) {
    return Response.json(
      { error: { code: "invalid_pro_interest", message: "response debe ser interested o not_now.", retryable: false } },
      { status: 400 },
    )
  }

  console.info("[pro-interest]", JSON.stringify({ ...body, at: new Date().toISOString() }))
  return new Response(null, { status: 202 })
}
