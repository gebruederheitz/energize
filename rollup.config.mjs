import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';

function hybridBuild(entryPoint, targetDir, emitTypes = false) {
    const tsCompilerOptions = {
        outDir: targetDir,
    };

    if (emitTypes) {
        tsCompilerOptions.declaration = true;
        tsCompilerOptions.declarationDir = targetDir + '/types';
    }

    return [
        {
            input: entryPoint,
            output: {
                dir: targetDir,
                format: 'cjs',
                sourcemap: true,
            },
            plugins: [
                resolve(),
                typescript({
                    compilerOptions: tsCompilerOptions,
                }),
            ],
        },
        {
            input: entryPoint,
            output: {
                dir: targetDir + '/esm',
                format: 'module',
                sourcemap: true,
            },
            plugins: [
                resolve(),
                typescript({
                    compilerOptions: {
                        outDir: targetDir + '/esm',
                        declaration: false,
                        target: 'esnext',
                        module: 'esnext',
                    },
                }),
            ],
        },
    ];
}

export default [
    ...hybridBuild('src/index.ts', 'dist', true),
    ...hybridBuild('src/animations/index.ts', 'dist/animations'),
    // {
    //     input: 'src/index.ts',
    //     plugins: [
    //         typescript({
    //             compilerOptions: {
    //                 declaration: true,
    //                 emitDeclarationOnly: true,
    //
    //             }
    //         })
    //     ]
    // }
];
