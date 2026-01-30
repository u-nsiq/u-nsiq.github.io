Quartz는 **Giscus**를 이용하여 블로그에 댓글창을 달 수 있습니다.
Giscus는 깃허브의 'Discussions(토론)' 기능을 활용하므로, 무료이고 광고가 없으며 개발자 친화적입니다.

## 1. 사전 준비 (GitHub 설정)

Giscus를 쓰려면 깃허브 저장소가 다음 조건을 만족해야 합니다.

1.  **Public 저장소:** 비공개(Private) 저장소에서는 방문자가 댓글을 볼 수 없습니다.
2.  **Giscus 앱 설치:** [GitHub Apps - giscus](https://github.com/apps/giscus)에서 저장소에 앱을 설치해야 합니다.
3.  **Discussions 활성화:** 저장소 **Settings > General**에서 `Discussions` 체크박스를 켜야 합니다.

---

## 2. ID 발급받기

직접 코드를 짤 필요 없이, [Giscus 홈페이지](https://giscus.app/ko)에서 설정을 생성하면 됩니다.

1.  **저장소 입력:** `사용자명/저장소명` (예: `u-nsiq/quartz-blog`) 입력.
2.  **카테고리 선택:** **"Announcements"** 를 추천합니다. (글과 댓글이 1:1로 잘 매칭됩니다.)
3.  **결과 확인:** 화면 아래로 내리면 **`repo-id`** 와 **`category-id`** 가 생성된 것을 볼 수 있습니다. 이 **두 가지 값**을 복사해 두세요.

> **⚠️ 주의:** `<script>` 태그 전체를 복사할 필요는 없습니다. ID 값만 있으면 됩니다.

---

## 3. Quartz에 적용하기

`quartz.layout.ts` 파일을 열어 `sharedPageComponents`의 `afterBody` (본문 하단) 부분에 코드를 추가합니다.

```typescript
// quartz.layout.ts

export const sharedPageComponents: SharedLayout = {
  // ...
  afterBody: [
    Component.Comments({
      provider: 'giscus',
      options: {
        // Giscus 사이트에서 받은 값들을 여기에 넣으세요
        repo: '사용자명/저장소명',
        repoId: '복사한_REPO_ID',
        category: 'Announcements',
        categoryId: '복사한_CATEGORY_ID',
        
        // 한국어 사용자라면 'ko'로 설정
        lang: 'ko', 
      }
    }),
  ],
  // ...
}
````

---

## 4. 고급 설정 (Customization)

### 댓글창 숨기기

특정 페이지에서 댓글창을 끄고 싶다면, 해당 파일의 프론트매터에 `comments: false`를 추가하세요.



```YAML
---
title: "댓글 금지 메모"
comments: false
---
```

### 테마 변경

블로그 테마에 맞춰 댓글창 테마도 자동으로 바뀝니다. 만약 커스텀 테마를 쓰고 싶다면 `themeUrl`, `lightTheme`, `darkTheme` 옵션을 사용할 수 있습니다.

---

**26/1/30 Giscus 코드**

```
<script src="https://giscus.app/client.js"
        data-repo="u-nsiq/u-nsiq.github.io"
        data-repo-id="R_kgDOREaiJg"
        data-category="Announcements"
        data-category-id="DIC_kwDOREaiJs4C1pbd"
        data-mapping="url"
        data-strict="0"
        data-reactions-enabled="1"
        data-emit-metadata="0"
        data-input-position="bottom"
        data-theme="preferred_color_scheme"
        data-lang="ko"
        crossorigin="anonymous"
        async>
</script>
```
