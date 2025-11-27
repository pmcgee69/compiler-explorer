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

import fs from 'node:fs/promises';
import path from 'node:path';

import type {
    ExecutionOptions,
    ExecutionOptionsWithEnv,
    FiledataPair,
} from '../../types/compilation/compilation.interfaces.js';
import type {PreliminaryCompilerInfo} from '../../types/compiler.interfaces.js';
import type {ParseFiltersAndOutputOptions} from '../../types/features/filters.interfaces.js';
import {unwrap} from '../assert.js';
import {BaseCompiler} from '../base-compiler.js';
import {CompilationEnvironment} from '../compilation-env.js';
import {MapFileReaderDelphi} from '../mapfiles/map-file-delphi.js';
import {PELabelReconstructor, PELabelReconstructorOptions} from '../pe32-support.js';
import * as utils from '../utils.js';

import * as pascalUtils from './pascal-utils.js';

export class PascalWinCompiler extends BaseCompiler {
    static get key() {
        return 'pascal-win';
    }

    mapFilename: string | null;
    dprFilename: string;
    projectBaseName: string;
    isWrapperProgram: boolean;

    constructor(info: PreliminaryCompilerInfo, env: CompilationEnvironment) {
        super(info, env);
        info.supportsFiltersInBinary = true;

        this.mapFilename = null;
        this.compileFilename = 'output.pas';
        this.dprFilename = 'prog.dpr';
        this.projectBaseName = 'prog';
        this.isWrapperProgram = false;
    }

    override getSharedLibraryPathsAsArguments() {
        return [];
    }

    override exec(command: string, args: string[], options: ExecutionOptions) {
        if (process.platform === 'linux' || process.platform === 'darwin') {
            const wine = this.env.ceProps<string>('wine');

            args = args.slice(0);
            if (command.toLowerCase().endsWith('.exe')) {
                args.unshift(command);
                command = wine;
            }
        }

        return super.exec(command, args, options);
    }

    override getExecutableFilename(dirPath: string) {
        return path.join(dirPath, this.projectBaseName + '.exe');
    }

    override getOutputFilename(dirPath: string) {
        return path.join(dirPath, this.projectBaseName + '.exe');
    }

    override filename(fn: string) {
        if (process.platform === 'linux' || process.platform === 'darwin') {
            return 'Z:' + fn;
        }
        return super.filename(fn);
    }

    override async objdump(outputFilename: string, result, maxSize: number, intelAsm: boolean) {
        const dirPath = path.dirname(outputFilename);
        const execBinary = this.getExecutableFilename(dirPath);
        if (await utils.fileExists(execBinary)) {
            outputFilename = execBinary;
        } else {
            outputFilename = this.getOutputFilename(path.dirname(outputFilename));
        }

        let args = [...this.compiler.objdumperArgs, '-d', '-l', outputFilename];
        if (intelAsm) args = args.concat(['-M', 'intel']);
        return this.exec(this.compiler.objdumper, args, {maxOutput: 1024 * 1024 * 1024}).then(objResult => {
            if (objResult.code === 0) {
                result.asm = objResult.stdout;
            } else {
                result.asm = '<No output: objdump returned ' + objResult.code + '>';
            }

            return result;
        });
    }

    async saveDummyProjectFile(filename: string, unitName: string, unitPath: string) {
        // biome-ignore format: keep as-is for readability
        await fs.writeFile(
            filename,
            'program prog;\n' +
            'uses ' + unitName + ' in \'' + unitPath + '\';\n' +
            'begin\n' +
            'end.\n',
        );
    }

    override async writeAllFiles(dirPath: string, source: string, files: FiledataPair[]) {
        // Strip comment content to avoid highlighting commented code
        const cleanedSource = pascalUtils.stripComments(source);

        let inputFilename: string;
        if (pascalUtils.isProgram(source)) {
            // Use the program name from the source, like FPC does
            const progName = pascalUtils.getProgName(source);
            inputFilename = path.join(dirPath, progName + '.dpr');
        } else {
            const unitName = pascalUtils.getUnitname(source);
            if (unitName) {
                inputFilename = path.join(dirPath, unitName + '.pas');
            } else {
                inputFilename = path.join(dirPath, this.compileFilename);
            }
        }

        await fs.writeFile(inputFilename, cleanedSource);

        if (files && files.length > 0) {
            await this.writeMultipleFiles(files, dirPath);
        }

        return {
            inputFilename,
        };
    }

