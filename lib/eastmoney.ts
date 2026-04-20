/**
 * 东方财富 API 封装
 * 美股 secid 前缀: 105=纳斯达克, 106=纽交所, 107=美交所
 * 大盘: 100.NDX, 100.SPX, 100.DJI
 *
 * 非交易时间东方财富会把 push2 302 → push2delay，导致延迟飙升。
 * 我们直接检测：如果当前不在美股交易时间，主动使用 delay 服务器。
 */

// ──── 服务器地址（交易时间用实时，非交易时间用延迟服务器） ────
function isUSMarketOpen(): boolean {
  // 美股交易时间: 美东 09:30-16:00 (UTC 13:30-20:00, 夏令时)
  // 简化判断：UTC 13:00-21:00 覆盖冬夏令时
  const now = new Date()
  const utcHour = now.getUTCHours()
  const day = now.getUTCDay() // 0=Sun, 6=Sat
  if (day === 0 || day === 6) return false
  return utcHour >= 13 && utcHour < 21
}

function getQuoteBase(): string {
  return isUSMarketOpen()
    ? 'https://push2.eastmoney.com/api/qt/stock/get'
    : 'https://push2delay.eastmoney.com/api/qt/stock/get'
}

function getKLineBase(): string {
  // K线历史数据: 始终用 push2his，push2delay 在非交易时间返回空 klines
  return 'https://push2his.eastmoney.com/api/qt/stock/kline/get'
}

function getListBase(): string {
  return isUSMarketOpen()
    ? 'https://push2.eastmoney.com/api/qt/clist/get'
    : 'https://push2delay.eastmoney.com/api/qt/clist/get'
}

const US_PREFIXES = ['105', '106', '107']

export interface EastMoneyQuote {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  open: number
  high: number
  low: number
  volume: number
  marketCap?: number
  // 盘前/盘后
  extPrice?: number
  extChange?: number
  extChangePercent?: number
  extType?: 'pre' | 'post'
  extTime?: string
}

export interface EastMoneyKLine {
  time: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

// 记住每只股票对应的市场前缀
const prefixCache = new Map<string, string>()

const HEADERS = {
  'Referer': 'https://quote.eastmoney.com/',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
}

/**
 * 带超时 + 自动重试的 fetch
 * 超时 5s，最多重试 2 次（总计最坏 ~10s 而非之前的 ~36s）
 */
async function robustFetch(url: string, timeout = 5000, maxRetries = 2, customHeaders?: Record<string, string>): Promise<Response> {
  let lastError: Error | null = null
  for (let i = 0; i < maxRetries; i++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeout)
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        cache: 'no-store',
        headers: customHeaders ?? HEADERS,
      })
      clearTimeout(timer)
      return res
    } catch (e) {
      clearTimeout(timer)
      lastError = e as Error
      // 如果还有重试机会，等 300ms
      if (i < maxRetries - 1) {
        await new Promise(r => setTimeout(r, 300))
      }
    }
  }
  throw lastError || new Error('fetch failed')
}

// ──── fetchQuote ────
export async function fetchQuote(symbol: string): Promise<EastMoneyQuote | null> {
  const upperSymbol = symbol.toUpperCase()
  const ut = 'fa5fd1943c7b386f172d6893dbfba10b'

  // 如果已知前缀，只请求那一个
  const cached = prefixCache.get(upperSymbol)
  if (cached) {
    const result = await singleQuote(cached, upperSymbol, ut)
    if (result) return result
    prefixCache.delete(upperSymbol)
  }

  // 并发尝试所有前缀，取第一个成功的（比串行快 3 倍）
  const results = await Promise.all(
    US_PREFIXES.map((prefix) => singleQuote(prefix, upperSymbol, ut))
  )
  return results.find((r) => r !== null) ?? null
}

