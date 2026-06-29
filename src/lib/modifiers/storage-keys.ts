export const CONDITIONS_KEY = "mob.conditions.v1";

export function getHpKey(memberId: number) {
  return `party-stats:hp:${memberId}`;
}

export function getActiveInfusionsKey(memberId: number) {
  return `party-stats:active-infusions:${memberId}`;
}

export function getItemOverridesKey(memberId: number) {
  return `party-stats:item-overrides:${memberId}`;
}

export function getCustomItemsKey(memberId: number) {
  return `party-stats:custom-items:${memberId}`;
}

export function getArmorModelKey(memberId: number) {
  return `party-stats:armor-model:${memberId}`;
}

export function getTotemAspectsKey(memberId: number) {
  return `party-stats:totem-aspects:${memberId}`;
}

export function getRageKey(memberId: number) {
  return `party-stats:rage:${memberId}`;
}

export function getSlotsKey(memberId: number) {
  return `party-stats:slots:${memberId}`;
}

export function getResourcesKey(memberId: number) {
  return `party-stats:resources:${memberId}`;
}

export function getMetamagicKey(memberId: number) {
  return `party-stats:metamagic:${memberId}`;
}

export function getMasteriesKey(memberId: number) {
  return `party-stats:masteries:${memberId}`;
}

export function getInspirationKey(memberId: number) {
  return `party-stats:inspiration:${memberId}`;
}
