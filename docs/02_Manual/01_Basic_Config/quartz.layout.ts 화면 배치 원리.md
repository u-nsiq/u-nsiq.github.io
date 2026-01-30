`quartz.layout.ts` 파일은 페이지의 **레이아웃(Layout)** 을 정의합니다.
헤더, 푸터, 사이드바, 본문 위아래에 어떤 컴포넌트(기능)를 배치할지 결정하는 **블로그의 설계도**입니다.

## 1. 페이지 구조 (Page Structure)

Quartz의 페이지는 `FullPageLayout` 인터페이스를 따르며, 크게 8가지 구역으로 나뉩니다.

```typescript
export interface FullPageLayout {
  head: QuartzComponent       // <head> 태그 (메타데이터)
  header: QuartzComponent[]   // 최상단 가로 메뉴바
  beforeBody: QuartzComponent[] // 본문 바로 위 (세로 배치)
  pageBody: QuartzComponent     // 본문 내용 (수정 불가)
  afterBody: QuartzComponent[]  // 본문 바로 아래 (세로 배치)
  left: QuartzComponent[]     // 왼쪽 사이드바
  right: QuartzComponent[]    // 오른쪽 사이드바
  footer: QuartzComponent     // 최하단 푸터
}
````

### 각 구역별 상세 설명

|**구역 이름**|**배치 방향**|**설명 및 역할**|
|---|---|---|
|**`head`**|-|HTML의 `<head>` 태그입니다. 화면에 보이지 않고, 탭 제목, 스크립트, 스타일 등 **메타데이터**를 담당합니다.|
|**`header`**|가로 (Horizontal)|`beforeBody`보다 위에 위치하는 최상단 바입니다. Quartz 3 스타일의 상단 메뉴바를 만들 때 사용합니다. (기본값은 비어있음)|
|**`beforeBody`**|세로 (Vertical)|본문 제목(`H1`) 위에 쌓이는 요소들입니다. 보통 **Breadcrumbs(경로)**나 **태그 목록**을 둡니다.|
|**`pageBody`**|-|실제 마크다운 콘텐츠가 렌더링되는 본문 영역입니다. (레이아웃 파일에서 컴포넌트를 추가할 수 없음)|
|**`afterBody`**|세로 (Vertical)|본문이 끝난 직후에 나옵니다. **댓글창(Giscus)**이나 **백링크**를 두기에 적합합니다.|
|**`left`**|세로 (Vertical)|**왼쪽 사이드바**. 데스크톱에서는 왼쪽에 고정되지만, 모바일에서는 상단으로 이동하거나 숨겨집니다. 보통 **파일 탐색기**를 둡니다.|
|**`right`**|세로 (Vertical)|**오른쪽 사이드바**. 데스크톱에서는 오른쪽에 고정되지만, 태블릿/모바일에서는 하단으로 이동합니다. **목차(TOC)**나 **그래프**를 둡니다.|
|**`footer`**|-|페이지 맨 아래에 위치하는 **푸터**. 저작권 표시나 SNS 링크를 둡니다.|

---

## 2. 반응형 동작 (Responsive Design)

화면 크기(Breakpoint)에 따라 레이아웃이 자동으로 변합니다. 기준점은 `variables.scss`에서 설정 가능합니다.

### 화면 크기별 레이아웃 변화

- **Desktop** (너비 > 1200px): `left`, `right` 사이드바가 양옆에 모두 보임.
    
- **Tablet** (800px < 너비 < 1200px): `left`는 보이지만, `right`는 본문 아래로 내려감.
    
- **Mobile** (너비 < 800px): `left`, `right` 모두 본문 위아래로 이동하거나 햄버거 메뉴로 들어감.
    


```SCSS
// 기본 브레이크포인트 설정 (quartz/styles/variables.scss)
$breakpoints: (
  mobile: 800px,
  desktop: 1200px,
);
```

---

## 3. 스타일 커스터마이징 (Styling)

레이아웃의 위치뿐만 아니라 디자인(CSS)을 수정하고 싶다면 다음 방법을 사용합니다.

1. **기본 설정:** 색상이나 폰트는 `quartz.config.ts`에서 수정하는 것이 가장 빠릅니다.
    
2. **고급 설정 (Sass):** 더 디테일한 스타일링이 필요하면 `quartz/styles/custom.scss` 파일에 직접 CSS(SCSS)를 작성합니다.
    
3. **컴포넌트별 스타일:** 각 컴포넌트는 고유의 스타일 파일(예: `quartz/components/styles/darkmode.scss`)을 가지고 있을 수 있으니, 특정 기능만 고치고 싶다면 해당 파일을 확인하세요.
    

> **💡 개발자 노트:** Quartz의 컴포넌트는 리액트(React)의 **HOC(Higher-order Components)** 개념과 유사하게 동작하며, 설정값(Properties)을 인자로 받아 기능을 변경할 수 있습니다.