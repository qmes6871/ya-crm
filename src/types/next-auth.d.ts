import "next-auth";

interface UserPermissions {
  dashboard: boolean;
  attendance: boolean;
  clients: boolean;
  projects: boolean;
  leads: boolean;
  tasks: boolean;
  documents: boolean;
  accounts: boolean;
  servers: boolean;
  settlements: boolean;
  revenue: boolean;
  obSales: boolean;
  settings: boolean;
}

declare module "next-auth" {
  interface User {
    id: string;
    role: string;
    permissions?: UserPermissions;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      image?: string;
      permissions?: UserPermissions;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    permissions?: UserPermissions;
  }
}
