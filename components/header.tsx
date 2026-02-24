
import { Search, Bell, Menu, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { useState, useEffect } from "react"
import { useAccountType } from "@/contexts/account-type-context"
import { useSidebar } from "@/contexts/sidebar-context"

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchFocused, setSearchFocused] = useState(false)
  const [notificationListOpen, setNotificationListOpen] = useState(false)
  const [simulatedUser, setSimulatedUser] = useState<any>(null)
  const { unlockAccountType } = useAccountType()
  const { userProfile } = useSidebar()

  useEffect(() => {
    const storedUser = localStorage.getItem("simulatedUser")
    if (storedUser) {
      setSimulatedUser(JSON.parse(storedUser))
    }

    const handleStorageChange = () => {
      const updatedUser = localStorage.getItem("simulatedUser")
      if (updatedUser) {
        setSimulatedUser(JSON.parse(updatedUser))
      } else {
        setSimulatedUser(null)
      }
    }

    window.addEventListener("storage", handleStorageChange)
    window.addEventListener("simulationCreated", handleStorageChange)

    return () => {
      window.removeEventListener("storage", handleStorageChange)
      window.removeEventListener("simulationCreated", handleStorageChange)
    }
  }, [])

  const handleClearSimulation = () => {
    localStorage.removeItem("simulatedUser")
    unlockAccountType()
    setSimulatedUser(null)
    window.location.reload()
  }

  const handleLogout = () => {
    localStorage.removeItem("simulatedUser")
    unlockAccountType()
    setSimulatedUser(null)
    window.location.reload()
  }

  const toggleMobileSidebar = () => {
    const sidebar = document.getElementById("mobile-sidebar")
    const overlay = document.getElementById("sidebar-overlay")

    if (sidebar && overlay) {
      if (mobileMenuOpen) {
        sidebar.classList.add("-translate-x-full")
        overlay.classList.add("hidden")
      } else {
        sidebar.classList.remove("-translate-x-full")
        overlay.classList.remove("hidden")
      }
      setMobileMenuOpen(!mobileMenuOpen)
    }
  }

  useEffect(() => {
    const overlay = document.getElementById("sidebar-overlay")
    if (overlay) {
      overlay.addEventListener("click", () => {
        toggleMobileSidebar()
      })
    }
  }, [])

  const getUserInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const getAccountTypeLabel = (accountType: string, accountSubType: string | null) => {
    if (accountType === "empresas") {
      return accountSubType === "in-house" ? "In-House" : "Company"
    }
    if (accountType === "agencias") return "Agency"
    if (accountType === "nomades") return "Nomad"
    if (accountType === "admin") return "Admin"
    return "User"
  }

  const displayName = simulatedUser?.name || userProfile.name || "João Silva"
  const displayType = simulatedUser
    ? getAccountTypeLabel(simulatedUser.accountType, simulatedUser.accountSubType)
    : "Agency"
  const displayInitials = getUserInitials(displayName)
  const displayAvatar = simulatedUser?.avatar || userProfile.avatar || "/placeholder.svg?height=32&width=32"

  return (
    <>
      <header className="border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-3 sm:py-4 relative z-40 bg-slate-50 dark:bg-black transition-colors duration-200 overflow-visible">
        <div className="flex items-center justify-between overflow-visible">
          <div className="flex items-center flex-1 space-x-3">
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden p-2 dark:text-white dark:hover:bg-slate-800"
              onClick={toggleMobileSidebar}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>

            <div
              className={`flex-1 transition-all duration-200 ${searchFocused ? "max-w-none" : "max-w-xs sm:max-w-lg"}`}
            >
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-400 h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Buscar..."
                  className="pl-10 bg-gray-50 dark:bg-slate-900 dark:text-white border-gray-200 dark:border-gray-700 text-sm placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-4">
            <Button
              variant="ghost"
              size="sm"
              className="relative p-2 dark:text-white dark:hover:bg-slate-800"
              onClick={() => setNotificationListOpen(true)}
            >
              <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
              <Badge className="absolute -top-1 -right-1 h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center p-0 bg-red-500 text-white text-xs">
                2
              </Badge>
            </Button>

            <Button
              variant="ghost"
              className="flex items-center space-x-2 sm:space-x-3 p-1 sm:p-2 h-auto dark:text-white dark:hover:bg-slate-800"
            >
              <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
                <AvatarImage src={displayAvatar.startsWith("data:") ? displayAvatar : undefined} />
                <AvatarFallback className="bg-gradient-to-br from-blue-600 to-purple-600 text-white font-semibold">
                  {displayAvatar.length <= 2 ? displayAvatar : displayInitials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium dark:text-white">{displayName}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{displayType}</p>
              </div>
            </Button>
          </div>
        </div>
      </header>

    </>
  )
}
