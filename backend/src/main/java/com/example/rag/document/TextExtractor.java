package com.example.rag.document;

import com.example.rag.common.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Locale;

@Component
public class TextExtractor {

    public String extract(Path path, String originalFileName) {
        String lowerName = originalFileName.toLowerCase(Locale.ROOT);
        if (!(lowerName.endsWith(".txt") || lowerName.endsWith(".md") || lowerName.endsWith(".markdown"))) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "지원하지 않는 파일 형식입니다. MVP에서는 TXT/MD만 지원합니다.");
        }
        try {
            String text = Files.readString(path, StandardCharsets.UTF_8).trim();
            if (text.isBlank()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "문서에서 텍스트를 찾을 수 없습니다.");
            }
            return text;
        } catch (IOException ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "문서 텍스트 추출에 실패했습니다.");
        }
    }
}
