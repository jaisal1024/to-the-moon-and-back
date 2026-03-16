import { defineType } from 'sanity';

export default defineType({
  name: 'codeBlock',
  type: 'code',
  title: 'Code Block',
  options: {
    language: 'typescript',
    languageAlternatives: [
      { title: 'Typescript', value: 'typescript' },
      { title: 'Javascript', value: 'javascript' },
      { title: 'HTML', value: 'html' },
      { title: 'CSS', value: 'css' },
    ],
  },
});
