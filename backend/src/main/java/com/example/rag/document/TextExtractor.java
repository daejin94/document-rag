package com.example.rag.document;

import com.example.rag.common.ApiException;
import com.example.rag.llm.OcrModelClient;
import com.example.rag.llm.OcrResult;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.ImageType;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
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

    private final OcrModelClient ocrModelClient;
    private final RagProperties ragProperties;

    public TextExtractor(OcrModelClient ocrModelClient, RagProperties ragProperties) {
        this.ocrModelClient = ocrModelClient;
        this.ragProperties = ragProperties;
    }

    public ExtractionResult extract(Path path, String originalFileName) {
        String lowerName = originalFileName.toLowerCase(Locale.ROOT);
        if (lowerName.endsWith(".pdf")) {
            return readPdf(path);
        }
        String imageMimeType = imageMimeType(lowerName);
        if (imageMimeType != null) {
            return ocrImage(path, imageMimeType);
        }
        if (!(lowerName.endsWith(".txt") || lowerName.endsWith(".md") || lowerName.endsWith(".markdown"))) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "지원하지 않는 파일 형식입니다. TXT/MD/PDF/이미지(PNG/JPG)만 지원합니다.");
        }
        try {
            return ExtractionResult.ofText(readText(path, StandardCharsets.UTF_8));
        } catch (MalformedInputException ex) {
            try {
                return ExtractionResult.ofText(readText(path, MS949));
            } catch (MalformedInputException fallbackEx) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "문서 인코딩을 읽을 수 없습니다. 파일을 UTF-8 텍스트 형식으로 변환한 뒤 다시 업로드해주세요.");
            } catch (IOException fallbackEx) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "문서 텍스트 추출에 실패했습니다.");
            }
        } catch (IOException ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "문서 텍스트 추출에 실패했습니다.");
        }
    }

    private ExtractionResult readPdf(Path path) {
        try (PDDocument document = Loader.loadPDF(path.toFile())) {
            if (document.isEncrypted()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "암호화된 PDF는 지원하지 않습니다.");
            }
            String text = new PDFTextStripper().getText(document).trim();
            if (isPdfTextUsable(text, document.getNumberOfPages())) {
                return ExtractionResult.ofText(text);
            }
            // 텍스트를 충분히 읽지 못한 스캔/이미지 PDF는 페이지를 이미지로 렌더링해 OCR로 추출한다.
            return ocrPdf(document);
        } catch (IOException ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "PDF 텍스트 추출에 실패했습니다.");
        }
    }

    private ExtractionResult ocrPdf(PDDocument document) throws IOException {
        PDFRenderer renderer = new PDFRenderer(document);
        int pageCount = Math.min(document.getNumberOfPages(), ragProperties.ocrMaxPages());
        StringBuilder builder = new StringBuilder();
        int promptTokens = 0;
        int completionTokens = 0;
        for (int page = 0; page < pageCount; page++) {
            BufferedImage image = renderer.renderImageWithDPI(page, ragProperties.ocrDpi(), ImageType.RGB);
            OcrResult result = ocrModelClient.recognize(toPng(image), "image/png");
            promptTokens += result.promptTokens();
            completionTokens += result.completionTokens();
            if (result.text() != null && !result.text().isBlank()) {
                builder.append(result.text().trim()).append("\n\n");
            }
        }
        String text = builder.toString().trim();
        if (text.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "OCR로도 문서에서 텍스트를 찾을 수 없습니다.");
        }
        return new ExtractionResult(text, promptTokens, completionTokens, ocrModelClient.modelName());
    }

    private ExtractionResult ocrImage(Path path, String mimeType) {
        byte[] imageBytes;
        try {
            imageBytes = Files.readAllBytes(path);
        } catch (IOException ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "이미지 파일을 읽을 수 없습니다.");
        }
        OcrResult result = ocrModelClient.recognize(imageBytes, mimeType);
        String text = result.text() == null ? "" : result.text().trim();
        if (text.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "이미지에서 텍스트를 찾을 수 없습니다.");
        }
        return new ExtractionResult(text, result.promptTokens(), result.completionTokens(), ocrModelClient.modelName());
    }

    private byte[] toPng(BufferedImage image) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(image, "png", out);
        return out.toByteArray();
    }

    private String imageMimeType(String lowerName) {
        if (lowerName.endsWith(".png")) {
            return "image/png";
        }
        if (lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg")) {
            return "image/jpeg";
        }
        return null;
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

    /**
     * PDFTextStripper로 뽑은 텍스트가 검색에 쓸 만큼 충분한지 판단한다.
     * 충분하지 않으면(스캔본/이미지 PDF) OCR fallback 대상이 된다.
     */
    private boolean isPdfTextUsable(String text, int pageCount) {
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
            return false;
        }
        if (pageCount >= MIN_PAGES_FOR_LENGTH_CHECK
                && meaningfulChars < pageCount * MIN_MEANINGFUL_CHARS_PER_PAGE) {
            return false;
        }
        if ((double) meaningfulChars / visibleChars < MIN_MEANINGFUL_CHAR_RATIO) {
            return false;
        }
        if (unknownChars >= MIN_UNKNOWN_CHARS_FOR_RATIO_CHECK
                && (double) unknownChars / visibleChars > MAX_UNKNOWN_CHAR_RATIO) {
            return false;
        }
        return true;
    }
}
