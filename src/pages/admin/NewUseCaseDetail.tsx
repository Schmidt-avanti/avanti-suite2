import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import NewUseCaseForm from "./NewUseCaseForm";

export default function NewUseCaseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [initialData, setInitialData] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("new_use_cases")
        .select("*")
        .eq("id", id)
        .single();
      if (error || !data) {
        navigate("/admin/new-use-cases");
        return;
      }
      setInitialData(data);
      setLoading(false);
    };
    fetchData();
  }, [id, navigate]);

  if (loading) {
    return <div className="max-w-3xl mx-auto py-8">Wird geladen ...</div>;
  }

  // NewUseCaseForm bekommt initialData und einen editMode-Prop
  return (
    <NewUseCaseForm initialData={initialData} editMode />
  );
} 