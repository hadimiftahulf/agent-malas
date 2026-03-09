# Contributing to Agent Malas

First off, thank you for considering contributing to Agent Malas! 🎉

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Testing](#testing)
- [Documentation](#documentation)

## 📜 Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code.

## 🤝 How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates. When you create a bug report, include as many details as possible:

- Use the bug report template
- Include health status output
- Include relevant logs
- Describe the exact steps to reproduce
- Provide environment details

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion:

- Use the feature request template
- Provide a clear use case
- Explain why this enhancement would be useful
- Include mockups or examples if applicable

### Pull Requests

1. Fork the repo and create your branch from `main`
2. If you've added code, add tests
3. Ensure the test suite passes
4. Make sure your code follows the coding standards
5. Update documentation as needed
6. Write a clear commit message

## 🛠️ Development Setup

### Prerequisites

- Node.js >= 18.0.0
- GitHub CLI (`gh`) authenticated
- Gemini CLI configured
- SQLite3
- Git with SSH configured

### Setup Steps

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/agent-malas.git
cd agent-malas

# Add upstream remote
git remote add upstream https://github.com/hadimiftahulf/agent-malas.git

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your credentials
nano .env

# Run in development mode
npm start
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test
npm test -- test-name

# Run with coverage
npm run test:coverage
```

### Development Workflow

```bash
# Create feature branch
git checkout -b feature/amazing-feature

# Make changes
# ... edit files ...

# Test changes
npm test

# Check health
curl http://localhost:3001/api/health/detailed | jq

# Commit changes
git add .
git commit -m "feat: add amazing feature"

# Push to your fork
git push origin feature/amazing-feature

# Create Pull Request on GitHub
```

## 📝 Coding Standards

### JavaScript Style Guide

We follow standard JavaScript conventions:

```javascript
// Use ES6+ features
import { something } from './module.js';

// Use async/await over promises
async function doSomething() {
  try {
    const result = await operation();
    return result;
  } catch (error) {
    logger.error(`Error: ${error.message}`);
    throw error;
  }
}

// Use descriptive variable names
const taskProcessingTimeout = 600000; // Good
const t = 600000; // Bad

// Add JSDoc comments for functions
/**
 * Process task with retry mechanism
 * @param {Object} task - Task object
 * @param {number} maxRetries - Maximum retry attempts
 * @returns {Promise<boolean>} Success status
 */
async function processTask(task, maxRetries = 3) {
  // Implementation
}

// Use proper error handling
try {
  await riskyOperation();
} catch (error) {
  logger.error(`Operation failed: ${error.message}`);
  // Cleanup
  await cleanup();
  throw error;
}
```

### File Organization

```
src/
├── index.js              # Main entry point
├── config.js             # Configuration
├── db.js                 # Database operations
├── db-transactions.js    # Transaction helpers
├── worker.js             # Task processing
├── retry-helper.js       # Retry mechanisms
├── graceful-shutdown.js  # Shutdown handler
├── health-monitor.js     # Health monitoring
├── routes/
│   └── api.js           # API routes
└── ...
```

### Error Handling

Always use proper error handling:

```javascript
// Good
try {
  const result = await operation();
  return result;
} catch (error) {
  logger.error(`Operation failed: ${error.message}`);
  // Cleanup resources
  await cleanup();
  // Update status
  updateStatus('failed', { error: error.message });
  throw error;
}

// Bad
const result = await operation(); // No error handling
```

### Logging

Use the logger module consistently:

```javascript
import { logger } from './logger.js';

// Info level
logger.info('Task started', taskId);

// Warning level
logger.warn('Retry attempt failed', taskId);

// Error level
logger.error('Critical error occurred', taskId);
```

## 📝 Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/):

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Examples

```bash
# Feature
git commit -m "feat(worker): add retry mechanism for git operations"

# Bug fix
git commit -m "fix(db): prevent race condition in task locking"

# Documentation
git commit -m "docs(readme): update installation instructions"

# Performance
git commit -m "perf(db): optimize query with prepared statements"
```

## 🔄 Pull Request Process

1. **Update Documentation**: Ensure README and other docs are updated
2. **Add Tests**: Include tests for new features
3. **Update Changelog**: Add entry to CHANGELOG.md
4. **Pass CI**: Ensure all checks pass
5. **Request Review**: Tag maintainers for review
6. **Address Feedback**: Respond to review comments
7. **Squash Commits**: Clean up commit history if needed

### PR Title Format

Use conventional commit format:

```
feat: add health monitoring system
fix: resolve memory leak in WebSocket
docs: improve installation guide
```

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tests added/updated
- [ ] Manual testing completed
- [ ] Health checks passing

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No new warnings
- [ ] Tests pass locally

## Related Issues
Closes #issue_number
```

## 🧪 Testing

### Writing Tests

```javascript
// test/worker.test.js
import { processTask } from '../src/worker.js';

describe('Worker', () => {
  it('should process task successfully', async () => {
    const task = { id: '123', title: 'Test task' };
    const result = await processTask(task);
    expect(result).toBe(true);
  });

  it('should handle errors gracefully', async () => {
    const task = { id: '456', title: 'Failing task' };
    await expect(processTask(task)).rejects.toThrow();
  });
});
```

### Running Tests

```bash
# All tests
npm test

# Watch mode
npm test -- --watch

# Coverage
npm run test:coverage

# Specific file
npm test -- worker.test.js
```

## 📚 Documentation

### Code Documentation

Use JSDoc for functions:

```javascript
/**
 * Process task with retry mechanism
 * @param {Object} task - Task object with id, title, description
 * @param {Object} options - Processing options
 * @param {number} options.maxRetries - Maximum retry attempts
 * @param {number} options.timeout - Timeout in milliseconds
 * @returns {Promise<boolean>} True if successful, false otherwise
 * @throws {Error} If task processing fails after all retries
 * @example
 * const success = await processTask(task, { maxRetries: 3 });
 */
async function processTask(task, options = {}) {
  // Implementation
}
```

### README Updates

When adding features, update:
- Features list
- Usage examples
- Configuration options
- API documentation

### Changelog

Add entries to CHANGELOG.md:

```markdown
## [Unreleased]

### Added
- New feature description

### Fixed
- Bug fix description

### Changed
- Change description
```

## 🎯 Best Practices

### Performance

- Use prepared statements for database queries
- Implement caching where appropriate
- Use async/await for I/O operations
- Avoid blocking operations

### Security

- Never commit credentials
- Validate all inputs
- Use parameterized queries
- Handle errors without exposing sensitive data

### Reliability

- Always use transactions for related operations
- Implement retry mechanisms for external calls
- Add proper error handling and cleanup
- Use timeouts for long operations

## 🤔 Questions?

- Open a [Discussion](https://github.com/hadimiftahulf/agent-malas/discussions)
- Check existing [Issues](https://github.com/hadimiftahulf/agent-malas/issues)
- Read the [Documentation](https://github.com/hadimiftahulf/agent-malas#readme)

## 📞 Contact

- GitHub: [@hadimiftahulf](https://github.com/hadimiftahulf)
- Issues: [GitHub Issues](https://github.com/hadimiftahulf/agent-malas/issues)

---

Thank you for contributing! 🙏

*"Tetap malas secara manual, biar bot yang kerja!"* 🤖
