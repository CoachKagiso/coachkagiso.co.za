# UI Styling Reference — Touch-Teq Office Dashboard

> **INSTRUCTIONS FOR AI/LLM:** This document defines the exact visual design system for the Touch-Teq office dashboard. When asked to "apply dashboard styling" or "match the design system," follow the specifications below precisely. Copy the code snippets as-is. Do not invent new patterns — use only what is defined here.

---

## 1. Design Tokens (Color Palette)

Use these colors everywhere. Do not deviate.

| Token | Hex | When to Use |
|-------|-----|-------------|
| `bg-[#0B0F19]` | Very dark navy | Input fields, selected option backgrounds, inner boxes |
| `bg-[#151B28]` | Medium navy | Cards, panels, dropdown menus, filter bars, modal backgrounds |
| `border-slate-700` | Light slate | Default input/trigger borders |
| `border-slate-800` | Dark slate | Panel borders, card borders, dividers |
| `border-orange-500` | Orange | Active/focused borders (when dropdown is open, when input is focused) |
| `text-orange-500` | Orange | Selected items, accent values, active states, "Today"/"Now" buttons |
| `text-white` | White | Primary text, selected labels |
| `text-slate-300` | Light gray | Unselected option text, secondary text |
| `text-slate-500` | Medium gray | Icons, labels, placeholder text, muted elements |
| `text-slate-600` | Dark gray | Very faint text, disabled placeholder |

---

## 2. Reusable Components

### 2A. DatePicker

**Import:** `import { DatePicker } from '@/components/ui/DatePicker';`

**When to use:** Any date field in any form. Always use this component — never use native `<input type="date">`.

```tsx
<DatePicker
  label="Due Date"                    // optional — renders label above
  value={formDate}                    // "yyyy-MM-dd" string or ""
  onChange={(val) => setFormDate(val)}
  placeholder="Select date"
/>
```

| Prop | Type | Default |
|------|------|---------|
| `value` | `string` (`"yyyy-MM-dd"`) | — |
| `onChange` | `(value: string) => void` | — |
| `label` | `string` | — |
| `placeholder` | `string` | `"Select date"` |
| `className` | `string` | `""` |

The component is self-contained. It handles its own popup, styling, and portal rendering. Do not wrap it in anything extra.

---

### 2B. TimePicker

**Import:** `import { TimePicker } from '@/components/ui/TimePicker';`

**When to use:** Any time field in any form. Always use this component — never use native `<input type="time">`.

```tsx
<TimePicker
  label="Due Time (optional)"        // optional — renders label above
  value={formTime}                    // "HH:mm" string (24h) or ""
  onChange={(val) => setFormTime(val)}
  placeholder="Select time"
/>
```

| Prop | Type | Default |
|------|------|---------|
| `value` | `string` (`"HH:mm"`) | — |
| `onChange` | `(value: string) => void` | — |
| `label` | `string` | — |
| `placeholder` | `string` | `"Select time"` |
| `className` | `string` | `""` |

The component is self-contained. It displays 12-hour AM/PM format to the user but stores/sends 24-hour `HH:mm` format. Do not wrap it in anything extra.

---

### 2C. MonthPicker

**Import:** `import { MonthPicker } from '@/components/ui/MonthPicker';`

**When to use:** Any month selector (e.g., filters). Use as-is.

```tsx
<MonthPicker
  value={monthFilter}                 // "yyyy-MM" string
  onChange={(val) => setMonthFilter(val)}
  placeholder="Select month"
/>
```

The component is self-contained. Do not wrap it or add extra icons.

---

## 3. Custom Dropdown (Select)

**When to use:** Any select/dropdown field in a form (e.g., Priority, Status, Category, Bank Account). Never use native `<select>` elements — always build a custom dropdown following this exact pattern.

### Step-by-step implementation:

#### Step 1: Add state

```tsx
const [fieldNameOpen, setFieldNameOpen] = useState(false);
```

#### Step 2: Add click-outside backdrop

Place this at the **top of your component's JSX** (inside the root element), before any other content. List ALL dropdown open states from that component:

```tsx
{(dropOneOpen || dropTwoOpen || dropThreeOpen) && (
  <div
    className="fixed inset-0 z-[99]"
    onClick={() => { setDropOneOpen(false); setDropTwoOpen(false); setDropThreeOpen(false); }}
  />
)}
```

> **Why:** The backdrop sits at `z-[99]`. Dropdown panels sit at `z-[100]` (above backdrop). Clicking the backdrop closes all dropdowns.

#### Step 3: Build the dropdown

Wrap trigger + panel in `<div className="relative">`:

