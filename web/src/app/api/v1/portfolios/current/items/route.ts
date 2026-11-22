import { addCurrentPortfolioItem } from "@/lib/api/mock-portfolios"

export function POST(request: Request) {
  return addCurrentPortfolioItem(request)
}
