// @ts-nocheck
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Bell, ArrowRight, X } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { SystemAlert } from "../types/admin-dashboard.types";

export const AlertsCenter = ({ alerts }: { alerts: SystemAlert[] }) => {
  const [dismissed, setDismissed] = useState<string[]>([]);

  if (alerts.length === 0 || dismissed.length === alerts.length) {
    return null;
  }

  const activeAlerts = alerts.filter((alert) => !dismissed.includes(alert.id));
  const highPriorityCount = activeAlerts.filter(
    (a) => a.severity === "high",
  ).length;

  const getSeverityColor = (severity: SystemAlert["severity"]) => {
    switch (severity) {
      case "high":
        return "text-red-700 bg-red-50 border-red-300";
      case "medium":
        return "text-amber-700 bg-amber-50 border-amber-300";
      case "low":
        return "text-blue-700 bg-blue-50 border-blue-300";
      default:
        return "text-blue-700 bg-blue-50 border-blue-300";
    }
  };

  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem
        value="alerts"
        className="border-2 border-red-300 bg-red-50 rounded-xl shadow-sm"
      >
        <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-red-100/50 rounded-t-xl transition-colors">
          <div className="flex items-center gap-3 w-full">
            <div className="p-2 rounded-lg bg-red-100">
              <Bell className="h-5 w-5 text-red-600" />
            </div>
            <div className="flex items-center justify-between flex-1">
              <div className="text-left">
                <h3 className="font-semibold text-red-800 flex items-center gap-2">
                  Alertas do Sistema
                  <Badge className="ml-2 bg-red-600 text-white hover:bg-red-700">
                    {activeAlerts.length}
                  </Badge>
                  {highPriorityCount > 0 && (
                    <span className="text-xs text-red-600 font-medium">
                      ({highPriorityCount} críticos)
                    </span>
                  )}
                </h3>
                <p className="text-xs text-red-600/80 mt-1">
                  Itens que requerem sua atenção imediata
                </p>
              </div>
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-4">
          <div className="space-y-2 pt-2">
            {activeAlerts.map((alert) => {
              const Icon = alert.icon;
              return (
                <div
                  key={alert.id}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border-2 transition-all shadow-sm hover:shadow-md",
                    getSeverityColor(alert.severity),
                  )}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{alert.title}</p>
                        <Badge variant="outline" className="text-xs">
                          {alert.count}
                        </Badge>
                      </div>
                      <p className="text-xs opacity-80 mt-0.5 line-clamp-1">
                        {alert.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link to={alert.link}>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1 text-xs"
                      >
                        Ver
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDismissed([...dismissed, alert.id])}
                      className="h-7 w-7 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};
