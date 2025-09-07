import UserRoles from '../components/UserRoles'
import { PermissionDebugger } from '../components/RoleBasedAccess'

export default function UserRolesPage() {
  return (
    <div>
      <UserRoles />
      <PermissionDebugger />
    </div>
  )
}