# Contributing to Fire-Signal

Thank you for your interest in contributing to Fire-Signal! 🔥

## Development Setup

```bash
# Clone the repo
git clone https://github.com/fire-signal/fire-signal.git
cd fire-signal

# Install dependencies
pnpm install

# Build
pnpm build

# Run tests
pnpm test
```

## Adding a New Provider

1. Create a new folder in `src/providers/{provider-name}/`
2. Implement the provider class extending `BaseProvider`
3. Export it from `src/providers/{provider-name}/index.ts`
4. Register it in `src/providers/index.ts`
5. Add documentation to README.md
6. Add tests

## Commit Messages

We use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `refactor:` Code refactoring
- `chore:` Maintenance tasks

## Pull Requests

1. Fork the repo
2. Create a branch (`git checkout -b feat/amazing-feature`)
3. Commit your changes
4. Push to your fork
5. Open a Pull Request

## Code Style

- We use Prettier for formatting
- Run `pnpm format` before committing
- TypeScript strict mode is enabled

## Questions?

Open an issue or discussion on GitHub!
