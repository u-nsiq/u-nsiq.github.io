Quartz는 사이트의 모든 콘텐츠를 **RSS 피드(`index.xml`)** 형태로 자동 발행합니다.
덕분에 방문자들은 RSS 리더기를 통해 사용자님의 새 글 소식을 편하게 받아볼 수 있습니다.

## 1. 필수 설정 (Configuration)

RSS가 제대로 작동하려면 **`baseUrl`** 설정이 가장 중요합니다.
RSS 표준 규격상 절대 주소(Absolute URL)가 필요하기 때문입니다.

`quartz.config.ts` 파일에서 아래 부분을 꼭 확인하세요.

```typescript
// quartz.config.ts
const config: QuartzConfig = {
  configuration: {
    // ...
    baseUrl: "u-nsiq.github.io", // https:// 를 뺀 도메인 주소 입력
    // ...
  },
}
````

---

## 2. 구독 주소 (Feed URL)

배포가 완료되면, RSS 피드 주소는 기본적으로 다음과 같습니다.

> **`https://{baseUrl}/index.xml`**

예를 들어, 도메인이 `u-nsiq.github.io`라면 구독 주소는 `https://u-nsiq.github.io/index.xml`이 됩니다.

이 주소를 블로그 어딘가에 링크해두거나, 방문자에게 알려주면 됩니다.

---

## 3. 고급 설정 (Customization)

만약 `index.xml`이라는 파일명이 마음에 들지 않는다면, `ContentIndex` 플러그인 설정에서 바꿀 수 있습니다.

`quartz.config.ts`의 `plugins` 섹션을 수정합니다.



```TypeScript
// quartz.config.ts

emitters: [
  Plugin.ContentIndex({
    rssSlug: "feed", // index.xml 대신 feed.xml로 변경됨
    // ...
  }),
  // ...
]
```

> **💡 참고:** 이 기능은 `ContentIndex` 플러그인이 담당하므로, 해당 플러그인이 `emitters` 목록에 있어야 작동합니다.

