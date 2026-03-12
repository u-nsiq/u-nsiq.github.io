import { PageLayout, SharedLayout } from "./quartz/cfg"
import * as Component from "./quartz/components"

// 1. 모든 페이지에 공통으로 적용되는 레이아웃 (Shared)
// --------------------------------------------------
export const sharedPageComponents: SharedLayout = {
  head: Component.Head(), // HTML <head> 태그 (SEO, 메타데이터 처리)
  header: [], // 페이지 최상단 가로 메뉴바 (현재 비어있음)
  afterBody: [
    Component.Comments({
      provider: 'giscus',
      options: {
        // Giscus 사이트에서 받은 값들을 여기에 넣으세요
        repo: 'u-nsiq/u-nsiq.github.io',
        repoId: 'R_kgDOREaiJg',
        category: 'Announcements',
        categoryId: 'DIC_kwDOREaiJs4C1pbd',
        // 한국어 사용자라면 'ko'로 설정
        lang: 'ko', 
      }
    }),
  ], // 본문 내용이 끝난 직후 공간 (보통 댓글창(Giscus)을 여기에 넣음)
  
  // 페이지 맨 아래 푸터 (Footer)
  footer: Component.Footer({
    links: {
      GitHub: "https://github.com/u-nsiq", 
      "Email": "mailto:wnstlr0830@gmail.com",
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
    Component.ArticleTitle(), // 글의 거대한 제목 (H1)
    Component.ContentMeta(),  // 글 정보 (날짜, 읽는 시간)
    Component.TagList(),      // 태그 목록 (#CS #OS)
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
        { Component: Component.ReaderMode() }, // 리더 모드 (글에만 집중하는 모드)
      ],
    }),
    
    Component.Explorer({
      title: "Explorer", // 제목
      folderClickBehavior: "link", // 폴더 클릭 시 해당 폴더의 설명 페이지(index.md)로 이동
      folderDefaultState: "collapsed", // 처음부터 폴더를 열어서 내용을 보여줌 (open/collapsed)
      useSavedState: true, // 사용자가 이전에 열고 닫은 상태를 기억
      
      // 이모지 추가
      mapFn: (node) => {
        if (node.isFolder) {
          node.displayName = "📁 " + node.displayName
        } else {
          node.displayName = "📄 " + node.displayName
        }
      },
    }),

    Component.RecentNotes({
      title: "Recent Notes",
      limit: 5,
      showTags: false,
      filter: (f) => !!f.slug?.startsWith("Notes/") && !f.slug?.endsWith("index"),
    }),
    Component.RecentNotes({
      title: "Recent Posts",
      limit: 5,
      showTags: false,
      filter: (f) => !!f.slug?.startsWith("Posts/") && !f.slug?.endsWith("index"),
    }),
  ],

  // 오른쪽 사이드바 (Right Sidebar)
  right: [
    Component.Graph({
      localGraph: { showTags: false },
      globalGraph: { showTags: false },
    }), // 지식 그래프 (점과 선으로 연결된 모습)
    Component.DesktopOnly(Component.TableOfContents()), // 목차 (TOC) - 데스크톱에서만 보임
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
      Component.ContentMeta() // 메타 정보
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
    Component.Explorer({
      title: "Explorer", // 제목 통일
      folderClickBehavior: "link", // 클릭 동작 통일
      folderDefaultState: "open", // 상태 통일
      useSavedState: true,
      mapFn: (node) => {
        if (node.isFolder) {
          node.displayName = "📁 " + node.displayName
        } else {
          node.displayName = "📄 " + node.displayName
        }
      },
    }),

    Component.RecentNotes({
      title: "Recent Notes",
      limit: 5,
      showTags: false,
      filter: (f) => !!f.slug?.startsWith("Notes/") && !f.slug?.endsWith("index"),
    }),
    Component.RecentNotes({
      title: "Recent Posts",
      limit: 5,
      showTags: false,
      filter: (f) => !!f.slug?.startsWith("Posts/") && !f.slug?.endsWith("index"),
    }),
  ],

  // 오른쪽 사이드바 (목록 페이지는 보통 오른쪽을 비워둠)
  right: [],
}