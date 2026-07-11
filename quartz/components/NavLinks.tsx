import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { FullSlug, pathToRoot, resolveRelative } from "../util/path"
import { classNames } from "../util/lang"
import style from "./styles/navLinks.scss"

// [커스텀] 좌측 사이드바 내비 링크 (Home / About).
// Explorer 폴더 제목이 토글 전용이라 페이지 진입점을 명시적으로 제공한다.
// 모바일 드로어 안에서도 동일하게 노출된다.
export default (() => {
  const NavLinks: QuartzComponent = ({ fileData, displayClass }: QuartzComponentProps) => {
    const slug = fileData.slug!
    return (
      <nav class={classNames(displayClass, "nav-links")}>
        <a class="nav-link" href={pathToRoot(slug)}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          <span>Home</span>
        </a>
        <a class="nav-link" href={resolveRelative(slug, "about" as FullSlug)}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <span>About</span>
        </a>
      </nav>
    )
  }

  NavLinks.css = style
  return NavLinks
}) satisfies QuartzComponentConstructor
