import { useGSuiteAuthStore } from '@/stores/gsuite-auth'
import { getErrorMessage } from '@/utils/error'
import type { CellData, SpreadsheetWithGridData } from '@/types/gsuite'

export type { CellData, SpreadsheetWithGridData }
export type { SheetWithData } from '@/types/gsuite'

export async function getSpreadsheetWithData(
  accessToken: string,
  spreadsheetId: string,
  ranges: string[],
): Promise<SpreadsheetWithGridData> {
  const url = new URL(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`)
  ranges.forEach((range) => url.searchParams.append('ranges', range))
  url.searchParams.append('includeGridData', 'true')

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    if (response.status === 401) {
      useGSuiteAuthStore.getState().logout()
    }
    const errorData = await response.json().catch(() => ({}))
    throw new Error(getErrorMessage(errorData.error, `HTTP ${response.status}`))
  }

  return response.json()
}
