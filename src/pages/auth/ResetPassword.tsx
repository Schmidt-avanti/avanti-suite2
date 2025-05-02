
import React, { useState, useEffect } from 'react';
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { supabase } from "@/integrations/supabase/client";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const passwordResetSchema = z.object({
  password: z.string()
    .min(8, "Das Passwort muss mindestens 8 Zeichen lang sein")
    .regex(/[A-Z]/, "Das Passwort muss mindestens einen Großbuchstaben enthalten")
    .regex(/[a-z]/, "Das Passwort muss mindestens einen Kleinbuchstaben enthalten")
    .regex(/[0-9]/, "Das Passwort muss mindestens eine Zahl enthalten")
    .regex(/[^a-zA-Z0-9]/, "Das Passwort muss mindestens ein Sonderzeichen enthalten"),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwörter stimmen nicht überein",
  path: ["confirmPassword"]
});

const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasTokenError, setHasTokenError] = useState(false);

  // Get token from URL - check both query param and hash fragment
  const tokenFromParams = searchParams.get('token') || "";
  const [tokenFromHash, setTokenFromHash] = useState<string>("");
  
  useEffect(() => {
    // Extract token from hash if present (e.g. #access_token=xxx)
    const hash = location.hash;
    if (hash && hash.includes('access_token=')) {
      const hashParams = new URLSearchParams(hash.substring(1));
      setTokenFromHash(hashParams.get('access_token') || "");
    }
    
    // Check for error in hash
    if (hash && hash.includes('error=')) {
      setHasTokenError(true);
      const hashParams = new URLSearchParams(hash.substring(1));
      const errorMsg = hashParams.get('error_description') || "Der Link ist ungültig oder abgelaufen.";
      
      toast({
        variant: "destructive",
        title: "Ungültiger Link",
        description: errorMsg.replace(/\+/g, ' ')
      });
    }
  }, [location.hash, toast]);
  
  // Use the token from either source
  const token = tokenFromHash || tokenFromParams;

  useEffect(() => {
    if (!token && !location.hash.includes('access_token=')) {
      setHasTokenError(true);
      toast({
        variant: "destructive",
        title: "Ungültiger Link",
        description: "Der Passwort-Reset-Link ist ungültig oder abgelaufen."
      });
    }
  }, [token, location.hash, toast]);

  const form = useForm<z.infer<typeof passwordResetSchema>>({
    resolver: zodResolver(passwordResetSchema),
    defaultValues: {
      password: "",
      confirmPassword: ""
    },
  });

  const onSubmit = async (values: z.infer<typeof passwordResetSchema>) => {
    if (!token) {
      toast({
        variant: "destructive",
        title: "Ungültiger Link",
        description: "Der Passwort-Reset-Link ist ungültig oder abgelaufen."
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Use updateUser with the new password (the token is in the URL or cookies already)
      const { error } = await supabase.auth.updateUser({ 
        password: values.password 
      });

      if (error) throw error;

      toast({
        title: "Passwort zurückgesetzt",
        description: "Dein Passwort wurde erfolgreich zurückgesetzt. Du kannst dich jetzt anmelden."
      });

      // Redirect to login page
      navigate("/auth/login", { replace: true });
    } catch (error: any) {
      console.error("Password reset error:", error);
      toast({
        variant: "destructive",
        title: "Fehler",
        description: error?.message || "Das Passwort konnte nicht zurückgesetzt werden. Der Link ist möglicherweise abgelaufen."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (hasTokenError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Link abgelaufen</CardTitle>
            <CardDescription className="text-center">
              Der Passwort-Reset-Link ist ungültig oder abgelaufen.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center">
            <Button onClick={() => navigate("/auth/login")} variant="default">
              Zurück zum Login
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="flex justify-center mb-6">
            <img 
              alt="avanti suite" 
              className="h-20 transform hover:scale-105 transition-transform duration-200" 
              src="/lovable-uploads/eff651fc-49c9-4b51-b5bc-d14c401b3934.png" 
            />
          </h1>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Neues Passwort festlegen</CardTitle>
            <CardDescription>
              Bitte gib dein neues Passwort ein.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Neues Passwort</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Passwort bestätigen</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "Wird zurückgesetzt..." : "Passwort zurücksetzen"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;
