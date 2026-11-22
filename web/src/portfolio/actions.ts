"use server"

import type { ProInterest } from "./types"

const responses = new Set<ProInterest["response"]>(["interested", "not_now"])
const triggers = new Set<ProInterest["trigger"]>(["template", "palette", "customize"])
const priceBands = new Set(["none", "up_to_2000", "2000_5000", "5000_10000", "over_10000"])

export async function registerProInterest(body: ProInterest) {
  const valid =
    responses.has(body.response) &&
    triggers.has(body.trigger) &&
    (body.price_band_ars_month === null || priceBands.has(body.price_band_ars_month))
  if (!valid) return { ok: false as const }

  console.info("[pro-interest]", JSON.stringify({ ...body, at: new Date().toISOString() }))
  return { ok: true as const }
}
