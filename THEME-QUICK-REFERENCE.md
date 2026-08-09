# IMS Theme - Quick Reference Card

## 🎨 Color Palette at a Glance

### Status Colors
```
Draft       → bg-gray-100 text-gray-800
Issued      → bg-blue-100 text-blue-800
Confirmed   → bg-green-100 text-green-800
Closed      → bg-slate-100 text-slate-800
```

### Tender Type Colors
```
Contract        → bg-purple-100 text-purple-800
Spot Purchase   → bg-orange-100 text-orange-800
Annual Tender   → bg-indigo-100 text-indigo-800
```

### Action Colors
```
Primary   → bg-blue-600 hover:bg-blue-700    (Main CTA)
Success   → bg-green-600 text-white          (Approve, Confirm)
Warning   → bg-amber-600 text-white          (Review needed)
Danger    → bg-red-600 text-white            (Delete, Reject)
Info      → bg-blue-100 text-blue-800        (Information)
```

---

## 📏 Common Spacing

| Element | Padding | Gap |
|---------|---------|-----|
| Button | px-4 py-2 (sm), px-4 py-3 (default) | - |
| Card | px-6 py-6 | - |
| Table | px-4 py-3 | - |
| Grid | - | gap-4 |
| Section | - | space-y-6 |

---

## 🔤 Typography Quick Reference

```tsx
// Page Title
<h1 className="text-4xl font-bold text-slate-900">Title</h1>

// Section Title
<h2 className="text-2xl font-bold text-slate-900">Section</h2>

// Card Title
<h3 className="text-lg font-semibold text-slate-900">Card Title</h3>

// Label
<label className="text-sm font-medium text-slate-700">Label</label>

// Body Text
<p className="text-slate-900">Normal text</p>

// Secondary Text
<p className="text-sm text-slate-600">Secondary text</p>

// Small Text
<p className="text-xs text-slate-500">Small text</p>

// Amount/Number
<p className="text-2xl font-bold text-green-600">Rs 1,234,567</p>
```

---

## 🧩 Component Snippets

### Button Variants
```tsx
// Primary
<Button className="bg-blue-600 hover:bg-blue-700">Save</Button>

// Secondary
<Button variant="outline">Cancel</Button>

// Danger
<Button variant="destructive">Delete</Button>

// Ghost/Link
<Button variant="ghost">Skip</Button>

// Small
<Button size="sm" variant="outline">Edit</Button>
```

### Card with Header
```tsx
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent className="space-y-4">
    Content
  </CardContent>
</Card>
```

### Badge Styles
```tsx
// Status
<Badge className="bg-blue-100 text-blue-800">Active</Badge>

// Secondary
<Badge variant="secondary">Secondary</Badge>

// Outline
<Badge variant="outline">Outline</Badge>
```

### Table Structure
```tsx
<div className="overflow-x-auto">
  <table className="w-full text-sm">
    <thead className="border-b border-slate-200 bg-slate-50">
      <tr>
        <th className="text-left py-3 px-4 font-semibold">Header</th>
      </tr>
    </thead>
    <tbody className="divide-y divide-slate-200">
      <tr className="hover:bg-slate-50">
        <td className="py-3 px-4">Data</td>
      </tr>
    </tbody>
  </table>
</div>
```

---

## 🎯 Layout Patterns

### Page with Header + Content
```tsx
<div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
  <div className="max-w-7xl mx-auto space-y-6">
    {/* Header */}
    <div>
      <h1 className="text-4xl font-bold text-slate-900">Title</h1>
      <p className="text-slate-600">Subtitle</p>
    </div>
    
    {/* Summary Cards */}
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="pt-6">
          <div className="text-3xl font-bold text-blue-600">123</div>
          <p className="text-sm text-slate-600">Label</p>
        </CardContent>
      </Card>
    </div>

    {/* Data Table */}
    <Card>
      <CardHeader>
        <CardTitle>Data</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Table here */}
      </CardContent>
    </Card>
  </div>
</div>
```

---

## 🌙 Dark Mode Support

All components automatically support dark mode. Just ensure you're using CSS variable names:

```tsx
// ✅ Good - Uses CSS variables
className="bg-background text-foreground"

// ❌ Avoid - Hard-coded colors don't respect dark mode
className="bg-white text-black"
```

Enable dark mode by adding `.dark` class:
```tsx
document.documentElement.classList.add('dark');
```

---

## 📱 Responsive Breakpoints

```tsx
// Mobile first
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4"

// Sizes: 640px, 768px, 1024px, 1280px, 1536px
// Prefixes: sm, md, lg, xl, 2xl

// Common pattern
className="max-w-7xl mx-auto"  // Full width
className="max-w-4xl mx-auto"  // Medium container
className="max-w-sm mx-auto"   // Small container
```

---

## 🎨 Customization Guide

To change colors globally, edit the CSS variables in `src/index.css`:

```css
:root {
  --primary: 222.2 47.4% 11.2%;  /* Change this HSL value */
  /* All primary buttons will update automatically */
}
```

HSL Format: `Hue Saturation Lightness`
- Hue: 0-360
- Saturation: 0-100%
- Lightness: 0-100%

Use [HSL Color Picker](https://www.w3schools.com/colors/colors_hsl.asp) to find your colors!

---

## 🚀 Implementation Checklist for New Project

- [ ] Copy `tailwind.config.ts`
- [ ] Copy `src/index.css` with CSS variables
- [ ] Copy `src/components/ui/` folder
- [ ] Install dependencies: `npm install`
- [ ] Test dark mode toggle
- [ ] Verify responsive design on mobile
- [ ] Check color contrast (WCAG AA)

---

## 📚 Files to Copy

```
For your clone project, copy these files:
├── tailwind.config.ts          (Tailwind configuration)
├── src/index.css               (CSS variables & base styles)
├── src/components/ui/          (shadcn/ui components)
├── postcss.config.js           (PostCSS configuration)
└── package.json                (Dependencies)

Then copy IMS-THEME-DESIGN-SYSTEM.md for reference!
```

---

## 💡 Pro Tips

1. **Use semantic classes** - `bg-destructive` instead of `bg-red-500`
2. **Dark mode ready** - Use CSS variable names instead of hardcoded colors
3. **Consistent spacing** - Use Tailwind's spacing scale (gap-4, mb-6, etc.)
4. **Mobile first** - Design for mobile, then use md: and lg: for larger screens
5. **Type hierarchy** - Use text-4xl, text-2xl, text-lg for clear structure
6. **Focus states** - Add `focus:ring-2 focus:ring-ring` for accessibility
7. **Hover states** - Use `hover:opacity-80` or `hover:bg-slate-100 transition`

---

## 🎯 Color Conversion Helper

If you need to convert colors:

**From Hex to HSL:**
- #1e293b (Slate-900) → 222.2 47.4% 11.2%
- #3b82f6 (Blue-500) → 217.2 91.2% 59.8%
- #ef4444 (Red-500) → 0 84.2% 60.2%

Use an online converter or your IDE's color picker!

---

**Last Updated:** January 13, 2026  
**Theme Version:** 1.0 - IMS Professional Design System  
**Ready for:** Cloning & Production Use ✅
