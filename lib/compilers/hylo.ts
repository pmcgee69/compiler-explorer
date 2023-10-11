import {BaseCompiler} from '../base-compiler.js';
import type {PreliminaryCompilerInfo} from '../../types/compiler.interfaces.js';
import type {ParseFiltersAndOutputOptions} from '../../types/features/filters.interfaces.js';

// TODO: remove this comment
// For reference, the basic behaviour of BaseCompiler is:
// - make a random temporary folder
// - save example.extension to the new folder, the full path to this is the inputFilename
// - the outputFilename is determined by the getOutputFilename() method
// - execute the compiler.exe with the arguments from OptionsForFilter() and adding inputFilename
// - be aware that the language class is only instanced once, so storing state is not possible

export class HyloCompiler extends BaseCompiler {
    static get key() {
        return 'hylo';
    }

    constructor(info: PreliminaryCompilerInfo, env) {
        super(info, env);
        // TODO: support LLVM IR view.
        // this.compiler.supportsIrView = true;
    }

    override optionsForFilter(
        filters: ParseFiltersAndOutputOptions,
        outputFilename: string,
        userOptions?: string[],
    ): string[] {
        if (filters.intel) {
            return ['--emit', 'intel-asm', '-o', this.filename(outputFilename)];
        } else {
            return ['-o', this.filename(outputFilename)];
        }
    }
}