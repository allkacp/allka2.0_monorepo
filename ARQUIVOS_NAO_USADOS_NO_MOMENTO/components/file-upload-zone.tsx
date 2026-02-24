
import type React from "react"

import { useState, useCallback } from "react"
import { Upload, X, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface FileUploadZoneProps {
  onFilesSelected: (files: File[]) => void
  accept?: string
  maxSize?: number
  multiple?: boolean
  className?: string
}

export function FileUploadZone({
  onFilesSelected,
  accept = ".pdf,.doc,.docx,.jpg,.jpeg,.png",
  maxSize = 10 * 1024 * 1024, // 10MB default
  multiple = true,
  className,
}: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)

      const files = Array.from(e.dataTransfer.files)
      const validFiles = files.filter((file) => file.size <= maxSize)

      if (validFiles.length > 0) {
        setSelectedFiles(validFiles)
        onFilesSelected(validFiles)
      }
    },
    [maxSize, onFilesSelected],
  )

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || [])
      const validFiles = files.filter((file) => file.size <= maxSize)

      if (validFiles.length > 0) {
        setSelectedFiles(validFiles)
        onFilesSelected(validFiles)
      }
    },
    [maxSize, onFilesSelected],
  )

  const removeFile = useCallback((index: number) => {
    setSelectedFiles((prev) => {
      const newFiles = prev.filter((_, i) => i !== index)
      return newFiles
    })
  }, [])

  return (
    <div className={cn("space-y-4", className)}>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200",
          isDragging
            ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
            : "border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600",
        )}
      >
        <Upload className={cn("h-10 w-10 mx-auto mb-4", isDragging ? "text-blue-500" : "text-gray-400")} />
        <p className="text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
          {isDragging ? "Solte os arquivos aqui" : "Arraste arquivos ou clique para selecionar"}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Formatos aceitos: PDF, DOC, DOCX, JPG, PNG (máx. {(maxSize / 1024 / 1024).toFixed(0)}MB)
        </p>
        <label htmlFor="file-upload">
          <Button type="button" variant="outline" className="cursor-pointer bg-transparent" asChild>
            <span>Selecionar Arquivos</span>
          </Button>
          <input
            id="file-upload"
            type="file"
            accept={accept}
            multiple={multiple}
            onChange={handleFileSelect}
            className="hidden"
          />
        </label>
      </div>

      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Arquivos selecionados ({selectedFiles.length})
          </p>
          {selectedFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800"
            >
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{file.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeFile(index)}
                className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
