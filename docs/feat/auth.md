# 인증 기능

이 문서는 회원가입, 로그인, JWT 인증 흐름을 정리합니다.

## API

| Method | Path | 설명 |
|---|---|---|
| POST | `/api/auth/signup` | 회원가입 |
| POST | `/api/auth/login` | 로그인 |

`/api/auth/**` 경로는 인증 없이 접근할 수 있다. 그 외 API는 JWT 인증이 필요하다.

## 회원가입

요청 필드:

| 필드 | 조건 |
|---|---|
| `email` | email 형식, blank 불가 |
| `password` | blank 불가, 8~100자 |
| `name` | blank 불가, 최대 100자 |

처리 흐름:

1. 이메일 중복 여부를 확인한다.
2. 비밀번호를 BCrypt로 인코딩한다.
3. `app_users`에 사용자를 저장한다.
4. `userId`, `email`, `name`을 반환한다.

이미 가입된 이메일이면 `409 Conflict`를 반환한다.

## 로그인

요청 필드:

| 필드 | 조건 |
|---|---|
| `email` | email 형식, blank 불가 |
| `password` | blank 불가 |

처리 흐름:

1. 이메일로 사용자를 조회한다.
2. BCrypt로 비밀번호를 검증한다.
3. JWT access token을 생성한다.
4. `accessToken`, `refreshToken`을 반환한다.

현재 MVP에서는 `refreshToken`이 `accessToken`과 동일하다.

## JWT

- `JWT_SECRET`은 최소 32바이트 이상이어야 한다.
- access token 만료 시간 기본값은 120분이다.
- 인증 필터는 Bearer token을 검증하고 인증 사용자 정보를 SecurityContext에 넣는다.

## 보안 설정

- CSRF는 비활성화한다.
- 세션 정책은 stateless이다.
- `/api/auth/**`는 `permitAll`이다.
- 그 외 요청은 인증이 필요하다.

## 주의사항

- 인증 우회 로직을 추가하지 않는다.
- refresh token 저장소 구현은 사용자가 요청한 경우에만 추가한다.
- 사용자 id 기반 데이터 접근 제한을 제거하지 않는다.
