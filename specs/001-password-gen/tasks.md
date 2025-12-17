# Tasks: Password Generation Web App

**Feature**: 001-password-gen  
**Branch**: `001-password-gen`  
**Date**: 2025-12-17

**Input**: Design documents from `/specs/001-password-gen/`

## Format: `- [ ] [ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- All paths are absolute from repository root

---

## Phase 1: Setup (Project Initialization)

**Purpose**: Initialize project structure and basic dependencies

- [ ] T001 Create project directory structure (src/, tests/, public/, specs/)
- [ ] T002 Initialize npm project with package.json (dependencies: vite, typescript, vitest, sql.js)
- [ ] T003 [P] Create vite.config.ts with development server and build configuration
- [ ] T004 [P] Create tsconfig.json with ES2022 target and strict type checking
- [ ] T005 [P] Create vitest.config.ts for unit and accessibility testing
- [ ] T006 [P] Download EFF Long Wordlist to src/assets/wordlist.json (7,776 words)
- [ ] T007 [P] Download sql-wasm.wasm binary to public/sql-wasm.wasm
- [ ] T008 [P] Create src/index.html with semantic HTML structure, two tab sections (password, passphrase), history container
- [ ] T009 [P] Create src/styles/main.css with CSS reset, root variables, responsive breakpoints

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T010 [P] Create src/models/PasswordConfig.ts with interface and default values
- [ ] T011 [P] Create src/models/PassphraseConfig.ts with interface and default values
- [ ] T012 [P] Create src/models/GeneratedCredential.ts with interface definition
- [ ] T013 [P] Create src/models/HistoryEntry.ts with view model interface
- [ ] T014 Create src/services/validator.ts with validatePasswordConfig() and validatePassphraseConfig() functions
- [ ] T015 Create src/services/database.ts with Database class implementing IDatabase interface (initialize, saveCredential, getAllCredentials, getCredentialById methods)
- [ ] T016 Create src/services/historyService.ts with HistoryService class implementing IHistoryService interface (getHistory, toHistoryEntry methods)
- [ ] T017 [P] Create src/services/clipboard.ts with copyToClipboard() function using Navigator Clipboard API with progressive enhancement fallback
- [ ] T018 [P] Create src/styles/forms.css with form control styles, slider styles, button styles (WCAG 2.1 AA contrast ratios)
- [ ] T019 [P] Create src/styles/history.css with history list styles, responsive grid layout

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Generate Random Password (Priority: P1) 🎯 MVP

**Goal**: Enable users to generate secure random passwords with customizable length, character types, and minimum requirements

**Independent Test**: Open app, adjust password options (length slider, character type toggles, minimum sliders), click generate, see password displayed, click copy button, verify password in clipboard. Password should conform to all selected rules.

### Implementation for User Story 1

- [ ] T020 [P] [US1] Create src/services/passwordGenerator.ts with PasswordGenerator class implementing IPasswordGenerator interface (generate, validate, getDefaultConfig methods)
- [ ] T021 [P] [US1] Implement Web Crypto API random character selection in src/services/passwordGenerator.ts (getRandomChar helper using crypto.getRandomValues)
- [ ] T022 [US1] Implement password generation algorithm in src/services/passwordGenerator.ts (character pool building, minimum requirements enforcement, Fisher-Yates shuffle)
- [ ] T023 [US1] Create src/components/PasswordForm.ts with PasswordFormComponent class implementing IPasswordFormComponent interface (getConfig, setConfig, reset, generate, copyPassword, getValidationErrors methods)
- [ ] T024 [US1] Wire password form controls to PasswordFormComponent in src/components/PasswordForm.ts (length slider, uppercase/lowercase/numbers/special chars toggles, min numbers/special chars sliders)
- [ ] T025 [US1] Implement generate button handler in src/components/PasswordForm.ts (call passwordGenerator.generate, display result, save to database via database.saveCredential)
- [ ] T026 [US1] Implement copy button handler in src/components/PasswordForm.ts (call clipboard.copyToClipboard, show confirmation message)
- [ ] T027 [US1] Add form validation in src/components/PasswordForm.ts (disable generate button when config invalid, show error messages)
- [ ] T028 [US1] Add ARIA labels and semantic HTML to password form controls in src/components/PasswordForm.ts (aria-label, role, aria-describedby attributes)
- [ ] T029 [US1] Implement keyboard navigation for password form in src/components/PasswordForm.ts (tab order, Enter key to generate, focus management)

**Checkpoint**: User Story 1 complete - password generation fully functional and testable independently

---

## Phase 4: User Story 2 - Generate Random Passphrase (Priority: P2)

**Goal**: Enable users to generate memorable random passphrases with customizable word count, uppercase, numbers, and separator

