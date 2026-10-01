# Compiler Explorer - Windows Local Deployment

**Branch:** `CE-for-Win-Pascal-2025`

This is a customized build of Compiler Explorer for **local Windows deployment** with commercial and open-source compilers. It is **NOT** intended for public cloud deployment.

## Purpose

This branch removes the hundreds of cloud-based compilers from the public Compiler Explorer and configures it to use:
- **Commercial Compilers**: Delphi (Embarcadero), C++Builder
- **Free Pascal Compilers**: Multiple FPC versions
- **Open Source Compilers**: Rust, Python (local installations)

## Differences from Public CE

### Key Customizations

1. **Minimal Language Support** (`lib/languages.ts`)
   - Only includes: C++, Pascal, Rust, Python
   - Full language list backed up in `lib/languages.ts.full-backup`

2. **Local Compiler Configurations** (`etc/config/*.local.properties`)
   - Pascal compilers (FPC + Delphi)
   - C++ compilers (C++Builder, MinGW)
   - Paths configured for Windows file system

3. **TypeScript Modernization**
   - Migrated from 2021 JavaScript to 2025 TypeScript
   - Better type safety and modern features
   - Smart Pascal program/unit detection

## Installation

### Prerequisites

- **Node.js**: Latest LTS version (v18+ recommended)
- **npm**: Latest version
- **Compilers** installed locally (see Configuration section)

### Setup Steps

1. **Clone this branch**:
   ```bash
   git clone -b CE-for-Win-Pascal-2025 https://github.com/pmcgee69/compiler-explorer.git
   cd compiler-explorer
   ```

2. **Install dependencies**:
   ```bash
   npm install
   npm install -g webpack webpack-cli
   ```

3. **Configure compilers** (see Configuration section below)

4. **Build**:
   ```bash
   npm run webpack
   ```

5. **Start server**:
   ```bash
   npm start
   ```

6. **Access**: Browse to http://localhost:10240/

## Configuration

### Pascal Compilers

Edit `etc/config/pascal.local.properties` to configure your local installations:

#### Free Pascal (FPC)

```properties
compiler.fpc331.exe=C:\fpcupdeluxe\fpc\bin\x86_64-win64\fpc.exe
compiler.fpc322.exe=C:\FPC\3.2.2\bin\i386-win32\fpc.exe
# Add more FPC versions as needed
```

#### Delphi Compilers

```properties
# 32-bit Delphi
compiler.delphi27.exe=C:\Program Files (x86)\Embarcadero\Studio\21.0\Bin\DCC32.EXE
compiler.delphi27.name=x86 Delphi 10.4.2 Sydney

# 64-bit Delphi
compiler.delphi27_64.exe=C:\Program Files (x86)\Embarcadero\Studio\21.0\Bin\DCC64.EXE
compiler.delphi27_64.name=x64 Delphi 10.4.2 Sydney
```

#### Object Dump Tool

Configure objdump for assembly output:
```properties
group.fpc.objdumper=C:\Program Files (x86)\Embarcadero\Dev-Cpp\TDM-GCC-64\bin\objdump.exe
group.delphi.objdumper=C:\Program Files (x86)\Embarcadero\Dev-Cpp\TDM-GCC-64\bin\objdump.exe
```

### C++ Compilers

Edit `etc/config/c++.local.properties` for C++Builder and other C++ compilers.

### Adding Your Own Compilers

1. Edit the appropriate `.local.properties` file
2. Follow the existing patterns for compiler groups
3. Ensure paths use Windows format (`C:\...`)
4. Test with `npm start`

## Features

### Pascal Support

The current implementation includes **smart program/unit detection**:

- **`pascal-utils.ts`**: Automatically detects whether source is a `program` or `unit`
- Extracts program name from source code
- Handles both `.pas` (units) and `.dpr` (programs) files
- No hardcoded filenames - intelligent detection

Example:
```pascal
program MyApp;  // Detected as program, executable named "MyApp"
```

```pascal
unit MyUnit;    // Detected as unit, wrapped in dummy project
```

