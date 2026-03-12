"use client"

import type { UserRole, Permission, AccountType, AccountSubType } from "@/types/user"
import { useState, useEffect } from "react"

export function useUserPermissions() {
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>("company_user")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // In a real app, this would fetch the current user's role from context or API
    // For now, we'll simulate getting the user role
    const fetchUserRole = async () => {
      try {
        // This would typically come from your auth context or API
        // For demo purposes, we'll use a default role
        const role: UserRole = "company_admin" // This should come from your auth system
        setCurrentUserRole(role)
      } catch (error) {
        console.error("Failed to fetch user role:", error)
        setCurrentUserRole("company_user") // fallback to most restrictive role
      } finally {
        setLoading(false)
      }
    }

    fetchUserRole()
  }, [])

  return {
    currentUserRole,
    loading,
    hasPermission: (permission: Permission) => hasPermission(currentUserRole, permission),
    getUserPermissions: () => getUserPermissions(currentUserRole),
  }
}

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  company_admin: [
    "view_projects",
    "create_projects",
    "edit_projects",
    "cancel_projects",
    "view_catalog",
    "purchase_services",
    "manage_users",
    "view_payments",
    "manage_payments",
    "approve_deliveries",
    "access_ai_knowledge",
    "edit_ai_knowledge",
    "view_analytics",
  ],
  company_user: [
    "view_projects",
    "view_catalog",
    "view_payments",
    "approve_deliveries",
    "access_ai_knowledge",
    "view_analytics",
  ],
  agency_admin: [
    "view_projects",
    "create_projects",
    "edit_projects",
    "cancel_projects",
    "view_catalog",
    "purchase_services",
    "manage_users",
    "view_payments",
    "manage_payments",
    "approve_deliveries",
    "access_ai_knowledge",
    "edit_ai_knowledge",
    "view_analytics",
  ],
  agency_user: [
    "view_projects",
    "create_projects",
    "edit_projects",
    "view_catalog",
    "purchase_services",
    "view_payments",
    "approve_deliveries",
    "access_ai_knowledge",
    "view_analytics",
  ],
  nomad: ["view_projects", "view_analytics"],
  admin: [
    "view_projects",
    "create_projects",
    "edit_projects",
    "cancel_projects",
    "view_catalog",
    "purchase_services",
    "manage_users",
    "view_payments",
    "manage_payments",
    "approve_deliveries",
    "access_ai_knowledge",
    "edit_ai_knowledge",
    "view_analytics",
    "admin_access",
  ],
  partner: [
    "view_partner_dashboard",
    "request_withdrawal",
    "view_analytics",
  ],
}

export function getUserPermissions(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] || []
}

export function hasPermission(userRole: UserRole, permission: Permission): boolean {
  const permissions = getUserPermissions(userRole)
  return permissions.includes(permission)
}

export function getAccountAccess(accountType: AccountType, accountSubType: AccountSubType | null) {
  if (accountType === "empresas") {
    if (accountSubType === "in-house") {
      return {
        catalogAccess: "full",
        pricing: "full_price",
        language: "enterprise",
        features: ["full_catalog", "direct_contracting", "priority_support"],
      }
    } else {
      return {
        catalogAccess: "limited",
        pricing: "discounted",
        language: "company",
        features: ["project_based", "agency_managed", "approval_workflow"],
      }
    }
  }

  if (accountType === "agencias") {
    return {
      catalogAccess: "full",
      pricing: "agency_discount",
      language: "agency",
      features: ["client_management", "project_creation", "commission_tracking"],
    }
  }

  return {
    catalogAccess: "none",
    pricing: "standard",
    language: "default",
    features: [],
  }
}

export function checkAccountStatus(lastProjectDate?: string): boolean {
  if (!lastProjectDate) return false

  const lastProject = new Date(lastProjectDate)
  const now = new Date()
  const daysDiff = Math.floor((now.getTime() - lastProject.getTime()) / (1000 * 60 * 60 * 24))

  return daysDiff <= 90 // Active if last project was within 90 days
}
