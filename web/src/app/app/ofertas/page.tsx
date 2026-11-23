import type { Metadata } from "next"
import { Offers } from "@/components/app/offers"

export const metadata: Metadata = { title: "Ofertas" }

export default function OffersPage() {
  return <Offers />
}
