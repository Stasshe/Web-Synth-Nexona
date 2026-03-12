import * as esbuild from "esbuild";

await esbuild.build({
  entryPoints: ["src/audio/worklet/processor.ts"],
  bundle: true,
  outfile: "public/worklet/processor.js",
  format: "iife",
  target: "es2022",
  minify: false,
  sourcemap: true,
});

console.log("Worklet processor built → public/worklet/processor.js");

await esbuild.build({
  entryPoints: ["src/audio/worklet/recorderProcessor.ts"],
  bundle: true,
  outfile: "public/worklet/recorder.js",
  format: "iife",
  target: "es2022",
  minify: false,
  sourcemap: true,
});

console.log("Recorder processor built → public/worklet/recorder.js");
