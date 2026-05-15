package com.example.rag.document;

import com.example.rag.common.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.charset.Charset;
import java.nio.charset.MalformedInputException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Locale;

@Component
public class TextExtractor {

    private static final Charset MS949 = Charset.forName("MS949");

    public String extract(Path path, String originalFileName) {
        String lowerName = originalFileName.toLowerCase(Locale.ROOT);
        if (!(lowerName.endsWith(".txt") || lowerName.endsWith(".md") || lowerName.endsWith(".markdown"))) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "지원하지 않는 파일 형식입니다. MVP에서는 TXT/MD만 지원합니다.");
        }
        try {
            return readText(path, StandardCharsets.UTF_8);
        } catch (MalformedInputException ex) {
            try {
                return readText(path, MS949);
            } catch (MalformedInputException fallbackEx) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "문서 인코딩을 읽을 수 없습니다. 파일을 UTF-8 텍스트 형식으로 변환한 뒤 다시 업로드해주세요.");
            } catch (IOException fallbackEx) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "문서 텍스트 추출에 실패했습니다.");
            }
        } catch (IOException ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "문서 텍스트 추출에 실패했습니다.");
        }
    }

    private String readText(Path path, Charset charset) throws IOException {
        String text = Files.readString(path, charset).trim();
        if (text.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "문서에서 텍스트를 찾을 수 없습니다.");
        }
        return text;
    }
}
