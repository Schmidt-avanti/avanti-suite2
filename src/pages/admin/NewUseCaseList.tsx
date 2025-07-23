import React, { useEffect, useState } from "react";
import { Button } from "../../components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";

interface UseCase {
  id: string;
  title: string;
  status: string;
  version: number;
  created_at: string;
  category: string[];
  customer_id: string;
}

interface Customer {
  id: string;
  name: string;
}

const sortOptions = [
  { key: "title", label: "Titel" },
  { key: "status", label: "Status" },
  { key: "version", label: "Version" },
  { key: "created_at", label: "Erstellt am" },
];

export default function NewUseCaseList() {
  const navigate = useNavigate();
  const [useCases, setUseCases] = useState<UseCase[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>("");
  const [typeOptions, setTypeOptions] = useState<string[]>([]);
  const [selectedType, setSelectedType] = useState<string>("");
  const [sortKey, setSortKey] = useState<string>("created_at");
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    if (selectedCustomer) {
      fetchUseCases();
    } else {
      setUseCases([]);
      setTypeOptions([]);
    }
  }, [selectedCustomer]);

  useEffect(() => {
    // Filter Typen aus geladenen Use Cases extrahieren
    const allTypes = Array.from(
      new Set(useCases.flatMap((uc) => uc.category || []))
    );
    setTypeOptions(allTypes);
  }, [useCases]);

  const fetchCustomers = async () => {
    const { data, error } = await supabase
      .from("customers")
      .select("id, name")
      .order("name");
    if (!error && data) {
      setCustomers(data);
      if (data.length > 0) setSelectedCustomer(data[0].id);
    }
  };

  const fetchUseCases = async () => {
    setLoading(true);
    let query = supabase
      .from("new_use_cases")
      .select("id, title, status, version, created_at, category, customer_id")
      .eq("customer_id", selectedCustomer);
    if (selectedType) {
      query = query.contains("category", [selectedType]);
    }
    const { data, error } = await query;
    if (!error && data) {
      setUseCases(data);
    } else {
      setUseCases([]);
    }
    setLoading(false);
  };

  // Sortierung
  const sortedUseCases = [...useCases].sort((a, b) => {
    let aVal = a[sortKey as keyof UseCase];
    let bVal = b[sortKey as keyof UseCase];
    if (sortKey === "created_at") {
      return sortAsc
        ? new Date(aVal as string).getTime() - new Date(bVal as string).getTime()
        : new Date(bVal as string).getTime() - new Date(aVal as string).getTime();
    }
    if (typeof aVal === "string" && typeof bVal === "string") {
      return sortAsc
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    }
    if (typeof aVal === "number" && typeof bVal === "number") {
      return sortAsc ? aVal - bVal : bVal - aVal;
    }
    return 0;
  });

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortAsc((asc) => !asc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">Neue Use Cases</h1>
        <Button onClick={() => navigate("/admin/new-use-cases/new")}>Neuen Use Case anlegen</Button>
      </div>
      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-1">Kunde</label>
          <select
            className="border rounded px-2 py-1"
            value={selectedCustomer}
            onChange={(e) => setSelectedCustomer(e.target.value)}
          >
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Typ</label>
          <select
            className="border rounded px-2 py-1"
            value={selectedType}
            onChange={(e) => {
              setSelectedType(e.target.value);
              fetchUseCases();
            }}
          >
            <option value="">Alle</option>
            {typeOptions.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow p-4">
        <table className="w-full text-left">
          <thead>
            <tr>
              {sortOptions.map((opt) => (
                <th
                  key={opt.key}
                  className="py-2 px-3 cursor-pointer select-none hover:underline"
                  onClick={() => handleSort(opt.key)}
                >
                  {opt.label}
                  {sortKey === opt.key && (sortAsc ? " ▲" : " ▼")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={sortOptions.length} className="py-4 text-center text-muted-foreground">
                  Wird geladen ...
                </td>
              </tr>
            ) : sortedUseCases.length === 0 ? (
              <tr>
                <td colSpan={sortOptions.length} className="py-4 text-center text-muted-foreground">
                  Keine Use Cases gefunden.
                </td>
              </tr>
            ) : (
              sortedUseCases.map((uc) => (
                <tr
                  key={uc.id}
                  className="hover:bg-muted/30 cursor-pointer"
                  onClick={() => navigate(`/admin/new-use-cases/${uc.id}`)}
                >
                  <td className="py-2 px-3 font-medium">{uc.title}</td>
                  <td className="py-2 px-3">{uc.status}</td>
                  <td className="py-2 px-3">{uc.version}</td>
                  <td className="py-2 px-3">{new Date(uc.created_at).toLocaleDateString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
} 