import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { SimpleSlug, resolveRelative } from "../util/path"
import { byDateAndAlphabetical } from "./PageList"
import { Date, getDate } from "./Date"
import { classNames } from "../util/lang"
import { i18n } from "../i18n"
import { QuartzPluginData } from "../plugins/vfile"
import style from "./styles/homeShowcase.scss"

// [커스텀] 홈(index) 전용 섹션 쇼케이스.
// 구조: "Browse" 헤더(+ 가든 상태 라인) → 투컬럼 [Posts 그룹(서브카드 1열 스택) | Notes 그룹(리스트)].
// 두 그룹 박스는 grid stretch로 같은 높이가 되고, Notes 리스트는 그 높이에 맞춰 균등 분배된다.
// allFiles에서 직접 필터·정렬하므로 글을 쓰면 자동 갱신된다 (수동 관리 없음).
// 홈 한정 렌더링은 quartz.layout.ts의 ConditionalRender가 담당.

const SHOWCASE_TITLE = "Browse"

interface SectionSpec {
  title: string
  prefix: string // slug prefix로 폴더 필터
  folder: SimpleSlug // "more →" 링크가 이동할 폴더 index
  limit?: number
}

const POST_SECTIONS: SectionSpec[] = [
  { title: "🔬 Research", prefix: "Posts/Research/", folder: "Posts/Research/" as SimpleSlug },
  {
    title: "📄 Paper Review",
    prefix: "Posts/Paper-Review/",
    folder: "Posts/Paper-Review/" as SimpleSlug,
  },
  { title: "🛠️ Projects", prefix: "Posts/Projects/", folder: "Posts/Projects/" as SimpleSlug },
  { title: "📝 Essays", prefix: "Posts/Essays/", folder: "Posts/Essays/" as SimpleSlug },
  { title: "📚 Lectures", prefix: "Posts/Lectures/", folder: "Posts/Lectures/" as SimpleSlug },
]

const NOTES_SECTION: SectionSpec = {
  title: "🌱 Notes",
  prefix: "Notes/",
  folder: "Notes/" as SimpleSlug,
}

// Posts 서브카드는 압축(한 줄 항목 × 2). Notes는 투컬럼에서 Posts 그룹 높이에 맞춰 리스트를 채움
const POST_CARD_LIMIT = 2
const NOTES_LIMIT = 10

// 가든 성숙도 태그 → 이모지 (vault 규칙: 상태 태그 전용)
const GROWTH_STAGES: [string, string][] = [
  ["🌱", "seedling"],
  ["🌿", "budding"],
  ["🌲", "evergreen"],
]

const isContentFile = (prefix: string) => (f: QuartzPluginData) =>
  !f.frontmatter?.draft && !!f.slug?.startsWith(prefix) && !f.slug?.endsWith("/index")

export default (() => {
  const HomeShowcase: QuartzComponent = ({
    allFiles,
    fileData,
    displayClass,
    cfg,
  }: QuartzComponentProps) => {
    const sorter = byDateAndAlphabetical(cfg)
    const pagesFor = (spec: SectionSpec, limit: number) =>
      allFiles
        .filter(isContentFile(spec.prefix))
        .sort(sorter)
        .slice(0, spec.limit ?? limit)

    // showDate: 항목 오른쪽에 인라인 날짜 표시 여부 (제목은 한 줄 말줄임)
    const itemList = (spec: SectionSpec, limit: number, showDate: boolean) => (
      <ul class="showcase-ul">
        {pagesFor(spec, limit).map((page) => (
          <li>
            <a href={resolveRelative(fileData.slug!, page.slug!)} class="internal">
              {page.frontmatter?.title ?? i18n(cfg.locale).propertyDefaults.title}
            </a>
            {showDate && page.dates && (
              <span class="meta">
                <Date date={getDate(cfg, page)!} locale={cfg.locale} />
              </span>
            )}
          </li>
        ))}
      </ul>
    )

    // 가든 상태 라인: posts/notes 수 + 성숙도 분포 (자동 계산)
    const postCount = allFiles.filter(isContentFile("Posts/")).length
    const noteFiles = allFiles.filter(isContentFile("Notes/"))
    const stageCounts = GROWTH_STAGES.map(([emoji, tag]) => [
      emoji,
      noteFiles.filter((f) => (f.frontmatter?.tags ?? []).includes(tag)).length,
    ]).filter(([, n]) => (n as number) > 0)

    return (
      <div class={classNames(displayClass, "home-showcase")}>
        <div class="showcase-header">
          <h2 class="showcase-heading">{SHOWCASE_TITLE}</h2>
          <span class="garden-stats">
            {postCount} posts · {noteFiles.length} notes
            {stageCounts.map(([emoji, n]) => ` · ${emoji} ${n}`).join("")}
          </span>
        </div>

        <div class="showcase-columns">
          <div class="showcase-group">
            <div class="group-head">
              <h3 class="group-title">🗂️ Posts</h3>
              <a
                href={resolveRelative(fileData.slug!, "Posts/" as SimpleSlug)}
                class="internal showcase-more"
              >
                all posts →
              </a>
            </div>
            <div class="showcase-grid">
              {POST_SECTIONS.map((spec) => (
                <div class="showcase-section">
                  <div class="showcase-head">
                    <h4 class="showcase-title">{spec.title}</h4>
                    <a
                      href={resolveRelative(fileData.slug!, spec.folder)}
                      class="internal showcase-more"
                    >
                      more →
                    </a>
                  </div>
                  {itemList(spec, POST_CARD_LIMIT, false)}
                </div>
              ))}
            </div>
          </div>

          <div class="showcase-group notes-group">
            <div class="group-head">
              <h3 class="group-title">{NOTES_SECTION.title}</h3>
              <a
                href={resolveRelative(fileData.slug!, NOTES_SECTION.folder)}
                class="internal showcase-more"
              >
                all notes →
              </a>
            </div>
            {itemList(NOTES_SECTION, NOTES_LIMIT, true)}
          </div>
        </div>
      </div>
    )
  }

  HomeShowcase.css = style
  return HomeShowcase
}) satisfies QuartzComponentConstructor
