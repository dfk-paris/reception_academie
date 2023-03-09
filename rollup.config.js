import {nodeResolve} from '@rollup/plugin-node-resolve'

import riot from 'rollup-plugin-riot'
import commonjs from '@rollup/plugin-commonjs'

import dotenv from "rollup-plugin-dotenv"

const NODE_ENV = process.env['NODE_ENV'] || 'development'
const optimize = (NODE_ENV == 'production')
// console.log(NODE_ENV, optimize)

const app = {
  input: 'frontend/app.js',
  output: {
    file: 'public/app.js',
    format: optimize ? 'iife' : 'esm',
    sourcemap: true
  },
  plugins: [
    dotenv(),
    nodeResolve(),
    commonjs(),
    riot()
  ]
}

const database = {
  input: 'frontend/database.js',
  output: {
    file: 'public/database.js',
    format: optimize ? 'iife' : 'esm',
    sourcemap: !optimize
  },
  plugins: [
    dotenv(),
    nodeResolve(),
    commonjs()
  ]
}

export default [app, database]