**Independent Test**: Switch to Passphrase tab, adjust options (word count slider, uppercase/numbers toggles, separator input), click generate, see passphrase displayed with specified number of words and formatting, click copy button, verify passphrase in clipboard.

### Implementation for User Story 2

- [ ] T030 [P] [US2] Create src/services/passphraseGenerator.ts with PassphraseGenerator class implementing IPassphraseGenerator interface (generate, validate, getDefaultConfig, getWordlist methods)
- [ ] T031 [P] [US2] Load EFF wordlist in src/services/passphraseGenerator.ts (import from src/assets/wordlist.json)
- [ ] T032 [US2] Implement passphrase generation algorithm in src/services/passphraseGenerator.ts (random word selection using crypto.getRandomValues, uppercase first letter if enabled, append numbers if enabled, join with separator)
- [ ] T033 [US2] Create src/components/PassphraseForm.ts with PassphraseFormComponent class implementing IPassphraseFormComponent interface (getConfig, setConfig, reset, generate, copyPassphrase, getValidationErrors methods)
- [ ] T034 [US2] Wire passphrase form controls to PassphraseFormComponent in src/components/PassphraseForm.ts (word count slider, uppercase/numbers toggles, separator input field)
- [ ] T035 [US2] Implement generate button handler in src/components/PassphraseForm.ts (call passphraseGenerator.generate, display result, save to database via database.saveCredential)
- [ ] T036 [US2] Implement copy button handler in src/components/PassphraseForm.ts (call clipboard.copyToClipboard, show confirmation message)
- [ ] T037 [US2] Add form validation in src/components/PassphraseForm.ts (validate word count range 3-8, validate separator max length 10)
- [ ] T038 [US2] Add ARIA labels and semantic HTML to passphrase form controls in src/components/PassphraseForm.ts (aria-label, role, aria-describedby attributes)
- [ ] T039 [US2] Implement keyboard navigation for passphrase form in src/components/PassphraseForm.ts (tab order, Enter key to generate, focus management)

**Checkpoint**: User Stories 1 AND 2 both work independently - password and passphrase generation fully functional

---

## Phase 5: User Story 3 - View Generation History (Priority: P3)

**Goal**: Enable users to view and retrieve previously generated passwords and passphrases

**Independent Test**: After generating several passwords and passphrases, view history section which displays all items with timestamps ordered by most recent first. Click any history item to copy it to clipboard. Close and reopen app to verify history persists.

### Implementation for User Story 3

- [ ] T040 [P] [US3] Create src/components/HistoryList.ts with HistoryListComponent class implementing IHistoryListComponent interface (loadHistory, filterByType, copyHistoryItem, refresh methods)
- [ ] T041 [US3] Implement loadHistory method in src/components/HistoryList.ts (call historyService.getHistory, render history items with preview and formatted timestamp)
- [ ] T042 [US3] Implement history item click handler in src/components/HistoryList.ts (call clipboard.copyToClipboard with item value, show confirmation)
- [ ] T043 [US3] Implement preview generation in src/components/HistoryList.ts (passwords show first 6 chars + "••••••", passphrases show first 2 words + "•••")
- [ ] T044 [US3] Implement timestamp formatting in src/components/HistoryList.ts (relative time for <24 hours, absolute date for older)
- [ ] T045 [US3] Implement filterByType method in src/components/HistoryList.ts (filter by 'all', 'password', or 'passphrase')
- [ ] T046 [US3] Add ARIA labels and semantic HTML to history list in src/components/HistoryList.ts (role="list", aria-label, button semantics)
- [ ] T047 [US3] Implement keyboard navigation for history list in src/components/HistoryList.ts (arrow keys to navigate items, Enter to copy)
- [ ] T048 [US3] Add database persistence to IndexedDB in src/services/database.ts (export database binary periodically, restore on app load)
- [ ] T049 [US3] Wire history refresh to generation events (call historyList.refresh after password/passphrase generation in PasswordForm and PassphraseForm)

**Checkpoint**: All user stories independently functional - complete password/passphrase generation with persistent history

---

## Phase 6: Application Integration & Main Entry Point

**Purpose**: Wire all components together into cohesive single-page application

