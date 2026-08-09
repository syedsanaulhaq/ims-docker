# 🎨 IMS Theme System - Complete Setup Guide for New Projects

## 📌 Overview

This guide explains how to use the IMS theme system in your clone or new projects. The IMS uses a professional, modern design system built with **TailwindCSS**, **shadcn/ui**, and custom **CSS variables**.

---

## 🚀 Quick Setup (5 Minutes)

### Step 1: Copy Core Theme Files

Copy these 3 files to your new project:

```
From IMS Project:
├── tailwind.config.ts          → Your Project's tailwind.config.ts
├── src/index.css               → Your Project's src/index.css (or globals.css)
├── src/components/ui/          → Your Project's src/components/ui/ (entire folder)
└── postcss.config.js           → Your Project's postcss.config.js
```

### Step 2: Update package.json

Ensure you have these dependencies:

```json
{
  "devDependencies": {
    "tailwindcss": "^3.3.0",
    "postcss": "^8.4.24",
    "autoprefixer": "^10.4.14",
    "tailwindcss-animate": "^1.0.5"
  },
  "dependencies": {
    "@radix-ui/react-*": "^latest",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "lucide-react": "^latest"
  }
}
```

### Step 3: Install Dependencies

```bash
npm install
```

### Step 4: Done! ✅

Your new project now has the exact same professional theme as IMS!

---

## 📁 File Structure

```
your-project/
├── src/
│   ├── index.css                    # CSS variables & base styles
│   ├── components/
│   │   └── ui/                      # shadcn/ui components
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── input.tsx
│   │       ├── select.tsx
│   │       ├── badge.tsx
│   │       ├── textarea.tsx
│   │       └── ... (other ui components)
│   └── pages/
│       └── YourPages.tsx
├── tailwind.config.ts               # Tailwind configuration
├── postcss.config.js                # PostCSS config
└── package.json
```

---

## 🎨 What You Get

### Color System
- ✅ 10+ semantic color variables
- ✅ Light & dark mode support
- ✅ Sidebar-specific colors
- ✅ Status & action colors (blue, green, red, amber)

### Components
- ✅ Button (4 variants)
- ✅ Card (with header/footer)
- ✅ Input (text, date, email)
- ✅ Select (dropdown)
- ✅ Badge (status, type)
- ✅ Textarea
- ✅ Checkbox
- ✅ And many more...

### Features
- ✅ Dark mode (toggle with `.dark` class)
- ✅ Responsive design (sm, md, lg, xl breakpoints)
- ✅ Animations (accordion, fade, pulse)
- ✅ Print styles
- ✅ Accessibility ready (focus states, contrast)

---

## 🎯 Using the Theme

### 1. **Basic Page Layout**

```tsx
export function MyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold text-slate-900">Page Title</h1>
          <p className="text-slate-600">Subtitle or description</p>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Cards here */}
        </div>
      </div>
    </div>
  );
}
```

### 2. **Status Badge**

```tsx
<Badge className="bg-blue-100 text-blue-800">Active</Badge>
<Badge className="bg-green-100 text-green-800">Confirmed</Badge>
<Badge className="bg-amber-100 text-amber-800">Pending</Badge>
<Badge className="bg-red-100 text-red-800">Rejected</Badge>
```

### 3. **Data Table**

```tsx
<div className="overflow-x-auto">
  <table className="w-full text-sm">
    <thead className="border-b border-slate-200 bg-slate-50">
      <tr>
        <th className="text-left py-3 px-4 font-semibold text-slate-700">
          Column Header
        </th>
      </tr>
    </thead>
    <tbody className="divide-y divide-slate-200">
      <tr className="hover:bg-slate-50 transition">
        <td className="py-3 px-4 text-slate-900">Data</td>
      </tr>
    </tbody>
  </table>
</div>
```

### 4. **Form with Fields**

```tsx
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export function MyForm() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Form Title</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input placeholder="Enter name..." />
        
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Select option..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="opt1">Option 1</SelectItem>
          </SelectContent>
        </Select>

        <Button className="bg-blue-600 hover:bg-blue-700">Submit</Button>
      </CardContent>
    </Card>
  );
}
```

---

## 🌙 Dark Mode Implementation

### Enable Dark Mode

```tsx
// In your app root or settings page
function toggleDarkMode() {
  document.documentElement.classList.toggle('dark');
}

<button onClick={toggleDarkMode}>
  Toggle Dark Mode
</button>
```

### Dark Mode Aware Component

```tsx
// ✅ Automatically supports dark mode
<div className="bg-background text-foreground">
  {/* Colors adjust automatically when .dark is added to html */}
</div>

// ✅ Specific dark mode colors
<div className="bg-white dark:bg-slate-950">
  {/* White in light, slate-950 in dark */}
</div>
```

---

## 🎨 Customization

### Change Primary Color

