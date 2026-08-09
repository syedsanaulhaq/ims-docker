# IMS Design System & Theme Guide

## 🎨 Overview

This document provides a complete design system for the Inventory Management System (IMS) that you can use for your clone or other projects. The system uses a modern, professional design with Tailwind CSS and shadcn/ui components.

---

## 📦 Technology Stack

- **CSS Framework:** TailwindCSS v3+
- **Component Library:** shadcn/ui (Radix UI + Tailwind)
- **Animation:** tailwindcss-animate
- **Dark Mode:** Class-based (`.dark` class)
- **Color System:** HSL-based CSS variables

---

## 🎯 Color Palette

### Light Mode (Default)

| Color | HSL Value | Usage |
|-------|-----------|-------|
| **Primary** | `222.2 47.4% 11.2%` | Main actions, buttons, links (#1e293b - slate-900) |
| **Primary Foreground** | `210 40% 98%` | Text on primary backgrounds (white) |
| **Secondary** | `210 40% 96.1%` | Secondary actions, backgrounds (#f1f5f9 - slate-100) |
| **Secondary Foreground** | `222.2 47.4% 11.2%` | Text on secondary backgrounds |
| **Muted** | `210 40% 96.1%` | Disabled states, placeholders |
| **Muted Foreground** | `215.4 16.3% 46.9%` | Secondary text (#64748b - slate-500) |
| **Accent** | `210 40% 96.1%` | Highlights, accents |
| **Destructive** | `0 84.2% 60.2%` | Errors, delete actions (#ef4444 - red-500) |
| **Border** | `214.3 31.8% 91.4%` | Lines, dividers (#e2e8f0 - slate-200) |
| **Background** | `0 0% 100%` | Page background (white) |
| **Card** | `0 0% 100%` | Card backgrounds (white) |

### Dark Mode

| Color | HSL Value | Usage |
|-------|-----------|-------|
| **Primary** | `210 40% 98%` | Main actions (light) |
| **Background** | `222.2 84% 4.9%` | Page background (#0f172a - slate-950) |
| **Card** | `222.2 84% 4.9%` | Card backgrounds |
| **Border** | `217.2 32.6% 17.5%` | Lines, dividers |

### Sidebar Colors

| Element | Light Mode | Dark Mode |
|---------|-----------|-----------|
| **Background** | `0 0% 98%` (#f2f2f2) | `240 5.9% 10%` (#191f2e) |
| **Foreground** | `240 5.3% 26.1%` | `240 4.8% 95.9%` |
| **Primary** | `240 5.9% 10%` (#1a202c) | `224.3 76.3% 48%` (#3b82f6 - blue) |
| **Accent** | `240 4.8% 95.9%` (#f3f4f6) | `240 3.7% 15.9%` (#1e293b) |
| **Border** | `220 13% 91%` | `240 3.7% 15.9%` |

---

## 🖌️ Extended Color System

### Semantic Colors Used in Pages

```css
/* Blues - Primary Actions & Info */
bg-blue-50, bg-blue-100, bg-blue-600, bg-blue-700
text-blue-600, text-blue-800

/* Greens - Success & Positive */
bg-green-50, bg-green-100, bg-green-600, bg-green-800
text-green-600

/* Reds - Errors & Destructive */
bg-red-50, bg-red-100, bg-red-600, bg-red-800
text-red-600

/* Slate/Gray - Neutral & Backgrounds */
bg-slate-50, bg-slate-100, bg-slate-200, bg-slate-900
text-slate-600, text-slate-900

/* Purples - Tender Type (Contract) */
bg-purple-100, text-purple-800

/* Orange - Tender Type (Spot Purchase) */
bg-orange-100, text-orange-800

/* Indigo - Tender Type (Annual Tender) */
bg-indigo-100, text-indigo-800

/* Amber/Yellow - Warnings */
bg-amber-100, text-amber-800
```

---

## 📐 Spacing & Sizing

```typescript
// Tailwind Default Spacing Scale
0, 1, 2, 3, 4, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32...

// Common sizes in IMS
px-4, py-3    // Button padding
px-6, py-6    // Card padding
gap-2, gap-3, gap-4  // Component gaps
mb-2, mb-4, mb-6  // Margins

// Max width
max-w-7xl   // Main containers
max-w-6xl   // Dashboard content
max-w-4xl   // Detail pages
```

---

## 🎛️ Border Radius

```css
lg: 0.5rem    /* 8px - Buttons, cards */
md: 0.375rem  /* 6px - Small components */
sm: 0.25rem   /* 4px - Minimal rounding */

Default radius: var(--radius) = 0.5rem
```

---

## ✨ Typography

### Font Stack (from shadcn/ui defaults)
- **System Fonts:** -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif

### Heading Styles Used

```tsx
// h1 - Page titles
className="text-4xl font-bold text-slate-900"

// h2 - Section titles
className="text-2xl font-bold text-slate-900"

// h3 - Card titles
className="text-lg font-semibold text-slate-900"

// h4 - Subsection
className="font-semibold text-slate-900"

// Body
className="text-sm text-slate-700"
className="text-xs text-slate-500"

// Labels
className="text-sm font-medium text-slate-700"

// Currency amounts
className="font-bold text-blue-600"
className="text-2xl font-bold text-green-600"
```

---

## 🧩 Component Patterns

### Buttons

```tsx
// Primary CTA
<Button className="bg-blue-600 hover:bg-blue-700">
  Action
</Button>

// Outline / Secondary
<Button variant="outline">
  Secondary
</Button>

// Destructive
<Button variant="destructive">
  Delete
</Button>

// Ghost
<Button variant="ghost">
  Link Style
</Button>

// Small
<Button size="sm" variant="outline">
  Small Button
</Button>
```

### Cards

```tsx
<Card>
  <CardHeader>
    <CardTitle>Section Title</CardTitle>
    <CardDescription>Subtitle or description</CardDescription>
  </CardHeader>
  <CardContent className="space-y-4">
    Content here
  </CardContent>
</Card>
```

### Badges

```tsx
// Status badges
<Badge className="bg-gray-100 text-gray-800">Draft</Badge>
<Badge className="bg-blue-100 text-blue-800">Issued</Badge>
<Badge className="bg-green-100 text-green-800">Confirmed</Badge>

// Type badges
<Badge className="bg-purple-100 text-purple-800">Contract</Badge>
<Badge className="bg-orange-100 text-orange-800">Spot Purchase</Badge>
<Badge className="bg-indigo-100 text-indigo-800">Annual Tender</Badge>

// Secondary
<Badge variant="secondary">Secondary</Badge>
```

### Inputs

```tsx
// Text input
<Input 
  placeholder="Enter text..."
  className="border-slate-300"
/>

// Date input
<Input 
  type="date"
  className="border-slate-300"
/>

// Textarea
<Textarea 
  placeholder="Enter text..."
  className="border-slate-300"
  rows={4}
/>

// Select
<Select value={selected} onValueChange={setSelected}>
  <SelectTrigger className="border-slate-300">
    <SelectValue placeholder="Select..." />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="opt1">Option 1</SelectItem>
  </SelectContent>
</Select>
```

---

## 📱 Layout Patterns

### Page Layout

```tsx
<div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
  <div className="max-w-7xl mx-auto space-y-6">
    {/* Header */}
    <div>
      <h1 className="text-4xl font-bold text-slate-900">Title</h1>
      <p className="text-slate-600">Subtitle</p>
    </div>

    {/* Content Grid */}
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {/* Cards here */}
    </div>
  </div>
</div>
```

### Summary Cards

```tsx
<Card>
  <CardContent className="pt-6">
    <div className="text-3xl font-bold text-blue-600">123</div>
    <p className="text-sm text-slate-600">Label</p>
  </CardContent>
</Card>
```

### Data Tables

```tsx
<div className="overflow-x-auto">
  <table className="w-full text-sm">
    <thead className="border-b border-slate-200 bg-slate-50">
      <tr>
        <th className="text-left py-3 px-4 font-semibold text-slate-700">
          Header
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

---

## 🌙 Dark Mode Implementation

In `src/index.css`, CSS variables automatically switch in dark mode:

```tsx
// Component automatically supports dark mode
export function MyComponent() {
  return (
    <div className="bg-background text-foreground">
      {/* Content */}
    </div>
  );
}

// Dark mode toggle (in app root)
document.documentElement.classList.toggle('dark');
```

---

## 🎬 Animations

```tsx
// Built-in animations
animation: {
  'accordion-down': 'accordion-down 0.2s ease-out',
  'accordion-up': 'accordion-up 0.2s ease-out'
}

// Transitions
className="transition"
className="transition-colors"
className="hover:bg-slate-100 transition"
```

---

## 📋 Responsive Design

```tsx
// Mobile-first approach
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4"

// Common breakpoints
sm: 640px
md: 768px
lg: 1024px
xl: 1280px
2xl: 1536px

// Container queries
max-w-7xl  // Full width container
max-w-4xl  // Medium container
max-w-sm   // Small container (sidebar compatible)
```

---

## 🎯 CSS Variables (for customization)

Place this in your `src/index.css` to customize the entire theme:

```css
@layer base {
  :root {
    /* Colors */
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    
    /* Spacing */
    --radius: 0.5rem;
  }
  
  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
  }
}
```

To change a color, just update the HSL value!

---

## 💡 Best Practices

1. **Always use semantic classes:** Use `bg-destructive` instead of `bg-red-500` for errors
2. **Maintain spacing consistency:** Use Tailwind's spacing scale (gap-4, mb-6, etc.)
3. **Dark mode support:** Use CSS variable names that auto-switch in dark mode
4. **Typography hierarchy:** Use `text-4xl`, `text-2xl`, `text-lg` for clear hierarchy
5. **Color contrast:** Ensure text has sufficient contrast (WCAG AA minimum)
6. **Responsive design:** Always design mobile-first with md: and lg: breakpoints

---

## 📖 Component Usage Examples

### Example: Tender Dashboard Card

```tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function TenderCard({ tender }) {
  return (
    <Card className="hover:shadow-lg transition">
      <CardHeader>
        <CardTitle className="text-lg">{tender.title}</CardTitle>
        <CardDescription>{tender.reference_number}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between">
          <span className="text-slate-600">Status</span>
          <Badge className={getStatusColor(tender.status)}>
            {tender.status}
          </Badge>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-600">Value</p>
          <p className="text-2xl font-bold text-green-600">
            Rs {tender.estimated_value.toLocaleString()}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## 🚀 Quick Start for New Project

1. Copy `tailwind.config.ts`
2. Copy `src/index.css` 
3. Copy `src/components/ui/` folder (shadcn components)
4. Use this guide for component patterns

Your new system will have the same professional look! 🎨

---

## 📞 Color Reference Card

Keep this handy for quick reference:

```
🎨 PRIMARY: Slate-900 (#1e293b) - All main buttons & links
📘 BLUES: Information & primary actions
✅ GREENS: Success, positive states
❌ REDS: Errors, destructive actions
⚪ SLATE: Neutral, text, backgrounds
💜 PURPLE: Contract tenders
🟠 ORANGE: Spot purchase tenders
🔷 INDIGO: Annual tenders
⚠️ AMBER: Warnings
```

---

Created: January 13, 2026 | IMS Theme System v1.0
