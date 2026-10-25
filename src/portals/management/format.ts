/** "86%", or a dash when nothing has been measured yet. */
export const formatRate = (rate: number | null) => (rate === null ? '—' : `${rate.toFixed(0)}%`)

/** "1 unit", "12 units"; `many` for words that don't just take an s. */
export const plural = (n: number, word: string, many = `${word}s`) => `${n.toLocaleString()} ${n === 1 ? word : many}`
