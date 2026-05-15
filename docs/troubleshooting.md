# 트러블슈팅

프로젝트 실행 및 RAG 질의 과정에서 자주 만나는 문제와 확인 방법을 정리합니다.

## JWT_SECRET 관련 에러

아래와 같은 로그가 나오면 `JWT_SECRET`이 비어 있거나 너무 짧은 상태입니다.

```text
WeakKeyException
key byte array is 0 bits
```

해결 방법:

1. 루트 `.env` 파일에 충분히 긴 `JWT_SECRET` 값을 넣습니다.
2. 백엔드를 재시작합니다.

개발용 secret 생성 예시:

```bash
openssl rand -base64 32
```

## gradle 명령어가 없을 때

시스템 Gradle이 없어도 됩니다.  
`backend/gradlew`가 포함되어 있으므로 아래처럼 실행합니다.

```bash
cd backend
./gradlew bootRun
```

## Java가 없을 때

아래와 같은 로그가 나오면 Java 21이 설치되어 있지 않은 상태입니다.

```text
JAVA_HOME is not set
```

WSL Ubuntu 기준 설치 명령어:

```bash
sudo apt update
sudo apt install -y openjdk-21-jdk
```

설치 확인:

```bash
java -version
```

## 문서에서 정보를 찾을 수 없다고 나올 때

검색 유사도 threshold가 너무 높거나 문서 chunk가 정상 생성되지 않았을 수 있습니다.

확인할 내용:

1. 업로드한 문서 상태가 `COMPLETED`인지 확인
2. `chunkCount`가 1 이상인지 확인
3. `.env`에서 similarity threshold를 낮춘 뒤 백엔드 재시작

예시:

```env
RAG_SIMILARITY_THRESHOLD=0.20
```
