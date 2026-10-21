export type ProjectLifecycleStatus = 'ACTIVE' | 'INACTIVE';

export function validateProjectStatusTransition(
  currentStatus: ProjectLifecycleStatus,
  targetStatus: ProjectLifecycleStatus
): boolean {
  if (currentStatus === targetStatus) {
    return true;
  }
  // No deletion option; projects only transition between ACTIVE and INACTIVE
  return (currentStatus === 'ACTIVE' && targetStatus === 'INACTIVE') ||
         (currentStatus === 'INACTIVE' && targetStatus === 'ACTIVE');
}

export function canRoleAccessProject(
  role: 'ADMIN' | 'STAFF' | 'CLIENT_LEADER' | 'CLIENT_VIEWER',
  projectStatus: ProjectLifecycleStatus,
  isAssigned: boolean = true
): { canView: boolean; canEdit: boolean } {
  // Admin retains full access to all projects (active + inactive)
  if (role === 'ADMIN') {
    return { canView: true, canEdit: true };
  }

  // Inactive project rules:
  if (projectStatus === 'INACTIVE') {
    if (role === 'STAFF') {
      // Staff retains read-only access to inactive projects
      return { canView: true, canEdit: false };
    }
    // Clients have zero access to inactive projects
    return { canView: false, canEdit: false };
  }

  // Active project rules:
  if (role === 'STAFF') {
    return { canView: isAssigned, canEdit: isAssigned };
  }

  // Clients must be explicitly assigned to the active project
  if (role === 'CLIENT_LEADER') {
    return { canView: isAssigned, canEdit: isAssigned };
  }

  if (role === 'CLIENT_VIEWER') {
    return { canView: isAssigned, canEdit: false };
  }

  return { canView: false, canEdit: false };
}