```tsx
<div>
  <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">
    Field Label
  </label>
  <div className="relative">
    {/* TRIGGER BUTTON */}
    <button
      type="button"
      onClick={() => setFieldNameOpen(!fieldNameOpen)}
      className={`w-full flex items-center justify-between px-4 py-3 border rounded-lg transition-all font-bold text-sm bg-[#151B28] ${
        fieldNameOpen ? 'border-orange-500' : 'border-slate-700 hover:border-slate-600'
      }`}
    >
      <div className="flex items-center gap-2">
        <IconName size={14} className="text-slate-500" />
        <span className="text-white">{selectedLabel || 'Select...'}</span>
      </div>
      <ChevronDown
        size={14}
        className={`text-slate-500 transition-transform ${fieldNameOpen ? 'rotate-180' : ''}`}
      />
    </button>

    {/* DROPDOWN PANEL */}
    {fieldNameOpen && (
      <div className="absolute top-full left-0 w-full mt-2 bg-[#151B28] border border-slate-800 rounded-xl shadow-2xl z-[100] p-1 max-h-60 overflow-y-auto">
        {options.map(option => (
          <button
            key={option.value}
            type="button"
            onClick={() => {
              setSelected(option.value);
              setFieldNameOpen(false);
            }}
            className={`w-full px-4 py-2.5 text-left hover:bg-slate-800 transition-colors font-bold text-sm ${
              selected === option.value
                ? 'text-orange-500 bg-[#0B0F19]'
                : 'text-slate-300'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    )}
  </div>
</div>
```

### Dropdown variants:

**With leading icon** (like Priority with Flag, Category with Tag):
```tsx
<div className="flex items-center gap-2">
  <Flag size={14} className="text-slate-500" />
  <span className="text-white">{label}</span>
