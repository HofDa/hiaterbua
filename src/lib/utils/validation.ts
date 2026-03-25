export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function isValidEarTag(earTag: string): boolean {
  // Basic validation for ear tag format
  // Can be extended based on specific requirements
  return earTag.trim().length >= 2 && earTag.trim().length <= 50
}

export function isValidCoordinate(lat: number, lon: number): boolean {
  return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180
}

export function isValidAccuracy(accuracy: number): boolean {
  return accuracy > 0 && accuracy < 1000 // Reasonable GPS accuracy range in meters
}

export function sanitizeString(input: string): string {
  return input.trim().replace(/[<>]/g, '')
}

export function validateRequired(value: unknown, fieldName: string): string | null {
  if (value === null || value === undefined || value === '') {
    return `${fieldName} ist erforderlich`
  }
  if (typeof value === 'string' && value.trim() === '') {
    return `${fieldName} darf nicht leer sein`
  }
  return null
}

export function validateNumber(value: unknown, fieldName: string, min?: number, max?: number): string | null {
  if (value === null || value === undefined) {
    return `${fieldName} ist erforderlich`
  }
  
  const num = Number(value)
  if (isNaN(num)) {
    return `${fieldName} muss eine Zahl sein`
  }
  
  if (min !== undefined && num < min) {
    return `${fieldName} muss mindestens ${min} sein`
  }
  
  if (max !== undefined && num > max) {
    return `${fieldName} darf höchstens ${max} sein`
  }
  
  return null
}
