# Feature: Dashboard Redesign (The "Home" Experience)

## Overview
The new Home Page (Dashboard) is designed to be a high-intimacy, mobile-first surface that greets the couple every time they open the app. It moves away from a utility-focused list to an emotional, dynamic space.

## Core Design Principles
1.  **Mobile-First**: Optimized for tall aspect ratios (18:9, 19.5:9).
2.  **Alive**: The screen should never look exactly the same twice (cycling photos, dynamic spotlight).
3.  **Intimate**: Focus on "Us" content (memories, notes, plans) rather than generic "apps".

---

## UI Components

### 1. Immersive Hero & "The Story" Layout
**Visuals**:
- **Full Screen**: The background cover photo takes up 100% of the viewport height (behind the UI).
- **Effect**: Subtle "Ken Burns" (slow zoom/pan) effect on the background image to make it feel alive.
- **Typography**:
    - **Center Stage**: The "Days Together" counter is massive, cinematic, and emotional.
    - **Font**: Editorial style (e.g., elegant serif mixed with clean sans).
    - **Text**: "472 Days" (Hero) + "of us" (Subtext).

### 2. The Glass Stack (Widget Layer)
**Concept**: A frosted glass pane floating above the immersive background.
- **Location**: Anchored at the bottom third of the screen.
- **Visuals**:
    - `backdrop-filter: blur(20px)`
    - `background: rgba(255, 255, 255, 0.1)` (or dark mode equivalent)
    - **Depth**: Soft shadows to separate it from the background photo.
- **Content**:
    - **Weather**: Minimalist icon.
    - **Next Countdown**: "2 Days until [Event]".

### 3. The "Fridge" (Tactile Element)
**Concept**: A physical object sitting *on top* of the digital glass layer.
- **Visuals**:
    - A **Polaroid** (if photo) or **Torn Note** (if text).
    - **Physics**: Slightly rotated (-3deg or 4deg) to look imperfect and human.
    - **Shadows**: Deep, realistic drop shadow to sell the "pinned" depth.
- **Interaction**: Tap to view full screen or "flip" for details.

### 4. Navigation (Floating Dock)
- **Style**: A floating capsule at the bottom center (iOS Dynamic Island style but at the bottom).
- **Behavior**: Hides on scroll (if content expands) or persists transparently.

---

## Technical Requirements (Database)
- **Lockets Table**:
    - Needs `locket_covers` (array or table) for the slideshow.
    - Needs `pinned_timeline_item_id` for the Fridge.

---

## Implementation Prompt (For AI Agents)
**Copy and paste the following prompt to an AI coding agent to implement this feature:**

```markdown
# Role
You are a specialized "Love-Tech" UI/UX Engineer and React Developer. Your goal is to create a "Premium," "High-Fidelity" mobile dashboard that feels expensive, intimate, and alive.

# Task
Refactor `app/(main)/page.tsx` and `Dashboard.tsx` to replace the current layout with the **Immersive Home** design.

# Core Aesthetic: "Cinematic & Tactile"
- **No white backgrounds**: The app is built on top of the user's photos.
- **Glassmorphism**: Use `backdrop-blur-xl` and `bg-white/10` for containers.
- **Typography**: Use large, emotional serif fonts (e.g., `font-serif` class) for the counter.
- **Depth**: The "Fridge" item (pinned photo/note) should look like it is physically sitting on top of the glass interface (rotate-3, shadow-2xl).

# Components to Build
1.  **ImmersiveBackground**:
    - Fullscreen `absolute inset-0 -z-10`.
    - Slideshow of cover photos with slow generic zoom (framer-motion).
2.  **HeroCounter**:
    - Centered vertically (or slightly above).
    - Big text: "472 Days".
    - Subtext: "Together".
3.  **GlassWidgetDeck**:
    - Floating container at bottom ~25%.
    - Contains: WeatherWidget, CountdownWidget.
4.  **FridgePin**:
    - A component that renders a "Polaroid" or "Sticky Note".
    - Position: Absolute, slightly overlapping the WidgetDeck or pinned to top-right of it.
    - Style: `rotate-[-6deg]`, white border `p-2`, `shadow-xl`.

# Tech Stack / Constraints
- **Design Tokens (CRITICAL)**:
    - **Font**: MUST use `font-display` for all headings/counters (matches Landing Page).
    - **Colors**: Use `#221016` (Deep Burgundy) as the base dark backing if needed, or `bg-background-dark`.
    - **Glass**: Use `backdrop-blur-xl` + `bg-white/10` + `border-white/10` (matches Login glass card).
    - **Icons**: Use `material-symbols-outlined` spans for "filled" icons or `lucide-react` for UI strokes (keep consistent with `app/page.tsx` usage of material symbols for emotive icons).
- **Tailwind CSS**: Use extensive utility classes for blur, opacity, and gradients.
- **Framer Motion**: Use `animate-in fade-in zoom-in` classes or `motion.div` for the background zoom.

# Step-by-Step
1.  **Install**: Ensure `framer-motion` and `clsx`/`tailwind-merge` are available.
2.  **Scaffold**: specific components in `components/dashboard/`.
3.  **Compose**: Assemble in `Dashboard.tsx`.
```
