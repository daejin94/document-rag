# 인증 기능

이 문서는 회원가입, 로그인, JWT 인증 흐름을 정리합니다.

## API

| Method | Path | 설명 |
|---|---|---|
| POST | `/api/auth/signup` | 회원가입 |
| POST | `/api/auth/login` | 로그인 |
| GET | `/api/auth/oauth-providers` | 활성화된 소셜 로그인 제공자 조회(`{ "google": boolean }`) |
| GET | `/api/oauth2/authorization/google` | 구글 OAuth 로그인 시작(구글로 리다이렉트) |
| GET | `/api/login/oauth2/code/google` | 구글 OAuth 콜백(백엔드 내부 처리) |

`/api/auth/**`, `/api/oauth2/**`, `/api/login/oauth2/**` 경로는 인증 없이 접근할 수 있다. 그 외 API는 JWT 인증이 필요하다.

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

## 구글 OAuth 로그인

백엔드 주도(Authorization Code) 방식이다. 프론트는 "구글로 로그인" 버튼으로 브라우저 전체를 `/api/oauth2/authorization/google`로 이동시키고, 코드 교환과 사용자 식별, JWT 발급은 모두 백엔드가 처리한다.

처리 흐름:

1. 프론트가 `/api/oauth2/authorization/google`로 이동 → 백엔드가 구글로 리다이렉트한다.
2. 구글 인증 후 `/api/login/oauth2/code/google` 콜백으로 돌아온다.
3. 백엔드가 사용자 이메일을 기준으로 계정을 찾거나(없으면) 새로 만든다. 신규 구글 사용자는 일반 가입과 동일하게 `PENDING` 상태로 생성된다. 구글 전용 계정은 비밀번호(`password`)가 없다.
4. 계정이 `APPROVED`이면 JWT를 발급해 프론트로 `?token=...`과 함께 리다이렉트한다. 그 외에는 `?oauth_error=...`로 리다이렉트한다. 코드: `signup`(이번에 새로 가입), `pending`(이미 가입돼 승인 대기 중), `rejected`(거절), `disabled`(비활성), `failed`/`no_email`(인증 실패).
5. 프론트(`App.tsx`)는 콜백에서 `token`을 저장하고 주소창을 정리하며, `oauth_error`는 안내 메시지로 표시한다.

설정(환경변수):

| 변수 | 설명 |
|---|---|
| `SPRING_SECURITY_OAUTH2_CLIENT_REGISTRATION_GOOGLE_CLIENT_ID` / `..._CLIENT_SECRET` | 구글 OAuth 클라이언트 자격증명. **설정하지 않으면 구글 로그인은 비활성화되고 앱은 정상 부팅된다.** |
| `SPRING_SECURITY_OAUTH2_CLIENT_REGISTRATION_GOOGLE_REDIRECT_URI` | 승인된 리디렉션 URI. Google Cloud Console에 동일하게 등록해야 한다(dev 예: `http://localhost:8080/api/login/oauth2/code/google`). |
| `OAUTH_FRONTEND_URL` | 로그인 완료 후 돌아갈 프론트 주소(dev 기본값: `http://localhost:5173/`). |

> 구글 설정은 Spring 표준 바인딩 이름의 **환경변수로만** 주입한다. `application.yml`에 `spring.security.oauth2.client.registration.google` 키를 두면 client-id가 비어 있어도 Spring이 `OAuth2ClientProperties`를 검증하다 부팅이 실패한다(`ClientsConfiguredCondition`이 registration 키 존재 여부만 보기 때문). 자세한 내용은 [troubleshooting.md](../troubleshooting.md) 참고.

stateless 정책을 유지하기 위해 Authorization 요청은 HTTP 세션이 아니라 단기 쿠키(`HttpCookieOAuth2AuthorizationRequestRepository`)에 저장한다. OAuth 엔드포인트는 기존 `/api` 프록시를 재사용하도록 `/api` 하위로 옮겨져 있다(`SecurityConfig`에서 `authorizationEndpoint`/`redirectionEndpoint`의 baseUri를 `/api` 하위로 지정). 따라서 위 redirect-uri도 `/api/login/oauth2/code/google` 경로여야 한다.

이메일/비밀번호 로그인으로 구글 전용 계정(비밀번호 없음)에 로그인하려 하면 "구글 로그인을 사용해주세요" 안내와 함께 거부한다.

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
