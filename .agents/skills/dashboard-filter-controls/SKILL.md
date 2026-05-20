---
name: dashboard-filter-controls
description: Apply the Coach Kagiso dashboard filter styling consistently. Use when a user asks to style, replace, reuse, or standardize dashboard dropdown filters, select controls, date inputs, date pickers, calendar popovers, or filter rows in the coach-kagiso app.
---

# Dashboard Filter Controls

## Purpose

Use the existing shared controls instead of styling native browser controls directly. The goal is a consistent Coach Kagiso dashboard filter system: warm borders, 8px radius, white surfaces, ink text, no blue browser hover/selection styling, smooth motion, and full-click date picker behavior.

## Core Components

Reuse these components when they exist:

- `components/FilterDropdown.tsx` for dropdown/select filters.
- `components/DashboardDatePicker.tsx` for date inputs and calendar popovers.

Keep the global support styles in `app/globals.css`:

```css
.coach-dashboard-clean .dashboard-filter-dropdown-trigger,
.coach-dashboard-clean .dashboard-filter-dropdown-menu {
  border-color: #d8c8bb !important;
}

.coach-dashboard-clean .dashboard-date-picker-trigger,
.coach-dashboard-clean .dashboard-date-picker-popover {
  border-color: #d8c8bb !important;
}
```

## Replacement Pattern

Replace native dashboard filter controls:

- Replace `<select>` with `<FilterDropdown />`.
- Replace `<input type="date">` with `<DashboardDatePicker />`.
- Preserve original `name` values so GET forms and server filters keep working.
- Preserve existing filter state when the page is client-controlled.
- For form-only pages, pass the current filter value; the shared component includes a hidden input for submission.

Example dropdown:

```tsx
<FilterDropdown
  name="archetype"
  value={filters.archetype || ''}
  ariaLabel="Filter messages by archetype"
  options={[
    { value: '', label: 'All archetypes' },
    ...archetypeOptions.map((archetype) => ({
      value: archetype,
      label: archetype,
    })),
  ]}
/>
```

Example controlled dropdown:

```tsx
<FilterDropdown
  name="clientService"
  value={service}
  onChange={setService}
  ariaLabel="Filter clients by service"
  options={[
    { value: 'all', label: 'All services' },
    ...serviceOptions.map((serviceName) => ({
      value: serviceName,
      label: serviceName,
    })),
  ]}
/>
```

Example date picker:

```tsx
<DashboardDatePicker
  name="from"
  value={filters.from || ''}
  ariaLabel="From date"
  placeholder="From date"
/>
```

Example controlled date picker:

```tsx
<DashboardDatePicker
  name="financeFrom"
  value={draftFrom}
  onChange={setDraftFrom}
  ariaLabel="From date"
  placeholder="From date"
/>
```

## Visual Contract

Match this styling behavior:

- Trigger height: `h-11` for shared controls unless the surrounding layout requires tighter sizing.
- Radius: `rounded-[8px]`.
- Border: `#D8C8BB`, hover `#C9AD98`, focus `#142334`.
- Surface: white; hover surface `#F8F6F4` or menu row hover `#F5F0EA`.
- Text: `#142334`; muted placeholder `#7C6F66` or `#A09086`.
- Motion: use the existing `motion/react` `AnimatePresence` pattern in the shared components.
- Avoid native browser blue backgrounds, native calendar UI, and default select option hover styling.
- The date picker must open when clicking anywhere on the field, not only the icon.

## Implementation Checks

After editing, run:

```powershell
npx tsc --noEmit
npm run lint
git diff --check -- <changed-files>
```

Use browser verification for dashboard pages when practical:

- Confirm the target section has `0` native `<select>` elements when replaced.
- Confirm the target section has `0` `input[type="date"]` elements when replaced.
- Confirm `.dashboard-filter-dropdown-trigger` count matches expected dropdowns.
- Confirm `.dashboard-date-picker-trigger` count matches expected date pickers.
- Check computed styles on a trigger:
  - `borderColor` should be `rgb(216, 200, 187)`.
  - `borderRadius` should be `8px`.
  - `backgroundColor` should be `rgb(255, 255, 255)`.

## Guardrails

- Do not create a new dropdown or calendar component unless the shared one cannot support the use case.
- Do not break form submission names or URL query behavior.
- Do not add unrelated dashboard redesigns while applying this skill.
- Do not reintroduce prop-to-state sync effects that call `setState` directly inside `useEffect`; React lint rejects that pattern in this repo.
