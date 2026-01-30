Quartz는 페이지 내의 제목(Heading, `#`)을 자동으로 인식하여 **목차(TOC)** 를 생성합니다.
사용자가 스크롤을 내림에 따라 현재 읽고 있는 섹션의 목차 색상이 변하여 위치를 알려줍니다.

## 1. 기본 동작 규칙

* **범위:** 기본적으로 **H1(#)부터 H3(###)** 까지의 제목만 목차에 표시됩니다.
* **최소 조건:** 페이지 내에 **제목이 2개 이상**일 때만 목차가 나타납니다. (제목이 하나면 굳이 목차가 필요 없으니까요.)

---

## 2. 페이지별 제어 (Frontmatter)

특정 페이지에서만 목차를 숨기고 싶다면, 해당 파일의 프론트매터에 `enableToc: false`를 추가합니다.

```yaml
---
title: "짧은 메모"
enableToc: false
---
````

---

## 3. 디자인 및 레이아웃 설정

`quartz.layout.ts` 파일에서 목차의 위치와 스타일을 변경할 수 있습니다. 보통은 오른쪽 사이드바(`right`)에 둡니다.

### 스타일 변경 (`layout` 옵션)

- **`modern`**: (기본값) 현재 Quartz의 깔끔한 스타일.
    
- **`legacy`**: 이전 버전의 스타일.
    



```TypeScript
// quartz.layout.ts

Component.DesktopOnly(
  Component.TableOfContents({
    layout: "modern" // 또는 "legacy"
  })
)
```

> **💡 참고:** 목차 기능이 작동하려면 `quartz.config.ts`의 플러그인 목록에 `TableOfContents` 플러그인이 포함되어 있어야 합니다.

