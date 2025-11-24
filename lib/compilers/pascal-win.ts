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
import {PELabelReconstructor} from '../pe32-support.js';
import * as utils from '../utils.js';

import * as pascalUtils from './pascal-utils.js';

export class PascalWinCompiler extends BaseCompiler {
    static get key() {
        return 'pascal-win';
    }

    mapFilename: string | null;
    dprFilename: string;
    projectBaseName: string;

    constructor(info: PreliminaryCompilerInfo, env: CompilationEnvironment) {
        super(info, env);
        info.supportsFiltersInBinary = true;

        this.mapFilename = null;
        this.compileFilename = 'output.pas';
        this.dprFilename = 'prog.dpr';
        this.projectBaseName = 'prog';
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

        await fs.writeFile(inputFilename, source);

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
        } else {
            // Input is a .pas unit file, create a dummy prog.dpr project that uses it
            const unitFilepath = inputBasename;
            const unitName = unitFilepath.replace(/\.pas$/i, '');
            projectFile = path.join(tempPath, this.dprFilename);
            projectBaseName = 'prog';
            await this.saveDummyProjectFile(projectFile, unitName, unitFilepath);
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
            const reconstructor = new PELabelReconstructor(asmLines, false, mapFileReader, false);
            reconstructor.run('output');

            console.log(`[Delphi] Map file: ${this.mapFilename}`);
            console.log(`[Delphi] Working directory: ${path.dirname(unwrap(this.mapFilename))}`);

            // Convert source line markers from /app/filename:line format to .loc directives
            const fileMap = new Map<string, number>();
            let fileCounter = 1;
            const result: string[] = [];
            let foundSourceLines = 0;
            let topLevelFileAdded = false;

            for (const line of reconstructor.asmLines) {
                const sourceMatch = line.match(/^\/app\/(.+):(\d+)$/);
                if (sourceMatch) {
                    foundSourceLines++;
                    const filename = sourceMatch[1];
                    const lineNumber = sourceMatch[2];

                    // Skip line 0 markers - they indicate no line info available
                    // Let the previous source line continue instead of breaking highlighting
                    if (lineNumber === '0') {
                        continue;
                    }

                    // Log first few matches for debugging
                    if (foundSourceLines <= 5) {
                        console.log(`[Delphi] Source marker ${foundSourceLines}: file="${filename}" line=${lineNumber}`);
                    }

                    // Add top-level .file directive once at the very beginning (like FPC does)
                    if (!topLevelFileAdded) {
                        const topLevelFile = `\t.file "${filename}"`;
                        result.unshift(topLevelFile);
                        console.log(`[Delphi] Added top-level .file directive: ${topLevelFile}`);
                        topLevelFileAdded = true;
                    }

                    // Get or assign file number for DWARF debug info
                    if (!fileMap.has(filename)) {
                        const fileNum = fileCounter++;
                        fileMap.set(filename, fileNum);
                        const fileDirective = `\t.file ${fileNum} "${filename}"`;
                        result.push(fileDirective);
                        console.log(`[Delphi] Added numbered .file directive: ${fileDirective}`);
                    }

                    const fileNum = fileMap.get(filename)!;
                    const locDirective = `\t.loc ${fileNum} ${lineNumber} 0`;
                    result.push(locDirective);

                    // Log first few .loc directives
                    if (foundSourceLines <= 10) {
                        console.log(`[Delphi] .loc directive: ${locDirective}`);
                    }
                } else {
                    result.push(line);
                }
            }

            console.log(`[Delphi] Processed ${reconstructor.asmLines.length} lines, found ${foundSourceLines} source markers, converted to .loc directives`);
            console.log(`[Delphi] First 20 lines of processed assembly:`);
            for (let i = 0; i < Math.min(20, result.length); i++) {
                console.log(`[Delphi]   ${i}: ${result[i]}`);
            }
            return result;
        };

        return [];
    }
}
