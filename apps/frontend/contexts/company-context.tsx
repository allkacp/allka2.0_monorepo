"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

export interface CompanyAgencyOption {
  id: number
  name: string
  type: "company" | "agency"
  role: string
  isActive: boolean
}

interface CompanyContextType {
  selectedCompany: CompanyAgencyOption | null
  companies: CompanyAgencyOption[]
  setSelectedCompany: (company: CompanyAgencyOption) => void
  addCompany: (company: CompanyAgencyOption) => void
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined)

const getInitialCompanies = (): CompanyAgencyOption[] => [
  {
    id: 1,
    name: "Acme Corporation",
    type: "company",
    role: "Admin",
    isActive: true,
  },
  {
    id: 2,
    name: "Tech Solutions Ltd",
    type: "company",
    role: "User",
    isActive: true,
  },
  {
    id: 3,
    name: "Creative Agency Pro",
    type: "agency",
    role: "Manager",
    isActive: true,
  },
  {
    id: 4,
    name: "Global Enterprises",
    type: "company",
    role: "Admin",
    isActive: true,
  },
  {
    id: 5,
    name: "Digital Marketing Hub",
    type: "agency",
    role: "User",
    isActive: true,
  },
]

export function CompanyProvider({ children }: { children: ReactNode }) {
  const initialCompanies = getInitialCompanies()
  const [selectedCompany, setSelectedCompanyState] = useState<CompanyAgencyOption | null>(initialCompanies[0])
  const [companies, setCompanies] = useState<CompanyAgencyOption[]>(initialCompanies)

  useEffect(() => {
    // Load selected company from localStorage after mount
    try {
      const storedCompany = localStorage.getItem("selectedCompany")
      if (storedCompany) {
        const parsed = JSON.parse(storedCompany)
        // Verify the stored company exists in the companies list
        const companyExists = companies.some((c) => c.id === parsed.id)
        if (companyExists) {
          setSelectedCompanyState(parsed)
        } else {
          // If stored company doesn't exist, keep default
          localStorage.setItem("selectedCompany", JSON.stringify(companies[0]))
        }
      } else {
        // Save default to localStorage
        localStorage.setItem("selectedCompany", JSON.stringify(companies[0]))
      }
    } catch (error) {
      console.error("Error loading selected company:", error)
      // Keep default if error occurs
      localStorage.setItem("selectedCompany", JSON.stringify(companies[0]))
    }
  }, [])

  const setSelectedCompany = (company: CompanyAgencyOption) => {
    setSelectedCompanyState(company)
    try {
      localStorage.setItem("selectedCompany", JSON.stringify(company))
      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent("companyChanged", { detail: company }))
    } catch (error) {
      console.error("Error saving selected company:", error)
    }
  }

  const addCompany = (company: CompanyAgencyOption) => {
    setCompanies((prev) => [...prev, company])
    // TODO: In production, this would make an API call to save the association
  }

  return (
    <CompanyContext.Provider
      value={{
        selectedCompany,
        companies,
        setSelectedCompany,
        addCompany,
      }}
    >
      {children}
    </CompanyContext.Provider>
  )
}

export function useCompany() {
  const context = useContext(CompanyContext)
  if (context === undefined) {
    throw new Error("useCompany must be used within a CompanyProvider")
  }
  return context
}
