# GrupoSpy Design System

## 1. Color Tokens

### Background Colors
| Token | CSS Var | Hex | Usage |
|-------|---------|-----|-------|
| bg-primary | --color-bg-primary | #0A0A0F | Main app background |
| bg-secondary | --color-bg-secondary | #111118 | Card/sidebar background |
| bg-elevated | --color-bg-elevated | #1A1A24 | Hover, elevated surfaces |

### Accent Colors
| Token | CSS Var | Hex | Usage |
|-------|---------|-----|-------|
| accent-primary | --color-accent-primary | #7C3AED | Primary CTA, active states |
| accent-secondary | --color-accent-secondary | #6D28D9 | Hover of primary |
| accent-glow | --color-accent-glow | rgba(124,58,237,0.3) | Glow shadows |

### Text Colors
| Token | Hex | Usage |
|-------|-----|-------|
| text-primary | #F1F0FF | Main content text |
| text-secondary | #8B8BA7 | Secondary labels |
| text-muted | #4A4A6A | Placeholders, timestamps |

### Semantic Colors
| Name | Hex | Usage |
|------|-----|-------|
| success | #10B981 | Connected, completed, positive |
| warning | #F59E0B | In-progress, alerts, medium urgency |
| danger | #EF4444 | Error, disconnected, high urgency |
| info | #3B82F6 | Informational, scheduled, tags |

## 2. Typography

### Font Family
- **Sans**: Inter (Google Fonts) → `font-family: var(--font-sans)`
- **Mono**: JetBrains Mono → `font-family: var(--font-mono)` (code, phone numbers)

### Type Scale
| Class | Size | Weight | Use Case |
|-------|------|--------|----------|
| `.text-display` | 48px | 700 | Hero titles |
| `.text-h1` | 32px | 700 | Page titles |
| `.text-h2` | 24px | 600 | Section headings |
| `.text-h3` | 18px | 600 | Card titles |
| `.text-body` | 14px | 400 | Body text (default) |
| `.text-small` | 12px | 400 | Captions, timestamps |

## 3. Spacing

Use multiples of 4px: 4, 8, 12, 16, 20, 24, 28, 32, 48, 64

## 4. Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| rounded-sm | 6px | Badges, small elements |
| rounded-md | 10px | Buttons, inputs |
| rounded-lg | 16px | Cards |
| rounded-xl | 24px | Modals, large surfaces |
| rounded-full | 9999px | Avatars, pills |

## 5. Shadow Scale

| Name | Value | Usage |
|------|-------|-------|
| shadow-card | 0 1px 3px rgba(0,0,0,0.4) | Default card shadow |
| shadow-elevated | 0 4px 16px rgba(0,0,0,0.5) | Elevated/floating |
| shadow-glow | 0 4px 20px rgba(124,58,237,0.3) | Interactive, focus |

## 6. Components

### Button
```jsx
<button className="btn btn-primary">Ação primária</button>
<button className="btn btn-secondary">Secundário</button>
<button className="btn btn-ghost">Ghost</button>
<button className="btn btn-danger">Perigo</button>
```
Variants: `btn-primary` (purple), `btn-secondary` (dark), `btn-ghost` (transparent), `btn-danger` (red)

### Badge
```jsx
<span className="badge badge-success">Conectado</span>
<span className="badge badge-warning">Enviando</span>
<span className="badge badge-danger">Erro</span>
<span className="badge badge-info">Agendado</span>
<span className="badge badge-neutral">Rascunho</span>
```

### Input
```jsx
<input className="input" placeholder="..." />
<textarea className="input" rows={4} />
<select className="input">...</select>
```

### Card
```jsx
<div className="card">...</div>
<div className="card card-interactive">...</div>  // with hover effect
```

### Skeleton
```jsx
<div className="skeleton" style={{ height: 100, borderRadius: 16 }} />
```

### Navigation Link
```jsx
<Link href="/dashboard" className={`nav-link ${active ? 'active' : ''}`}>
  <Icon size={16} aria-hidden="true" />
  <span className="sidebar-label">Dashboard</span>
</Link>
```

