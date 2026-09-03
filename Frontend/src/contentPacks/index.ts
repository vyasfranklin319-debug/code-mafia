import { ContentPack } from '../types/game';
import { jsTodoAppPack } from './jsTodoApp';
import { pythonInventoryApiPack } from './pythonInventoryApi';
import { jsAuthServicePack } from './jsAuthService';

export const allContentPacks: ContentPack[] = [
  jsTodoAppPack,
  pythonInventoryApiPack,
  jsAuthServicePack
];

export function getContentPackById(id: string): ContentPack {
  const found = allContentPacks.find(p => p.id === id);
  return found || jsTodoAppPack;
}
