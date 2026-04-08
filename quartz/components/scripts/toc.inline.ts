const observer = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    const slug = entry.target.id
    const tocEntryElements = document.querySelectorAll(`a[data-for="${slug}"]`)
    const windowHeight = entry.rootBounds?.height
    if (windowHeight && tocEntryElements.length > 0) {
      if (entry.boundingClientRect.y < windowHeight) {
        tocEntryElements.forEach((tocEntryElement) => tocEntryElement.classList.add("in-view"))
      } else {
        tocEntryElements.forEach((tocEntryElement) => tocEntryElement.classList.remove("in-view"))
      }
    }
  }
})

function toggleToc(this: HTMLElement) {
  this.classList.toggle("collapsed")
  this.setAttribute(
    "aria-expanded",
    this.getAttribute("aria-expanded") === "true" ? "false" : "true",
  )
  const content = this.nextElementSibling as HTMLElement | undefined
  if (!content) return
  content.classList.toggle("collapsed")
}

// [커스텀] panel-open 드로어 토글 (mobile-toc 버튼 전용)
function toggleTocPanel(this: HTMLElement) {
  const tocEl = this.closest(".toc") as HTMLElement
  if (!tocEl) return
  tocEl.classList.toggle("panel-open")
}
// [커스텀 끝]

function setupToc() {
  for (const toc of document.getElementsByClassName("toc")) {
    const button = toc.querySelector(".toc-header")
    const content = toc.querySelector(".toc-content")
    if (!button || !content) return
    button.addEventListener("click", toggleToc)
    window.addCleanup(() => button.removeEventListener("click", toggleToc))

    // [커스텀] mobile-toc 버튼 이벤트 바인딩
    const mobileTocBtn = toc.querySelector("button.mobile-toc") as HTMLElement | null
    if (mobileTocBtn) {
      mobileTocBtn.addEventListener("click", toggleTocPanel)
      window.addCleanup(() => mobileTocBtn.removeEventListener("click", toggleTocPanel))
    }
  }
}

document.addEventListener("nav", () => {
  setupToc()

  // [커스텀] 페이지 이동 시 panel-open 드로어 닫기
  for (const toc of document.getElementsByClassName("toc")) {
    const mobileTocBtn = toc.querySelector("button.mobile-toc") as HTMLElement | null
    if (mobileTocBtn?.checkVisibility()) {
      toc.classList.remove("panel-open")
    }
  }
  // [커스텀 끝]

  // update toc entry highlighting
  observer.disconnect()
  const headers = document.querySelectorAll("h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]")
  headers.forEach((header) => observer.observe(header))
})
