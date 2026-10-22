import assert from "node:assert/strict"
import { test } from "node:test"
import { isThemeShortcut } from "../lib/theme-shortcut.ts"

test("theme shortcut accepts only the D key without unsafe key normalization", () => {
  assert.equal(isThemeShortcut({ key: "d" }), true)
  assert.equal(isThemeShortcut({ key: "D" }), true)
  for (const key of [
    undefined,
    null,
    68,
    {},
    "",
    "Unidentified",
    "Dead",
    "a",
  ]) {
    assert.equal(isThemeShortcut({ key }), false)
  }
  assert.equal(isThemeShortcut({}), false)
  assert.equal(isThemeShortcut(new Event("keydown")), false)
})

test("theme shortcut ignores composition, repeats, handled events and modifier chords", () => {
  for (const flag of [
    "defaultPrevented",
    "repeat",
    "metaKey",
    "ctrlKey",
    "altKey",
    "isComposing",
  ]) {
    assert.equal(isThemeShortcut({ key: "d", [flag]: true }), false, flag)
  }
})
