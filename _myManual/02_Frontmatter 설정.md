Frontmatter는 마크다운 파일 맨 위에 작성하는 메타데이터 영역입니다.
Quartz는 `gray-matter` 라이브러리를 사용하여 이 영역을 파싱합니다.

## 1. 기본 문법 (Syntax)
파일의 맨 첫 줄에 `---` (대시 3개)로 시작하고 닫아야 합니다.

```yaml
---
title: "여기에 제목 입력"
date: 2026-01-31
tags: [Tag1, Tag2]
---
````

## 2. 주요 설정 항목 (Fields)

### 📝 기본 정보 (Basic)

- **`title`**: 문서의 제목입니다.
    
    - **팁:** 이 항목을 적지 않으면, Quartz는 자동으로 **파일 이름**을 제목으로 사용합니다.
        
- **`description`**: 문서의 요약 또는 설명입니다. 링크 미리보기(Link Preview)에 사용됩니다.
    
- **`tags`**: 태그 목록입니다. YAML 문법에 따라 두 가지 방식 모두 가능합니다.
	- **한 줄 작성:** `tags: [CS, OS]`
	- **여러 줄 작성:**
	  ```YAML
	  tags:
		  - CS
		  - OS
	  ```
    
- **`aliases`**: 문서의 별칭입니다. (리스트 형식)
    
- **`permalink`**: 파일 경로가 바뀌더라도 URL을 고정하고 싶을 때 사용합니다.
    

### 📅 날짜 (Dates)

`YYYY-MM-DD` 형식을 권장합니다.

- **`date`**: 문서가 발행된 날짜입니다.
    
- **`lastmod`** (또는 `modified`): 마지막 수정일입니다.
    

### 👁️ 공개 및 상태 (Visibility)

- **`draft`**: `true`로 설정하면 **비공개 페이지(Private Page)**가 됩니다.
    
    - 로컬 미리보기(`--serve`)에서는 보이지만, GitHub 배포(`sync`) 시 제외됩니다.
        
    - 아직 작성 중인 글에 유용합니다.
        

### 🎨 디자인 및 기능

- **`enableToc`**: `true` / `false`. 이 페이지에서만 목차(Table of Contents)를 켜거나 끕니다.
    
- **`cssclasses`**: 특정 CSS 클래스를 적용합니다.
    
- **`comments`**: `false`로 설정하여 댓글창을 숨길 수 있습니다.
    

---

## 3. 작동 원리 (심화)

Quartz는 각 필드를 담당하는 플러그인이 따로 있습니다. 커스터마이징 시 참고하세요.

- **`Frontmatter` 플러그인:** `title`, `tags`, `aliases`, `cssclasses` 처리
    
- **`CreatedModifiedDate` 플러그인:** `date` 관련 처리
    
- **`Description` 플러그인:** `description` 처리
    

---

## 4. 작성 예시 (Template)


```YAML
---
title: "Quartz 블로그 구축기"
date: 2026-01-31
tags: [Blog, Quartz]
draft: false
description: "Quartz를 이용한 블로그 구축 과정을 정리함."
---
```

