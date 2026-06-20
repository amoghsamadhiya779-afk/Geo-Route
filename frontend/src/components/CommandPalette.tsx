"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { fetchCities } from "@/lib/api";
import { useTrentStore } from "@/store/useTrentStore";
import { MapPin } from "lucide-react";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const setActiveCity = useTrentStore((state) => state.setActiveCity);

  const { data: cities } = useQuery({
    queryKey: ['cities'],
    queryFn: fetchCities,
  });

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <Command>
        <CommandInput placeholder="Type a command or search for a city..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Global Cities">
            {cities?.map((city) => (
              <CommandItem
                key={city.id}
                onSelect={() => {
                  setActiveCity(city.id);
                  setOpen(false);
                }}
                className="cursor-pointer"
              >
                <MapPin className="mr-2 h-4 w-4 text-emerald-500" />
                <span>{city.name}</span>
                <span className="ml-auto text-xs text-muted-foreground">{city.country}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