- [ ] T050 Create src/main.ts with AppComponent class implementing IAppComponent interface (initialize, switchTab, getActiveTab, handleError methods)
- [ ] T051 Implement initialize method in src/main.ts (initialize database, instantiate all components, wire event handlers, load initial history)
- [ ] T052 Implement tab switching in src/main.ts (show/hide password/passphrase forms, update active tab state, update URL hash)
- [ ] T053 Implement global error handling in src/main.ts (catch errors from all components, display user-friendly error messages)
- [ ] T054 Wire tab navigation controls in src/index.html (click handlers for password/passphrase tabs)
- [ ] T055 Add loading state during database initialization in src/main.ts (show loading spinner, hide when ready)
- [ ] T056 Implement URL hash routing for tabs in src/main.ts (support #password and #passphrase URLs)

---

## Phase 7: Testing (Unit, Integration, Accessibility)

**Purpose**: Achieve 80%+ code coverage and 100% accessibility compliance

### Unit Tests

- [ ] T057 [P] Create tests/unit/passwordGenerator.test.ts (test generate with various configs, test validation rules, test minimum requirements enforcement, test Fisher-Yates shuffle randomness)
- [ ] T058 [P] Create tests/unit/passphraseGenerator.test.ts (test generate with various configs, test uppercase/numbers options, test separator handling, test word count validation)
- [ ] T059 [P] Create tests/unit/validator.test.ts (test password config validation edge cases, test passphrase config validation, test invalid configurations rejection)
- [ ] T060 [P] Create tests/unit/database.test.ts (test saveCredential, test getAllCredentials, test getCredentialById, test database persistence to IndexedDB)
- [ ] T061 [P] Create tests/unit/historyService.test.ts (test getHistory, test toHistoryEntry preview generation, test timestamp formatting)
- [ ] T062 [P] Create tests/unit/clipboard.test.ts (test copyToClipboard success, test fallback for unsupported browsers, test error handling)

### Integration Tests

- [ ] T063 [P] Create tests/integration/passwordFlow.test.ts (test complete password generation flow: configure → generate → display → copy → save to database)
- [ ] T064 [P] Create tests/integration/passphraseFlow.test.ts (test complete passphrase generation flow: configure → generate → display → copy → save to database)
- [ ] T065 [P] Create tests/integration/historyFlow.test.ts (test generate multiple credentials → view history → copy from history → persist across sessions)
- [ ] T066 [P] Create tests/integration/tabSwitching.test.ts (test switching between password/passphrase tabs maintains state)

### Accessibility Tests

- [ ] T067 [P] Create tests/accessibility/keyboard.test.ts (test keyboard navigation for all forms, test Enter key to generate, test tab order, test focus management)
- [ ] T068 [P] Create tests/accessibility/screenReader.test.ts (test ARIA labels presence, test semantic HTML structure, test form control descriptions)
- [ ] T069 [P] Create tests/accessibility/contrast.test.ts (test color contrast ratios meet WCAG 2.1 AA for all UI elements, test focus indicators)
- [ ] T070 [P] Create tests/accessibility/axeCore.test.ts (run @axe-core automated accessibility scan on entire application, verify 100% pass rate)

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements affecting multiple user stories

- [ ] T071 [P] Add responsive CSS media queries to src/styles/main.css (mobile 320px-767px, tablet 768px-1023px, desktop 1024px+)
- [ ] T072 [P] Optimize bundle size in vite.config.ts (code splitting, tree shaking, minification)
- [ ] T073 [P] Add touch target sizing to src/styles/forms.css (minimum 44x44px for mobile)
- [ ] T074 [P] Implement smooth transitions for tab switching in src/styles/main.css (fade in/out animations at 60fps)
- [ ] T075 [P] Add loading states for async operations in src/components (database initialization, history loading)
- [ ] T076 [P] Implement confirmation messages for copy operations (fade-out toast notifications)
- [ ] T077 [P] Add error recovery for database failures (retry logic, fallback to in-memory storage)
- [ ] T078 [P] Performance optimization: lazy load wordlist only when passphrase tab opened
- [ ] T079 [P] Performance optimization: debounce slider input events in forms
- [ ] T080 [P] Security: add Content Security Policy meta tag to src/index.html
- [ ] T081 Update specs/001-password-gen/quickstart.md with final project structure and testing commands
- [ ] T082 Create README.md in repository root with project overview, setup instructions, usage guide
- [ ] T083 Run full test suite and verify 80%+ code coverage achieved
- [ ] T084 Run accessibility audit and verify 100% WCAG 2.1 AA compliance
- [ ] T085 Test application on all target browsers (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- [ ] T086 Test responsive design on viewport range 320px-2560px
- [ ] T087 Verify bundle size <5MB requirement met
- [ ] T088 Run quickstart.md validation (follow all steps in quickstart guide, verify they work)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3, 4, 5)**: All depend on Foundational phase completion
  - User stories can proceed in parallel (if multiple developers)
  - Or sequentially in priority order: US1 (P1) → US2 (P2) → US3 (P3)
- **Application Integration (Phase 6)**: Depends on at least US1 completion (MVP = US1 only)
- **Testing (Phase 7)**: Can start as each user story completes
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1 - Password)**: Can start after Foundational (Phase 2) - NO dependencies on other stories
- **User Story 2 (P2 - Passphrase)**: Can start after Foundational (Phase 2) - NO dependencies on other stories (completely independent from US1)
- **User Story 3 (P3 - History)**: Can start after Foundational (Phase 2) - Integrates with US1 and US2 but should be independently testable

