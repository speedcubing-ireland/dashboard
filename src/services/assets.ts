import QRCode from 'qrcode'
import { base64ToBytes } from '@/utils/pdf'
import { ASSET_PATHS } from '@/constants'

export async function loadFlagBytes(countryCode: string): Promise<Uint8Array> {
  const code = countryCode.toLowerCase()
  const url = code === 'tw' ? ASSET_PATHS.chineseTaipeiFlag : `https://flagcdn.com/h240/${code}.png`

  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error()
    return new Uint8Array(await res.arrayBuffer())
  } catch {
    return new Uint8Array(0)
  }
}

export async function preloadFlags(countryCodes: string[]): Promise<Map<string, Uint8Array>> {
  const flags = new Map<string, Uint8Array>()
  const unique = [...new Set(countryCodes)]
  await Promise.all(
    unique.map(async (code) => {
      try {
        flags.set(code, await loadFlagBytes(code))
      } catch {}
    })
  )
  return flags
}

export function extractUrl(text: string): string | null {
  if (!text) return null
  const match = text.match(/(https?:\/\/[^\s]+|www\.[^\s]+)/gi)
  if (!match?.length) return null
  return match[0].startsWith('www.') ? `https://${match[0]}` : match[0]
}

export async function generateQRBytes(text: string, width = 200): Promise<Uint8Array> {
  const dataUrl = await QRCode.toDataURL(text, { width, margin: 1 })
  return base64ToBytes(dataUrl)
}

async function loadImageData(path: string | null): Promise<string | null> {
  if (!path) return null
  if (path.startsWith('data:')) return path

  if (path.startsWith('/') || path.startsWith('http')) {
    const res = await fetch(path)
    const blob = await res.blob()
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }
  return path
}

export interface ImageAssets {
  background?: Uint8Array
  logo?: Uint8Array
  wcaLogo?: Uint8Array
  flags: Map<string, Uint8Array>
  qrCode?: Uint8Array
}

export async function prepareImages(
  config: { backgroundImage?: string | null; logoImage?: string | null; wcaLogoImage?: string | null },
  flags: Map<string, Uint8Array>,
  qrCode?: Uint8Array
): Promise<ImageAssets> {
  const assets: ImageAssets = { flags }

  const [bg, logo, wca] = await Promise.all([
    loadImageData(config.backgroundImage ?? null),
    loadImageData(config.logoImage ?? null),
    loadImageData(config.wcaLogoImage ?? null),
  ])

  if (bg) assets.background = base64ToBytes(bg)
  if (logo) assets.logo = base64ToBytes(logo)
  if (wca) assets.wcaLogo = base64ToBytes(wca)
  if (qrCode) assets.qrCode = qrCode

  return assets
}
