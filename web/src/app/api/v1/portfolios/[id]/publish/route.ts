import { publishPortfolio, unpublishPortfolio } from "@/lib/api/mock-portfolios"

type Params = { params: Promise<{ id: string }> }

export async function POST(request: Request, { params }: Params) {
  return publishPortfolio(request, (await params).id)
}

export async function DELETE(request: Request, { params }: Params) {
  return unpublishPortfolio(request, (await params).id)
}
