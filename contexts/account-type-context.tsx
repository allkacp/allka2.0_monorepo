"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

export type AccountType = "empresas" | "agencias" | "nomades" | "admin" | "parceiro"
export type AccountSubType = "company" | "in-house" | null

interface AccountTypeContextType {
  accountType: AccountType
  accountSubType: AccountSubType
  setAccountType: (type: AccountType, subType?: AccountSubType) => void
  isLocked: boolean
  lockAccountType: () => void
  unlockAccountType: () => void
}

const AccountTypeContext = createContext<AccountTypeContextType | undefined>(undefined)

export function AccountTypeProvider({ children }: { children: ReactNode }) {
  const [accountType, setAccountTypeState] = useState<AccountType>("admin")
  const [accountSubType, setAccountSubType] = useState<AccountSubType>(null)
  const [isLocked, setIsLocked] = useState(false)

  useEffect(() => {
    const storedUser = localStorage.getItem("simulatedUser")
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser)
        if (user.accountType) {
          setAccountTypeState(user.accountType)
          setAccountSubType(user.accountSubType || null)
          // This allows switching between account types during testing
        }
      } catch (error) {
        console.error("Error loading stored user:", error)
      }
    }
  }, [])

  const setAccountType = (type: AccountType, subType: AccountSubType = null) => {
    setAccountTypeState(type)
    setAccountSubType(subType)

    const storedUser = localStorage.getItem("simulatedUser")
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser)
        user.accountType = type
        user.accountSubType = subType
        localStorage.setItem("simulatedUser", JSON.stringify(user))
      } catch (error) {
        console.error("Error updating stored user:", error)
      }
    }
  }

  const lockAccountType = () => {
    setIsLocked(true)
  }

  const unlockAccountType = () => {
    setIsLocked(false)
  }

  return (
    <AccountTypeContext.Provider
      value={{
        accountType,
        accountSubType,
        setAccountType,
        isLocked,
        lockAccountType,
        unlockAccountType,
      }}
    >
      {children}
    </AccountTypeContext.Provider>
  )
}

export function useAccountType() {
  const context = useContext(AccountTypeContext)
  if (context === undefined) {
    throw new Error("useAccountType must be used within an AccountTypeProvider")
  }
  return context
}
