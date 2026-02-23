
import { X, Key, Lock, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useState, useEffect } from "react"

interface User {
  id: string
  name: string
  email: string
  user_type: string
}

interface UserPasswordSlidePanelProps {
  open: boolean
  onClose: () => void
  user: User | null
}

export function UserPasswordSlidePanel({ open, onClose, user }: UserPasswordSlidePanelProps) {
  const [isClosing, setIsClosing] = useState(false)
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  useEffect(() => {
    if (!open) {
      setIsClosing(false)
      setNewPassword("")
      setConfirmPassword("")
      setShowPassword(false)
      setShowConfirm(false)
    }
  }, [open])

  const handleClose = () => {
    setIsClosing(true)
    setTimeout(() => {
      onClose()
    }, 300)
  }

  const handleSave = () => {
    if (newPassword !== confirmPassword) {
      alert("As senhas não coincidem!")
      return
    }
    if (newPassword.length < 8) {
      alert("A senha deve ter no mínimo 8 caracteres!")
      return
    }
    console.log("[v0] Resetting password for user:", user?.id)
    // Implement password reset logic here
    handleClose()
  }

  if (!open && !isClosing) return null
  if (!user) return null

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const getUserTypeColor = (type: string) => {
    if (!type) return "bg-gray-500"
    switch (type.toLowerCase()) {
      case "company":
        return "bg-blue-500"
      case "agency":
        return "bg-purple-500"
      case "nomade":
        return "bg-green-500"
      case "team_allka":
        return "bg-orange-500"
      case "partner":
        return "bg-pink-500"
      default:
        return "bg-gray-500"
    }
  }

  const passwordStrength = (password: string) => {
    if (password.length === 0) return { label: "", color: "" }
    if (password.length < 6) return { label: "Fraca", color: "text-red-600" }
    if (password.length < 10) return { label: "Média", color: "text-orange-600" }
    return { label: "Forte", color: "text-green-600" }
  }

  const strength = passwordStrength(newPassword)

  return (
    <>
      {/* // Smaller modal for password reset */}
      <div
        className={`fixed top-0 right-0 h-[calc(100%-32px)] w-[500px] bg-white shadow-2xl z-50 flex flex-col transition-transform duration-500 ease-out ${
          open && !isClosing ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header with brand theme */}
        <div className="flex items-center justify-between px-4 py-3 app-brand-header">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border-2 border-white">
              <AvatarFallback className={getUserTypeColor(user.user_type)}>{getInitials(user.name)}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-lg font-semibold">Redefinir Senha</h2>
              <p className="text-xs text-orange-100">{user.email}</p>
            </div>
          </div>
          <Button onClick={handleClose} size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-white/20">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="overflow-y-auto p-6">
          <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-lg p-6 border border-orange-200">
            <div className="flex items-center gap-2 mb-4">
              <Key className="h-5 w-5 text-orange-600" />
              <h3 className="text-base font-semibold text-gray-900">Nova Senha</h3>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="new_password" className="text-sm text-gray-700">
                  Nova Senha
                </Label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    id="new_password"
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="h-9 pl-9 pr-9"
                    placeholder="Digite a nova senha..."
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {newPassword && <p className={`text-xs mt-1 ${strength.color} font-medium`}>Força: {strength.label}</p>}
              </div>

              <div>
                <Label htmlFor="confirm_password" className="text-sm text-gray-700">
                  Confirmar Senha
                </Label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    id="confirm_password"
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="h-9 pl-9 pr-9"
                    placeholder="Confirme a nova senha..."
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-xs mt-1 text-red-600 font-medium">As senhas não coincidem</p>
                )}
              </div>

              <div className="bg-white rounded p-3 border border-orange-200">
                <p className="text-xs text-gray-600 leading-relaxed">
                  A nova senha será aplicada imediatamente e o usuário precisará utilizá-la no próximo login.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* // Save button footer */}
        <div className="border-t bg-gray-50 px-4 py-3 flex justify-end gap-2">
          <Button onClick={handleClose} variant="outline" size="sm">
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={!newPassword || !confirmPassword || newPassword !== confirmPassword}
            size="sm"
            className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
          >
            <Key className="h-4 w-4 mr-2" />
            Redefinir Senha
          </Button>
        </div>
      </div>
    </>
  )
}

export default UserPasswordSlidePanel
