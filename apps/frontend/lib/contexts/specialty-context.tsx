"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";

export interface Specialty {
  id: number;
  name: string;
  rates: {
    iniciante: number;
    junior: number;
    pleno: number;
    senior: number;
  };
  activeNomades: number;
  status: "active" | "inactive";
  aiEnabled?: boolean;
  aiFixedValue?: number;
}

interface SpecialtyContextType {
  specialties: Specialty[];
  addSpecialty: (specialty: Specialty) => void;
  updateSpecialty: (id: number, specialty: Specialty) => void;
  deleteSpecialty: (id: number) => void;
  isLoading: boolean;
}

const SpecialtyContext = createContext<SpecialtyContextType | undefined>(
  undefined,
);

const initialSpecialties: Specialty[] = [
  {
    id: 1,
    name: "Design Gráfico",
    rates: { iniciante: 35, junior: 50, pleno: 75, senior: 120 },
    activeNomades: 12,
    status: "active",
    aiEnabled: true,
    aiFixedValue: 15.0,
  },
  {
    id: 2,
    name: "Copywriting",
    rates: { iniciante: 40, junior: 60, pleno: 85, senior: 130 },
    activeNomades: 8,
    status: "active",
    aiEnabled: true,
    aiFixedValue: 25.0,
  },
  {
    id: 3,
    name: "Social Media",
    rates: { iniciante: 30, junior: 45, pleno: 65, senior: 100 },
    activeNomades: 15,
    status: "active",
    aiEnabled: true,
    aiFixedValue: 10.0,
  },
  {
    id: 4,
    name: "Desenvolvimento Web",
    rates: { iniciante: 60, junior: 90, pleno: 130, senior: 200 },
    activeNomades: 6,
    status: "active",
    aiEnabled: false,
  },
  {
    id: 5,
    name: "Edição de Vídeo",
    rates: { iniciante: 45, junior: 65, pleno: 95, senior: 150 },
    activeNomades: 4,
    status: "active",
    aiEnabled: false,
  },
  {
    id: 6,
    name: "Tráfego Pago",
    rates: { iniciante: 25, junior: 40, pleno: 60, senior: 100 },
    activeNomades: 0,
    status: "active",
    aiEnabled: false,
  },
];

export function SpecialtyProvider({ children }: { children: ReactNode }) {
  const [specialties, setSpecialties] =
    useState<Specialty[]>(initialSpecialties);
  const [isLoading, setIsLoading] = useState(true);
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydration - Load specialties from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("allka-specialties");
    if (stored) {
      try {
        setSpecialties(JSON.parse(stored));
      } catch (e) {
        setSpecialties(initialSpecialties);
      }
    }
    setIsHydrated(true);
    setIsLoading(false);
  }, []);

  // Save to localStorage whenever specialties change (debounced)
  useEffect(() => {
    if (isHydrated && specialties.length > 0) {
      localStorage.setItem("allka-specialties", JSON.stringify(specialties));
    }
  }, [specialties, isHydrated]);

  const addSpecialty = useCallback((specialty: Specialty) => {
    setSpecialties((prev) => [...prev, specialty]);
  }, []);

  const updateSpecialty = useCallback((id: number, specialty: Specialty) => {
    setSpecialties((prev) => prev.map((s) => (s.id === id ? specialty : s)));
  }, []);

  const deleteSpecialty = useCallback((id: number) => {
    setSpecialties((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const value = useMemo(
    () => ({
      specialties,
      addSpecialty,
      updateSpecialty,
      deleteSpecialty,
      isLoading,
    }),
    [specialties, addSpecialty, updateSpecialty, deleteSpecialty, isLoading],
  );

  return (
    <SpecialtyContext.Provider value={value}>
      {children}
    </SpecialtyContext.Provider>
  );
}

export function useSpecialties() {
  const context = useContext(SpecialtyContext);
  if (context === undefined) {
    throw new Error("useSpecialties must be used within a SpecialtyProvider");
  }
  return context;
}

export function useSpecialty(id: number | string) {
  const { specialties } = useSpecialties();
  return useMemo(
    () => specialties.find((s) => s.id === Number(id)),
    [specialties, id],
  );
}
