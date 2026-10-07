import * as migration_20261005_222004_initial from './20261005_222004_initial';
import * as migration_20261005_222736_media from './20261005_222736_media';
import * as migration_20261005_222904_collections from './20261005_222904_collections';
import * as migration_20261005_223303_posts from './20261005_223303_posts';

export const migrations = [
  {
    up: migration_20261005_222004_initial.up,
    down: migration_20261005_222004_initial.down,
    name: '20261005_222004_initial',
  },
  {
    up: migration_20261005_222736_media.up,
    down: migration_20261005_222736_media.down,
    name: '20261005_222736_media',
  },
  {
    up: migration_20261005_222904_collections.up,
    down: migration_20261005_222904_collections.down,
    name: '20261005_222904_collections',
  },
  {
    up: migration_20261005_223303_posts.up,
    down: migration_20261005_223303_posts.down,
    name: '20261005_223303_posts'
  },
];