async function singleQuote(prefix: string, upperSymbol: string, ut: string): Promise<EastMoneyQuote | null> {
  const secid = `${prefix}.${upperSymbol}`
  const url = `${getQuoteBase()}?secid=${secid}&fields=f43,f44,f45,f46,f47,f58,f60,f169,f170&ut=${ut}`

  try {
    const res = await robustFetch(url)
    const data = await res.json()

    if (data?.data && data.data.f43 !== undefined && data.data.f43 !== '-' && data.data.f43 !== null) {
      const d = data.data
      const rawPrice = d.f43
      if (!rawPrice && rawPrice !== 0) return null

      prefixCache.set(upperSymbol, prefix)

      const price = rawPrice / 1000
      const open = (d.f46 || rawPrice) / 1000
      const high = (d.f44 || rawPrice) / 1000
      const low = (d.f45 || rawPrice) / 1000
      const change = (d.f169 || 0) / 1000
      const changePercent = (d.f170 || 0) / 100

      return {
        symbol: upperSymbol,
        name: d.f58 || upperSymbol,
        price: parseFloat(price.toFixed(3)),
        change: parseFloat(change.toFixed(3)),
        changePercent: parseFloat(changePercent.toFixed(2)),
        open: parseFloat(open.toFixed(3)),
        high: parseFloat(high.toFixed(3)),
        low: parseFloat(low.toFixed(3)),
        volume: d.f47 || 0,
      }
    }
  } catch {
    // 网络失败，跳过该前缀
  }
  return null
}

// ──── Yahoo Finance 备用 K 线源（东方财富非交易时间 kline 不可用） ────
const YAHOO_INDEX_MAP: Record<string, string> = {
  'NDX': '^NDX',
  'SPX': '^GSPC',
  'DJI': '^DJI',
}

function yahooRangeFromLimit(limit: number): string {
  if (limit <= 5) return '5d'
  if (limit <= 30) return '1mo'
  if (limit <= 90) return '3mo'
  if (limit <= 180) return '6mo'
  if (limit <= 365) return '1y'
  if (limit <= 730) return '2y'
  return '5y'
}

// Yahoo 日线 period 对照: 101=日线→1d, 102=周线→1wk, 103=月线→1mo
function yahooInterval(period: '101' | '102' | '103'): string {
  if (period === '102') return '1wk'
  if (period === '103') return '1mo'
  return '1d'
}

