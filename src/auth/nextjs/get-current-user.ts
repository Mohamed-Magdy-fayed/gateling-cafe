"use server"

import { cookies } from "next/headers"
import { getSessionFromCookie } from "../core/session"
import { cache } from "react"
import { redirect } from "next/navigation"
import type { PartialUser, SessionPayload } from "@/auth/nextjs/schemas"

function _getCurrentUser(options: {
  withFullSession: true
  redirectIfNotFound: true
}): Promise<SessionPayload>
function _getCurrentUser(options: {
  withFullSession: true
  redirectIfNotFound?: false
}): Promise<SessionPayload | null>
function _getCurrentUser(options: {
  withFullSession?: false
  redirectIfNotFound: true
}): Promise<PartialUser>
function _getCurrentUser(options?: {
  withFullSession?: false
  redirectIfNotFound?: false
}): Promise<PartialUser | null>
async function _getCurrentUser({
  withFullSession = false,
  redirectIfNotFound = false,
} = {}) {
  const session = await getSessionFromCookie(await cookies())

  if (session == null) {
    if (redirectIfNotFound) return redirect("/sign-in")
    return null
  }

  if (withFullSession) {
    return session
  }

  return session.user;
}

export const getCurrentUser = cache(_getCurrentUser)
