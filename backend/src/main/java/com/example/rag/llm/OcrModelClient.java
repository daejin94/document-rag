package com.example.rag.llm;

public interface OcrModelClient {

    /**
     * 이미지 한 장에서 텍스트를 추출한다.
     *
     * @param imageBytes 이미지 원본 바이트
     * @param mimeType   data URL에 쓸 MIME 타입(예: image/png)
     */
    OcrResult recognize(byte[] imageBytes, String mimeType);

    String modelName();
}
