const GIPHY_API_BASE_URL = 'https://api.giphy.com/v1/gifs'
const GIPHY_API_KEY = import.meta.env.VITE_GIPHY_API_KEY as string | undefined

type GiphyImage = {
  url?: string
  width?: string
  height?: string
  size?: string
}

type GiphyItem = {
  id: string
  title?: string
  images?: {
    fixed_width?: GiphyImage
    fixed_width_small?: GiphyImage
    original?: GiphyImage
  }
}

type GiphyResponse = {
  data?: GiphyItem[]
}

export type GifSearchResult = {
  id: string
  title: string
  url: string
  previewUrl: string
  width: number
  height: number
  sizeBytes: number
}

function parseNumber(value?: string) {
  const parsed = Number(value)

  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

function mapGif(item: GiphyItem): GifSearchResult | null {
  const image = item.images?.fixed_width || item.images?.original
  const preview = item.images?.fixed_width_small || image

  if (!image?.url || !preview?.url) {
    return null
  }

  return {
    id: item.id,
    title: item.title?.trim() || 'GIF',
    url: image.url,
    previewUrl: preview.url,
    width: parseNumber(image.width),
    height: parseNumber(image.height),
    sizeBytes: parseNumber(image.size),
  }
}

export async function fetchGifs(query: string, limit = 24) {
  if (!GIPHY_API_KEY) {
    throw new Error('Chua cau hinh VITE_GIPHY_API_KEY de tim GIF.')
  }

  const params = new URLSearchParams({
    api_key: GIPHY_API_KEY,
    limit: String(limit),
    rating: 'pg-13',
    lang: 'vi',
  })
  const path = query.trim() ? 'search' : 'trending'

  if (query.trim()) {
    params.set('q', query.trim())
  }

  const response = await fetch(`${GIPHY_API_BASE_URL}/${path}?${params.toString()}`)
  const body = (await response.json().catch(() => ({}))) as GiphyResponse

  if (!response.ok) {
    throw new Error('Khong the tai GIF tu GIPHY.')
  }

  return (body.data || [])
    .map(mapGif)
    .filter((item): item is GifSearchResult => Boolean(item))
}
