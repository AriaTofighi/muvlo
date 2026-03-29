import * as React from "react"

const COMPENSATION_ATTR = "data-overlay-scrollbar-compensation"
const COUNT_ATTR = "data-overlay-scrollbar-compensation-count"
const COMPENSATION_VAR = "--overlay-scrollbar-compensation"

export function useOverlayScrollbarCompensation() {
  React.useLayoutEffect(() => {
    if (typeof document === "undefined") {
      return undefined
    }

    const html = document.documentElement
    const activeCount = Number.parseInt(html.getAttribute(COUNT_ATTR) ?? "0", 10) || 0

    if (activeCount === 0) {
      const scrollbarWidth = Math.max(0, window.innerWidth - html.clientWidth)
      html.setAttribute(COMPENSATION_ATTR, "")
      html.style.setProperty(COMPENSATION_VAR, `${scrollbarWidth}px`)
    }

    html.setAttribute(COUNT_ATTR, String(activeCount + 1))

    return () => {
      const nextCount = Math.max(
        0,
        (Number.parseInt(html.getAttribute(COUNT_ATTR) ?? "1", 10) || 1) - 1
      )

      if (nextCount === 0) {
        html.removeAttribute(COMPENSATION_ATTR)
        html.removeAttribute(COUNT_ATTR)
        html.style.removeProperty(COMPENSATION_VAR)
        return
      }

      html.setAttribute(COUNT_ATTR, String(nextCount))
    }
  }, [])
}
