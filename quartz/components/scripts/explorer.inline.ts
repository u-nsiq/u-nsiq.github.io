import { FileTrieNode } from "../../util/fileTrie"
import { FullSlug, resolveRelative, simplifySlug } from "../../util/path"
import { ContentDetails } from "../../plugins/emitters/contentIndex"
import { togglePanel, closeAllPanels, registerOverlayClickHandler } from "./_drawer"

// ════════════════════════════════════════════════════════════════
// CUSTOM CHANGES INDEX  (마커: [커스텀] / [커스텀 끝])
//   1. toggleExplorerPanel             — 드로어 토글 (← _drawer.ts.togglePanel)
//   2. mobile vs desktop 버튼 바인딩 (setupExplorer)
//   3. nav 리스너: panel-open close (← _drawer.ts.closeAllPanels)
//   4. resize 리스너: 의도적 no-op
//   5. overlay click: _drawer.ts.registerOverlayClickHandler에 위임
//   6. recentSlugs: RecentNotes 기준 폴더 빨간 dot
//   7. folder-title-link: index.md 보유 폴더 제목을 링크로 교체
// ════════════════════════════════════════════════════════════════

type MaybeHTMLElement = HTMLElement | undefined

interface ParsedOptions {
  folderClickBehavior: "collapse" | "link"
  folderDefaultState: "collapsed" | "open"
  useSavedState: boolean
  stateOverrides: Record<string, boolean>
  sortFn: (a: FileTrieNode, b: FileTrieNode) => number
  filterFn: (node: FileTrieNode) => boolean
  mapFn: (node: FileTrieNode) => void
  order: "sort" | "filter" | "map"[]
}

type FolderState = {
  path: string
  collapsed: boolean
}

let currentExplorerState: Array<FolderState>
function toggleExplorer(this: HTMLElement) {
  const nearestExplorer = this.closest(".explorer") as HTMLElement
  if (!nearestExplorer) return
  const explorerCollapsed = nearestExplorer.classList.toggle("collapsed")
  nearestExplorer.setAttribute(
    "aria-expanded",
    nearestExplorer.getAttribute("aria-expanded") === "true" ? "false" : "true",
  )

  if (!explorerCollapsed) {
    // Stop <html> from being scrollable when mobile explorer is open
    document.documentElement.classList.add("mobile-no-scroll")
  } else {
    document.documentElement.classList.remove("mobile-no-scroll")
  }
}

// [커스텀] panel-open 드로어 토글 (mobile-explorer 버튼 전용)
// .collapsed와 분리하여 zoom/resize 이벤트에 영향받지 않도록 함
function toggleExplorerPanel(this: HTMLElement) {
  togglePanel(this, ".explorer")
}
// [커스텀 끝]

function toggleFolder(evt: MouseEvent) {
  evt.stopPropagation()
  const target = evt.target as MaybeHTMLElement
  if (!target) return

  // Check if target was svg icon or button
  const isSvg = target.nodeName === "svg"

  // corresponding <ul> element relative to clicked button/folder
  const folderContainer = (
    isSvg
      ? // svg -> div.folder-container
        target.parentElement
      : // button.folder-button -> div -> div.folder-container
        target.parentElement?.parentElement
  ) as MaybeHTMLElement
  if (!folderContainer) return
  const childFolderContainer = folderContainer.nextElementSibling as MaybeHTMLElement
  if (!childFolderContainer) return

  childFolderContainer.classList.toggle("open")

  // Collapse folder container
  const isCollapsed = !childFolderContainer.classList.contains("open")
  setFolderState(childFolderContainer, isCollapsed)

  const currentFolderState = currentExplorerState.find(
    (item) => item.path === folderContainer.dataset.folderpath,
  )
  if (currentFolderState) {
    currentFolderState.collapsed = isCollapsed
  } else {
    currentExplorerState.push({
      path: folderContainer.dataset.folderpath as FullSlug,
      collapsed: isCollapsed,
    })
  }

  const stringifiedFileTree = JSON.stringify(currentExplorerState)
  localStorage.setItem("fileTree", stringifiedFileTree)
}

