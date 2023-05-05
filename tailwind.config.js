import * as colors from './src/colors';

/** @type {import('tailwindcss').Config} */

export const content = ['./src/**/*.{js,ts,jsx,tsx}'];
export const theme = {
  extend: {
    colors: {
      ...colors,
    },
  },
};
export const plugins = [];