async function fetchKLineFromYahoo(
  symbol: string,
  period: '101' | '102' | '103',
  limit: number,
  endDate?: string,
): Promise<EastMoneyKLine[]> {
  const yahooSymbol = YAHOO_INDEX_MAP[symbol] || symbol
  const interval = yahooInterval(period)
  const range = yahooRangeFromLimit(limit)

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?range=${range}&interval=${interval}`

  try {
    const res = await robustFetch(url, 8000, 2)
    const data = await res.json()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = (data as any)?.chart?.result?.[0]
    if (!result?.timestamp || !result?.indicators?.quote?.[0]) return []

    const ts: number[] = result.timestamp
    const q = result.indicators.quote[0]
    const klines: EastMoneyKLine[] = []

    // endDate 过滤（如果指定了截止日期）
    const endTs = endDate ? new Date(endDate.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')).getTime() / 1000 : Infinity

    for (let i = 0; i < ts.length; i++) {
      if (ts[i] > endTs) break
      if (q.open[i] == null || q.close[i] == null) continue
      const dt = new Date(ts[i] * 1000)
      const dateStr = dt.toISOString().slice(0, 10)
      klines.push({
        time: dateStr,
        open: parseFloat(q.open[i].toFixed(3)),
        close: parseFloat(q.close[i].toFixed(3)),
        high: parseFloat(q.high[i].toFixed(3)),
        low: parseFloat(q.low[i].toFixed(3)),
        volume: q.volume[i] || 0,
      })
    }

    // 只取最后 limit 条
    return klines.slice(-limit)
  } catch {
    // Yahoo 也失败，返回空
  }
  return []
}

// ──── fetchKLine ────
export async function fetchKLine(
  symbol: string,
  period: '101' | '102' | '103' = '101',
  limit = 365,
  endDate?: string
): Promise<EastMoneyKLine[]> {
  const upperSymbol = symbol.toUpperCase()
  const ut = 'fa5fd1943c7b386f172d6893dbfba10b'
  const endParam = endDate ? endDate.replace(/-/g, '') : '20500101'

  // 先尝试东方财富
  let emResult: EastMoneyKLine[] = []
  try {
    const INDEX_SYMBOLS = ['NDX', 'SPX', 'DJI']
    if (INDEX_SYMBOLS.includes(upperSymbol)) {
      emResult = await fetchKLineWithSecid(`100.${upperSymbol}`, period, endParam, limit, ut)
    } else {
      const cached = prefixCache.get(upperSymbol)
      if (cached) {
        emResult = await fetchKLineWithSecid(`${cached}.${upperSymbol}`, period, endParam, limit, ut)
      }
      if (emResult.length === 0) {
        // 并发尝试所有前缀，取第一个有数据的
        const results = await Promise.all(
          US_PREFIXES.map((prefix) => fetchKLineWithSecid(`${prefix}.${upperSymbol}`, period, endParam, limit, ut))
        )
        for (let i = 0; i < results.length; i++) {
          if (results[i].length > 0) {
            prefixCache.set(upperSymbol, US_PREFIXES[i])
            emResult = results[i]
            break
          }
        }
      }
    }
  } catch {
    // 东方财富完全失败，继续到 Yahoo
  }

  if (emResult.length > 0) return emResult

  // 东方财富无数据（非交易时间 kline 服务不可用），回退 Yahoo Finance
  console.log(`[KLine] 东方财富无数据，回退 Yahoo Finance: ${upperSymbol}`)
  return fetchKLineFromYahoo(upperSymbol, period, limit, endParam)
}

async function fetchKLineWithSecid(secid: string, period: string, endParam: string, limit: number, ut: string): Promise<EastMoneyKLine[]> {
  const url = `${getKLineBase()}?secid=${secid}&fields1=f1,f2,f3,f4,f5,f6&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61&klt=${period}&fqt=1&end=${endParam}&lmt=${limit}&ut=${ut}`
  try {
    const res = await robustFetch(url)
    const data = await res.json()
    if (data?.data?.klines && Array.isArray(data.data.klines) && data.data.klines.length > 0) {
      return data.data.klines.map((line: string) => {
        const parts = line.split(',')
        return {
          time: parts[0],
          open: parseFloat(parts[1]),
          close: parseFloat(parts[2]),
          high: parseFloat(parts[3]),
          low: parseFloat(parts[4]),
          volume: parseFloat(parts[5]),
        }
      })
    }
  } catch {
    // ignore
  }
  return []
}

// ──── fetchIndex ────
export async function fetchIndex(secid: string): Promise<EastMoneyQuote | null> {
  const url = `${getQuoteBase()}?secid=${secid}&fields=f43,f44,f45,f46,f47,f58,f60,f169,f170&ut=fa5fd1943c7b386f172d6893dbfba10b`

  try {
    const res = await robustFetch(url)
    const data = await res.json()

    if (data?.data && data.data.f43 !== undefined) {
      const d = data.data
      const price = d.f43 / 100
      const change = d.f169 / 100
      const changePercent = d.f170 / 100

      return {
        symbol: secid.split('.')[1],
        name: d.f58 || secid,
        price: parseFloat(price.toFixed(2)),
        change: parseFloat(change.toFixed(2)),
        changePercent: parseFloat(changePercent.toFixed(2)),
        open: parseFloat((d.f46 / 100).toFixed(2)),
        high: parseFloat((d.f44 / 100).toFixed(2)),
        low: parseFloat((d.f45 / 100).toFixed(2)),
        volume: d.f47 || 0,
      }
    }
  } catch {
    // ignore
  }
  return null
}

// ──── fetchStockList ────
export async function fetchStockList(page = 1, pageSize = 50): Promise<{ symbol: string; name: string; price: number; changePercent: number; volume: number }[]> {
  const url = `${getListBase()}?pn=${page}&pz=${pageSize}&po=1&np=1&fltt=2&invt=2&fid=f3&fs=m:105,m:106,m:107&fields=f2,f3,f4,f12,f14,f47&ut=fa5fd1943c7b386f172d6893dbfba10b`

  try {
    const res = await robustFetch(url)
    const data = await res.json()

    if (data?.data?.diff && Array.isArray(data.data.diff)) {
      return data.data.diff
        .filter((item: Record<string, unknown>) => item.f2 && item.f2 !== '-' && item.f12)
        .map((item: Record<string, unknown>) => ({
          symbol: item.f12 as string,
          name: (item.f14 as string) || (item.f12 as string),
          price: parseFloat(String(item.f2)) || 0,
          changePercent: parseFloat(String(item.f3)) || 0,
          volume: typeof item.f47 === 'number' ? item.f47 : 0,
        }))
    }
  } catch {
    // ignore
  }
  return []
}

// ──── 新浪财经 盘前/盘后数据 ────
// 新浪美股代码：直接小写 symbol，大盘指数单独映射
const SINA_INDEX_MAP: Record<string, string> = {
  'NDX': 'ndx',
  'SPX': 'inx',
  'DJI': 'dji',
}

interface ExtendedQuote {
  extPrice: number
  extChange: number
  extChangePercent: number
  extType: 'pre' | 'post'
  extTime: string
}

export async function fetchExtendedQuote(symbol: string): Promise<ExtendedQuote | null> {
  const upper = symbol.toUpperCase()
  const sinaCode = SINA_INDEX_MAP[upper] ?? upper.toLowerCase()
  const url = `https://hq.sinajs.cn/list=gb_${sinaCode}`

  try {
    const res = await robustFetch(url, 6000, 1, {
      'Referer': 'https://finance.sina.com.cn',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    })
    const text = await res.text()
    const match = text.match(/hq_str_gb_\w+="(.+)"/)
    if (!match) return null

    const parts = match[1].split(',')
    // [21]=盘前/盘后价, [22]=涨跌幅%, [23]=涨跌额, [24]=盘前/盘后时间(含AM/PM EDT)
    // [25]=上次收盘时间, [26]=昨收价
    const extPriceRaw = parseFloat(parts[21])
    const extChangePctRaw = parseFloat(parts[22])
    const extChangeRaw = parseFloat(parts[23])
    const extTimeRaw = parts[24] ?? ''  // e.g. "Apr 20 04:35AM EDT"
    const lastCloseTimeRaw = parts[25] ?? '' // e.g. "Apr 17 04:00PM EDT"

    if (!extPriceRaw || isNaN(extPriceRaw) || !extTimeRaw) return null

    // 根据时间字段判断是盘前还是盘后
    // 盘前时间含 AM（美东时间），盘后含 PM 且不是收盘时间
    // 更可靠：对比盘前时间和收盘时间的日期是否是同一天
    const isPreMarket = extTimeRaw.includes('AM')
    const isPostMarket = extTimeRaw.includes('PM') && extTimeRaw !== lastCloseTimeRaw

    if (!isPreMarket && !isPostMarket) return null

    // 格式化时间：把 "Apr 20 04:35AM EDT" 简化为 "04:35"
    const timeMatch = extTimeRaw.match(/(\d{2}:\d{2})(AM|PM)/)
    const extTime = timeMatch ? `${timeMatch[1]}${timeMatch[2]}` : extTimeRaw

    return {
      extPrice: extPriceRaw,
      extChange: isNaN(extChangeRaw) ? 0 : extChangeRaw,
      extChangePercent: isNaN(extChangePctRaw) ? 0 : extChangePctRaw,
      extType: isPreMarket ? 'pre' : 'post',
      extTime,
    }
  } catch {
    return null
  }
}
