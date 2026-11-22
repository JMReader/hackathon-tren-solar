import { getPortfolio, updatePortfolio } from "@/lib/api/mock-portfolios"

type Params = { params: Promise<{ id: string }> }

export async function GET(request: Request, { params }: Params) {
  return getPortfolio(request, (await params).id)
}

export async function PATCH(request: Request, { params }: Params) {
  return updatePortfolio(request, (await params).id)
}