function countFiles(node: FileTrieNode): number {
  if (!node.isFolder) return 1
  return node.children.reduce((sum, child) => sum + countFiles(child), 0)
}

// [커스텀] 날짜 내림차순 상위 N개 파일 포함 폴더에 dot 표시
// RecentNotes 표시 개수(3)와 별개 — dot은 더 넓은 범위를 커버
const DOT_LIMIT = 3

function hasRecentFile(node: FileTrieNode, recentSlugs: Set<string>): boolean {
  if (!node.isFolder) return recentSlugs.has(node.slug as string)
  return node.children.some((child) => hasRecentFile(child, recentSlugs))
}
// [커스텀 끝]

function createFileNode(currentSlug: FullSlug, node: FileTrieNode): HTMLLIElement {
  const template = document.getElementById("template-file") as HTMLTemplateElement
  const clone = template.content.cloneNode(true) as DocumentFragment
  const li = clone.querySelector("li") as HTMLLIElement
  const a = li.querySelector("a") as HTMLAnchorElement
  a.href = resolveRelative(currentSlug, node.slug)
  a.dataset.for = node.slug
  a.textContent = node.displayName

  if (currentSlug === node.slug) {
    a.classList.add("active")
  }

  return li
}

function createFolderNode(
  currentSlug: FullSlug,
  node: FileTrieNode,
  opts: ParsedOptions,
  recentSlugs: Set<string>,
): HTMLLIElement {
  const template = document.getElementById("template-folder") as HTMLTemplateElement
  const clone = template.content.cloneNode(true) as DocumentFragment
  const li = clone.querySelector("li") as HTMLLIElement
  const folderContainer = li.querySelector(".folder-container") as HTMLElement
  const titleContainer = folderContainer.querySelector("div") as HTMLElement
  const folderOuter = li.querySelector(".folder-outer") as HTMLElement
  const ul = folderOuter.querySelector("ul") as HTMLUListElement

  const folderPath = node.slug
  folderContainer.dataset.folderpath = folderPath

  if (currentSlug === folderPath) {
    folderContainer.classList.add("active")
  }

  const fileCount = countFiles(node)
  const countSpan = document.createElement("span")
  countSpan.className = "folder-count"
  countSpan.textContent = String(fileCount)

  if (opts.folderClickBehavior === "link") {
    // Replace button with link for link behavior
    const button = titleContainer.querySelector(".folder-button") as HTMLElement
    const a = document.createElement("a")
    a.href = resolveRelative(currentSlug, folderPath)
    a.dataset.for = folderPath
    a.className = "folder-title"
    a.textContent = node.displayName
    button.replaceWith(a)
    titleContainer.appendChild(countSpan)
  } else {
    // [커스텀] index.md 있는 폴더: 제목을 링크로 교체 / 없는 폴더: 버튼(토글) 유지
    if (node.data !== undefined) {
      const button = titleContainer.querySelector(".folder-button") as HTMLElement
      const a = document.createElement("a")
      a.href = resolveRelative(currentSlug, folderPath)
      a.dataset.for = folderPath
      a.className = "folder-title-link"
      a.textContent = node.displayName
      button.replaceWith(a)
    } else {
      const span = titleContainer.querySelector(".folder-title") as HTMLElement
      span.textContent = node.displayName
    }
    // [커스텀 끝]
    titleContainer.appendChild(countSpan)
    // [커스텀] RecentNotes 기준 빨간 dot
    if (hasRecentFile(node, recentSlugs)) {
      const dot = document.createElement("span")
      dot.className = "folder-recent-dot"
      dot.setAttribute("aria-label", "최근 업데이트 포함")
      titleContainer.appendChild(dot)
    }
    // [커스텀 끝]
  }

  // if the saved state is collapsed or the default state is collapsed
  const isCollapsed =
    currentExplorerState.find((item) => item.path === folderPath)?.collapsed ??
    opts.folderDefaultState === "collapsed"

  // if this folder is a prefix of the current path we
  // want to open it anyways
  const simpleFolderPath = simplifySlug(folderPath)
  const folderIsPrefixOfCurrentSlug =
    simpleFolderPath === currentSlug.slice(0, simpleFolderPath.length)

  if (!isCollapsed || folderIsPrefixOfCurrentSlug) {
    folderOuter.classList.add("open")
  }

  for (const child of node.children) {
    const childNode = child.isFolder
      ? createFolderNode(currentSlug, child, opts, recentSlugs)
      : createFileNode(currentSlug, child)
    ul.appendChild(childNode)
  }

  return li
}

