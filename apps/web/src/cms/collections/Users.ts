import type { CollectionConfig } from 'payload'
import { isAdmin, isAdminField, ROLES } from '../access/roles'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: { useAsTitle: 'email', group: 'Settings', defaultColumns: ['email', 'name', 'roles'] },
  auth: {
    maxLoginAttempts: 5,
    lockTime: 15 * 60 * 1000,
    tokenExpiration: 8 * 60 * 60,
  },
  access: {
    read: ({ req }) =>
      isAdmin({ req }) ? true : req.user ? { id: { equals: req.user.id } } : false,
    create: isAdmin,
    update: ({ req }) =>
      isAdmin({ req }) ? true : req.user ? { id: { equals: req.user.id } } : false,
    delete: isAdmin,
  },
  fields: [
    { name: 'name', type: 'text' },
    {
      name: 'roles',
      type: 'select',
      hasMany: true,
      required: true,
      defaultValue: ['marketer'],
      options: ROLES.map((r) => ({ label: r[0]!.toUpperCase() + r.slice(1), value: r })),
      saveToJWT: true,
      access: { update: isAdminField, create: isAdminField },
    },
  ],
}
