import * as migration_20261013_163415_initial from './20261013_163415_initial';
import * as migration_20261013_232240_crm_funnels_forms from './20261013_232240_crm_funnels_forms';

export const migrations = [
  {
    up: migration_20261013_163415_initial.up,
    down: migration_20261013_163415_initial.down,
    name: '20261013_163415_initial',
  },
  {
    up: migration_20261013_232240_crm_funnels_forms.up,
    down: migration_20261013_232240_crm_funnels_forms.down,
    name: '20261013_232240_crm_funnels_forms'
  },
];
