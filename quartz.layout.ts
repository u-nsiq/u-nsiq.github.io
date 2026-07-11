import { PageLayout, SharedLayout } from "./quartz/cfg"
import * as Component from "./quartz/components"

// [커스텀] Explorer 옵션 단일 출처 — content / list 양쪽 layout이 공유.
// 두 layout의 left 사이드바 구성을 시각적으로 wireframe처럼 읽기 위해
// 좌측 블록 자체는 함수로 추출하지 않고 인라인 유지.
const explorerFolderStateOverrides = {
  Notes: "collapsed", // Notes 폴더: 접힘
  Posts: "open", // Posts 폴더만 열림 (하위는 folderDefaultState에 따라 접힘)
} as const

// 폴더 우선, 폴더는 Posts > Notes 순서, 파일은 frontmatter date 내림차순, 그 외 알파벳순.
const explorerSortFn = (a: any, b: any) => {
  if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1
  if (a.isFolder && b.isFolder) {
    const folderOrder: Record<string, number> = { Posts: 0, Notes: 1 }
    const aOrder = folderOrder[a.slugSegment] ?? 99
    const bOrder = folderOrder[b.slugSegment] ?? 99
    if (aOrder !== bOrder) return aOrder - bOrder
  }
  if (!a.isFolder && !b.isFolder) {
    const aDate = a.data?.date ? new Date(a.data.date).getTime() : 0
    const bDate = b.data?.date ? new Date(b.data.date).getTime() : 0
    if (aDate !== bDate) return bDate - aDate
  }
  return a.displayName.localeCompare(b.displayName, undefined, {
    numeric: true,
    sensitivity: "base",
  })
}

const explorerCommonOptions = {
  title: "Explorer",
  folderClickBehavior: "collapse" as const, // 폴더 제목 클릭 시 토글; index.md 보유 폴더는 "자세히" 링크
  folderDefaultState: "collapsed" as const, // 기본: 모든 폴더 접힘
  useSavedState: true, // 사용자 토글 상태 localStorage 기억
  folderStateOverrides: explorerFolderStateOverrides,
  sortFn: explorerSortFn,
  // [커스텀] 기본 필터(tags 제외)에 about 제외 추가 — About 진입은 사이드바 NavLinks가 담당
  filterFn: (node: any) => node.slugSegment !== "tags" && node.slug !== "about",
}
// [커스텀 끝]

// 1. 모든 페이지에 공통으로 적용되는 레이아웃 (Shared)
// --------------------------------------------------
export const sharedPageComponents: SharedLayout = {
  head: Component.Head(), // HTML <head> 태그 (SEO, 메타데이터 처리)
  header: [], // 페이지 최상단 가로 메뉴바 (현재 비어있음)
  afterBody: [
    // [커스텀] 홈 전용 섹션 쇼케이스 — 폴더별 최근 글 그리드 (Explore 블록, HomeShowcase.tsx)
    Component.ConditionalRender({
      component: Component.HomeShowcase(),
      condition: (page) => page.fileData.slug === "index",
    }),
    // [커스텀] 댓글은 콘텐츠 페이지에만 — 홈·폴더 index·태그·404 페이지에는 표시하지 않음
    Component.ConditionalRender({
      component: Component.Comments({
        provider: "giscus",
        options: {
          // Giscus 사이트에서 받은 값들을 여기에 넣으세요
          repo: "u-nsiq/u-nsiq.github.io",
          repoId: "R_kgDOREaiJg",
          category: "Announcements",
          categoryId: "DIC_kwDOREaiJs4C1pbd",
          // 한국어 사용자라면 'ko'로 설정
          lang: "ko",
        },
      }),
      condition: (page) =>
        page.fileData.slug !== "index" &&
        page.fileData.slug !== "about" &&
        page.fileData.slug !== "404" &&
        !page.fileData.slug?.endsWith("/index") &&
        !page.fileData.slug?.startsWith("tags/"),
    }),
  ], // 본문 내용이 끝난 직후 공간 (보통 댓글창(Giscus)을 여기에 넣음)

  // 페이지 맨 아래 푸터 (Footer)
  footer: Component.Footer({
    links: {
      GitHub: "https://github.com/u-nsiq",
      Email: "mailto:wnstlr0830@gmail.com",
    },
  }),
}

