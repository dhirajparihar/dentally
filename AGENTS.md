# Engineering Guidelines

## General Rules
- Follow DRY, KISS, YAGNI and Single Responsibility principles.
- Prefer simple, readable and maintainable solutions.
- Reuse existing components, utilities and patterns.
- Understand existing code before modifying it.
- Never perform unrelated changes.

## Frontend Rules
- Follow mobile-first responsive design.
- Use CSS Grid, Flexbox and responsive breakpoints.
- Prefer CSS-based responsiveness over JavaScript.
- Use centralized design tokens and reusable UI components.
- Maintain consistent typography, spacing and styling.
- Avoid unnecessary fixed dimensions.
- Support keyboard navigation and accessible interactions.

## Architecture Rules
- Follow the existing project architecture.
- Separate UI, business logic and API communication appropriately.
- Avoid duplicate state, logic and components.
- Use meaningful names and strict typing where supported.
- Avoid unnecessary abstraction and dependencies.

## Performance Rules
- Avoid unnecessary re-renders and duplicate API calls.
- Lazy-load heavy modules where beneficial.
- Optimize assets and bundle size.
- Measure before introducing complex optimizations.
- Avoid premature optimization.

## Safety Rules
- Preserve existing functionality and API contracts.
- Never expose secrets or credentials in frontend code.
- Validate user inputs and enforce authorization on the server.
- Handle asynchronous failures and edge cases.
- Do not modify database schemas or integrations without approval.
- Do not introduce mock implementations as production functionality.

## Definition of Done
A task is complete only when:
- The requested functionality works correctly.
- UI is responsive across supported screen sizes.
- Existing functionality remains intact.
- No new linting or type errors are introduced.
- Relevant tests and production builds pass.
- Loading, empty and error states are handled.
- Accessibility requirements are considered.
- Changes are documented concisely.
- Any unverified behavior or remaining limitation is explicitly reported.