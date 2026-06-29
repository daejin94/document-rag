package com.example.rag.document;

import com.example.rag.common.ApiException;
import com.example.rag.llm.OcrModelClient;
import com.example.rag.llm.OcrResult;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.http.HttpStatus;

import java.io.IOException;
import java.nio.charset.Charset;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class TextExtractorTest {

    private static final RagProperties RAG_PROPERTIES = new RagProperties(800, 150, 5, 0.7, 20, 200);

    private final StubOcrModelClient ocrModelClient = new StubOcrModelClient();
    private final TextExtractor textExtractor = new TextExtractor(ocrModelClient, RAG_PROPERTIES);

    @TempDir
    Path tempDir;

    @Test
    void extractsTextFromPdf() throws IOException {
        Path pdf = tempDir.resolve("sample.pdf");
        writePdf(pdf, "PDF text content");

        ExtractionResult result = textExtractor.extract(pdf, "sample.pdf");

        assertThat(result.text()).contains("PDF text content");
        assertThat(result.usedOcr()).isFalse();
        assertThat(ocrModelClient.calls).isZero();
    }

    @Test
    void fallsBackToOcrWhenPdfTextIsTooShortForPageCount() throws IOException {
        Path pdf = tempDir.resolve("short-multipage.pdf");
        writePdf(pdf, "short", 5);
        ocrModelClient.responseText = "OCR로 추출한 본문";

        ExtractionResult result = textExtractor.extract(pdf, "short-multipage.pdf");

        assertThat(result.text()).contains("OCR로 추출한 본문");
        assertThat(result.usedOcr()).isTrue();
        assertThat(result.ocrModel()).isEqualTo("stub-ocr");
        assertThat(ocrModelClient.calls).isEqualTo(5); // 페이지마다 1회
    }

    @Test
    void fallsBackToOcrWhenPdfTextHasTooManyUnknownCharacters() throws IOException {
        Path pdf = tempDir.resolve("broken.pdf");
        writePdf(pdf, "valid text ".repeat(40) + "?".repeat(40));
        ocrModelClient.responseText = "정상 추출 텍스트";

        ExtractionResult result = textExtractor.extract(pdf, "broken.pdf");

        assertThat(result.text()).contains("정상 추출 텍스트");
        assertThat(result.usedOcr()).isTrue();
    }

    @Test
    void failsWhenOcrAlsoReturnsNoTextFromPdf() throws IOException {
        Path pdf = tempDir.resolve("blank-scan.pdf");
        writePdf(pdf, "short", 5);
        ocrModelClient.responseText = "";

        assertThatThrownBy(() -> textExtractor.extract(pdf, "blank-scan.pdf"))
                .isInstanceOfSatisfying(ApiException.class, ex -> {
                    assertThat(ex.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
                    assertThat(ex.getMessage()).contains("OCR");
                });
    }

    @Test
    void extractsTextFromImageViaOcr() throws IOException {
        Path image = tempDir.resolve("scan.png");
        Files.write(image, new byte[]{1, 2, 3, 4});
        ocrModelClient.responseText = "이미지에서 읽은 텍스트";

        ExtractionResult result = textExtractor.extract(image, "scan.png");

        assertThat(result.text()).isEqualTo("이미지에서 읽은 텍스트");
        assertThat(result.usedOcr()).isTrue();
        assertThat(ocrModelClient.lastMimeType).isEqualTo("image/png");
        assertThat(ocrModelClient.calls).isEqualTo(1);
    }

    @Test
    void usesJpegMimeTypeForJpgImage() throws IOException {
        Path image = tempDir.resolve("scan.jpg");
        Files.write(image, new byte[]{1, 2, 3, 4});
        ocrModelClient.responseText = "jpg 텍스트";

        textExtractor.extract(image, "scan.jpg");

        assertThat(ocrModelClient.lastMimeType).isEqualTo("image/jpeg");
    }

    @Test
    void failsWhenImageHasNoText() throws IOException {
        Path image = tempDir.resolve("empty.png");
        Files.write(image, new byte[]{1, 2, 3, 4});
        ocrModelClient.responseText = "   ";

        assertThatThrownBy(() -> textExtractor.extract(image, "empty.png"))
                .isInstanceOfSatisfying(ApiException.class, ex -> {
                    assertThat(ex.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
                    assertThat(ex.getMessage()).contains("이미지에서 텍스트를 찾을 수 없습니다");
                });
    }

    @Test
    void extractsMs949TextWhenUtf8DecodingFails() throws IOException {
        Path textFile = tempDir.resolve("sample.txt");
        Files.writeString(textFile, "한글 문서", Charset.forName("MS949"));

        ExtractionResult result = textExtractor.extract(textFile, "sample.txt");

        assertThat(result.text()).isEqualTo("한글 문서");
        assertThat(result.usedOcr()).isFalse();
    }

    @Test
    void rejectsUnsupportedFileExtension() {
        Path file = tempDir.resolve("sample.csv");

        assertThatThrownBy(() -> textExtractor.extract(file, "sample.csv"))
                .isInstanceOfSatisfying(ApiException.class, ex -> {
                    assertThat(ex.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
                    assertThat(ex.getMessage()).contains("TXT/MD/PDF");
                });
    }

    private void writePdf(Path path, String text) throws IOException {
        writePdf(path, text, 1);
    }

    private void writePdf(Path path, String text, int pageCount) throws IOException {
        try (PDDocument document = new PDDocument()) {
            for (int i = 0; i < pageCount; i++) {
                PDPage page = new PDPage();
                document.addPage(page);
                try (PDPageContentStream contentStream = new PDPageContentStream(document, page)) {
                    contentStream.beginText();
                    contentStream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 12);
                    contentStream.newLineAtOffset(72, 720);
                    contentStream.showText(text);
                    contentStream.endText();
                }
            }
            document.save(path.toFile());
        }
    }

    private static final class StubOcrModelClient implements OcrModelClient {
        private String responseText = "ocr text";
        private int calls;
        private String lastMimeType;

        @Override
        public OcrResult recognize(byte[] imageBytes, String mimeType) {
            calls++;
            lastMimeType = mimeType;
            return new OcrResult(responseText, 10, 5);
        }

        @Override
        public String modelName() {
            return "stub-ocr";
        }
    }
}
