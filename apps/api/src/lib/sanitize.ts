const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous\s+)?instructions?/gi,
  /system\s*:/gi,
  /assistant\s*:/gi,
  /human\s*:/gi,
  /\[INST\]/gi,
  /<<SYS>>/gi,
  /you\s+are\s+now/gi,
  /pretend\s+(you\s+are|to\s+be)/gi,
  /jailbreak/gi,
  /prompt\s*injection/gi,
]

export function sanitizeTextForLLM(input: string, maxLength = 200): string {
  if (!input) return input

  let sanitized = input
  for (const pattern of INJECTION_PATTERNS) {
    sanitized = sanitized.replace(pattern, '')
  }

  return sanitized
    .replace(/[<>{}[\]\\]/g, '')
    .replace(/\r?\n|\r/g, ' ')
    .trim()
    .slice(0, maxLength)
}

export function isSuspiciousInput(input: string): boolean {
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(input)) return true
  }
  return false
}
