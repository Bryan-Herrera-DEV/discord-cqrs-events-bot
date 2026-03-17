import { AuthorizationError, ValidationError } from "@shared/application/errors";

export class RoleAssignmentPolicy {
  public assertRoleChangeAllowed(params: {
    actorHighestRolePosition: number;
    targetHighestRolePosition: number;
    rolePosition: number;
    botHighestRolePosition: number;
    roleManagedByIntegration: boolean;
  }): void {
    if (params.roleManagedByIntegration) {
      throw new ValidationError("No se puede asignar o quitar un rol gestionado por integración");
    }

    if (params.rolePosition >= params.botHighestRolePosition) {
      throw new AuthorizationError(
        "No puedo gestionar este rol porque está por encima de mi jerarquía"
      );
    }

    if (params.rolePosition >= params.actorHighestRolePosition) {
      throw new AuthorizationError(
        "No puedes gestionar este rol porque está al mismo nivel o por encima de tu rol más alto"
      );
    }

    if (params.targetHighestRolePosition >= params.actorHighestRolePosition) {
      throw new AuthorizationError(
        "No puedes cambiar roles de un usuario con jerarquía igual o superior"
      );
    }
  }
}
