import { getCurrentPortfolio } from "@/lib/api/mock-portfolios"

export function GET(request: Request) {
  return getCurrentPortfolio(request)
}
