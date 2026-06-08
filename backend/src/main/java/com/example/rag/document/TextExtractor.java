package com.example.rag.document;

import com.example.rag.common.ApiException;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
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
    private static final int MIN_MEANINGFUL_CHARS_PER_PAGE = 80;
    private static final int MIN_PAGES_FOR_LENGTH_CHECK = 5;
    private static final int MIN_UNKNOWN_CHARS_FOR_RATIO_CHECK = 20;
    private static final double MAX_UNKNOWN_CHAR_RATIO = 0.08;
    private static final double MIN_MEANINGFUL_CHAR_RATIO = 0.25;
    private static final String LOW_QUALITY_PDF_MESSAGE =
            "텍스트를 충분히 읽을 수 없는 PDF입니다. OCR 처리된 TXT/MD/PDF로 변환한 뒤 다시 업로드해주세요.";

    public String extract(Path path, String originalFileName) {
        String lowerName = originalFileName.toLowerCase(Locale.ROOT);
        if (lowerName.endsWith(".pdf")) {
            return readPdf(path);
        }
        if (!(lowerName.endsWith(".txt") || lowerName.endsWith(".md") || lowerName.endsWith(".markdown"))) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "지원하지 않는 파일 형식입니다. TXT/MD/PDF만 지원합니다.");
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

    private String readPdf(Path path) {
        try (PDDocument document = Loader.loadPDF(path.toFile())) {
            if (document.isEncrypted()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "암호화된 PDF는 지원하지 않습니다.");
            }
            String text = requireText(new PDFTextStripper().getText(document));
            validatePdfTextQuality(text, document.getNumberOfPages());
            return text;
        } catch (IOException ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "PDF 텍스트 추출에 실패했습니다.");
        }
    }

    private String readText(Path path, Charset charset) throws IOException {
        return requireText(Files.readString(path, charset));
    }

    private String requireText(String text) {
        text = text.trim();
        if (text.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "문서에서 텍스트를 찾을 수 없습니다.");
        }
        return text;
    }

    private void validatePdfTextQuality(String text, int pageCount) {
        int meaningfulChars = 0;
        int unknownChars = 0;
        int visibleChars = 0;
        for (int i = 0; i < text.length(); i++) {
            char ch = text.charAt(i);
            if (Character.isWhitespace(ch)) {
                continue;
            }
            visibleChars++;
            if (Character.isLetterOrDigit(ch)) {
                meaningfulChars++;
            }
            if (ch == '?' || ch == '\uFFFD') {
                unknownChars++;
            }
        }

        if (visibleChars == 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, LOW_QUALITY_PDF_MESSAGE);
        }
        if (pageCount >= MIN_PAGES_FOR_LENGTH_CHECK
                && meaningfulChars < pageCount * MIN_MEANINGFUL_CHARS_PER_PAGE) {
            throw new ApiException(HttpStatus.BAD_REQUEST, LOW_QUALITY_PDF_MESSAGE);
        }
        if ((double) meaningfulChars / visibleChars < MIN_MEANINGFUL_CHAR_RATIO) {
            throw new ApiException(HttpStatus.BAD_REQUEST, LOW_QUALITY_PDF_MESSAGE);
        }
        if (unknownChars >= MIN_UNKNOWN_CHARS_FOR_RATIO_CHECK
                && (double) unknownChars / visibleChars > MAX_UNKNOWN_CHAR_RATIO) {
            throw new ApiException(HttpStatus.BAD_REQUEST, LOW_QUALITY_PDF_MESSAGE);
        }
    }
}
