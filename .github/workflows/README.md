# GitHub Actions Workflows

This directory contains CI/CD workflows for the HBANK Protocol project.

## Workflows

### 🧪 test.yml - Tests and Quality Checks

**Triggers:**
- Push to `main`, `develop`, `refactor` branches
- Pull requests to these branches

**Jobs:**

1. **test** - Runs on Node.js 18.x and 20.x
   - Type checking with TypeScript
   - Linting with ESLint
   - Unit tests with coverage
   - Uploads coverage to Codecov
   - Comments coverage on PRs

2. **build** - Runs after tests pass
   - Production build verification
   - Ensures code compiles correctly

**Coverage Requirements:**
- Minimum 80% coverage for branches, functions, lines, statements
- Currently enforced at test level (will fail if below threshold)

### 📊 quality.yml - Code Quality Checks

**Triggers:**
- Push to `main`, `develop`, `refactor` branches
- Pull requests to these branches

**Jobs:**

1. **quality** - Code quality metrics
   - Full quality check (type-check + lint + format-check)
   - Code complexity analysis
   - Uploads complexity report as artifact

2. **security** - Security audits
   - Dependency vulnerability scanning
   - Outdated dependency check

## Local Development

Run the same checks locally before pushing:

```bash
# Run all tests with coverage
pnpm test:coverage

# Run full quality check
pnpm quality

# Run type check
pnpm type-check

# Run linting
pnpm lint

# Fix linting issues
pnpm lint:fix

# Check build
pnpm build
```

## Setting Up Codecov (Optional)

1. Sign up at [codecov.io](https://codecov.io)
2. Add your repository
3. Get the upload token
4. Add as `CODECOV_TOKEN` secret in GitHub repository settings
5. The workflow will automatically upload coverage

## Badges

Add these badges to your README.md:

```markdown
![Tests](https://github.com/YOUR_USERNAME/HBANK-PROTOCOL/workflows/Tests%20and%20Quality%20Checks/badge.svg)
![Code Quality](https://github.com/YOUR_USERNAME/HBANK-PROTOCOL/workflows/Code%20Quality/badge.svg)
[![codecov](https://codecov.io/gh/YOUR_USERNAME/HBANK-PROTOCOL/branch/main/graph/badge.svg)](https://codecov.io/gh/YOUR_USERNAME/HBANK-PROTOCOL)
```

## Continuous Improvement

Current status:
- ✅ Tests run automatically on all PRs
- ✅ Coverage tracking enabled
- ✅ Build verification
- ⚠️ Type check runs but doesn't fail (service errors pending)
- ⚠️ Lint runs but doesn't fail (gradual improvement)

Next steps:
1. Fix remaining TypeScript errors in services
2. Remove `continue-on-error` from type-check
3. Reduce ESLint warnings gradually
4. Remove `continue-on-error` from lint
5. Add E2E tests to workflow
