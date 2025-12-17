<!--
Sync Impact Report:
Version change: N/A → 1.0.0
Modified principles: Initial version
Added sections: All core principles and governance
Removed sections: None
Templates requiring updates: ✅ All templates aligned
Follow-up TODOs: None
-->

# Password Generator Constitution

## Core Principles

### I. Accessibility (NON-NEGOTIABLE)

Accessibility is a non-negotiable requirement for all features. Every user interface component must be fully accessible to users with disabilities, following WCAG 2.1 Level AA standards at minimum.

**Requirements**:
- Target perfect accessibility scores (100% where achievable)
- All interactive elements must be keyboard navigable
- All content must be screen reader compatible
- All color contrast ratios must meet or exceed WCAG standards
- All forms must have proper labels and error messaging
- ARIA attributes must be used correctly and comprehensively

**Validation**: Use automated accessibility testing tools (e.g., axe, Lighthouse) to achieve 100% programmatic test coverage for accessibility.

### II. Readability

Code readability takes priority over optimized or clever solutions. Code must be approachable and maintainable by developers of varying experience levels.

**Requirements**:
- Use clear, descriptive variable and function names
- Favor explicit logic over implicit or terse constructs
- Include comments for complex logic or non-obvious decisions
- Maintain consistent code formatting and style
- Break down complex functions into smaller, single-purpose units
- Prefer standard patterns over novel approaches unless clearly justified

**Rationale**: Maintainable code reduces technical debt and onboarding time, increasing long-term velocity.

### III. Responsive Design

All layouts must be fully responsive and function correctly on any device, from mobile phones to large desktop monitors.

**Requirements**:
- Use responsive CSS techniques (flexbox, grid, media queries)
- Test on multiple viewport sizes (320px to 2560px+)
- Ensure touch targets are adequately sized (minimum 44x44px)
- Support both portrait and landscape orientations
- Avoid fixed-width layouts that break on small or large screens

**Validation**: Test on physical devices or browser device emulation tools across the spectrum of common devices.

### IV. Testing (NON-NEGOTIABLE)

Comprehensive testing is mandatory for all features. Testing must cover both functionality and accessibility.

**Requirements**:
- Unit test coverage of 80% or higher for all code
- Programmatic accessibility testing with target of 100% coverage
- Tests must be written for all critical user paths
- Tests must be maintainable and clearly document intent
- All tests must pass before code is considered complete

**Testing tools**: Vitest for unit tests, axe or similar for accessibility testing.

**Rationale**: High test coverage catches regressions early and serves as living documentation of expected behavior.

### V. Safety

All development work must prioritize safety to prevent data loss and maintain code integrity.

**Requirements**:
- Commit all work to version control before implementing changes
- Never delete existing files without explicit user confirmation
- Create feature branches for all new work
- Use descriptive commit messages following conventional commit format
- Ensure backwards compatibility or provide clear migration paths

**Rationale**: Safe practices protect against accidental data loss and enable easy rollback of problematic changes.

## Technology Constraints

**Stack**: Vite (TypeScript/HTML/CSS) with minimal external dependencies
**Testing**: Vitest for unit and integration tests
**Storage**: SQLite database for local persistence
**Architecture**: Single-page application with clear component separation

**Component Structure**:
- Prefer modern HTML/CSS over TypeScript for layout and UX
- Use TypeScript only where necessary (form validation, data fetching, business logic, clipboard operations)
- Maintain simple architecture: UI components (Form, Preview, HistoryList) + local persistence layer

## Development Workflow

**Pre-Implementation**:
1. Commit current state before starting new work
2. Create feature branch following naming convention
3. Review specification and acceptance criteria

**Implementation**:
1. Write tests first (TDD approach)
2. Implement feature to pass tests
3. Validate accessibility programmatically
4. Test manually on multiple viewports
5. Ensure readability through code review or self-review

**Quality Gates**:
- All tests passing (80%+ coverage)
- Accessibility score 100% where achievable
- Responsive design validated across device sizes
- Code reviewed for readability
- Commit history clean and descriptive

## Governance

This constitution supersedes all other development practices and guidelines. All features must comply with these principles.

**Amendment Process**:
- Amendments require documentation of rationale
- Version number must be incremented (MAJOR for breaking changes, MINOR for additions, PATCH for clarifications)
- All dependent templates and documentation must be updated
- Migration plan required for breaking changes

**Compliance**:
- All code reviews must verify constitutional compliance
- Automated checks should enforce testing and accessibility requirements where possible
- Non-compliance must be justified and documented as technical debt with remediation plan

**Version**: 1.0.0 | **Ratified**: 2025-12-17 | **Last Amended**: 2025-12-17
