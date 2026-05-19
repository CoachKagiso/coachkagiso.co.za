# Dropdown Styling Guidelines

## Reference Style: Contact Details Section
Location: `IntakeForm.tsx` - Preferred Contact Method / Preferred Language dropdowns

---

## Required Classes for Dropdowns

### 1. Trigger Button (the visible dropdown)
```jsx
<button 
  type="button"
  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
  className="w-full p-4 bg-white/[0.03] border border-white/10 rounded-2xl font-bold text-white outline-none focus:ring-2 focus:ring-blue-500/30 transition-all flex items-center justify-between pr-4 text-base"
>
  <span>{selectedValue || 'Select...'}</span>
  <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} />
</button>
```

### 2. Dropdown Menu (the options list)
```jsx
<AnimatePresence>
  {isDropdownOpen && (
    <motion.div 
      initial={{ opacity: 0, y: -10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      className="absolute top-full left-0 w-full mt-2 bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden z-[100] shadow-2xl shadow-black/50"
    >
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => {
            setFormData({...formData, field: option});
            setIsDropdownOpen(false);
          }}
          className="w-full p-4 text-left text-base font-bold text-white hover:bg-blue-600 transition-colors border-b border-white/5 last:border-0"
        >
          {option}
        </button>
      ))}
    </motion.div>
  )}
</AnimatePresence>
```

---

## Key Styling Points

| Element | Classes |
|---------|---------|
| **Trigger Button Background** | `bg-white/[0.03]` |
| **Trigger Button Border** | `border border-white/10` |
| **Trigger Button Text** | `text-white` |
| **Trigger Placeholder Text** | `text-slate-500` |
| **Dropdown Background** | `bg-[#0a0a0a]` |
| **Dropdown Border** | `border-white/10` |
| **Option Text** | `text-white` |
| **Option Hover** | `hover:bg-blue-600` |
| **Option Selected** | `text-blue-400 bg-blue-600/20` |
| **Chevron Icon** | `text-slate-500` |
| **Z-Index** | `z-[100]` |
| **Border Radius** | `rounded-2xl` |

---

## Common Mistakes to Avoid

### ❌ DON'T: Use native `<select>` without proper styling
```jsx
// BAD - native select has white background
<select className="...">
  <option>Option 1</option>
</select>
```

### ❌ DON'T: Use light background for dropdown menu
```jsx
// BAD - white background makes text invisible
className="bg-white..."
```

### ❌ DON'T: Forget z-index
```jsx
// BAD - dropdown will be hidden behind other elements
className="..."
```

### ✅ DO: Use dark background for dropdown menu
```jsx
// GOOD
className="bg-[#0a0a0a]..."
```

### ✅ DO: Use white text on dark background
```jsx
// GOOD
className="text-white..."
```

---

## Required Imports

```tsx
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
```

---

## Required State

```tsx
const [isDropdownOpen, setIsDropdownOpen] = useState(false);
```

---

## Checklist for New Dropdowns

- [ ] Trigger button uses `bg-white/[0.03]` background
- [ ] Trigger button has `text-white` text color
- [ ] Dropdown menu uses `bg-[#0a0a0a]` background
- [ ] Dropdown options use `text-white` text color
- [ ] Dropdown has `z-[100]` z-index
- [ ] Dropdown has `border-white/10` border
- [ ] Hover state uses `hover:bg-blue-600`
- [ ] Selected state shows visual feedback (e.g., `text-blue-400`)
- [ ] Chevron icon rotates when open (`rotate-180`)
- [ ] Uses `AnimatePresence` and `motion.div` for animations
