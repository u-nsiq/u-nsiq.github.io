import { QuartzConfig } from "./quartz/cfg"
import * as Plugin from "./quartz/plugins"

/**
 * Quartz 4 Configuration
 *
 * 공식 문서 참조: https://quartz.jzhao.xyz/configuration
 */
const config: QuartzConfig = {
  configuration: {
    // 1. 사이트 기본 정보 설정
    // -------------------------------------------------
    pageTitle: "JunSik.io", // 사이트 제목입니다. RSS 피드 생성 시에도 사용됩니다.
    
    pageTitleSuffix: "", // 브라우저 탭 제목 뒤에 붙는 텍스트입니다. 실제 페이지 화면에는 보이지 않습니다.
    
    enableSPA: true, // SPA(Single Page Application) 라우팅을 켭니다. 페이지 이동 시 깜빡임 없이 부드럽게 전환됩니다.
    
    enablePopovers: true, // 링크에 마우스를 올렸을 때 미리보기 팝업(Popover)을 띄울지 결정합니다.
    
    // 방문자 통계 도구 설정
    // 사용하지 않으려면 null로 설정하세요. (예: analytics: null)
    // 구글, Plausible, Umami 등을 지원합니다.
    analytics: null,
    // {provider: 'google', tagId: '<your-google-tag>', // Google Analytics 설정 예시},
    
    locale: "en-US", // 날짜 형식 및 다국어 처리에 사용될 지역 설정입니다.
    
    // 사이트의 절대 주소 (Sitemap, RSS용)
    // 중요: 'https://' 프로토콜과 맨 뒤의 슬래시('/')를 제외하고 입력해야 합니다.
    // 예: u-nsiq.github.io
    baseUrl: "u-nsiq.github.io",
    
    // Quartz가 콘텐츠 탐색 시 무시할 파일이나 폴더 패턴입니다. (비공개 폴더 등)
    ignorePatterns: ["private", "templates", ".obsidian"],
    
    // 페이지 목록에 표시할 날짜의 기준입니다.
    // 값: 'created'(생성일), 'modified'(수정일), 'published'(발행일) 중 선택
    defaultDateType: "created",
    
    // 2. 디자인 및 테마 설정 (Theme)
    // -------------------------------------------------
    theme: {
      fontOrigin: "local", // "local": Quartz가 폰트를 자동 로딩하지 않음. custom.scss에서 CDN으로 직접 불러옴.

      cdnCaching: true,

      // fontOrigin: "local"이므로 아래 이름은 custom.scss에서 불러오는 font-family와 일치시킨다.
      typography: {
        title: { // 사이트 제목용 폰트 (custom.scss에서 Google Fonts CDN으로 로드)
          name: "Schibsted Grotesk",
          weights: [700, 900],
        },
        header: "Pretendard", // 제목(Header)용 폰트
        body: "Pretendard",     // 본문(Body)용 폰트
        code: "IBM Plex Mono",       // 코드 블록(Code)용 폰트
      },

      // 색상 설정 (라이트 모드 / 다크 모드)
      // 각 키(Key)의 역할은 다음과 같습니다.
      colors: {
        // [Velocity Style]
        lightMode: {
          light: "#ffffff",       // 배경: 깨끗한 화이트 (스크린샷의 종이 질감)
          lightgray: "#e0e0e0",   // 테두리: 아주 은은한 회색
          gray: "#d1d1d1",        // 그래프 선
          darkgray: "#3b3b3b",    // 본문: 스크린샷처럼 너무 검지 않은, 부드러운 진회색
          dark: "#202020",        // 제목: 깔끔한 검정
          secondary: "#7797C0",   
          tertiary: "#4a5a75",    // 링크 호버 (조금 더 진한 슬레이트)
          highlight: "rgba(108, 122, 150, 0.15)", // 형광펜: 포인트 컬러의 연한 버전
          textHighlight: "#fff23688", // 마크다운 강조
        },

        // [Nord Style]
        darkMode: {
          light: "#23272e",
          lightgray: "#393639",
          gray: "#646464",
          darkgray: "#d4d4d4",
          dark: "#ebebec",
          secondary: "#61afef",
          tertiary: "#98c379",
          highlight: "rgba(143, 159, 169, 0.15)",
          textHighlight: "#b3aa0288",
        },
      },
    },
  },
  
  // 3. 플러그인 설정 (Plugins)
  // -------------------------------------------------
  plugins: {
    // Transformers: 콘텐츠(Markdown)를 변환하는 역할을 합니다.
    transformers: [
      Plugin.FrontMatter(), // 문서 맨 앞의 YAML Frontmatter를 파싱합니다.
      Plugin.CreatedModifiedDate({
        priority: ["frontmatter"], // frontmatter date/modified 필드만 사용. 수동 관리.
      }),
      Plugin.SyntaxHighlighting({
        theme: {
          light: "catppuccin-latte",
          dark: "catppuccin-frappe",
        },
        keepBackground: true, // 코드 블록 배경색 유지
      }),
      Plugin.ObsidianFlavoredMarkdown({ enableInHtmlEmbed: false }), // 옵시디언 전용 문법 지원 (Callout 등)
      Plugin.GitHubFlavoredMarkdown(), // 깃허브 스타일 마크다운 지원 (Table 등)
      Plugin.TableOfContents(), // 목차(TOC) 생성
      Plugin.CrawlLinks({ markdownLinkResolution: "shortest" }), // [[WikiLink]] 처리 방식 설정
      Plugin.Description(), // SEO용 설명 생성
      Plugin.Latex({ renderEngine: "katex" }), // 수식(LaTeX) 렌더링 (KaTeX 사용)
      Plugin.HardLineBreaks(), // 마크다운 내 줄바꿈을 강제 적용합니다.
    ],
    
    // Filters: 조건에 맞지 않는 페이지를 제외합니다.
    filters: [Plugin.RemoveDrafts()], // 'draft: true'인 문서를 배포에서 제외합니다.
    
    // Emitters: 변환된 콘텐츠로 최종 파일(HTML, XML 등)을 생성합니다.
    emitters: [
      Plugin.AliasRedirects(), // Frontmatter의 aliases를 리다이렉트 처리
      Plugin.ComponentResources(), // CSS, JS 등 리소스 생성
      Plugin.ContentPage(), // 실제 콘텐츠 페이지 생성
      Plugin.FolderPage(), // 폴더 인덱스 페이지 생성
      // Plugin.TagPage(), // 태그는 상태 표시 전용 — 태그 페이지 불필요
      Plugin.ContentIndex({
        enableSiteMap: true, // 사이트맵 생성 (SEO)
        enableRSS: true,     // RSS 피드 생성
      }),
      Plugin.Assets(), // static 폴더의 에셋 복사
      Plugin.Static(),
      Plugin.Favicon(), // 파비콘 생성
      Plugin.NotFoundPage(), // 404 에러 페이지 생성
      // Plugin.CustomOgImages(), // SNS 공유 이미지 생성
    ],
  },
}

export default config