</div>
```

**Without leading icon** (just text + chevron):
```tsx
<span className="text-white">{label}</span>
```

**Filter bar dropdown** (fixed width, not full-width):
- Change trigger to include `w-[200px]` and remove `w-full`
- Change `bg-[#151B28]` to `bg-[#151B28]` (same)
- Panel uses `w-64` instead of `w-full`

---

## 4. Form Inputs (Text, Textarea)

All form text inputs and textareas follow this pattern:

### Text Input
```tsx
<input
  type="text"
  value={value}
  onChange={(e) => setValue(e.target.value)}
  placeholder="Placeholder text..."
  className="w-full bg-[#0B0F19] border border-slate-800 focus:border-orange-500 outline-none rounded-lg py-3 px-4 text-sm text-white placeholder:text-slate-600"
/>
```

### Textarea
```tsx
<textarea
  value={value}
  onChange={(e) => setValue(e.target.value)}
  placeholder="Placeholder text..."
  rows={3}
  className="w-full bg-[#0B0F19] border border-slate-800 focus:border-orange-500 outline-none rounded-lg py-3 px-4 text-sm text-white placeholder:text-slate-600 resize-none"
/>
```

### With Label
```tsx
<div>
  <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">
    Label Text
  </label>
  <input ... />
</div>
```

### Label with Required Indicator
```tsx
<label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">
  Label Text <span className="text-red-500">*</span>
</label>
```

---

## 5. Cards & Containers

### Standard Card
```tsx
<div className="bg-[#151B28] border border-slate-800/50 p-4 rounded-xl">
  ...
</div>
```

### Stat Card (with colored border accent)
```tsx
<div className="bg-[#151B28] border border-red-500/20 p-4 rounded-xl">
  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Label</p>
  <p className="text-3xl font-black text-orange-500 mt-1">Value</p>
</div>
```

---

## 6. Typography Patterns

| Element | Classes |
|---------|---------|
| Card label | `text-[10px] font-black uppercase tracking-[0.2em] text-slate-500` |
| Card value | `text-3xl font-black text-orange-500 mt-1` |
| Form label | `text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2` |
| Form input text | `text-sm text-white` |
| Placeholder text | `text-sm text-slate-500` or `placeholder:text-slate-600` |
| Button primary | `text-xs font-black uppercase tracking-wider` |
| Section heading | `text-lg font-black uppercase tracking-tight text-white` |

---

## 7. Buttons

### Primary (Orange)
```tsx
<button className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-black text-xs uppercase tracking-wider px-4 py-2.5 rounded-lg transition-colors">
  <Plus size={16} />
  Label
</button>
```

### Secondary (Slate)
```tsx
<button className="px-5 py-2.5 bg-slate-800 text-slate-300 font-bold text-xs uppercase tracking-wider rounded-lg hover:bg-slate-700 transition-colors">
  Cancel
</button>
```

### Disabled State
Add to any button: `disabled:opacity-50 disabled:cursor-not-allowed`

---

## 8. Quick Reference: What NOT to Do

| ❌ Don't | ✅ Do |
|----------|-------|
| Use `<select>` or `<input type="date">` or `<input type="time">` | Use the custom components defined above |
| Use light backgrounds (`bg-white`, `bg-gray-100`) | Use `bg-[#0B0F19]` (dark) or `bg-[#151B28]` (medium) |
| Use random border colors | Use `border-slate-700` (closed) or `border-orange-500` (active) |
| Use `text-black` or `text-gray-900` | Use `text-white` (primary) or `text-slate-300` (secondary) |
| Put dropdown panels at low z-index | Panels must be `z-[100]`, backdrops `z-[99]` |
| Forget the click-outside backdrop | Always add it when using custom dropdowns |
| Style the DatePicker or TimePicker internals | They're self-contained — just set props |

---

## 9. Complete Example: Form with All Components

```tsx
'use client';
import { useState } from 'react';
import { Flag, ChevronDown, Tag } from 'lucide-react';
import { DatePicker } from '@/components/ui/DatePicker';
import { TimePicker } from '@/components/ui/TimePicker';

const PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

const CATEGORIES = ['Admin', 'Site Visit', 'Follow-up', 'Documentation'];

export default function ExampleForm() {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('medium');
  const [priorityOpen, setPriorityOpen] = useState(false);
  const [category, setCategory] = useState('');
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');

  return (
    <div className="space-y-5">
      {/* Click-outside backdrop for all dropdowns */}
      {(priorityOpen || categoryOpen) && (
        <div className="fixed inset-0 z-[99]" onClick={() => { setPriorityOpen(false); setCategoryOpen(false); }} />
      )}

      {/* Text Input */}
      <div>
        <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">
          Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter title..."
          className="w-full bg-[#0B0F19] border border-slate-800 focus:border-orange-500 outline-none rounded-lg py-3 px-4 text-sm text-white placeholder:text-slate-600"
        />
      </div>

      {/* Date + Time Row */}
      <div className="grid grid-cols-2 gap-4">
        <DatePicker label="Due Date" value={dueDate} onChange={setDueDate} />
        <TimePicker label="Due Time" value={dueTime} onChange={setDueTime} />
      </div>

      {/* Dropdown Row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Priority Dropdown */}
        <div>
          <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">
            Priority
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setPriorityOpen(!priorityOpen)}
              className={`w-full flex items-center justify-between px-4 py-3 border rounded-lg transition-all font-bold text-sm bg-[#151B28] ${
                priorityOpen ? 'border-orange-500' : 'border-slate-700 hover:border-slate-600'
              }`}
            >
              <div className="flex items-center gap-2">
                <Flag size={14} className="text-slate-500" />
                <span className="text-white">{PRIORITIES.find(p => p.value === priority)?.label}</span>
              </div>
              <ChevronDown size={14} className={`text-slate-500 transition-transform ${priorityOpen ? 'rotate-180' : ''}`} />
            </button>
            {priorityOpen && (
              <div className="absolute top-full left-0 w-full mt-2 bg-[#151B28] border border-slate-800 rounded-xl shadow-2xl z-[100] p-1">
                {PRIORITIES.map(p => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => { setPriority(p.value); setPriorityOpen(false); }}
                    className={`w-full px-4 py-2.5 text-left hover:bg-slate-800 transition-colors font-bold text-sm ${
                      priority === p.value ? 'text-orange-500 bg-[#0B0F19]' : 'text-slate-300'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Category Dropdown */}
        <div>
          <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">
            Category
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setCategoryOpen(!categoryOpen)}
              className={`w-full flex items-center justify-between px-4 py-3 border rounded-lg transition-all font-bold text-sm bg-[#151B28] ${
                categoryOpen ? 'border-orange-500' : 'border-slate-700 hover:border-slate-600'
              }`}
            >
              <div className="flex items-center gap-2">
                <Tag size={14} className="text-slate-500" />
                <span className="text-white">{category || 'Select...'}</span>
              </div>
              <ChevronDown size={14} className={`text-slate-500 transition-transform ${categoryOpen ? 'rotate-180' : ''}`} />
            </button>
            {categoryOpen && (
              <div className="absolute top-full left-0 w-full mt-2 bg-[#151B28] border border-slate-800 rounded-xl shadow-2xl z-[100] p-1 max-h-60 overflow-y-auto">
                {CATEGORIES.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => { setCategory(c); setCategoryOpen(false); }}
                    className={`w-full px-4 py-2.5 text-left hover:bg-slate-800 transition-colors font-bold text-sm ${
                      category === c ? 'text-orange-500 bg-[#0B0F19]' : 'text-slate-300'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}