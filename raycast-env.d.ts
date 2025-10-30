/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Claude API Key - Anthropic Claude API キー（https://console.anthropic.com から取得） */
  "apiKey"?: string,
  /** Demo Mode - デモモード有効時は固定データを4秒で表示（API キー不要） */
  "demoMode": boolean
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `launcher` command */
  export type Launcher = ExtensionPreferences & {}
  /** Preferences accessible in the `clinic` command */
  export type Clinic = ExtensionPreferences & {}
  /** Preferences accessible in the `onboarding` command */
  export type Onboarding = ExtensionPreferences & {}
  /** Preferences accessible in the `manage-aliases` command */
  export type ManageAliases = ExtensionPreferences & {}
  /** Preferences accessible in the `clear-logs` command */
  export type ClearLogs = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `launcher` command */
  export type Launcher = {}
  /** Arguments passed to the `clinic` command */
  export type Clinic = {}
  /** Arguments passed to the `onboarding` command */
  export type Onboarding = {}
  /** Arguments passed to the `manage-aliases` command */
  export type ManageAliases = {}
  /** Arguments passed to the `clear-logs` command */
  export type ClearLogs = {}
}

