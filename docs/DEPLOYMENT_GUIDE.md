# Dream Studio 2.0 — 배포 가이드 (Render / Railway 단일 서버)

Dream Studio 2.0은 프로덕션 빌드 시 **Fastify 백엔드(`apps/api`)가 빌드된 React 프론트엔드(`apps/web/dist`)를 함께 서빙하는 단일 서버 구조**로 동작합니다.  
따라서 CORS 설정이나 2중 배포 없이 **단 1개의 URL**로 웹과 AI API를 동시에 배포할 수 있습니다.

---

## 1. Render 1-클릭 배포 (`render.yaml` 포함)
1. `dream-studio-v2` 폴더를 본인 GitHub 저장소에 푸시합니다. (`.env`는 `.gitignore`로 자동 제외됨)
2. https://dashboard.render.com → **New +** → **Blueprint** 선택 → 해당 GitHub 저장소 연결.
3. Render가 루트의 [`render.yaml`](../render.yaml)과 [`Dockerfile`](../Dockerfile)을 자동 인식합니다.
4. 환경 변수 입력 화면에서 아래 키 중 하나 이상을 입력하고 **Apply** 클릭:
   - `GEMINI_API_KEY` (필수 또는 아래 키와 병행)
   - `GITHUB_TOKEN` (선택 · GitHub Models 자동 폴백 합류)
   - `OPENROUTER_API_KEY` / `GROQ_API_KEY` (선택 · 동아리 다수 접속 시 권장)
5. 빌드 완료 후 `https://<서비스명>.onrender.com/api/health`가 `{"status":"ok"}`를 반환하면 배포 완료!

---

## 2. Railway 배포 (`railway.json` 포함)
1. https://railway.app → **New Project** → **Deploy from GitHub repo** 선택.
2. [`railway.json`](../railway.json)과 [`Dockerfile`](../Dockerfile)을 자동으로 감지해 빌드합니다.
3. **Variables** 탭에서 `GEMINI_API_KEY` (및 선택적으로 `GITHUB_TOKEN`, `AI_MODEL=gemini-3-flash-preview`, `AI_MAX_CONCURRENT=3`)를 추가합니다.
4. **Settings → Networking → Generate Domain**으로 공개 URL을 발급받습니다.

---

## 3. 로컬 프로덕션 서버 테스트 (배포 전 확인)
```bash
cd dream-studio-v2
corepack pnpm build
corepack pnpm start
# 브라우저에서 http://localhost:4000/ 접속 (웹 + API 통합 서빙)
```
