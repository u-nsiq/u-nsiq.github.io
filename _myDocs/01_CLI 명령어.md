터미널(Git Bash, VS Code)에서 사용하는 핵심 명령어 모음입니다.
모든 명령어는 `npx quartz <명령어>` 형태로 시작합니다.

---

## 1. 빌드 및 미리보기 (`build`)
블로그를 로컬 컴퓨터에서 생성하고 확인하는 가장 중요한 명령어입니다.

### 기본 명령어
```bash
# 그냥 빌드만 하기 (결과물은 public 폴더에 생성됨)
npx quartz build

# ★ 추천: 로컬 서버를 켜서 실시간 미리보기
npx quartz build --serve
````

### 주요 옵션 (Options)

- `--serve`: 로컬 서버를 실행합니다. 파일을 수정하고 저장하면 브라우저가 자동으로 새로고침됩니다.
    
- `--port <숫자>`: 서버 포트를 변경합니다. (기본값: 8080)
    
    - 예: `npx quartz build --serve --port 8081` (8080번이 이미 사용 중일 때 유용)
        
- `--wsPort <숫자>`: 핫 리로드(자동 새로고침)용 웹소켓 포트를 변경합니다. (기본값: 3001)
    
- `--watch`: 파일 변경을 감지해서 자동으로 다시 빌드합니다. (`--serve`를 쓰면 자동으로 켜집니다)
    
- `-o` 또는 `--output`: 결과물이 저장될 폴더를 바꿉니다. (기본값: `public`)
    
- `-v` 또는 `--verbose`: 빌드 과정을 아주 상세하게 출력합니다. (에러 났을 때 디버깅용)
    
- `--concurrency <숫자>`: 노트를 파싱할 때 몇 개의 스레드를 쓸지 정합니다. (속도 조절용, 보통 건드릴 필요 없음)
    

---

## 2. 배포 및 동기화 (`sync`)

작성한 글을 GitHub에 올리고(Push), GitHub의 변경 사항을 받아오는(Pull) 명령어입니다.

내부적으로 `git add` -> `git commit` -> `git pull` -> `git push` 과정을 한 번에 수행합니다.

### 기본 명령어


```Bash
npx quartz sync
```

### 주요 옵션 (Options)

- `-m` 또는 `--message "내용"`: 커밋 메시지를 직접 작성합니다. (안 쓰면 Quartz가 자동으로 메시지를 만듭니다)
    
    - 예: `npx quartz sync -m "OS 포스팅 추가"`
        
- `--no-pull`: **중요!** GitHub의 변경 사항을 가져오지 않고(Pull 생략), 내 로컬 내용을 강제로 올릴 때 사용합니다. 충돌이 났을 때 내 걸로 덮어씌우려면 사용하세요.
    
    - 사용법: `npx quartz sync --no-pull`
        
- `--no-push`: GitHub에 올리지 않고, 로컬에 커밋(저장)만 해둘 때 사용합니다.
    
- `--no-commit`: 커밋 단계를 건너뜁니다. (보통 잘 안 씀)
    

---

## 3. 업데이트 (`update`)

Quartz 엔진 자체를 최신 버전으로 업데이트합니다. 새로운 기능이나 버그 수정이 있을 때 실행합니다.

### 기본 명령어


```Bash
npx quartz update
```

### 주의사항

- 업데이트 과정에서 `content` 폴더(내 글)는 안전하지만, 설정 파일(`quartz.config.ts` 등)이 충돌 날 수 있습니다.
    
- 충돌 시 `git status`로 확인하고 해결해야 합니다.
    

---

## 4. 복구 (`restore`)

업데이트를 하다가 블로그가 망가지거나, 파일이 꼬였을 때 캐시 데이터를 이용해 복구를 시도합니다.

### 기본 명령어

```Bash
npx quartz restore
```

---

## 5. 초기화 (`create`)

맨 처음 Quartz 블로그를 만들 때 쓰는 명령어입니다. (이미 블로그가 있으므로 쓸 일은 거의 없습니다.)

### 기본 명령어


```Bash
npx quartz create
```

---

## 6. 공통 옵션 (General Options)


모든 명령어 뒤에 붙일 수 있는 옵션들입니다.

- `-v` 또는 `--verbose`: 로그를 상세하게 출력합니다. 뭔가 안 될 때 에러 원인을 찾기 위해 붙여보면 좋습니다.
    
- `-d` 또는 `--directory`: 내 글이 들어있는 폴더(`content`)의 이름을 바꿨다면 이 옵션으로 알려줘야 합니다. (기본값: "content")
    
- `--version`: 현재 설치된 Quartz의 버전을 확인합니다.
    
- `--help`: 해당 명령어의 도움말을 봅니다.

---
## 7. 문제 해결 및 비상용 명령어 (Troubleshooting)
Quartz 명령어가 꼬이거나 에러가 날 때 사용하는 수동 명령어들입니다.

### 1) 강력 캐시 삭제 (Clean Build)
이미지가 안 바뀌거나, 그래프가 깨지거나, 알 수 없는 에러가 계속될 때 사용합니다.
Quartz가 만들어둔 임시 파일들을 싹 지우고 처음부터 다시 빌드하는 방법입니다.

**Git Bash (윈도우) / Mac / Linux:**
```bash
rm -rf .quartz-cache public
npx quartz build --serve
````

**Windows CMD (명령 프롬프트):**


```DOS
rmdir /s /q .quartz-cache
rmdir /s /q public
npx quartz build --serve
```

### 2) Git 수동 조작 (Git Fallback)

`npx quartz sync`가 충돌(Conflict)로 실패했을 때, 직접 Git 명령어로 해결해야 합니다.


```Bash
# 1. 상태 확인 (어떤 파일이 문제인지 봄)
git status

# 2. 변경 사항 스테이징 (수동 해결 후)
git add .

# 3. 커밋
git commit -m "Manual fix"

# 4. 강제 푸시 (정말 어쩔 수 없을 때만!)
git push origin master --force
```

