`quartz.config.ts` 파일은 Quartz 블로그의 **제어판(Control Panel)** 입니다.
사이트의 기본 정보, 디자인(테마), 그리고 기능(플러그인)을 전반적으로 관리합니다.

> **💡 Tip:** VS Code나 Cursor 같은 TypeScript 지원 에디터를 사용하면, 설정에 오류가 있을 때 미리 경고를 띄워주어 실수를 방지할 수 있습니다.

---

## 1. 일반 설정 (General Configuration)

`config.configuration` 객체 안에서 사이트 전체에 영향을 주는 설정을 변경합니다.

| 설정 항목 (Key) | 설명 및 주의사항 | 비고 |
| :--- | :--- | :--- |
| **`pageTitle`** | 사이트 제목. RSS 피드 생성 시에도 사용됩니다. | 예: `"JunSik's Log"` |
| **`pageTitleSuffix`** | 브라우저 탭 제목 뒤에 붙는 꼬리말. 페이지 상단에는 보이지 않습니다. | 보통 `""` (공란) 추천 |
| **`enableSPA`** | **Single Page Application** 라우팅 활성화 여부. (`true`/`false`) | `true` 추천 (페이지 이동이 부드러워짐) |
| **`enablePopovers`** | 링크에 마우스를 올렸을 때 **미리보기 팝업** 표시 여부. | `true` 추천 |
| **`analytics`** | 방문자 통계 도구 설정. 사용하지 않으려면 `null`. | Google, Plausible, Umami 등 지원 |
| **`locale`** | 날짜 형식 및 다국어 설정 (i18n). | 예: `"ko-KR"`, `"en-US"` |
| **`baseUrl`** | **[중요]** 사이트맵/RSS용 절대 주소. `https://`와 끝 슬래시(`/`) 제외. | 예: `u-nsiq.github.io` |
| **`ignorePatterns`** | Quartz가 읽지 않고 무시할 폴더/파일 패턴 (Glob 패턴). | 예: `["private", ".obsidian"]` |
| **`defaultDateType`** | 글 목록에 표시할 날짜 기준. | `created`(작성일), `modified`(수정일), `published`(배포일) |

---

## 2. 테마 설정 (Theme)

`config.configuration.theme` 객체 안에서 폰트와 색상을 관리합니다.

### 🅰️ 타이포그래피 (Typography)
[Google Fonts](https://fonts.google.com/)에 있는 폰트 이름을 적으면 자동으로 적용됩니다.

#### 기본 설정 (문자열 방식)
단순히 폰트 이름만 적는 방식입니다.
```ts
typography: {
  header: "Schibsted Grotesk", // 제목 폰트
  body: "Source Sans Pro",     // 본문 폰트
  code: "IBM Plex Mono",       // 코드 블록 폰트
}
````

#### 고급 설정 (객체 방식 - 굵기 조절 등)

특정 굵기(Weight)나 이탤릭체를 포함하고 싶다면 객체 형태로 작성합니다.


```typescript
typography: {
  header: {
    name: "Schibsted Grotesk",
    weights: [400, 700], // 400(Regular), 700(Bold) 가져오기
    includeItalic: true,
  },
  ...
}
```

### 🎨 색상 (Colors)

`lightMode` (라이트 모드)와 `darkMode` (다크 모드)를 각각 설정합니다.

|**색상 키 (Key)**|**적용되는 곳**|
|---|---|
|`light`|페이지 배경색 (Background)|
|`lightgray`|연한 테두리 (Borders)|
|`gray`|그래프의 연결선, 짙은 테두리|
|`darkgray`|**본문 텍스트** (Body text)|
|`dark`|**제목(Header) 텍스트** 및 아이콘|
|`secondary`|**링크 색상**, 그래프의 현재 노드, 주요 강조색|
|`tertiary`|링크 호버(Hover) 색상, 방문한 그래프 노드|
|`highlight`|내부 링크 배경, 형광펜 효과, 코드 강조 줄|
|`textHighlight`|마크다운 강조 구문(`==text==`)의 배경색|

> **`cdnCaching`**: `true`면 구글 CDN을 사용해 폰트를 빠르게 로딩합니다. `false`면 폰트를 다운로드하여 자체 호스팅합니다.

---

## 3. 플러그인 설정 (Plugins)

Quartz는 콘텐츠를 변환하는 과정을 **파이프라인(Pipeline)**으로 처리합니다. `config.plugins`에서 이 과정을 조립합니다.

### 플러그인의 3가지 종류

1. **Transformers (변환기):** 마크다운 내용을 HTML이나 데이터로 변환 (Map).
    
    - 예: Frontmatter 파싱, LaTeX 수식 변환, Description 생성.
        
2. **Filters (필터):** 특정 조건에 맞는 콘텐츠를 제외 (Filter).
    
    - 예: `RemoveDrafts` (Draft 상태인 글 제외).
        
3. **Emitters (방출기):** 변환된 데이터를 바탕으로 최종 파일 생성 (Reduce).
    
    - 예: HTML 페이지 생성, RSS 피드 생성, 사이트맵 생성.
        

### 설정 방법

플러그인을 추가하거나 제거하려면 배열에 `Plugin.이름()`을 넣거나 뺍니다. 세부 설정이 필요한 경우 객체 `{}`를 인자로 전달합니다.

**예시: LaTeX 플러그인에 옵션 전달하기**


```TypeScript
transformers: [
  Plugin.FrontMatter(), // 기본 설정 사용
  Plugin.Latex({ renderEngine: "katex" }), // KaTeX 엔진 사용하도록 옵션 전달
]
```

> **주의:** `transformers`는 **순서가 중요**합니다. 위에서부터 아래로 순차적으로 처리되므로, 의존성이 있는 플러그인 순서에 유의하세요.