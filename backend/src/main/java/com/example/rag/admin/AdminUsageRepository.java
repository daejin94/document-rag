package com.example.rag.admin;

import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 관리자용 토큰 사용량 집계 쿼리. JPA로는 표현하기 번거로운 날짜 그룹핑을 위해
 * {@code DocumentChunkJdbcRepository}처럼 raw SQL을 사용한다.
 * 일자는 KST(Asia/Seoul) 기준으로 그룹핑한다.
 */
@Repository
public class AdminUsageRepository {

    private static final String KST_DAY = "(created_at AT TIME ZONE 'Asia/Seoul')::date";

    private final NamedParameterJdbcTemplate jdbcTemplate;

    public AdminUsageRepository(NamedParameterJdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<DailyUsageResponse> systemDailyUsage(LocalDate from, LocalDate to) {
        return dailyUsage(null, null, from, to);
    }

    public List<DailyUsageResponse> userDailyUsage(Long userId, LocalDate from, LocalDate to) {
        return dailyUsage("user_id", userId, from, to);
    }

    public List<DailyUsageResponse> projectDailyUsage(Long projectId, LocalDate from, LocalDate to) {
        return dailyUsage("project_id", projectId, from, to);
    }

    private List<DailyUsageResponse> dailyUsage(String idColumn, Long idValue, LocalDate from, LocalDate to) {
        MapSqlParameterSource params = new MapSqlParameterSource();
        StringBuilder where = new StringBuilder(" WHERE 1 = 1");
        if (idColumn != null) {
            where.append(" AND ").append(idColumn).append(" = :idValue");
            params.addValue("idValue", idValue);
        }
        if (from != null) {
            where.append(" AND ").append(KST_DAY).append(" >= :from");
            params.addValue("from", from);
        }
        if (to != null) {
            where.append(" AND ").append(KST_DAY).append(" <= :to");
            params.addValue("to", to);
        }

        String sql = "SELECT " + KST_DAY + " AS day,"
                + " SUM(prompt_tokens) AS prompt_tokens,"
                + " SUM(completion_tokens) AS completion_tokens,"
                + " SUM(total_tokens) AS total_tokens"
                + " FROM token_usages"
                + where
                + " GROUP BY day ORDER BY day ASC";

        return jdbcTemplate.query(sql, params, (rs, rowNum) -> new DailyUsageResponse(
                rs.getObject("day", LocalDate.class),
                rs.getLong("prompt_tokens"),
                rs.getLong("completion_tokens"),
                rs.getLong("total_tokens")
        ));
    }

    public Map<Long, Long> totalTokensByUser() {
        return totalsBy("user_id");
    }

    public Map<Long, Long> totalTokensByProject() {
        return totalsBy("project_id");
    }

    private Map<Long, Long> totalsBy(String idColumn) {
        String sql = "SELECT " + idColumn + " AS id, SUM(total_tokens) AS total"
                + " FROM token_usages WHERE " + idColumn + " IS NOT NULL"
                + " GROUP BY " + idColumn;
        Map<Long, Long> totals = new HashMap<>();
        jdbcTemplate.query(sql, new MapSqlParameterSource(), rs -> {
            totals.put(rs.getLong("id"), rs.getLong("total"));
        });
        return totals;
    }
}
