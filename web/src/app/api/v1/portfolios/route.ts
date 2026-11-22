import { createPortfolio } from "@/lib/api/mock-portfolios"

export async function POST(request: Request) {
  return createPortfolio(request)
}