    override async runCompiler(
        compiler: string,
        options: string[],
        inputFilename: string,
        execOptions: ExecutionOptionsWithEnv,
    ) {
        if (!execOptions) {
            execOptions = this.getDefaultExecOptions();
        }

        const tempPath = path.dirname(inputFilename);
        const inputBasename = path.basename(inputFilename);
        const isDprFile = inputBasename.toLowerCase().endsWith('.dpr');

        let projectFile: string;
        let projectBaseName: string;

        if (isDprFile) {
            // Input is already a .dpr program file, compile it directly (like FPC does)
            projectFile = inputFilename;
            projectBaseName = inputBasename.replace(/\.dpr$/i, '');
            this.isWrapperProgram = false;
        } else {
            // Input is a .pas unit file, create a dummy prog.dpr project that uses it
            const unitFilepath = inputBasename;
            const unitName = unitFilepath.replace(/\.pas$/i, '');
            projectFile = path.join(tempPath, this.dprFilename);
            projectBaseName = 'prog';
            await this.saveDummyProjectFile(projectFile, unitName, unitFilepath);
            this.isWrapperProgram = true;
        }

        this.projectBaseName = projectBaseName;
        this.mapFilename = path.join(tempPath, projectBaseName + '.map');

        inputFilename = inputFilename.replaceAll('/', '\\');

        options.pop();

        options.unshift('-CC', '-W', '-H', '-GD', '-$D+', '-$L+', '-$O-', '-$W+', '-$C-', '-V', '-B');

        options.push(projectFile);
        execOptions.customCwd = tempPath;

        return this.exec(compiler, options, execOptions).then(result => {
            return {
                ...result,
                inputFilename,
                stdout: utils.parseOutput(result.stdout, inputFilename),
                stderr: utils.parseOutput(result.stderr, inputFilename),
            };
        });
    }

    override optionsForFilter(filters: ParseFiltersAndOutputOptions) {
        filters.binary = true;
        filters.dontMaskFilenames = true;
        filters.preProcessBinaryAsmLines = (asmLines: string[]) => {
            const mapFileReader = new MapFileReaderDelphi(unwrap(this.mapFilename));
            // If this is a wrapper program (unit case), exclude prog.dpr segments
            const excludedUnits = this.isWrapperProgram ? ['prog.dpr'] : [];
            const reconstructor = new PELabelReconstructor(
                asmLines,
                mapFileReader,
                new Set([PELabelReconstructorOptions.DeleteBeforeFirstSegment]),
                excludedUnits,
            );
            reconstructor.run('output');

            // Convert source line markers from /app/filename:line format to .loc directives
            const fileMap = new Map<string, number>();
            let fileCounter = 1;
            const result: string[] = [];
            let topLevelFileAdded = false;
            let firstFilename: string | null = null;

            for (const line of reconstructor.asmLines) {
                const sourceMatch = line.match(/^\/app\/(.+):(\d+)$/);
                if (sourceMatch) {
                    const filename = sourceMatch[1];
                    const lineNumber = sourceMatch[2];

                    // Skip line 0 markers - they indicate no line info available
                    // Let the previous source line continue instead of breaking highlighting
                    if (lineNumber === '0') {
                        continue;
                    }

                    // Track the first file we encounter
                    if (firstFilename === null) {
                        firstFilename = filename;
                    }

                    // Only use markers from the first file (skip wrapper prog.dpr if unit exists)
                    if (filename !== firstFilename) {
                        continue;
                    }

                    // Add top-level .file directive once at the very beginning (like FPC does)
                    if (!topLevelFileAdded) {
                        result.unshift(`\t.file "${filename}"`);
                        topLevelFileAdded = true;
                    }

                    // Get or assign file number for DWARF debug info
                    if (!fileMap.has(filename)) {
                        const fileNum = fileCounter++;
                        fileMap.set(filename, fileNum);
                        result.push(`\t.file ${fileNum} "${filename}"`);
                    }

                    const fileNum = fileMap.get(filename)!;
                    result.push(`\t.loc ${fileNum} ${lineNumber} 0`);
                } else {
                    result.push(line);
                }
            }

            // Truncate unmapped sections to max 5 lines
            return this.truncateUnmappedSections(result);
        };

        return [];
    }

    /**
     * Truncate sections with no source line mappings to max 5 lines
     * This removes large finalization/initialization blocks that have no debug info
     */
    truncateUnmappedSections(asmLines: string[]): string[] {
        const maxUnmappedLines = 5;
        const sourceMarkerRegex = /^\s*\.loc\s+/;
        const addressRegex = /^\s*[\da-f]+:/i;

        let lineIdx = 0;
        let unmappedCount = 0;
        let unmappedStartIdx = -1;

        while (lineIdx < asmLines.length) {
            const line = asmLines[lineIdx];

            if (sourceMarkerRegex.test(line)) {
                // Found a source marker - reset counter
                if (unmappedCount > maxUnmappedLines && unmappedStartIdx !== -1) {
                    // Delete excess unmapped lines
                    const deleteCount = unmappedCount - maxUnmappedLines;
                    asmLines.splice(unmappedStartIdx + maxUnmappedLines, deleteCount);
                    lineIdx -= deleteCount;
                }
                unmappedCount = 0;
                unmappedStartIdx = -1;
            } else if (addressRegex.test(line)) {
                // This is an assembly line with an address
                if (unmappedStartIdx === -1) {
                    unmappedStartIdx = lineIdx;
                }
                unmappedCount++;
            }

            lineIdx++;
        }

        // Handle trailing unmapped section
        if (unmappedCount > maxUnmappedLines && unmappedStartIdx !== -1) {
            const deleteCount = unmappedCount - maxUnmappedLines;
            asmLines.splice(unmappedStartIdx + maxUnmappedLines, deleteCount);
        }

        return asmLines;
    }
}
