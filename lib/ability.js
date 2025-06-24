import { AbilityBuilder, Ability } from '@casl/ability';

export const defineAbilityFor = (user) => {
  const { can, build } = new AbilityBuilder(Ability);

  user.permissions.forEach((p) => {
    can(p.action, p.subject);
  });

  return build();
};

export const hasPermission=(permissions, action, subject) => {
  return permissions.some(p => 
    p.action.toLowerCase() === action.toLowerCase() && 
    p.subject.toLowerCase() === subject.toLowerCase()
  );
}