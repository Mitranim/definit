'use strict'

const babel = require('@babel/core')
const del = require('del')
const fs = require('fs')

const SRC = 'definit.js'
const ES  = 'definit.es.js'
const CJS = 'definit.cjs.js'

const babelPlugins = [
  ['@babel/plugin-check-constants',         {loose: true}],
  ['@babel/plugin-transform-block-scoping', {loose: true}],
]

const cjsBabelPlugins = [
  ...babelPlugins,
  ['@babel/plugin-transform-modules-commonjs', {strict: true, noInterop: true}],
]

function main() {
  const cmd = process.argv[2]
  if (!cmd) {
    build()
  }
  else if (cmd === 'watch') {
    watch()
    buildOrReport()
  }
  else {
    throw Error(`Unrecognized command: ${cmd}`)
  }
}

function clear() {
  del.sync(ES)
  del.sync(CJS)
}

function build() {
  clear()
  const t0 = Date.now()

  const {code: esCode} = babel.transformFileSync(SRC, {plugins: babelPlugins})
  fs.writeFileSync(ES, esCode)

  const {code: cjsCode} = babel.transform(esCode, {plugins: cjsBabelPlugins})
  fs.writeFileSync(CJS, cjsCode)

  const t1 = Date.now()
  console.info(`Built in ${t1 - t0}ms`)
}

function watch() {
  fs.watch(SRC, buildOrReport)
}

function buildOrReport() {
  try {
    build()
  }
  catch (err) {
    console.error(err)
  }
}

main()
