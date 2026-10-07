import * as migration_20261005_222004_initial from './20261005_222004_initial';

export const migrations = [
  {
    up: migration_20261005_222004_initial.up,
    down: migration_20261005_222004_initial.down,
    name: '20261005_222004_initial'
  },
];