### Within Each User Story

1. Generator service implementation first (core algorithm)
2. Form component implementation second (UI logic)
3. Form wiring third (connect UI to services)
4. Accessibility features fourth (ARIA, keyboard nav)
5. Story complete and independently testable

### Parallel Opportunities Per Phase

**Phase 1 (Setup)**: T003, T004, T005, T006, T007, T008, T009 can all run in parallel

**Phase 2 (Foundational)**: T010, T011, T012, T013 can run in parallel; T017, T018, T019 can run in parallel

**Phase 3 (US1)**: T020, T021 can run in parallel before T022

**Phase 4 (US2)**: T030, T031 can run in parallel before T032

**Phase 5 (US3)**: T040 is standalone

**Phase 7 (Testing)**: All unit tests (T057-T062) can run in parallel; all integration tests (T063-T066) can run in parallel; all accessibility tests (T067-T070) can run in parallel

**Phase 8 (Polish)**: T071-T080 can all run in parallel

---

## Parallel Example: User Story 1

After Foundational phase completes, these US1 tasks can run concurrently:

```bash
# Parallel batch 1 (different services):
T020: Create passwordGenerator.ts with interfaces
T021: Implement random character selection helper

# Sequential (depends on batch 1):
T022: Implement password generation algorithm (needs T020, T021)

# Parallel with T022 (different file):
T023: Create PasswordForm.ts component class

# Sequential (needs T022, T023):
T024-T029: Wire form controls and add features
```

---

## Implementation Strategy

### Option A: MVP First (Recommended)

Deliver User Story 1 only as initial release:

1. **Complete Phase 1**: Setup (T001-T009)
2. **Complete Phase 2**: Foundational (T010-T019) ⚠️ CRITICAL
3. **Complete Phase 3**: User Story 1 (T020-T029)
4. **Complete Phase 6**: Application Integration (T050-T056) - minimal for US1
5. **Complete Phase 7**: Testing for US1 (T057, T063, T067-T070)
6. **Complete Phase 8**: Polish (T071-T088)
7. **STOP and VALIDATE**: Test password generation independently
8. **Deploy MVP**: Users can generate and copy passwords

**MVP Scope**: Password generation only - provides immediate value

### Option B: Incremental Delivery

Deliver each user story as it completes:

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → **Deploy MVP** (password generation)
3. Add User Story 2 → Test independently → **Deploy v1.1** (add passphrase generation)
4. Add User Story 3 → Test independently → **Deploy v1.2** (add history viewing)
5. Each story adds value without breaking previous functionality

### Option C: Parallel Team Strategy

With 3+ developers available:

1. **Team completes Setup + Foundational together** (T001-T019)
2. **Once Foundational done, split into parallel tracks**:
   - **Developer A**: User Story 1 (T020-T029) - Password generation
   - **Developer B**: User Story 2 (T030-T039) - Passphrase generation
   - **Developer C**: User Story 3 (T040-T049) - History viewing
3. **Integrate**: Developer D wires everything together (T050-T056)
4. **Test in parallel**: All developers run test suites (T057-T070)
5. Stories complete and integrate independently

---

## Task Count Summary

- **Phase 1 (Setup)**: 9 tasks
- **Phase 2 (Foundational)**: 10 tasks (BLOCKING)
- **Phase 3 (US1 - Password)**: 10 tasks
- **Phase 4 (US2 - Passphrase)**: 10 tasks
- **Phase 5 (US3 - History)**: 10 tasks
- **Phase 6 (Integration)**: 7 tasks
- **Phase 7 (Testing)**: 14 tasks
- **Phase 8 (Polish)**: 18 tasks

**Total**: 88 tasks

**MVP Scope (US1 only)**: ~46 tasks (Phase 1 + Phase 2 + Phase 3 + Phase 6 + relevant Phase 7 + Phase 8)

**Parallel Opportunities**: 35+ tasks can run in parallel across all phases

---

## Notes

- All tasks follow format: `- [ ] [ID] [P?] [Story?] Description with file path`
- **[P]** indicates parallelizable (different files, no dependencies)
- **[Story]** maps task to user story (US1, US2, US3) for traceability
- Each user story independently completable and testable
- Tests optional - included here because constitution requires 80%+ coverage
- Commit after each task or logical group
- Stop at checkpoints to validate stories independently
- Constitution compliance built into all tasks (accessibility, testing, responsive design)
