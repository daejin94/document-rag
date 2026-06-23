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

## 전역 역할

- 사용자에는 전역 역할(`UserRole`) `USER`(기본) 또는 `SUPER_ADMIN`이 있다. 회원가입은 항상 `USER`로 생성한다.
- JWT payload에 `role` 클레임이 포함된다. 프론트엔드는 이 값으로 관리자 화면 진입 여부를 가른다.
- 프로젝트 멤버 역할(ADMIN/MEMBER)과는 별개다. 자세한 내용은 [projects.md](projects.md), [admin.md](admin.md)를 참고한다.

## JWT

- `JWT_SECRET`은 최소 32바이트 이상이어야 한다.
- access token 만료 시간 기본값은 120분이다.
- 인증 필터는 Bearer token을 검증하고 인증 사용자 정보를 SecurityContext에 넣는다.
- access token이 만료되면 보호된 API는 `401`을 반환한다. 프론트엔드는 이 응답을 받으면 토큰을 비우고 로그인 화면으로 보내며 "세션 만료" 안내를 표시한다.

## 보안 설정

- CSRF는 비활성화한다.
- 세션 정책은 stateless이다.
- `/api/auth/**`는 `permitAll`이다.
- 그 외 요청은 인증이 필요하다.

## 주의사항

- 인증 우회 로직을 추가하지 않는다.
- refresh token 저장소 구현은 사용자가 요청한 경우에만 추가한다.
- 프로젝트 단위 접근 제어(멤버십 가드)를 제거하지 않는다.
