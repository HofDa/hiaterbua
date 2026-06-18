import { useState, useCallback } from 'react'
import { validateRequired, validateNumber, sanitizeString } from '@/lib/utils/validation'
import type { Animal, Herd } from '@/types/domain'

export interface ValidationRule {
  required?: boolean
  min?: number
  max?: number
  minLength?: number
  maxLength?: number
  pattern?: RegExp
  custom?: (value: unknown) => string | null
  sanitize?: boolean
}

export interface ValidationRules {
  [fieldName: string]: ValidationRule
}

export interface FormErrors {
  [fieldName: string]: string | null
}

export interface UseFormValidationOptions {
  validateOnChange?: boolean
  sanitizeOnInput?: boolean
}

export interface UseFormValidationReturn<T extends Record<string, unknown>> {
  values: T
  errors: FormErrors
  isValid: boolean
  isDirty: boolean
  
  // Actions
  setValue: (field: keyof T, value: unknown) => void
  setError: (field: keyof T, error: string | null) => void
  clearError: (field: keyof T) => void
  clearAllErrors: () => void
  validateField: (field: keyof T) => string | null
  validateAll: () => boolean
  reset: (newValues?: Partial<T>) => void
  sanitizeValue: (field: keyof T, value: unknown) => unknown
}

export function useFormValidation<T extends Record<string, unknown>>(
  initialValues: T,
  validationRules: ValidationRules,
  options: UseFormValidationOptions = {}
): UseFormValidationReturn<T> {
  const {
    validateOnChange = true,
    sanitizeOnInput = true
  } = options

  const [values, setValues] = useState<T>(initialValues)
  const [errors, setErrors] = useState<FormErrors>({})
  const [isDirty, setIsDirty] = useState(false)

  const validateField = useCallback((field: keyof T): string | null => {
    const value = values[field]
    const rules = validationRules[field as string]
    
    if (!rules) return null

    // Required validation
    if (rules.required) {
      const requiredError = validateRequired(value, field as string)
      if (requiredError) return requiredError
    }

    // Skip other validations if value is empty and not required
    if (value === null || value === undefined || value === '') {
      return null
    }

    // Type-specific validations
    if (typeof value === 'number') {
      const numberError = validateNumber(value, field as string, rules.min, rules.max)
      if (numberError) return numberError
    }

    if (typeof value === 'string') {
      // Length validations
      if (rules.minLength && value.length < rules.minLength) {
        return `${field as string} muss mindestens ${rules.minLength} Zeichen lang sein`
      }
      if (rules.maxLength && value.length > rules.maxLength) {
        return `${field as string} darf höchstens ${rules.maxLength} Zeichen lang sein`
      }

      // Pattern validation
      if (rules.pattern && !rules.pattern.test(value)) {
        return `${field as string} hat ein ungültiges Format`
      }
    }

    // Custom validation
    if (rules.custom) {
      const customError = rules.custom(value)
      if (customError) return customError
    }

    return null
  }, [values, validationRules])

  const validateAll = useCallback((): boolean => {
    const newErrors: FormErrors = {}
    let isValid = true

    Object.keys(validationRules).forEach(field => {
      const error = validateField(field as keyof T)
      newErrors[field] = error
      if (error) isValid = false
    })

    setErrors(newErrors)
    return isValid
  }, [validationRules, validateField])

  const setValue = useCallback((field: keyof T, value: unknown) => {
    let processedValue = value

    // Sanitize value if enabled
    if (sanitizeOnInput && typeof value === 'string') {
      processedValue = sanitizeString(value)
    }

    setValues(prev => ({ ...prev, [field]: processedValue }))
    setIsDirty(true)

    // Validate on change if enabled
    if (validateOnChange) {
      const error = validateField(field)
      setErrors(prev => ({ ...prev, [field]: error }))
    }
  }, [sanitizeOnInput, validateOnChange, validateField])

  const setError = useCallback((field: keyof T, error: string | null) => {
    setErrors(prev => ({ ...prev, [field]: error }))
  }, [])

  const clearError = useCallback((field: keyof T) => {
    setErrors(prev => ({ ...prev, [field]: null }))
  }, [])

  const clearAllErrors = useCallback(() => {
    setErrors({})
  }, [])

  const reset = useCallback((newValues?: Partial<T>) => {
    const resetValues = newValues ? { ...initialValues, ...newValues } : initialValues
    setValues(resetValues)
    setErrors({})
    setIsDirty(false)
  }, [initialValues])

  const sanitizeValue = useCallback((field: keyof T, value: unknown): unknown => {
    if (typeof value === 'string') {
      return sanitizeString(value)
    }
    return value
  }, [])

  // Calculate overall validity
  const isValid = Object.values(errors).every(error => error === null)

  return {
    values,
    errors,
    isValid,
    isDirty,
    setValue,
    setError,
    clearError,
    clearAllErrors,
    validateField,
    validateAll,
    reset,
    sanitizeValue
  }
}

// Helper hooks for common form patterns
export function useHerdForm(initialHerd?: Partial<Herd>) {
  const initialValues = {
    name: initialHerd?.name ?? '',
    notes: initialHerd?.notes ?? '',
    fallbackCount:
      initialHerd?.fallbackCount != null ? String(initialHerd.fallbackCount) : ''
  }

  const validationRules: ValidationRules = {
    name: {
      required: true,
      minLength: 1,
      maxLength: 100,
      sanitize: true
    },
    notes: {
      maxLength: 1000,
      sanitize: true
    },
    fallbackCount: {
      custom: (value: unknown) => {
        if (value === '') return null
        const num = Number(value)
        if (isNaN(num) || num < 0) {
          return 'Anzahl muss eine positive Zahl sein'
        }
        return null
      }
    }
  }

  return useFormValidation(initialValues, validationRules)
}

export function useAnimalForm(initialAnimal?: Partial<Animal>) {
  const initialValues = {
    earTag: initialAnimal?.earTag ?? '',
    name: initialAnimal?.name ?? '',
    species: initialAnimal?.species ?? 'cattle',
    notes: initialAnimal?.notes ?? ''
  }

  const validationRules: ValidationRules = {
    earTag: {
      required: true,
      minLength: 2,
      maxLength: 50,
      sanitize: true,
      custom: (value: unknown) => {
        if (typeof value !== 'string') return null
        // Basic ear tag validation
        if (!/^[A-Za-z0-9\-/]+$/.test(value)) {
          return 'Ohrmarke darf nur Buchstaben, Zahlen, Bindestriche und Schrägstriche enthalten'
        }
        return null
      }
    },
    name: {
      maxLength: 100,
      sanitize: true
    },
    species: {
      required: true
    },
    notes: {
      maxLength: 500,
      sanitize: true
    }
  }

  return useFormValidation(initialValues, validationRules)
}
