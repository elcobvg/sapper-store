import commonjs from 'rollup-plugin-commonjs';
import resolve from 'rollup-plugin-node-resolve';

import pkg from './package.json';

const name = 'sapperStore';

export default [
  {
    input: 'src/store.js',
    output: {
      file: 'dist/index.js',
      format: 'umd',
      name
    },
    plugins: [
      resolve({
        jsnext: true,
        main: true
      }),
      commonjs()
    ]
  }
]