async function setupExplorer(currentSlug: FullSlug) {
  const allExplorers = document.querySelectorAll("div.explorer") as NodeListOf<HTMLElement>

  for (const explorer of allExplorers) {
    const dataFns = JSON.parse(explorer.dataset.dataFns || "{}")
    const rawOverrides: Record<string, "collapsed" | "open"> = JSON.parse(
      explorer.dataset.stateOverrides || "{}",
    )
    const stateOverrides: Record<string, boolean> = {}
    for (const [path, state] of Object.entries(rawOverrides)) {
      stateOverrides[path] = state === "collapsed"
    }
    const opts: ParsedOptions = {
      folderClickBehavior: (explorer.dataset.behavior || "collapse") as "collapse" | "link",
      folderDefaultState: (explorer.dataset.collapsed || "collapsed") as "collapsed" | "open",
      useSavedState: explorer.dataset.savestate === "true",
      stateOverrides,
      order: dataFns.order || ["filter", "map", "sort"],
      sortFn: new Function("return " + (dataFns.sortFn || "undefined"))(),
      filterFn: new Function("return " + (dataFns.filterFn || "undefined"))(),
      mapFn: new Function("return " + (dataFns.mapFn || "undefined"))(),
    }

    // Get folder state from local storage
    const storageTree = localStorage.getItem("fileTree")
    const serializedExplorerState = storageTree && opts.useSavedState ? JSON.parse(storageTree) : []
    const oldIndex = new Map<string, boolean>(
      serializedExplorerState.map((entry: FolderState) => [entry.path, entry.collapsed]),
    )

    const data = await fetchData
    const entries = [...Object.entries(data)] as [FullSlug, ContentDetails][]
    const trie = FileTrieNode.fromEntries(entries)

    // [커스텀] 날짜 내림차순 상위 DOT_LIMIT개 slug Set
    // index 페이지(폴더 노드로 흡수됨)는 빌드 타임 날짜로 항상 상위에 오므로 제외
    const recentSlugs = new Set(
      [...Object.entries(data)]
        .filter(([slug]) => slug !== "index" && !slug.endsWith("/index"))
        .sort(([, a], [, b]) => {
          const aDate = a.date ? new Date(a.date).getTime() : 0
          const bDate = b.date ? new Date(b.date).getTime() : 0
          return bDate - aDate
        })
        .slice(0, DOT_LIMIT)
        .map(([slug]) => slug),
    )
    // [커스텀 끝]

    // Apply functions in order
    for (const fn of opts.order) {
      switch (fn) {
        case "filter":
          if (opts.filterFn) trie.filter(opts.filterFn)
          break
        case "map":
          if (opts.mapFn) trie.map(opts.mapFn)
          break
        case "sort":
          if (opts.sortFn) trie.sort(opts.sortFn)
          break
      }
    }

    // Get folder paths for state management
    const folderPaths = trie.getFolderPaths()
    currentExplorerState = folderPaths.map((path) => {
      const previousState = oldIndex.get(path)
      const defaultCollapsed =
        opts.stateOverrides[path] !== undefined
          ? opts.stateOverrides[path]
          : opts.folderDefaultState === "collapsed"
      return {
        path,
        collapsed: previousState === undefined ? defaultCollapsed : previousState,
      }
    })

    const explorerUl = explorer.querySelector(".explorer-ul")
    if (!explorerUl) continue

    // Create and insert new content
    const fragment = document.createDocumentFragment()
    for (const child of trie.children) {
      const node = child.isFolder
        ? createFolderNode(currentSlug, child, opts, recentSlugs)
        : createFileNode(currentSlug, child)

      fragment.appendChild(node)
    }
    explorerUl.insertBefore(fragment, explorerUl.firstChild)

    // restore explorer scrollTop position if it exists
    const scrollTop = sessionStorage.getItem("explorerScrollTop")
    if (scrollTop) {
      explorerUl.scrollTop = parseInt(scrollTop)
    } else {
      // try to scroll to the active element if it exists
      const activeElement = explorerUl.querySelector(".active")
      if (activeElement) {
        activeElement.scrollIntoView({ behavior: "smooth" })
      }
    }

    // Set up event handlers
    const explorerButtons = explorer.getElementsByClassName(
      "explorer-toggle",
    ) as HTMLCollectionOf<HTMLElement>
    for (const button of explorerButtons) {
      // [커스텀] mobile 버튼은 panel-open 토글, desktop 버튼은 기존 collapsed 토글
      const handler =
        (button as HTMLElement).dataset.mobile === "true" ? toggleExplorerPanel : toggleExplorer
      button.addEventListener("click", handler)
      window.addCleanup(() => button.removeEventListener("click", handler))
    }

    // Set up folder click handlers
    if (opts.folderClickBehavior === "collapse") {
      const folderButtons = explorer.getElementsByClassName(
        "folder-button",
      ) as HTMLCollectionOf<HTMLElement>
      for (const button of folderButtons) {
        button.addEventListener("click", toggleFolder)
        window.addCleanup(() => button.removeEventListener("click", toggleFolder))
      }
    }

    const folderIcons = explorer.getElementsByClassName(
      "folder-icon",
    ) as HTMLCollectionOf<HTMLElement>
    for (const icon of folderIcons) {
      icon.addEventListener("click", toggleFolder)
      window.addCleanup(() => icon.removeEventListener("click", toggleFolder))
    }
  }
}

