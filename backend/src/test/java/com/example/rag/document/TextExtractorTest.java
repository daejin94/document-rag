package com.example.rag.document;

import com.example.rag.common.ApiException;
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

    private final TextExtractor textExtractor = new TextExtractor();

    @TempDir
    Path tempDir;

    @Test
    void extractsTextFromPdf() throws IOException {
        Path pdf = tempDir.resolve("sample.pdf");
        writePdf(pdf, "PDF text content");

        String text = textExtractor.extract(pdf, "sample.pdf");

        assertThat(text).contains("PDF text content");
    }

    @Test
    void extractsMs949TextWhenUtf8DecodingFails() throws IOException {
        Path textFile = tempDir.resolve("sample.txt");
        Files.writeString(textFile, "한글 문서", Charset.forName("MS949"));

        String text = textExtractor.extract(textFile, "sample.txt");

        assertThat(text).isEqualTo("한글 문서");
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
        try (PDDocument document = new PDDocument()) {
            PDPage page = new PDPage();
            document.addPage(page);
            try (PDPageContentStream contentStream = new PDPageContentStream(document, page)) {
                contentStream.beginText();
                contentStream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 12);
                contentStream.newLineAtOffset(72, 720);
                contentStream.showText(text);
                contentStream.endText();
            }
            document.save(path.toFile());
        }
    }
}
