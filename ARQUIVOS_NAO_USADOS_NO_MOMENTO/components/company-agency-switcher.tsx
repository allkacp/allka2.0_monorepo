
import { useState, useEffect } from "react"
import { Building2, ChevronDown, Check, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useCompany } from "@/contexts/company-context"

interface CompanyAgencySwitcherProps {
  onAddNew?: () => void
}

export function CompanyAgencySwitcher({ onAddNew }: CompanyAgencySwitcherProps) {
  const { selectedCompany, companies, setSelectedCompany } = useCompany()
  const [isMounted, setIsMounted] = useState(false)

  // Ensure proper hydration - only render after client-side mount
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Handle company selection with localStorage persistence
  const handleSwitch = (option: any) => {
    setSelectedCompany(option)
  }

  // Don't render until mounted to avoid hydration mismatch
  if (!isMounted) {
    return (
      <Button
        variant="outline"
        disabled
        className="flex items-center space-x-2 h-9 px-3 bg-white hover:bg-gray-50 border-gray-200"
      >
        <Building2 className="h-4 w-4 text-gray-600" />
        <div className="flex flex-col items-start">
          <span className="text-sm font-medium text-gray-900 leading-none">Carregando...</span>
        </div>
      </Button>
    )
  }

  // Check if company data is available
  if (!selectedCompany || companies.length === 0) {
    return (
      <Button
        variant="outline"
        disabled
        className="flex items-center space-x-2 h-9 px-3 bg-white hover:bg-gray-50 border-gray-200"
      >
        <Building2 className="h-4 w-4 text-gray-600" />
        <div className="flex flex-col items-start">
          <span className="text-sm font-medium text-gray-900 leading-none">Sem empresas</span>
        </div>
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="flex items-center space-x-2 h-9 px-3 bg-white hover:bg-gray-50 border-gray-200"
        >
          <Building2 className="h-4 w-4 text-gray-600" />
          <div className="flex flex-col items-start">
            <span className="text-sm font-medium text-gray-900 leading-none">{selectedCompany.name}</span>
            <span className="text-xs text-gray-500 leading-none mt-0.5">
              {selectedCompany.type === "company" ? "Empresa" : "Agência"}
            </span>
          </div>
          <ChevronDown className="h-4 w-4 text-gray-400 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuPortal>
        <DropdownMenuContent align="start" className="w-[280px] z-[9999]" sideOffset={8}>
          <DropdownMenuLabel className="text-xs font-semibold text-gray-500 uppercase">
            Suas Organizações
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          {companies.map((option) => (
            <DropdownMenuItem
              key={option.id}
              onClick={() => handleSwitch(option)}
              className={cn(
                "flex items-center justify-between py-2.5 cursor-pointer",
                selectedCompany.id === option.id && "bg-blue-50",
              )}
            >
              <div className="flex items-center space-x-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
                  <Building2 className="h-4 w-4 text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-900">{option.name}</span>
                  <div className="flex items-center space-x-2 mt-0.5">
                    <Badge
                      variant="secondary"
                      className={cn(
                        "text-xs px-1.5 py-0",
                        option.type === "company" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700",
                      )}
                    >
                      {option.type === "company" ? "Empresa" : "Agência"}
                    </Badge>
                    <span className="text-xs text-gray-500">{option.role}</span>
                  </div>
                </div>
              </div>
              {selectedCompany.id === option.id && <Check className="h-4 w-4 text-blue-600" />}
            </DropdownMenuItem>
          ))}

          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => onAddNew?.()}
            className="flex items-center space-x-2 py-2.5 cursor-pointer text-blue-600 hover:text-blue-700 hover:bg-blue-50"
          >
            <Plus className="h-4 w-4" />
            <span className="text-sm font-medium">Adicionar Organização</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </DropdownMenu>
  )
}
