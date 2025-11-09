import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Check, Share2, Plus, X, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { useTranslation } from "@/context/TranslationContext";

export function ShareMealPlan({ 
  mealPlanId, 
  userId, 
  mealPlanName, 
  collaborators = [] 
}: { 
  mealPlanId: string; 
  userId: string;
  mealPlanName: string;
  collaborators?: string[];
}) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const { translateUI } = useTranslation();
  const [currentCollaborators, setCurrentCollaborators] = useState<string[]>(collaborators);
  const [removing, setRemoving] = useState<string | null>(null);

  const shareUrl = `${window.location.origin}/shared-meal-plan/${mealPlanId}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: translateUI("Enlace copiado"),
        description: translateUI("El enlace para compartir se ha copiado al portapapeles."),
      });
    });
  };

  const handleShare = async () => {
    if (!email.trim()) {
      toast({
        title: translateUI("Email requerido"),
        description: translateUI("Por favor ingresa un email para compartir."),
        variant: "destructive",
      });
      return;
    }

    if (!email.includes('@') || !email.includes('.')) {
      toast({
        title: translateUI("Email inválido"),
        description: translateUI("Por favor ingresa un email válido."),
        variant: "destructive",
      });
      return;
    }

    setSharing(true);
    
    try {
      // Get current meal plan
      const { data: mealPlan, error: fetchError } = await supabase
        .from('meal_plans')
        .select('collaborators')
        .eq('id', mealPlanId)
        .single();

      if (fetchError) throw fetchError;

      const currentCollabs = mealPlan?.collaborators || [];
      
      // Check if email is already a collaborator
      if (currentCollabs.includes(email.trim())) {
        toast({
          title: translateUI("Ya es colaborador"),
          description: translateUI(`${email} ya tiene acceso a este plan de comidas.`),
          variant: "destructive",
        });
        setSharing(false);
        return;
      }

      // Add collaborator
      const { error: updateError } = await supabase
        .from('meal_plans')
        .update({ 
          collaborators: [...currentCollabs, email.trim()] 
        })
        .eq('id', mealPlanId);

      if (updateError) throw updateError;

      toast({
        title: translateUI("Compartido exitosamente"),
        description: translateUI(`Se compartió "${mealPlanName}" con ${email}`),
      });
      
      setCurrentCollaborators([...currentCollaborators, email.trim()]);
      setEmail("");
    } catch (error) {
      console.error("Error sharing meal plan:", error);
      toast({
        title: translateUI("Error"),
        description: translateUI("Ocurrió un error al compartir el plan de comidas."),
        variant: "destructive",
      });
    } finally {
      setSharing(false);
    }
  };

  const handleRemoveCollaborator = async (collaboratorEmail: string) => {
    setRemoving(collaboratorEmail);
    try {
      // Get current meal plan
      const { data: mealPlan, error: fetchError } = await supabase
        .from('meal_plans')
        .select('collaborators')
        .eq('id', mealPlanId)
        .single();

      if (fetchError) throw fetchError;

      const currentCollabs = mealPlan?.collaborators || [];
      const updatedCollabs = currentCollabs.filter((email: string) => email !== collaboratorEmail);

      // Update meal plan
      const { error: updateError } = await supabase
        .from('meal_plans')
        .update({ collaborators: updatedCollabs })
        .eq('id', mealPlanId);

      if (updateError) throw updateError;

      toast({
        title: translateUI("Colaborador eliminado"),
        description: translateUI(`Se eliminó a ${collaboratorEmail} del plan`),
      });
      
      setCurrentCollaborators(currentCollaborators.filter(email => email !== collaboratorEmail));
    } catch (error) {
      console.error("Error removing collaborator:", error);
      toast({
        title: translateUI("Error"),
        description: translateUI("No se pudo eliminar al colaborador"),
        variant: "destructive",
      });
    } finally {
      setRemoving(null);
    }
  };

  useEffect(() => {
    setCurrentCollaborators(collaborators);
  }, [collaborators]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Share2 className="h-4 w-4" />
          {translateUI("Compartir")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{translateUI("Compartir plan de comidas")}</DialogTitle>
          <DialogDescription>
            {translateUI("Cualquiera con el enlace puede ver tu plan. Agrega colaboradores por email para permitirles editar.")}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <div className="grid flex-1 gap-2">
              <Label htmlFor="link" className="sr-only">
                {translateUI("Enlace para compartir")}
              </Label>
              <Input
                id="link"
                readOnly
                className="font-mono text-sm"
                value={shareUrl}
              />
            </div>
            <Button 
              type="button" 
              size="icon" 
              variant={copied ? "secondary" : "outline"} 
              onClick={copyToClipboard}
            >
              {copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          
          {/* Current Collaborators */}
          {currentCollaborators.length > 0 && (
            <div className="border rounded-lg p-3 bg-muted/30">
              <Label className="text-sm font-semibold flex items-center gap-2 mb-3">
                <Users className="h-4 w-4" />
                {translateUI("Colaboradores Actuales")} ({currentCollaborators.length})
              </Label>
              <div className="space-y-2">
                {currentCollaborators.map((collaboratorEmail) => (
                  <div key={collaboratorEmail} className="flex items-center justify-between p-2 rounded-md bg-background border hover:bg-accent/50 transition-colors">
                    <span className="text-sm">{collaboratorEmail}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveCollaborator(collaboratorEmail)}
                      disabled={removing === collaboratorEmail}
                      className="h-7 w-7 p-0 hover:bg-destructive hover:text-destructive-foreground"
                      title={translateUI("Eliminar colaborador")}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div>
            <Label htmlFor="collaborator" className="text-xs text-muted-foreground">
              {translateUI("Agregar un colaborador con permisos de edición")}
            </Label>
            <div className="flex mt-1 space-x-2">
              <Input
                id="collaborator"
                placeholder={translateUI("Dirección de email")}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleShare()}
                className="flex-1"
              />
              <Button 
                type="button"
                onClick={handleShare}
                disabled={sharing}
              >
                {sharing ? (
                  <>
                    <Plus className="mr-2 h-4 w-4 animate-spin" />
                    {translateUI("Agregando...")}
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    {translateUI("Agregar")}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
        
        <DialogFooter className="sm:justify-start">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setOpen(false)}
          >
            {translateUI("Listo")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
