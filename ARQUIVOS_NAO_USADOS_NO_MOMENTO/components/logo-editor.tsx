
import type React from "react"

import { useState, useRef } from "react"
import { Camera, Upload, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

interface LogoEditorProps {
  currentLogo?: string
  onLogoChange: (file: File) => void
  className?: string
}

export function LogoEditor({ currentLogo, onLogoChange, className }: LogoEditorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith("image/")) {
      setSelectedFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSave = () => {
    if (selectedFile) {
      onLogoChange(selectedFile)
      setIsOpen(false)
      setPreview(null)
      setSelectedFile(null)
    }
  }

  const handleCancel = () => {
    setIsOpen(false)
    setPreview(null)
    setSelectedFile(null)
  }

  return (
    <>
      <div className={cn("relative group", className)}>
        <div className="w-20 h-20 rounded-xl overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
          {currentLogo ? (
            <img src={currentLogo || "/placeholder.svg"} alt="Logo" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white text-2xl font-bold">
              {/* Placeholder */}
            </div>
          )}
        </div>
        <button
          onClick={() => setIsOpen(true)}
          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center"
        >
          <Camera className="h-6 w-6 text-white" />
        </button>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Logotipo</DialogTitle>
            <DialogDescription>Faça upload de uma nova imagem para o logotipo da agência</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {preview ? (
              <div className="relative">
                <img
                  src={preview || "/placeholder.svg"}
                  alt="Preview"
                  className="w-full h-48 object-contain rounded-lg bg-gray-50"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setPreview(null)
                    setSelectedFile(null)
                  }}
                  className="absolute top-2 right-2 bg-white/90 hover:bg-white"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
              >
                <Upload className="h-10 w-10 mx-auto mb-3 text-gray-400" />
                <p className="text-sm font-medium text-gray-700 mb-1">Clique para selecionar uma imagem</p>
                <p className="text-xs text-gray-500">PNG, JPG ou SVG (máx. 2MB)</p>
              </div>
            )}

            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCancel}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={!selectedFile} className="bg-blue-600 hover:bg-blue-700">
              Salvar Logotipo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
