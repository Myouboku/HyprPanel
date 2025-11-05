# HyprPanel - Agent Guidelines

## Development Commands

- **Lint**: `npm run lint` (fix with `npm run lint:fix`)
- **Format**: `npm run format` (Prettier for .ts files)
- **Type Check**: `tsc --noEmit`
- **No test suite**: This project does not have automated tests

## Code Style

- **TypeScript**: Strict mode enabled (`noImplicitAny`, `strictNullChecks`, `noImplicitThis`)
- **Quotes**: Single quotes only (no template literals unless necessary)
- **Formatting**: 4 spaces, 110 char line width, trailing commas, semicolons required
- **Imports**: Absolute paths from `src/` root (e.g., `import options from 'src/configuration'`)
- **JSX**: React JSX with `astal/gtk3` import source (GTK3 components)
- **Return Types**: Explicit return types required on all functions (`@typescript-eslint/explicit-function-return-type`)
- **No `any`**: Never use `any` type (`@typescript-eslint/no-explicit-any: error`)
- **No Non-Null Assertions**: Avoid `!` operator (`@typescript-eslint/no-non-null-assertion: error`)
- **Naming**: PascalCase for types/classes, UPPER*CASE for enum members, private members require `*` prefix
- **Member Access**: Explicit accessibility modifiers required (public/private/protected), except constructors
- **Comments**: JSDoc for public methods explaining purpose and parameters. Avoid unnecessary comments that restate obvious code behavior

## Architecture

- **Services**: Singleton pattern with `getInstance()` (e.g., `WeatherService`)
- **Options**: Use `opt()` and `mkOptions()` from `src/lib/options`
- **State**: Astal `Variable` for reactive state, `bind()` for reactive bindings
- **Components**: Functional TSX components returning `JSX.Element`
- **Error Handling**: Use `errorHandler` from `src/core/errors/handler`
