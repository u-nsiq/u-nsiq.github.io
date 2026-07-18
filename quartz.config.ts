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
    // [커스텀] pageTitle / baseUrl: 개인 블로그 식별값. 자세한 설명은 _myDocs/커스텀 변경사항.md §1
    pageTitle: "JunSik.io", // 사이트 제목입니다. RSS 피드 생성 시에도 사용됩니다.

    pageTitleSuffix: "", // 브라우저 탭 제목 뒤에 붙는 텍스트입니다. 실제 페이지 화면에는 보이지 않습니다.

    enableSPA: true, // SPA(Single Page Application) 라우팅을 켭니다. 페이지 이동 시 깜빡임 없이 부드럽게 전환됩니다.

    enablePopovers: true, // 링크에 마우스를 올렸을 때 미리보기 팝업(Popover)을 띄울지 결정합니다.

    // 방문자 통계 도구 설정
    // 사용하지 않으려면 null로 설정하세요. (예: analytics: null)
    // 구글, Plausible, Umami 등을 지원합니다.
    analytics: { provider: "google", tagId: "G-PX97HG0GD5" },

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
        title: {
          // 사이트 제목용 폰트 (custom.scss에서 Google Fonts CDN으로 로드)
          name: "Schibsted Grotesk",
          weights: [700, 900],
        },
        header: "Pretendard Variable", // 제목(Header)용 폰트
        body: "Pretendard Variable", // 본문(Body)용 폰트
        code: "IBM Plex Mono", // 코드 블록(Code)용 폰트
      },

      // [커스텀] 색상 팔레트 — Light: Velocity "Anniversary" 페인트 실측 이식 / Dark: Nord.
      //   Obsidian Velocity theme.css의 .theme-light.anniversary 변수(oklch)를 hex로 변환한 값.
      //   각 키 의미와 대응 근거는 _myDocs/커스텀 변경사항.md §1-3 참고.
      colors: {
        // [Velocity Anniversary — 실측 이식 (8차)]
        lightMode: {
          light: "#FBFBFC", // 배경: --bg-main-inner = oklch(98.75% 0.00125 290)
          lightgray: "#D8D8D8", // 테두리: color-base-25 = oklch(88.25% 0 ·)
          gray: "#A3A3A3", // muted(날짜·그래프 선): color-base-50 = oklch(71.5% 0 ·)
          darkgray: "#222222", // 본문: text-normal = color-base-90 = oklch(25% 0 ·)
          dark: "#191919", // 제목: h1-color = color-base-100 = oklch(21.25% 0 ·)
          secondary: "#7797C0", // 액센트: Obsidian 사용자 지정 accentColor (anniversary 기본 레드를 override)
          tertiary: "#4A6FA5", // 링크 호버 (액센트 어두운 변형)
          highlight: "rgba(70, 70, 76, 0.06)", // hover/active 배경: --background-modifier-hover (뉴트럴 저알파)
          textHighlight: "#FCEFD2", // ==강조== 배경: 노랑 마커 (21차 — Obsidian Velocity 노랑 마커 33%를 라이트 배경에 합성한 실효값. 굵기는 custom.scss)
        },

        // [Nord Style]
        darkMode: {
          light: "#2E3440",
          lightgray: "#4C566A",
          gray: "#7B8A9A",
          darkgray: "#d4d4d4",
          dark: "#ebebec",
          secondary: "#61afef",
          tertiary: "#81A1C1", // 링크 호버 (Nord9)
          highlight: "rgba(143, 159, 169, 0.15)",
          textHighlight: "rgba(255, 214, 0, 0.55)", // 마크다운 강조 (yellow)
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
      Plugin.TableOfContents({ maxDepth: 4 }), // 목차(TOC) 생성
      Plugin.CrawlLinks({ markdownLinkResolution: "shortest" }), // [[WikiLink]] 처리 방식 설정
      Plugin.Description(), // SEO용 설명 생성
      Plugin.Latex({ renderEngine: "katex" }), // 수식(LaTeX) 렌더링 (KaTeX 사용)
      Plugin.HardLineBreaks(), // [커스텀] 추가 — 마크다운 내 줄바꿈을 강제 적용 (Quartz 기본 X)
    ],

    // Filters: 조건에 맞지 않는 페이지를 제외합니다.
    filters: [Plugin.RemoveDrafts()], // 'draft: true'인 문서를 배포에서 제외합니다.

    // Emitters: 변환된 콘텐츠로 최종 파일(HTML, XML 등)을 생성합니다.
    emitters: [
      Plugin.AliasRedirects(), // Frontmatter의 aliases를 리다이렉트 처리
      Plugin.ComponentResources(), // CSS, JS 등 리소스 생성
      Plugin.ContentPage(), // 실제 콘텐츠 페이지 생성
      Plugin.FolderPage(), // 폴더 인덱스 페이지 생성
      Plugin.TagPage(), // 태그 목록 페이지 생성
      Plugin.ContentIndex({
        enableSiteMap: true, // 사이트맵 생성 (SEO)
        enableRSS: true, // RSS 피드 생성
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
