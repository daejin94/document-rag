package com.example.rag.document;

/**
 * 텍스트 추출 결과. OCR을 사용한 경우 소비한 토큰과 모델명을 함께 담는다.
 * OCR을 사용하지 않은 일반 텍스트/PDF 추출이면 토큰은 0, 모델명은 null이다.
 */
public record ExtractionResult(
        String text,
        int ocrPromptTokens,
        int ocrCompletionTokens,
        String ocrModel
) {
    public static ExtractionResult ofText(String text) {
        return new ExtractionResult(text, 0, 0, null);
    }

    public boolean usedOcr() {
        return ocrModel != null && (ocrPromptTokens > 0 || ocrCompletionTokens > 0);
    }
}
