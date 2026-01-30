Quartz는 옵시디언의 **Admonition Callout** 문법을 완벽하게 지원합니다.
노트 작성 시 설명, 경고, 팁 등을 박스 형태로 예쁘게 강조할 수 있습니다.

## 1. 기본 문법 (Syntax)

인용구(`>`) 문법 뒤에 `[!타입]`을 붙여 사용합니다.

```markdown
> [!info] 제목을 적으세요
> 여기에 내용을 적으면 강조 박스가 됩니다.
> **마크다운** 문법도 안에서 자유롭게 쓸 수 있습니다.
````

---

## 2. 지원하는 타입 및 별칭 (Types)

총 12가지의 기본 스타일을 제공하며, 각 스타일마다 여러 가지 별칭(Alias)을 사용할 수 있습니다.

|**타입 (Type)**|**별칭 (Aliases)**|**색상 느낌**|
|---|---|---|
|**`note`**|`note`|기본 파란색 (필기)|
|**`abstract`**|`summary`, `tldr`|요약, 개요|
|**`info`**|`info`|정보 제공|
|**`todo`**|`todo`|할 일 목록|
|**`tip`**|`hint`, `important`|꿀팁, 중요 정보|
|**`success`**|`check`, `done`|성공, 완료 (초록색)|
|**`question`**|`help`, `faq`|질문, 도움말 (노란색)|
|**`warning`**|`attention`, `caution`|경고, 주의 (주황색)|
|**`failure`**|`missing`, `fail`|실패 (붉은색)|
|**`danger`**|`error`|위험, 에러 (진한 붉은색)|
|**`bug`**|`bug`|버그 리포트|
|**`example`**|`example`|예시 (보라색)|
|**`quote`**|`cite`|인용구|

---

## 3. 고급 기능 (Advanced)

### 접기/펼치기 (Collapsable)

내용이 길 때, 박스를 접어둘 수 있습니다.

- **`> [!info]- 제목`**: 처음부터 **접힌 상태**로 시작 (Click to open)
    
- **`> [!info]+ 제목`**: 처음부터 **펼쳐진 상태**로 시작 (접을 수 있음)
    

### 중첩 (Nesting)

콜아웃 안에 또 다른 콜아웃을 넣을 수 있습니다.



```Markdown
> [!question] 상위 질문
> > [!todo] 하위 답변
> > 이것은 중첩된 콜아웃입니다.
```

---

## 4. 커스터마이징 (Customization)

### 문제 해결: 콜아웃이 안 보인다면?

만약 콜아웃이 렌더링되지 않고 그냥 텍스트로 나온다면, 플러그인 순서 문제입니다.

`quartz.config.ts`에서 **`ObsidianFlavoredMarkdown`** 플러그인이 **`SyntaxHighlighting`** 플러그인보다 **뒤에(아래에)** 있어야 합니다.

### 나만의 콜아웃 만들기 (CSS)

새로운 색상이나 아이콘을 가진 콜아웃을 만들고 싶다면 `quartz/styles/custom.scss`에 추가할 수 있습니다.



```SCSS
/* custom.scss 예시 */
.callout {
  &[data-callout="custom"] {
    --color: #mycolor;
    --border: #mybordercolor;
    --bg: #mybg;
    --callout-icon: url("..."); /* SVG 아이콘 */
  }
}
```

