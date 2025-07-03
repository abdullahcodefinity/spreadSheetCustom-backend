import { AbilityBuilder, Ability } from '@casl/ability';

export const defineAbilityFor = (user) => {
  const { can, build } = new AbilityBuilder(Ability);

  // For SuperAdmin, allow all actions
  if (user.role === 'SuperAdmin') {
    can('manage', 'all');
    return build();
  }

  // For regular users, permissions are now sheet-specific
  // This will be handled in individual controllers by checking userSheet permissions
  return build();
};

export const hasPermission = (permissions, action, subject) => {
  return permissions.some(p => 
    p.action.toLowerCase() === action.toLowerCase() && 
    p.subject.toLowerCase() === subject.toLowerCase()
  );
}

// New function to check sheet-specific permissions
export const checkSheetPermission = async (prisma, userId, sheetId, permissionType) => {
  const userSheet = await prisma.userSheet.findFirst({
    where: {
      userId: userId,
      sheetId: sheetId
    },
    include: {
      permissions: true
    }
  });

  if (!userSheet) {
    return false;
  }

  return userSheet.permissions.some(p => p.type === permissionType);
};

// New function to get user's role for a specific sheet
export const getUserSheetRole = async (prisma, userId, sheetId) => {
  const userSheet = await prisma.userSheet.findFirst({
    where: {
      userId: userId,
      sheetId: sheetId
    }
  });

  return userSheet?.role || null;
};