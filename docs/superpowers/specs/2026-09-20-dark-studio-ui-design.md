# Dark Studio UI Design

## Goal

Refresh Archivist into a dark studio workspace: deep navy-black canvas, layered charcoal panels, luminous indigo/violet accents, clear data hierarchy, and responsive behavior. Preserve existing routes, data behavior, and interactions.

## Design system

- Canvas uses deep navy-black surfaces with subtle radial ambient glow.
- Panels use layered charcoal backgrounds, soft cool borders, and restrained blur.
- Primary accent is electric indigo/violet. Emerald, amber, and rose remain semantic status colors.
- Fraunces remains display face; Inter remains body face; JetBrains Mono remains metadata face.
- Focus states use visible accent rings. Motion stays subtle and respects `prefers-reduced-motion`.

## Shared components

- `AppShell` receives dark tokens, stronger navigation grouping, luminous active state, clearer organization switcher, and mobile-safe spacing.
- `PageHeader` gets a distinct surface, improved title/crumb hierarchy, and consistent action alignment.
- `PrimaryButton` and `GhostButton` gain stronger contrast, hover elevation, active states, and keyboard focus rings.
- `Panel`, `PanelHead`, `Stat`, `Pill`, `Progress`, `Timeline`, `Empty`, and `DateChip` use shared dark surfaces and status treatments.

## Route treatment

Route markup remains functionally unchanged. Targeted route-level changes are limited to spacing, responsive grid behavior, and replacing any visibly light or low-contrast utility classes that cannot inherit shared tokens.

## Accessibility and responsive behavior

- Maintain semantic links and buttons.
- Preserve keyboard navigation and add consistent `:focus-visible` styling.
- Ensure text and status colors remain legible on dark surfaces.
- Collapse sidebar affordances and grids at small widths without hiding content.
- Disable entrance and hover motion when reduced motion is requested.

## Validation

Run `npm run lint` and `npm run build`. Inspect dashboard and representative list/detail routes at desktop and mobile widths. Confirm no route or store behavior changes.