// 2. 단일 포스트 페이지 레이아웃 (Content Page)
// (일반적인 글, 노트 하나를 볼 때의 화면 구성)
// --------------------------------------------------
export const defaultContentPageLayout: PageLayout = {
  // 본문(Body) 바로 위에 표시될 요소들
  beforeBody: [
    // 브레드크럼 (경로 표시: Home > Study > OS)
    Component.ConditionalRender({
      component: Component.Breadcrumbs(),
      // 'index' (홈) 페이지가 아닐 때만 경로를 보여줌
      condition: (page) => page.fileData.slug !== "index",
    }),
    // [커스텀] 홈은 본문 H1이 제목 역할 — frontmatter title(JunSik.io) 이중 표시 방지
    Component.ConditionalRender({
      component: Component.ArticleTitle(), // 글의 거대한 제목 (H1)
      condition: (page) => page.fileData.slug !== "index",
    }),
    // [커스텀] About 페이지는 본문의 "Last updated" 표기가 날짜를 담당 — 자동 메타 숨김
    Component.ConditionalRender({
      component: Component.ContentMeta(), // 글 정보 (날짜, 읽는 시간)
      condition: (page) => page.fileData.slug !== "about",
    }),
    Component.TagList(), // 태그 목록 (#CS #OS)
  ],

  // 왼쪽 사이드바 (Left Sidebar)
  left: [
    Component.PageTitle(), // 블로그 제목 (클릭하면 홈으로 이동)
    Component.MobileOnly(Component.Spacer()), // 모바일에서만 빈 공간을 줌 (레이아웃 깨짐 방지)

    // Flex: 가로로 요소들을 나란히 배치하는 컨테이너
    Component.Flex({
      components: [
        {
          Component: Component.Search(), // 검색창
          grow: true, // 남은 공간을 검색창이 꽉 채우도록 설정
        },
        { Component: Component.Darkmode() }, // 다크모드/라이트모드 토글 버튼
      ],
    }),

    Component.NavLinks(), // [커스텀] 사이드바 내비 (Home·About — 폴더 제목이 토글 전용이라 명시적 진입점)
    Component.Explorer({ ...explorerCommonOptions }), // [커스텀] 옵션 단일 출처 = explorerCommonOptions
    // [커스텀] 최근 업데이트 노트 목록 — 사이드바 하단 고정 (custom.scss .recent-notes)
    Component.RecentNotes({
      title: "최근 노트",
      limit: 3,
      showTags: false,
      filter: (f) =>
        !f.frontmatter?.draft &&
        f.slug !== "index" &&
        f.slug !== "about" &&
        !f.slug?.endsWith("/index"),
    }),
  ],

  // 오른쪽 사이드바 (Right Sidebar)
  right: [
    Component.Graph({
      localGraph: { showTags: false },
      globalGraph: { showTags: false },
    }), // 지식 그래프 (점과 선으로 연결된 모습)
    Component.TableOfContents(), // 목차 (TOC)
    Component.Backlinks(), // 백링크 (이 글을 언급하고 있는 다른 글들 목록)
  ],
}

// 3. 목록 페이지 레이아웃 (List Page)
// (태그 클릭했을 때나, 폴더 클릭했을 때 나오는 파일 목록 화면)
// --------------------------------------------------
export const defaultListPageLayout: PageLayout = {
  beforeBody: [
    Component.Breadcrumbs(), // 경로 표시
    Component.ArticleTitle(), // 목록 제목 (예: "Tag: OS")
    Component.ContentMeta(), // 메타 정보
  ],

  // 왼쪽 사이드바 (글 페이지와 동일하게 유지)
  left: [
    Component.PageTitle(),
    Component.MobileOnly(Component.Spacer()),
    Component.Flex({
      components: [
        {
          Component: Component.Search(),
          grow: true,
        },
        { Component: Component.Darkmode() }, // 리스트 페이지엔 리더모드가 굳이 필요 없어서 빠져있음
      ],
    }),
    Component.NavLinks(), // [커스텀] 사이드바 내비 (Home·About — 폴더 제목이 토글 전용이라 명시적 진입점)
    Component.Explorer({ ...explorerCommonOptions }), // [커스텀] 옵션 단일 출처 = explorerCommonOptions
    // [커스텀] 최근 업데이트 노트 목록 — 사이드바 하단 고정 (custom.scss .recent-notes)
    Component.RecentNotes({
      title: "최근 노트",
      limit: 3,
      showTags: false,
      filter: (f) =>
        !f.frontmatter?.draft &&
        f.slug !== "index" &&
        f.slug !== "about" &&
        !f.slug?.endsWith("/index"),
    }),
  ],

  // 오른쪽 사이드바 (목록 페이지는 보통 오른쪽을 비워둠)
  right: [],
}