document.addEventListener("prenav", async () => {
  // save explorer scrollTop position
  const explorer = document.querySelector(".explorer-ul")
  if (!explorer) return
  sessionStorage.setItem("explorerScrollTop", explorer.scrollTop.toString())
})

document.addEventListener("nav", async (e: CustomEventMap["nav"]) => {
  const currentSlug = e.detail.url
  await setupExplorer(currentSlug)

  // [커스텀] 페이지 이동 시 panel-open 드로어 닫기 (원본: collapsed 추가 → panel-open 제거)
  // checkVisibility() 가드: desktop에선 mobile 버튼이 숨겨져 있으므로 닫기 작업 스킵
  for (const explorer of document.getElementsByClassName("explorer")) {
    const mobileExplorer = explorer.querySelector(".mobile-explorer")
    if (!mobileExplorer) return

    if ((mobileExplorer as HTMLElement).checkVisibility()) {
      document.documentElement.classList.remove("mobile-no-scroll")
    }

    mobileExplorer.classList.remove("hide-until-loaded")
  }
  closeAllPanels(".explorer")
  // [커스텀 끝]
})

// [커스텀] 의도적 no-op: zoom/resize에 패널이 닫히지 않게 함. _drawer.ts 참조.
window.addEventListener("resize", function () {})

// [커스텀] 오버레이(배경) 클릭 시 드로어 닫기 — _drawer.ts에 위임 (멱등)
registerOverlayClickHandler()
// [커스텀 끝]

function setFolderState(folderElement: HTMLElement, collapsed: boolean) {
  return collapsed ? folderElement.classList.remove("open") : folderElement.classList.add("open")
}
