# Frontend & UX Checklist

This document defines the standard styling, user interface, accessibility, client performance, Progressive Web App (PWA), and responsive design review checklist used by the Frontend, UI/UX, & Accessibility (a11y) Agent.

The purpose of this document is to:
- Standardize user interface audits
- Reduce visual and interaction blind spots
- Verify WCAG 2.1 AA accessibility compliance
- Identify SSR and React 19 hydration issues
- Ensure Progressive Web App (PWA) reliability and offline usability
- Maintain design system consistency using Tailwind CSS 4

---

# Review Methodology

For every section, classify items as:
```text
Present
Partially Present
Missing
Not Applicable
```

Then determine the risk level:
```text
Low Risk
Medium Risk
High Risk
Critical Risk
```

Do not create findings solely because a modern convenience is absent. Scale your evaluation based on:
- Actual impact on player and Dungeon Master workflows
- Page load and hydration safety
- Accessibility blockers (which can prevent users with disabilities from using the hub)

---

# Priority Order

Frontend and UX risks should be prioritized in the following order:

## Priority 1
Web Accessibility (a11y) Blockers (e.g., keyboard traps, unlabelled interactive buttons)

## Priority 2
React 19 & SSR Hydration Errors (causes broken UI controls, runtime exceptions, or infinite render loops)

## Priority 3
Responsive Layout and Visual Hierarchy Failures (unreadable texts, overlapping grids on mobile viewports)

## Priority 4
Progressive Web App (PWA) and Service Worker Caching Failures (app failing to load cached shell files offline)

## Priority 5
Theme Consistency & Dark Mode Failures (contrast ratio drops, color bleed, hardcoded hex values bypassing Tailwind variables)

## Priority 6
Client-Side Sync Loop & Performance Bottlenecks (unnecessary React renders, large layout thrashing, un-debounced localStorage writes)

---

# Audit Checklists

---

## 1. Web Accessibility (a11y)

### Keyboard Navigation
* **Focus States**: Every focusable element (inputs, buttons, select menus, links) must have a visible, high-contrast focus indicator when navigated to via `Tab`.
* **Keyboard Usability**: All interactive behaviors (such as opening dialogs, rolling dice, adding items) must be fully operable using only the keyboard (`Tab`, `Space`, `Enter`, Arrow keys).
* **Keyboard Traps**: Ensure focus never gets locked inside a component (e.g., inside modal dialogs, unless intentionally trapping focus, which must release when the modal closes or `Esc` is pressed).
* **Skip Navigation**: Pages with large navigation blocks should offer a way to skip directly to the main content.

### Assistive Technology (ARIA)
* **Semantic Elements**: Verify interactive tags use standard HTML5 tags (`<button>`, `<input>`, `<a>`) rather than clicking generic `<div>`s or `<span>`s.
* **ARIA Roles**: Where custom components are necessary, appropriate ARIA roles (`role="dialog"`, `role="combobox"`, `role="tablist"`) must be defined.
* **Labels and Names**: Interactive icons and buttons (such as the "Manage Party" gear icon, or "Add Character" plus icon) must have explicit descriptions using `aria-label` or `aria-labelledby`.
* **Screen Reader Feedback**: Live updates (like dice rolls, combat state turn shifts) should announce themselves to screen readers via `aria-live="polite"` or `aria-live="assertive"`.

---

## 2. SSR & React 19 Hydration Safety

### Hydration & Server Rendering
* **No Mismatches**: The HTML generated on the server must match the first render on the client. Check for dynamic values (such as `Date.now()`, `Math.random()`, or client-only `window` checks) running on the initial server pass.
* **Safe Client Detection**: Verify any client-only checks (using `typeof window !== 'undefined'`) are deferred to `useEffect` or state variables initialized to false and set to true on mount.
* **Flash of Unstyled Content (FOUC)**: Ensure critical styles are bundled with SSR payloads to prevent visual flashes of layout shift when JavaScript hydrates.
* **Error Boundaries**: Verify UI error boundaries isolate rendering errors in individual components (e.g., a single character detail card failing should not crash the entire party dashboard).

---

## 3. Visual & Responsive Layouts

### Viewport Adaptation
* **Breakpoints**: The application must remain usable, legible, and break-free down to `320px` width (standard mobile viewport).
* **Text Overflow**: Long character names, campaign notes, or description texts must truncate or wrap gracefully without breaking element containers.
* **Target Sizes**: Interactive touch targets on mobile (such as combat HP sliders, buttons, inputs) should be at least `44x44px` to prevent misclicks.
* **Layout Shifts (CLS)**: Ensure elements (especially async components like character cards fetching live DDB data) have reserved space placeholders (skeletons) to avoid abrupt page jumps.

---

## 4. Theme & Styling Systems

### Tailwind CSS 4 & Color Systems
* **CSS Custom Variables**: Verify that colors, spacings, and font sizes leverage the system's global Tailwind variables rather than hardcoded tailwind values (like `bg-[#3f2a1b]`) or static inline styles.
* **Contrast Ratios**: Check that body text on background elements meets the WCAG AA minimum contrast ratio of `4.5:1` (and `3:1` for large text) in both light and dark modes.
* **Dark Mode Native Support**: Ensure theme tokens are isolated properly so that turning on dark mode doesn't accidentally inherit light-mode panels or leave text illegible.

---

## 5. PWA & Offline Support

### Service Worker & Manifest
* **Assets Cache**: The service worker must cache critical application shell assets (fonts, icons, main scripts, core UI styles) to allow the app to launch offline.
* **Webmanifest Validation**: The manifest file must define valid short names, startup URLs, theme colors, and responsive icon sizes.
* **Offline UI Indicator**: The app should display a friendly offline status banner when the network connection is lost.
* **Cached Mutation Logic**: Verify that client changes made offline (like editing journal entries or toggling conditions) queue mutations safely or explain that sync is pending network restoration, rather than silently losing the data on refresh.

---

## 6. State Management & Client Performance

### Component Efficiency
* **State Co-location**: Verify state is kept as local as possible to avoid triggering wide-tree re-renders when a minor component value changes.
* **Re-render Optimization**: Audit heavy lists (like the compendium with hundreds of spells or monsters) to ensure virtual lists or deferred rendering are used if list filtering causes perceptible lag.
* **Debounced Event Handlers**: Input changes that persist to localStorage or call sync functions must be debounced to prevent rendering stutters or flood sync requests.
