type ThemeShortcutEvent = {
  readonly key?: unknown
  readonly defaultPrevented?: boolean
  readonly repeat?: boolean
  readonly metaKey?: boolean
  readonly ctrlKey?: boolean
  readonly altKey?: boolean
  readonly isComposing?: boolean
}

export function isThemeShortcut(event: ThemeShortcutEvent) {
  return (
    (event.key === "d" || event.key === "D") &&
    !event.defaultPrevented &&
    !event.repeat &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.altKey &&
    !event.isComposing
  )
}
