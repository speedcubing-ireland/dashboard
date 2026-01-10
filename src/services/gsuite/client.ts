import { useGSuiteAuthStore } from '@/stores/gsuite-auth'

const APIS = {
  ADMIN: 'https://admin.googleapis.com/admin/directory/v1',
  GROUPS: 'https://www.googleapis.com/groups/v1/groups',
  SHEETS: 'https://sheets.googleapis.com/v4/spreadsheets',
  DRIVE: 'https://www.googleapis.com/drive/v3',
} as const

class GSuiteError extends Error {
  status: number
  code?: string

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.status = status
    this.code = code
    this.name = 'GSuiteError'
  }
}

type RequestParams = Record<string, string | number | boolean | undefined>

async function fetchWithAuth<T>(url: string, accessToken: string, options: RequestInit = {}): Promise<T> {
  const store = useGSuiteAuthStore.getState()
  if (store.isAuthenticated && store.isTokenExpired()) {
    store.logout()
    throw new GSuiteError('Session expired', 401, 'TOKEN_EXPIRED')
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      store.logout()
    }
    const data = await response.json().catch(() => ({}))
    throw new GSuiteError(data.error?.message || `HTTP ${response.status}`, response.status, data.error?.code)
  }

  return response.status === 204 ? ({} as T) : response.json()
}

function buildUrl(baseUrl: string, endpoint: string, params?: RequestParams): string {
  const url = new URL(`${baseUrl}${endpoint}`)
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) url.searchParams.append(key, String(value))
    })
  }
  return url.toString()
}

function createApiRequest(api: keyof typeof APIS) {
  return <T>(endpoint: string, accessToken: string, options: RequestInit & { params?: RequestParams } = {}): Promise<T> => {
    const { params, ...init } = options
    return fetchWithAuth<T>(buildUrl(APIS[api], endpoint, params), accessToken, init)
  }
}

export const adminRequest = createApiRequest('ADMIN')

export async function fetchAll<T>(
  requestFn: (token: string, params: Record<string, unknown>) => Promise<{ items?: T[]; nextPageToken?: string }>,
  token: string,
  params: Record<string, unknown> = {}
): Promise<T[]> {
  const items: T[] = []
  let pageToken: string | undefined
  do {
    const response = await requestFn(token, { ...params, pageToken })
    if (response.items) items.push(...response.items)
    pageToken = response.nextPageToken
  } while (pageToken)
  return items
}

