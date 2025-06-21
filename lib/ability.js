import { AbilityBuilder, Ability } from '@casl/ability';

export const defineAbilityFor = (user) => {
  const { can, build } = new AbilityBuilder(Ability);

  user.permissions.forEach((p) => {
    can(p.action, p.subject);
  });

  return build();
};
