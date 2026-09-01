// Copyright (c) 2017, Compiler Explorer Authors
// All rights reserved.
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are met:
//
//     * Redistributions of source code must retain the above copyright notice,
//       this list of conditions and the following disclaimer.
//     * Redistributions in binary form must reproduce the above copyright
//       notice, this list of conditions and the following disclaimer in the
//       documentation and/or other materials provided with the distribution.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
// AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
// IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
// ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
// LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
// CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
// SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
// INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
// CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
// ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE.

// CUSTOM BUILD FOR WINDOWS - LOCAL DEPLOYMENT ONLY
// This is a minimal language configuration for local Windows deployment
// with commercial compilers (Delphi, C++Builder, Free Pascal) and local open-source compilers
// Full language list is backed up in languages.ts.full-backup

import fs from 'node:fs';
import path from 'node:path';

import type {Language, LanguageKey} from '../types/languages.interfaces.js';

type DefKeys =
    | 'name'
    | 'monaco'
    | 'extensions'
    | 'alias'
    | 'previewFilter'
    | 'formatter'
    | 'logoFilename'
    | 'logoFilenameDark'
    | 'monacoDisassembly'
    | 'tooltip'
    | 'digitSeparator';
type LanguageDefinition = Pick<Language, DefKeys>;

// Minimal language definitions for Windows local deployment
const definitions: Record<LanguageKey, LanguageDefinition> = {
    'c++': {
        name: 'C++',
        monaco: 'cppp',
        extensions: ['.cpp', '.cxx', '.h', '.hpp', '.hxx', '.c', '.cc', '.ixx'],
        alias: ['gcc', 'cpp'],
        logoFilename: 'cpp.svg',
        logoFilenameDark: null,
        formatter: 'clangformat',
        previewFilter: /^\s*#include/,
        monacoDisassembly: null,
        digitSeparator: "'",
    },
    pascal: {
        name: 'Pascal',
        monaco: 'pascal',
        extensions: ['.pas', '.dpr', '.inc'],
        alias: [],
        logoFilename: 'pascal.svg',
        logoFilenameDark: 'pascal-dark.svg',
        formatter: null,
        previewFilter: null,
        monacoDisassembly: null,
    },
    rust: {
        name: 'Rust',
        monaco: 'rustp',
        extensions: ['.rs'],
        alias: [],
        logoFilename: 'rust.svg',
        logoFilenameDark: 'rust-dark.svg',
        formatter: 'rustfmt',
        previewFilter: null,
        monacoDisassembly: null,
        digitSeparator: '_',
    },
    python: {
        name: 'Python',
        monaco: 'python',
        extensions: ['.py'],
        alias: [],
        logoFilename: 'python.svg',
        logoFilenameDark: null,
        formatter: null,
        previewFilter: null,
        monacoDisassembly: null,
        digitSeparator: '_',
    },
};

export const languages = Object.fromEntries(
    Object.entries(definitions).map(([key, lang]) => {
        let example: string;
        try {
            example = fs.readFileSync(path.join('examples', key, 'default' + lang.extensions[0]), 'utf8');
        } catch {
            example = 'Oops, something went wrong and we could not get the default code for this language.';
        }

        const def: Language = {
            ...lang,
            id: key as LanguageKey,
            supportsExecute: false,
            example,
        };
        return [key, def];
    }),
) as Record<LanguageKey, Language>;