Edit `src/index.css`:

```css
:root {
  --primary: 222.2 47.4% 11.2%;  /* Change this HSL value */
}

/* All primary buttons update automatically */
```

**Popular color values:**
- **Blue:** `217.2 91.2% 59.8%`
- **Green:** `142.7 76.4% 36.5%`
- **Purple:** `280 85.1% 56.1%`
- **Red:** `0 84.2% 60.2%`
- **Slate (Default):** `222.2 47.4% 11.2%`

### Change Border Radius

Edit `src/index.css`:

```css
:root {
  --radius: 0.75rem; /* 12px instead of 8px */
}
```

### Add Custom Component

```tsx
// src/components/ui/custom-button.tsx
import { Button } from "./button";

export function CustomButton(props) {
  return (
    <Button 
      className="bg-gradient-to-r from-blue-600 to-purple-600" 
      {...props} 
    />
  );
}
```

---

## 📚 Component Reference

| Component | Usage | File |
|-----------|-------|------|
| Button | Actions, CTAs | `ui/button.tsx` |
| Card | Content containers | `ui/card.tsx` |
| Input | Text input fields | `ui/input.tsx` |
| Select | Dropdowns | `ui/select.tsx` |
| Badge | Status labels | `ui/badge.tsx` |
| Textarea | Multi-line text | `ui/textarea.tsx` |
| Checkbox | Boolean inputs | `ui/checkbox.tsx` |
| Label | Form labels | `ui/label.tsx` |
| Separator | Visual dividers | `ui/separator.tsx` |

---

## 🔧 Configuration Files Explained

### tailwind.config.ts
- Defines color variables using HSL
- Configures responsive breakpoints
- Sets up animations
- Adds custom utilities

### src/index.css
- Defines actual HSL color values
- Base styles (body, headings, links)
- Component-specific utilities
- Print styles

### postcss.config.js
```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

---

## 📱 Responsive Breakpoints

```
Mobile: 0px (default)
sm:     640px
md:     768px (tablets)
lg:     1024px (desktops)
xl:     1280px (large screens)
2xl:    1536px (very large)
```

**Usage:**
```tsx
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
// 1 column on mobile, 2 on tablet, 4 on desktop
```

---

## ✨ Advanced Customization

### Custom Gradient Backgrounds

```tsx
<div className="bg-gradient-to-r from-blue-500 to-purple-600">
  Gradient background
</div>
```

### Custom Animations

Add to `tailwind.config.ts`:

```ts
animation: {
  'fade-in': 'fade-in 0.5s ease-out',
  'slide-up': 'slide-up 0.3s ease-out',
}
```

### Custom Colors in Any Element

```tsx
// Using Tailwind's extended colors
<button className="bg-blue-600 hover:bg-blue-700 text-white">
  Custom Button
</button>
```

---

## 🐛 Troubleshooting

### Colors not applying?
- [ ] Did you rebuild Tailwind? (`npm run dev`)
- [ ] Is the file path in `tailwind.config.ts` correct?
- [ ] Are you using class names (not inline styles)?

### Dark mode not working?
- [ ] Check if `<html className="dark">` is set
- [ ] Verify CSS variables in `.dark` block
- [ ] Clear browser cache

### Components not found?
- [ ] Did you copy the `src/components/ui/` folder?
- [ ] Are imports using correct paths?
- [ ] Check `@/components/ui` alias in tsconfig.json

---

## 📖 Documentation Links

- [TailwindCSS Docs](https://tailwindcss.com)
- [shadcn/ui Components](https://ui.shadcn.com)
- [Radix UI Primitives](https://www.radix-ui.com)
- [HSL Color Picker](https://www.w3schools.com/colors/colors_hsl.asp)

---

## ✅ Checklist Before Going Live

- [ ] Colors look good in both light & dark mode
- [ ] All buttons are accessible (tab navigation works)
- [ ] Form inputs are clearly visible
- [ ] Responsive design works on mobile (max-width: 600px)
- [ ] Print styles work (test with Ctrl+P)
- [ ] No console errors
- [ ] Focus states are visible (press Tab)
- [ ] Color contrast passes WCAG AA

---

## 💬 Support

For questions or issues with the theme:

1. Check **IMS-THEME-DESIGN-SYSTEM.md** for detailed docs
2. Check **THEME-QUICK-REFERENCE.md** for code snippets
3. Review **CSS-VARIABLES-TEMPLATE.css** for color values
4. Look at IMS project pages for real-world examples

---

## 🎉 You're Ready!

You now have a complete, professional design system ready for production. Use it consistently across all your pages for a polished, cohesive user experience.

**Happy Building!** 🚀

---

**Version:** 1.0  
**Last Updated:** January 13, 2026  
**Compatibility:** React 18+, TypeScript, Vite, Next.js  
**License:** Use freely for your projects