## 7. Layout Rules

### App Layout
- Sidebar: 240px expanded / 72px collapsed
- Topbar: 56px height
- Content: flex-1, overflow-y: auto, padding: 28px

### Grid System
- KPI cards: `repeat(4, 1fr)` desktop, `repeat(2, 1fr)` tablet, `1fr` mobile
- Content cards: `repeat(2, 1fr)` desktop, `1fr` mobile
- Connections: `repeat(auto-fill, minmax(320px, 1fr))`

## 8. Animation Patterns

### Durations
- Micro (hover, focus): 150ms
- Standard (slide, fade): 200-250ms
- Page transition: 300ms
- Sidebar collapse: 300ms ease

### Approved Framer Motion Variants (from `/src/lib/animations.js`)
```js
import { fadeIn, slideInUp, scaleIn, staggerChildren, pageTransition } from '@/lib/animations'

// Page wrapper
<motion.div variants={pageTransition} initial="hidden" animate="visible">

// Card grid with stagger
<motion.div variants={staggerChildren} initial="hidden" animate="visible">
  <motion.div variants={slideInUp}>Card</motion.div>
</motion.div>

// Modal
<motion.div variants={modalBackdrop}>
  <motion.div variants={modalContent}>Modal</motion.div>
</motion.div>
```

### CSS Animations
- `.skeleton` — shimmer loading effect
- `.pulse-accent` — purple pulse dot (8px)
- `.pulse-success` — green pulse dot (8px)
- `.gradient-animated` — animated dark gradient background
- `.gradient-text` — animated purple gradient text

## 9. Composition Rules

### When to use Card vs Modal vs Drawer
- **Card**: displaying data/entities in a list or grid
- **Modal**: destructive actions, confirmations, multi-step forms < 4 fields
- **Drawer**: detail views, side panels, context-specific info

### Empty States
Always provide: icon (48px, opacity 0.2) + title + optional CTA button
```jsx
<div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--color-text-muted)' }}>
  <Icon size={48} style={{ opacity: 0.2, marginBottom: 12 }} />
  <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Nenhum item</p>
  <p style={{ fontSize: 13, marginBottom: 16 }}>Clique no botão para adicionar</p>
  <button className="btn btn-primary">+ Adicionar</button>
</div>
```

### Loading States
Prefer skeleton over spinner for layout-sized elements:
```jsx
// Skeleton rows
Array.from({length: 5}).map((_, i) => (
  <div key={i} className="skeleton" style={{ height: 56, marginBottom: 8, borderRadius: 8 }} />
))
```

## 10. Accessibility Checklist

- [ ] All interactive elements have `cursor: pointer`
- [ ] All icons have `aria-hidden="true"` OR descriptive `aria-label`
- [ ] Color contrast >= 4.5:1 for text
- [ ] Focus visible on all interactive elements (`:focus-visible` styled)
- [ ] Form inputs have associated `<label>` elements
- [ ] Minimum touch target: 44x44px

## 11. Anti-Patterns (NEVER DO)

- Hardcode colors: `color: '#7C3AED'` → Use `color: 'var(--color-accent-primary)'`
- Use emojis as icons → Use Lucide React SVG icons
- Mix different icon sizes randomly → Use consistent sizes (14px nav, 16px buttons, 18px headers)
- Create new utility classes → Use existing `.btn`, `.card`, `.input`, `.badge`, `.skeleton`
- Skip loading states → Always show skeleton or spinner

## 12. New Screen Checklist

Before creating any new screen:
1. Use `AppLayout` wrapper
2. Use design token CSS vars for all colors
3. Import icons from `lucide-react`
4. Add loading skeleton
5. Add empty state
6. Use `.card` for containers
7. Use `.btn.btn-primary` for primary actions
8. Add `cursor-pointer` to clickable elements
9. Test responsive at 375px, 768px, 1440px
10. Verify accessibility checklist above
