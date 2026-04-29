export type EntityId = string | number

export interface StudioUser {
  id?: EntityId
  _id?: EntityId
  userId?: string
  email?: string
  username?: string
  roles?: string[]
  createdAt?: string
  updatedAt?: string
}

export interface LoginCredentials {
  userId: string
  password: string
}

export interface MessageRecord {
  id?: EntityId
  _id?: EntityId
  text: string
  userId?: string
  createdAt: string
}

export interface ServiceListResult<T> {
  data?: T[]
  total?: number
  limit?: number
  skip?: number
}
