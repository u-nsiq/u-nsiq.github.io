파비콘(Favicon)이란 웹 브라우저 탭의 제목 옆에 표시되는 작은 아이콘을 말합니다.
Quartz는 별도의 복잡한 설정 없이, 이미지 파일 하나만 넣어두면 자동으로 파비콘을 생성해 줍니다.

## 1. 설정 방법

Quartz는 `quartz/static` 폴더 안에 있는 **`icon.png`** 파일을 찾아서 자동으로 처리합니다.

1.  사용하고 싶은 아이콘 이미지를 준비합니다.
2.  파일 이름을 반드시 **`icon.png`** 로 변경합니다.
3.  **`quartz/static/`** 폴더 안에 덮어씌웁니다.

## 2. 작동 원리

Quartz의 `Favicon` 플러그인은 빌드 시점에 `icon.png` 파일을 읽어들여 **48x48 픽셀** 크기로 리사이징한 후, `public` 폴더에 `favicon.ico`라는 이름으로 내보냅니다.
이로써 용량을 최소화하고 웹 표준을 준수하게 됩니다.

## 3. 플러그인 확인

이 기능이 작동하려면 `quartz.config.ts` 파일의 `emitters` 목록에 플러그인이 등록되어 있어야 합니다. (기본적으로 등록되어 있습니다.)
별도의 세부 설정 옵션(Configuration Options)은 없습니다.

```typescript
// quartz.config.ts

emitters: [
  Plugin.Favicon(), // 이 줄이 있어야 파비콘이 생성됨
  // ...
]
````

