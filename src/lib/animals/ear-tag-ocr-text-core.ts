export {
  buildEarTagVariants,
  buildKnownEarTagIndex,
  findKnownEarTagMatch,
  isSameEarTag,
  normalizeEarTagText,
} from '@/lib/animals/ear-tag-ocr-text-normalization'
export {
  buildSuggestionVariants,
  extractSuggestionSeeds,
  scoreEarTagCandidate,
  scoreKnownEarTagMatch,
  scoreRecognitionCandidate,
} from '@/lib/animals/ear-tag-ocr-text-candidates'
export {
  describeOcrError,
  describeOcrStatus,
} from '@/lib/animals/ear-tag-ocr-text-status'
