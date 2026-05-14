package com.example.rag.document;

import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public class DocumentChunkJdbcRepository {

    private final NamedParameterJdbcTemplate jdbcTemplate;

    public DocumentChunkJdbcRepository(NamedParameterJdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public void save(Long documentId, int chunkIndex, String content, List<Float> embedding) {
        String sql = """
                INSERT INTO document_chunks (document_id, chunk_index, content, embedding, token_count)
                VALUES (:documentId, :chunkIndex, :content, CAST(:embedding AS vector), :tokenCount)
                """;
        jdbcTemplate.update(sql, new MapSqlParameterSource()
                .addValue("documentId", documentId)
                .addValue("chunkIndex", chunkIndex)
                .addValue("content", content)
                .addValue("embedding", toVectorLiteral(embedding))
                .addValue("tokenCount", estimateTokenCount(content)));
    }

    public List<SearchResult> search(Long userId, List<Long> documentIds, List<Float> queryEmbedding, int topK) {
        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("userId", userId)
                .addValue("embedding", toVectorLiteral(queryEmbedding))
                .addValue("topK", topK);

        String documentFilter = "";
        if (documentIds != null && !documentIds.isEmpty()) {
            documentFilter = " AND d.id IN (:documentIds)";
            params.addValue("documentIds", documentIds);
        }

        String sql = """
                SELECT
                    dc.id AS chunk_id,
                    dc.document_id,
                    d.title AS document_title,
                    dc.chunk_index,
                    dc.content,
                    dc.embedding <=> CAST(:embedding AS vector) AS distance,
                    1 - (dc.embedding <=> CAST(:embedding AS vector)) AS similarity
                FROM document_chunks dc
                JOIN documents d ON d.id = dc.document_id
                WHERE d.user_id = :userId
                  AND d.status = 'COMPLETED'
                """ + documentFilter + """
                ORDER BY dc.embedding <=> CAST(:embedding AS vector)
                LIMIT :topK
                """;

        return jdbcTemplate.query(sql, params, (rs, rowNum) -> new SearchResult(
                rs.getLong("chunk_id"),
                rs.getLong("document_id"),
                rs.getString("document_title"),
                rs.getInt("chunk_index"),
                rs.getString("content"),
                rs.getDouble("distance"),
                rs.getDouble("similarity")
        ));
    }

    private String toVectorLiteral(List<Float> embedding) {
        StringBuilder builder = new StringBuilder("[");
        for (int i = 0; i < embedding.size(); i++) {
            if (i > 0) {
                builder.append(',');
            }
            builder.append(embedding.get(i));
        }
        return builder.append(']').toString();
    }

    private int estimateTokenCount(String content) {
        return Math.max(1, content.length() / 4);
    }
}
