# TODO

## Phase 1: Critical Security & Stability [P1.1-P1.5]

- [ ] **[P1.1] Database Security**: Replace raw SQL with Drizzle ORM to prevent SQL injection
- [x] **[P1.2] XSS Prevention**: Add DOMPurify sanitization for HTML content rendering
- [x] **[P1.3] Connection Pooling**: Fix database pool singleton to prevent resource leaks
- [ ] **[P1.4] Transaction Management**: Implement proper transaction boundaries for multi-step operations
- [x] **[P1.5] Secret Management**: Rotate all credentials, remove from git history

## Phase 2: Cost Optimization [P2.1-P2.4]

- [x] **[P2.1] AI Model Selection**: Implement intelligent model selection (save ~$700/month)
  - [x] Use claude-3-haiku for extraction/scoring
  - [x] Reserve claude-3.5-sonnet for optimization only
- [ ] **[P2.2] Result Caching**: Add LRU cache for AI responses
- [ ] **[P2.3] Prompt Optimization**: Reduce token usage in system prompts
- [ ] **[P2.4] Rate Limiting**: Implement tier-based rate limiting

## Phase 3: Testing Foundation [P3.1-P3.4]

- [ ] **[P3.1] Service Tests**: Add unit tests for all remote functions (target: 80% coverage)
- [ ] **[P3.2] Auth Tests**: Test authentication flows and session management
- [ ] **[P3.3] Database Tests**: Integration tests for all database operations
- [ ] **[P3.4] E2E Critical Paths**: Test user registration → job creation → optimization flow

## Phase 4: Core Algorithm Improvements [P4.1-P4.4]

- [ ] **[P4.1] ATS Scoring**: Replace hardcoded keywords with AI-powered extraction
- [ ] **[P4.2] Industry Scoring**: Add industry-specific scoring models
- [ ] **[P4.3] Semantic Matching**: Implement synonym recognition and semantic understanding
- [ ] **[P4.4] Job Matching**: Build missing job matching algorithm

## Phase 5: Technical Debt [P5.1-P5.4]

- [ ] **[P5.1] Component Audit**: Remove unused Shadcn components (~70% reduction)
- [ ] **[P5.2] Type Safety**: Replace all `any` types with proper TypeScript types
- [ ] **[P5.3] Error Boundaries**: Add comprehensive error handling
- [ ] **[P5.4] Loading States**: Implement skeletons and proper loading indicators

## Phase 6: Accessibility & UX [P6.1-P6.4]

- [ ] **[P6.1] ARIA Labels**: Add missing accessibility attributes
- [ ] **[P6.2] Keyboard Navigation**: Fix all keyboard interaction issues
- [ ] **[P6.3] Form Validation**: Implement consistent field-level validation
- [ ] **[P6.4] Error States**: Standardize error handling across components

## Phase 7: Feature Development [P7.1-P7.4]

- [ ] **[P7.1] Success Tracking**: Track optimization success rates
- [ ] **[P7.2] Analytics Dashboard**: Build insights and metrics dashboard
- [ ] **[P7.3] A/B Testing**: Framework for optimization experiments
- [ ] **[P7.4] Subscription Tiers**: Complete tier-based feature gating

## Phase 8: Performance Optimization [P8.1-P8.4]

- [ ] **[P8.1] Bundle Optimization**: Tree-shake and lazy load components
- [ ] **[P8.2] Query Performance**: Add database indexes and optimize queries
- [ ] **[P8.3] Service Worker**: Implement offline capability
- [ ] **[P8.4] CDN Strategy**: Optimize static asset delivery

## Phase 0: Monitoring & Operations [P0.1-P0.5]

- [x] **[P0.1]** Set up error tracking (Sentry)
- [ ] **[P0.2]** Implement structured logging with log levels
- [ ] **[P0.3]** Add performance monitoring (Core Web Vitals)
- [ ] **[P0.4]** Database query monitoring and slow query alerts
- [ ] **[P0.5]** AI cost tracking and alerts

## Success Metrics

### Cost Targets

- [ ] Reduce AI costs by 70% ($700/month savings)
- [ ] Reduce CDN costs by removing unused components ($50/month)

### Quality Targets

- [ ] Achieve 80% unit test coverage
- [ ] Zero critical security vulnerabilities
- [ ] 100% accessibility compliance (WCAG 2.1 AA)

### Performance Targets

- [ ] Page load time < 2 seconds
- [ ] Time to Interactive < 3 seconds
- [ ] Database query response < 100ms (p95)

---

## Phase Priority Guide

| Priority        | Phases | Description            | Risk if Delayed                |
| --------------- | ------ | ---------------------- | ------------------------------ |
| 🔴 **Critical** | P1, P2 | Security & Cost        | Data breach, $700/mo waste     |
| 🟡 **High**     | P3, P4 | Testing & Algorithms   | Bugs in prod, poor UX          |
| 🟢 **Medium**   | P5, P6 | Debt & Accessibility   | Maintenance burden, legal risk |
| 🔵 **Future**   | P7, P8 | Features & Performance | Competitive disadvantage       |
| ⚪ **Ongoing**  | P0     | Monitoring             | Blind to issues                |

---

_Reference: See `docs/code-review-critical-analysis.md` for detailed implementation guidance_
