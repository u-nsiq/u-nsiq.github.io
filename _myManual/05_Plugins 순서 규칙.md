Quartz의 `quartz.config.ts` 파일 내 `plugins` 설정은 단순한 리스트가 아니라 **실행 순서가 중요한 파이프라인(Pipeline)** 입니다.
순서가 잘못되면 렌더링이 깨지거나 빌드 에러가 발생할 수 있습니다.

---

## 1. Transformers (변환기) - ⭐ 매우 중요
마크다운 텍스트를 HTML로 변환하는 핵심 단계입니다. **순차적으로 실행(Sequential Execution)**되므로 앞 단계의 결과가 뒷 단계에 영향을 줍니다.

### ✅ 권장 순서 (Safe Order)

```typescript
transformers: [
  // 1. 메타데이터 파싱 (무조건 최우선)
  Plugin.Frontmatter(), 
  
  // 2. 날짜 계산 (Frontmatter 의존)
  Plugin.CreatedModifiedDate({ priority: ["frontmatter", "filesystem"] }), 
  
  // 3. 코드 하이라이팅 (★ 중요: OFM보다 먼저 실행되어야 함)
  Plugin.SyntaxHighlighting({ ... }), 
  
  // 4. Obsidian 확장 문법 (Callout, Mermaid, Wikilinks)
  // [경고] Callout이나 Mermaid 내부의 코드가 깨지지 않으려면 SyntaxHighlighting 뒤에 와야 함
  Plugin.ObsidianFlavoredMarkdown({ enableInHtmlEmbed: false }), 
  
  // 5. GitHub 표준 문법 (Table, Tasklist, Footnotes)
  Plugin.GitHubFlavoredMarkdown(), 
  
  // 6. 구조 분석 (Header가 확정된 후 실행)
  Plugin.TableOfContents(), 
  
  // 7. 링크 및 그래프 연결 (모든 텍스트 변환 후 링크 수집)
  Plugin.CrawlLinks({ markdownLinkResolution: "shortest" }), 
  
  // 8. 기타 텍스트 처리
  Plugin.Latex({ renderEngine: "katex" }), 
  Plugin.Description(), 
  Plugin.HardLineBreaks(), // (단순 치환이라 맨 뒤가 안전)
]
````

### 🚨 핵심 의존성 규칙 (Dependency Rules)

1. **Frontmatter First:** 모든 플러그인은 문서의 설정을 읽어야 하므로 `Frontmatter()`는 무조건 0순위입니다.
    
2. **SyntaxHighlighting > ObsidianFlavoredMarkdown:**
    
    - `SyntaxHighlighting`이 먼저 코드 블록을 처리하고 보호해야 합니다.
        
    - 순서가 바뀌면 `ObsidianFlavoredMarkdown`이 코드 블록 내부의 특수문자를 Callout이나 Mermaid 문법으로 오해하여 렌더링이 깨질 수 있습니다.
        

---

## 2. Filters (필터) - ⚡ 성능 최적화

콘텐츠를 걸러내는 단계입니다. 기능적 오류보다는 **빌드 속도**에 영향을 줍니다.

### ✅ 권장 순서

"가장 많이 걸러내는 것"을 위로 올립니다. (Early Return 원칙)



```TypeScript
filters: [
  // 1. 명시적 비공개 (Draft) - 가장 많은 문서를 여기서 떨구는 게 효율적
  Plugin.RemoveDrafts(), 
  
  // 2. 특정 조건 (필요 시)
  // Plugin.ExplicitPublish(), 
]
```

---

## 3. Emitters (생성기) - 📂 파일 출력

최종 결과를 파일로 쓰는 단계입니다. 대부분 병렬적/독립적으로 작동하므로 **순서가 크게 중요하지 않습니다.**

### ✅ 권장 순서 (논리적 그룹핑)


```TypeScript
emitters: [
  // 1. 리소스 (JS, CSS, 이미지)
  Plugin.AliasRedirects(), 
  Plugin.ComponentResources(), 
  Plugin.ContentPage(), 
  
  // 2. 인덱스 페이지들 (순서 상관 없음)
  Plugin.FolderPage(), 
  Plugin.TagPage(), 
  
  // 3. 특수 파일 (RSS, Sitemap)
  Plugin.ContentIndex({ enableSiteMap: true, enableRSS: true }), 
  Plugin.Assets(), 
  Plugin.Static(), 
  Plugin.NotFoundPage(), 
]
```

---

## 4. 문제 해결 체크리스트 (Troubleshooting)

만약 블로그 화면이 이상하다면 다음을 확인하세요.

- **Q. 콜아웃(Callout) 모양이 이상하게 깨져요.**
    
    - A. `transformers` 목록에서 `SyntaxHighlighting`이 `ObsidianFlavoredMarkdown`보다 **아래에 있는지** 확인하세요. (위로 올려야 함)
        
- **Q. Mermaid 그래프가 코드로만 나와요.**
    
    - A. 위와 동일합니다. 순서를 확인하세요.
        
- **Q. 목차(TOC)가 안 생겨요.**
    
    - A. `TableOfContents`가 `GitHubFlavoredMarkdown`이나 `ObsidianFlavoredMarkdown`보다 너무 앞에 있어서, 헤더(#)를 인식하기 전에 실행된 건 아닌지 확인하세요.
        

