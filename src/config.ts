import fs from 'node:fs';
import path from 'node:path';

export type VaultConfig = {
  vaultRoot: string;
  folders: {
    people: string[];
    concepts: string[];
    meetings: string[];
    stubs: string[];
  };
  frontmatter: {
    peopleType: string;
    conceptType: string;
    meetingType: string;
  };
};

const defaultConfig: VaultConfig = {
  vaultRoot: '.',
  folders: {
    people: ['03-people'],
    concepts: ['02-concepts'],
    meetings: ['06-meetings'],
    stubs: ['99-stubs'],
  },
  frontmatter: {
    peopleType: 'person',
    conceptType: 'concept',
    meetingType: 'meeting-notes',
  },
};

export function loadConfig(root: string): VaultConfig {
  const configPath = path.join(root, 'vault.config.json');
  if (!fs.existsSync(configPath)) {
    return { ...defaultConfig, vaultRoot: root };
  }

  const raw = fs.readFileSync(configPath, 'utf8');
  const user = JSON.parse(raw) as Partial<VaultConfig>;

  return {
    ...defaultConfig,
    ...user,
    vaultRoot: path.resolve(root, user.vaultRoot ?? '.'),
    folders: {
      ...defaultConfig.folders,
      ...(user.folders ?? {}),
    },
    frontmatter: {
      ...defaultConfig.frontmatter,
      ...(user.frontmatter ?? {}),
    },
  };
}
