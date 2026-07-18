import React, { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";

export default function CustomerAutocomplete({ value, onChange, placeholder = "Nome do cliente", className = "" }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const { data: expedicoes = [] } = useQuery({
    queryKey: ["ma-expedicao-customers"],
    queryFn: () => base44.entities.MAExpedicao.list("customer"),
    staleTime: 5 * 60 * 1000,
  });

  const customers = [...new Set(expedicoes.map(e => e.customer).filter(Boolean))].sort();

  const suggestions = value
    ? customers.filter(c => c.toLowerCase().includes(value.toLowerCase()))
    : [];

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-auto text-sm">
          {suggestions.map(c => (
            <li
              key={c}
              className="px-3 py-2 cursor-pointer hover:bg-[#860063]/10 hover:text-[#860063] transition-colors"
              onMouseDown={() => { onChange(c); setOpen(false); }}
            >
              {c}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}