import { $ } from 'bun'
import { build, type Options } from 'tsup'

const tsupConfig: Options = {
	entry: ['src/**/*.ts'],
	splitting: false,
	sourcemap: false,
	clean: true,
	bundle: false,
	minify: false
	// outExtension() {
	// 	return {
	// 		js: '.js'
	// 	}
	// }
} satisfies Options

await Promise.all([
	// ? tsup esm
	build({
		outDir: 'dist',
		format: 'esm',
		target: 'node20',
		cjsInterop: false,
		...tsupConfig
	}),
	// ? tsup cjs
	build({
		outDir: 'dist/cjs',
		format: 'cjs',
		target: 'node20',
		// dts: true,
		...tsupConfig
	})
])

// ? Fix mjs import
const glob = new Bun.Glob('./dist/**/*.mjs')

for await (const entry of glob.scan('.')) {
	const content = await Bun.file(entry).text()

	await Bun.write(
		entry,
		content
			.replace(
				// Named import
				/(import|export)\s*\{([a-zA-Z0-9_,\s$]*)\}\s*from\s*['"]([a-zA-Z0-9./-]*[./][a-zA-Z0-9./-]*)['"]/g,
				'$1{$2}from"$3.mjs"'
			)
			.replace(
				// Default import
				/(import|export) ([a-zA-Z0-9_$]+) from\s*['"]([a-zA-Z0-9./-]*[./][a-zA-Z0-9./-]*)['"]/g,
				'$1 $2 from"$3.mjs"'
			)
	)

	// await fs.writeFile(
	// 	entry,
	// 	(await fs.readFile(entry))
	// 		.toString()
	// 		.replaceAll(/require\("(.+)\.js"\);/g, 'require("$1.cjs");'),
	// );
}

await $`tsc --project tsconfig.dts.json`

await Bun.build({
	entrypoints: ['./src/index.ts'],
	outdir: './dist/bun',
	minify: {
		whitespace: true,
		syntax: true,
		identifiers: false
	},
	target: 'bun',
	sourcemap: 'external',
	external: [
		'@sinclair/typebox',
		'cookie',
		'fast-decode-uri-component',
		'memoirist'
	]
})

await Promise.all([
	$`cp dist/*.d.ts dist/cjs`,
	$`cp dist/ws/*.d.ts dist/cjs/ws/`
])

await $`cp dist/index*.d.ts dist/bun`

const fsMjs = Bun.file('dist/universal/fs.mjs')
const fsMjsContent = await fsMjs.text()
Bun.write(fsMjs, fsMjsContent.replace(`require("fs")`, `await import("fs")`))

process.exit()
