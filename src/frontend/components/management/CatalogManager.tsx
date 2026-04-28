"use client";

import { useMemo, useState } from "react";
import { Plus, Search, Tag } from "lucide-react";
import { cn } from "@/frontend/utils/utils";

interface CatalogItem {
  id: string;
  name: string;
  description?: string;
  active: boolean;
}

interface CatalogManagerProps {
  title: string;
  items: CatalogItem[];
  onCreate: (name: string) => void;
  onToggle: (id: string) => void;
}

export function CatalogManager({ title, items, onCreate, onToggle }: CatalogManagerProps) {
  const [query, setQuery] = useState("");
  const [name, setName] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => `${item.name} ${item.description ?? ""}`.toLowerCase().includes(q));
  }, [items, query]);

  return (
    <div className="rounded-[12px] border border-[#E2E8E4] bg-white p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Tag size={14} className="text-[#5C7A6A]" />
        <p className="text-[0.875rem] font-semibold text-[#1A2E1F]">{title}</p>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5C7A6A]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm catalog"
            className="input-field pl-8"
          />
        </div>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Mục mới"
          className="input-field max-w-[180px]"
        />
        <button
          className="btn-primary"
          disabled={!name.trim()}
          onClick={() => {
            onCreate(name.trim());
            setName("");
          }}
        >
          <Plus size={14} />
          Thêm
        </button>
      </div>

      <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
        {filtered.map((item) => (
          <div key={item.id} className="rounded-[8px] border border-[#E2E8E4] px-3 py-2 flex items-center justify-between gap-3">
            <div>
              <p className="text-[0.8125rem] font-medium text-[#1A2E1F]">{item.name}</p>
              {item.description && <p className="text-[0.75rem] text-[#5C7A6A]">{item.description}</p>}
            </div>
            <button
              className={cn(
                "px-2 py-1 rounded-[6px] text-[0.6875rem] font-semibold border",
                item.active ? "border-[#B8E0C8] bg-[#ECFDF3] text-[#1B7A3F]" : "border-[#E2E8E4] bg-[#F7F8F6] text-[#5C7A6A]"
              )}
              onClick={() => onToggle(item.id)}
            >
              {item.active ? "Đang bật" : "Đang tắt"}
            </button>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-[0.75rem] text-[#5C7A6A]">Không có mục phù hợp.</p>}
      </div>
    </div>
  );
}
