# DESIGN_GUIDELINES.md

# Aquard Design Guidelines

## Design Philosophy

Aquard should feel like a premium product.

It should never feel like a collection of Home Assistant cards.

The interface should resemble a modern appliance rather than a dashboard.

---

# First Impression

Users should immediately understand:

- current status
- current temperature
- whether action is required

Everything else is secondary.

---

# Visual Hierarchy

Every screen must have one primary focal point.

Recommended order:

1. Water Status
2. Temperature
3. Primary Controls
4. Water Details
5. Advanced Information

Never give every element the same visual weight.

---

# Simplicity

Less is more.

Avoid displaying information simply because it exists.

Every visible element should have a purpose.

---

# White Space

Do not fear empty space.

White space improves readability.

The interface should feel calm.

---

# Layout

Primary design target:

- Two-column Home Assistant dashboard
- Landscape orientation
- Home Assistant Kiosk Mode

The interface should scale naturally to:

- Desktop
- Tablet
- Mobile

The layout should adapt automatically.
The primary Home view should fit completely on a 10-inch landscape tablet without vertical scrolling. Expanded sections may extend beyond the initial viewport.

Users should rarely need layout options.

---

# Colors

Colors communicate meaning.

Never use colors purely for decoration.

Examples:

Green

- Healthy
- Ready
- Safe

Yellow

- Attention
- Monitor

Orange

- Action needed
- Maintenance required

Red

- Action required
- Unsafe

Blue

- Information
- Water
- Controls

---

# Typography

Typography should remain simple.

Prefer:

Large numbers.

Short labels.

Minimal text.

Avoid paragraphs inside the interface.

---

# Icons

Icons should support recognition.

Icons should never replace clear text.

Icons should remain consistent across the project.

## Aquard status indicator

Overall water status uses one fixed transparent circular SVG geometry. The ring and symbol share the status color: green check for Excellent, yellow eye for Monitor, orange exclamation for Action Needed, and red exclamation for Alert. The center remains transparent; only the ring, reflection, glow, symbol, and subtle top-left sparkle are rendered. All states use identical dimensions and spacing so state changes never shift the hero layout.

---

# Buttons

Buttons represent actions.

Information should never look like a button.

Buttons should feel:

- large
- comfortable
- touch friendly

---

# Motion

Animations should communicate state.

Examples:

Expand details.

Button feedback.

Status transitions.

Loading.

Avoid decorative animations.

Animation duration should remain short and smooth.

---

# Images

Themes may provide:

- backgrounds
- illustrations
- icons

Images should never reduce readability.

Background artwork should always remain subtle.

---

# Themes

Every theme should preserve:

- layout
- usability
- accessibility

Themes may change appearance.

Themes must never change interaction.

---

# Responsive Design

Desktop and tablet are primary.

Mobile is fully supported but simplified.

Components should adapt naturally without changing user workflows.

---

# Accessibility

Maintain sufficient color contrast.

Do not rely on color alone.

Support keyboard navigation where possible.

Touch targets should remain large enough for tablet users.

---

# Consistency

The same action should always look the same.

The same status should always look the same.

The same spacing should always look the same.

Consistency creates familiarity.

---

# Design Goal

Aquard should feel modern today.

It should still feel modern five years from now.

Avoid following temporary design trends.

Design for longevity.
