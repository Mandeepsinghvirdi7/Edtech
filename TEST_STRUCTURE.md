# Unit Testing Structure

This document outlines the testing structure for the HikeEducation Dashboard project.

## Overview

Tests are organized in `__tests__` folders mirroring the source structure, ensuring that tests don't interfere with production code while remaining closely associated with the modules they test.

## Directory Structure

### Frontend Tests: `src/__tests__/`

```
src/__tests__/
├── utils/                    # Tests for utility functions
│   └── calculations.test.ts   # Example: tests for src/lib/calculations.ts
├── components/               # Tests for React components
│   └── Dashboard.test.tsx     # Example: tests for src/pages/Dashboard.tsx
├── hooks/                     # Tests for custom React hooks
│   └── useToast.test.ts       # Example: tests for src/hooks/use-toast.ts
└── setup.ts                   # Jest setup and global mocks
```

### Backend Tests: `backend/__tests__/`

```
backend/__tests__/
├── api/                       # Tests for API endpoints
│   └── server.test.ts         # Example: tests for backend/server.js
└── utils/                     # Tests for backend utilities
    └── mongo.test.ts          # Example: tests for backend/mongo.js
```

## Running Tests

### Frontend Tests

```bash
# Run all frontend tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Backend Tests

```bash
# Run all backend tests
cd backend
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Test File Naming Convention

- Test files should use the `.test.ts` (or `.test.tsx` for React components) suffix
- Keep test file names matching the source file being tested
- Example: `src/lib/calculations.ts` → `src/__tests__/utils/calculations.test.ts`

## Writing Tests

### Frontend Component Tests

Use React Testing Library for component tests:

```typescript
import { render, screen } from '@testing-library/react';
import { MyComponent } from '@/Components/MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText(/text/i)).toBeInTheDocument();
  });
});
```

### Backend API Tests

Use Jest with supertest for API tests:

```typescript
import request from 'supertest';
import app from '../server';

describe('GET /api/data', () => {
  it('should return 200', async () => {
    const res = await request(app).get('/api/data');
    expect(res.status).toBe(200);
  });
});
```

### Utility Function Tests

Simple unit tests for pure functions:

```typescript
import { myFunction } from '@/lib/utilities';

describe('myFunction', () => {
  it('should return expected result', () => {
    const result = myFunction(input);
    expect(result).toBe(expected);
  });
});
```

## Best Practices

1. **Isolation**: Each test should be independent and not rely on other tests
2. **Clarity**: Test names should clearly describe what is being tested
3. **Coverage**: Aim for >80% code coverage over time
4. **Mocking**: Mock external dependencies (APIs, database calls, etc.)
5. **Speed**: Keep tests fast; use jest timers for async operations
6. **Maintenance**: Update tests when functionality changes

## Configuration Files

- **Frontend**: `jest.config.js` - Jest configuration for React/TypeScript
- **Backend**: `backend/jest.config.js` - Jest configuration for Node.js

## Example Tests Included

This structure includes example test templates for:
- Utility functions: `calculations.test.ts`
- React components: `Dashboard.test.tsx`
- React hooks: `useToast.test.ts`
- API endpoints: `server.test.ts`
- Database utilities: `mongo.test.ts`

Replace these examples with actual tests for your codebase.

## Adding New Tests

1. Create a new `.test.ts(x)` file in the appropriate `__tests__` subfolder
2. Import the module/component you want to test
3. Write your test cases using Jest syntax
4. Run tests to verify they pass
5. Add tests to CI/CD pipeline (optional)

## Next Steps

- Install testing dependencies if not already present
- Gradually convert manual tests to automated unit tests
- Increase code coverage with each feature update
- Integrate tests into your CI/CD pipeline