### Supported Languages

- **C++**: Full support with multiple compilers
- **Pascal**: FPC and Delphi with program/unit detection
- **Rust**: Local rustc installation
- **Python**: Local Python installation

## Updating from Main Branch

To update this branch with latest improvements from public CE:

### Option 1: Merge (Recommended for small updates)

```bash
git checkout CE-for-Win-Pascal-2025
git fetch origin main
git merge origin/main
# Resolve conflicts in lib/languages.ts - keep your minimal version
# Test thoroughly
```

### Option 2: Rebase (For major updates)

This is more complex but gives cleaner history. See `REBASE-NOTES.md` for details.

### Files to Protect During Updates

When merging/rebasing, **preserve these customizations**:

1. **`lib/languages.ts`** - Your minimal language list
2. **`etc/config/*.local.properties`** - Your compiler paths
3. **`WINDOWS-DEPLOYMENT.md`** - This documentation

These are the **only** files that differ significantly from main branch.

## Development

### Build Commands

- **Development mode**: `npm run webpack:dev`
- **Production build**: `npm run webpack`
- **Watch mode**: `npm run webpack:watch`

### Testing

- **All tests**: `npm test`
- **Minimal tests**: `npm run test-min`
- **TypeScript check**: `npm run ts-check`
- **Linting**: `npm run lint`

### Pre-commit Checks

Always run before committing:
```bash
npm run ts-check
npm run lint
npm run test-min
```

Or use the comprehensive check:
```bash
make pre-commit
```

## Troubleshooting

### Build Errors

**Issue**: TypeScript compilation errors
- **Solution**: Run `npm run ts-check` to see detailed errors
- Check that `lib/languages.ts` has correct type definitions

**Issue**: Missing dependencies
- **Solution**: Delete `node_modules` and run `npm install` again

### Runtime Errors

**Issue**: Compiler not found
- **Solution**: Check paths in `.local.properties` files
- Ensure compilers are actually installed at those paths
- Use absolute Windows paths (e.g., `C:\...`)

**Issue**: objdump errors
- **Solution**: Install TDM-GCC or similar to get objdump.exe
- Update objdumper paths in properties files

## Architecture Notes

### Language Detection

The modern TypeScript implementation uses:

- **Type-safe language definitions**: `types/languages.interfaces.ts`
- **Monaco editor integration**: Each language maps to Monaco syntax highlighting
- **Example code loading**: Automatic loading from `examples/{lang}/default{ext}`

### Pascal Compiler Classes

- **`pascal.ts`**: Main FPC compiler class (cross-platform)
- **`pascal-win.ts`**: Windows-specific Delphi compiler
- **`pascal-utils.ts`**: Helper functions for program/unit detection

## Maintenance Notes

### When Updating Compiler Versions

1. Update version in `.local.properties`
2. Test compilation
3. Update README if version numbers are mentioned

### Adding New Compilers

1. Add to appropriate `.local.properties` file
2. Test with sample code
3. Document in this file

## History

- **2021**: Original `CE-for-Win-Pascal` branch created
- **2025**: Modernized to `CE-for-Win-Pascal-2025`
  - Migrated to TypeScript
  - Updated to latest CE architecture
  - Added Rust and Python support
  - Improved Pascal program/unit handling

## Backup

The following backups are maintained:

- **`lib/languages.ts.full-backup`**: Complete language list from main branch
- **Git tag**: `CE-for-Win-Pascal-backup-20251122` - Previous branch state

## License

Same as Compiler Explorer: BSD 2-Clause License

## Support

This is a private/local deployment. For issues:

1. Check this documentation
2. Check public CE docs: https://github.com/compiler-explorer/compiler-explorer
3. For commercial compiler issues, contact vendor support

## See Also

- **Main CE Project**: https://github.com/compiler-explorer/compiler-explorer
- **CE Documentation**: https://github.com/compiler-explorer/compiler-explorer/blob/main/docs/
- **Windows Native Guide**: https://github.com/compiler-explorer/compiler-explorer/blob/main/docs/WindowsNative.md
