import { NextRequest, NextResponse } from 'next/server'
import { fetchStockList } from '@/lib/eastmoney'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const minChange = parseFloat(searchParams.get('minChange') || '-100')
  const maxChange = parseFloat(searchParams.get('maxChange') || '100')
  const minPrice = parseFloat(searchParams.get('minPrice') || '0')
  const maxPrice = parseFloat(searchParams.get('maxPrice') || '999999')
  const minVolume = parseInt(searchParams.get('minVolume') || '0')
  const page = parseInt(searchParams.get('page') || '1')

  const stocks = await fetchStockList(page, 100)

  const filtered = stocks.filter((s) => {
    return (
      s.changePercent >= minChange &&
      s.changePercent <= maxChange &&
      s.price >= minPrice &&
      s.price <= maxPrice &&
      s.volume >= minVolume
    )
  })

  return NextResponse.json(filtered)
}
