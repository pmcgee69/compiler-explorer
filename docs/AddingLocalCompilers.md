# Adding Local Compilers - Quick Guide

This is a quick reference for adding local compilers to your Compiler Explorer instance. For comprehensive details, see [AddingACompiler.md](AddingACompiler.md).

## Configuration Files

Compiler Explorer uses `.local.properties` files for local configurations. These override defaults and are gitignored.

Common files:
- `etc/config/c++.local.properties`        - C++ compilers
- `etc/config/pascal-win.local.properties` - Delphi compilers (Windows)
- `etc/config/rust.local.properties`       - Rust compilers
- `etc/config/python.local.properties`     - Python interpreters

## Example 1: Adding Delphi Compilers

**File:** `etc/config/pascal-win.local.properties`

```ini
compilers=&delphi64

group.delphi64.compilers=delphi27_64:delphi28_64
group.delphi64.compilerType=pascal-win

compiler.delphi27_64.exe=C:\\Program Files (x86)\\Embarcadero\\Studio\\20.0\\Bin\\DCC64.EXE
compiler.delphi27_64.name=x64 Delphi 10.4.2 Sydney

compiler.delphi28_64.exe=C:\\Program Files (x86)\\Embarcadero\\Studio\\22.0\\Bin\\DCC64.EXE
compiler.delphi28_64.name=x64 Delphi 11 Alexandria
```

## Example 2: Adding C++Builder Compilers

**File:** `etc/config/c++.local.properties`

```ini
compilers=&embclang64:&embclang64mod

# Classic 64-bit compilers
group.embclang64.compilers=bcc11_64:bcc123_64
group.embclang64.groupName=C++Builder x64

compiler.bcc11_64.exe=C:\\Program Files (x86)\\Embarcadero\\Studio\\22.0\\bin\\bcc64.exe
compiler.bcc11_64.name=C++Builder 11 x64
compiler.bcc11_64.ldPath=C:\\Program Files (x86)\\Embarcadero\\Studio\\22.0\\lib\\win64\\release

compiler.bcc123_64.exe=C:\\Program Files (x86)\\Embarcadero\\Studio\\23.0\\bin\\bcc64.exe
compiler.bcc123_64.name=C++Builder 12.3 x64
compiler.bcc123_64.ldPath=C:\\Program Files (x86)\\Embarcadero\\Studio\\23.0\\lib\\win64\\release

# Modern 64-bit compilers (12.3+)
group.embclang64mod.compilers=bcc123_64mod
group.embclang64mod.groupName=C++Builder x64 modern

compiler.bcc123_64mod.exe=C:\\Program Files (x86)\\Embarcadero\\Studio\\23.0\\bin64\\bcc64x.exe
compiler.bcc123_64mod.name=C++Builder 12.3 x64 modern
compiler.bcc123_64mod.ldPath=C:\\Program Files (x86)\\Embarcadero\\Studio\\23.0\\lib\\win64x\\release|C:\\Program Files (x86)\\Embarcadero\\Studio\\23.0\\x86_64-w64-mingw32\\lib

defaultCompiler=bcc123_64mod
```

## Key Properties

- **compilers** - List of compiler IDs or groups (prefix groups with `&`)
- **compiler.ID.exe** - Path to compiler executable
- **compiler.ID.name** - Display name
- **compiler.ID.ldPath** - Library paths for linking (use `|` separator for multiple paths)
- **group.NAME.compilers** - List of compilers in group
- **group.NAME.compilerType** - Compiler type (e.g., `pascal-win`, `gcc`)

## See Also

- [AddingACompiler.md](AddingACompiler.md) - Full documentation
- [Configuration.md](Configuration.md) - Configuration system details
- [DelphiCppBuilderSpecifics.md](DelphiCppBuilderSpecifics.md) - Delphi and C++Builder setup guide
