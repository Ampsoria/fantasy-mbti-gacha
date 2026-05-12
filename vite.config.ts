import { defineConfig } from 'vite'

export default defineConfig({
  // Use relative base path so that GitHub Pages hosted in a subfolder (e.g. username.github.io/FBTI/) 
  // will correctly load assets relative to the current directory instead of the root domain.
  base: './',
})
