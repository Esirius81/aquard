# AI_START_HERE.md

# Aquard

Welcome to the Aquard project.

Before making any changes, you MUST read the project documentation in the following order.

---

## Required reading order

1. PROJECT_CONTEXT.md
2. ARCHITECTURE.md
3. UX_PHILOSOPHY.md
4. DESIGN_GUIDELINES.md
5. WATER_QUALITY.md
6. ROADMAP.md
7. CHANGELOG.md

Do not start implementing features before understanding these documents.

---

## Project philosophy

Aquard is not "just another Home Assistant card."

Aquard is a premium water monitoring experience that should feel like a native appliance interface.

The project prioritizes:

- User experience
- Simplicity
- Clean architecture
- Maintainability
- Performance

over technical complexity.

---

## General development rules

- Preserve backwards compatibility whenever practical.
- Avoid unnecessary dependencies.
- Keep the code modular and easy to understand.
- Separate logic, presentation and configuration.
- Never hardcode colors, texts or assets when they can be themed.
- Never hardcode profile-specific logic inside UI components.
- Keep animations subtle and purposeful.
- Mobile support is required, but the primary design target is a two-column Home Assistant dashboard in landscape orientation.

---

## Before implementing any feature

Always determine:

1. What user problem does this solve?
2. Does it fit the Aquard philosophy?
3. Is this presentation, logic or configuration?
4. Can this be reused by other water profiles?
5. Does this keep the interface simple?

If the answer is "no", reconsider the implementation.

---

## Coding rules

Unless explicitly requested:

- Do not create Git commits.
- Do not create Git tags.
- Do not add new dependencies.
- Do not rename public APIs.
- Do not remove backwards compatibility without explaining why.
- Do not implement speculative features.

---

## When completing work

Always:

- Update CHANGELOG.md
- Update documentation when necessary
- Validate the project
- Summarize the implementation
- Mention assumptions and possible improvements

Aquard should always become simpler, more beautiful and easier to use.
