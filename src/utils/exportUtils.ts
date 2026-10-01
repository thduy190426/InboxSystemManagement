export function exportToCSV(filename: string, headers: string[], data: (string | number | boolean | null | undefined)[][]) {
  const processCell = (cell: string | number | boolean | null | undefined) => {
    if (cell === null || cell === undefined) return '""'
    const str = String(cell)
    return '"' + str.replace(/"/g, '""') + '"'
  }

  const csvContent = [
    headers.map(processCell).join(','),
    ...data.map(row => row.map(processCell).join(','))
  ].join('\n')

  const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
