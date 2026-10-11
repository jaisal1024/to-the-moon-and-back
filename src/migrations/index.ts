import * as migration_20261005_222004_initial from './20261005_222004_initial';
import * as migration_20261005_222736_media from './20261005_222736_media';

export const migrations = [
  {
    up: migration_20261005_222004_initial.up,
    down: migration_20261005_222004_initial.down,
    name: '20261005_222004_initial',
  },
  {
    up: migration_20261005_222736_media.up,
    down: migration_20261005_222736_media.down,
    name: '20261005_222736_media'
  },
];
