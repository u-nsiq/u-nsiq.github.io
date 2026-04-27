// ============================================================
// 드로어 시스템 공유 헬퍼 (.inline.ts 아님 — 일반 모듈)
//
// explorer.inline.ts와 toc.inline.ts가 공통으로 쓰는 토글/오버레이
// 로직을 한 곳에 모은다. 두 inline 스크립트는 각각 독립 esbuild 번들
// (bundle: true)이고, esbuild가 이 모듈을 트리쉐이킹해 인라이닝한다.
//
// 관련 SCSS: quartz/styles/_drawer.scss (.panel-open 클래스 정의)
// ============================================================

// .panel-open: SCSS와의 계약 클래스 이름. 이름을 바꾸려면 _drawer.scss의
// 모든 .panel-open 셀렉터도 같이 바꿔야 함.
export const PANEL_OPEN_CLASS = "panel-open"

// 버튼이 속한 가장 가까운 컨테이너의 .panel-open 클래스를 토글한다.
// containerSelector 예: ".explorer", ".toc"
// [커스텀] aria-expanded를 동적으로 갱신해 스크린리더에 열림/닫힘 상태 전달
export function togglePanel(button: HTMLElement, containerSelector: string): void {
  const container = button.closest(containerSelector) as HTMLElement | null
  if (!container) return
  container.classList.toggle(PANEL_OPEN_CLASS)
  const isOpen = container.classList.contains(PANEL_OPEN_CLASS)
  button.setAttribute("aria-expanded", isOpen ? "true" : "false")
}

// 매칭되는 모든 컨테이너에서 .panel-open을 제거한다 (nav/오버레이 핸들러용).
export function closeAllPanels(containerSelector: string): void {
  for (const el of document.querySelectorAll(containerSelector)) {
    el.classList.remove(PANEL_OPEN_CLASS)
  }
}

// 문서 단위 클릭 위임: .sidebar.left/.sidebar.right 바깥 클릭 시 해당
// 패널 닫기. 멱등 — 여러 번 호출돼도 한 번만 등록된다(SPA nav 시 중복 방지).
let overlayHandlerRegistered = false
export function registerOverlayClickHandler(): void {
  if (overlayHandlerRegistered) return
  overlayHandlerRegistered = true
  document.addEventListener("click", (e) => {
    const target = e.target as HTMLElement
    const leftSidebar = document.querySelector(".sidebar.left")
    const rightSidebar = document.querySelector(".sidebar.right")

    if (leftSidebar && !leftSidebar.contains(target)) {
      closeAllPanels(".explorer")
    }
    if (rightSidebar && !rightSidebar.contains(target)) {
      closeAllPanels(".toc")
    }
  })
}
