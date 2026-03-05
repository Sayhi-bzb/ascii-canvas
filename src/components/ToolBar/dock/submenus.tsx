"use client";

import type { ComponentType, RefObject } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { PALETTE } from "@/lib/constants";
import type { ToolType } from "@/types";
import { getFirstGrapheme } from "@/utils/characters";
import { MATERIAL_PRESETS, SHAPE_TOOLS } from "./constants";

type SubmenuOptionClass = (active: boolean) => string;

type BrushSubmenuProps = {
  brushChar: string;
  customChar: string;
  setCustomChar: (value: string) => void;
  setBrushChar: (value: string) => void;
  setTool: (tool: ToolType) => void;
  inputRef: RefObject<HTMLInputElement | null>;
  submenuOptionClass: SubmenuOptionClass;
};

export function BrushSubmenu({
  brushChar,
  customChar,
  setCustomChar,
  setBrushChar,
  setTool,
  inputRef,
  submenuOptionClass,
}: BrushSubmenuProps) {
  return (
    <>
      <button
        onClick={() => {
          setBrushChar(customChar);
          setTool("brush");
          inputRef.current?.focus();
        }}
        className={submenuOptionClass(brushChar === customChar && customChar !== "")}
      >
        <div className="size-3.5 flex items-center justify-center shrink-0">
          {brushChar === customChar && customChar !== "" && (
            <Check className="size-3.5 stroke-[3]" />
          )}
        </div>
        <div className="flex-1 px-1">
          <Input
            ref={inputRef}
            className="h-6 w-14 text-center p-0 font-mono text-base font-bold border-none shadow-none ring-0 focus-visible:ring-0 bg-muted/40 hover:bg-muted/60 rounded-sm text-inherit placeholder:text-muted-foreground/50"
            placeholder="Custom"
            maxLength={12}
            value={customChar}
            onChange={(e) => {
              const raw = e.target.value;
              const val = raw ? getFirstGrapheme(raw) : "";
              setCustomChar(val);
              if (val) {
                setBrushChar(val);
              }
            }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      </button>
      {MATERIAL_PRESETS.map((char) => (
        <button
          key={char}
          onClick={() => {
            setBrushChar(char);
            setTool("brush");
          }}
          className={submenuOptionClass(brushChar === char)}
        >
          <div className="size-3.5 flex items-center justify-center shrink-0">
            {brushChar === char && <Check className="size-3.5 stroke-[3]" />}
          </div>
          <span className="flex-1 font-mono font-bold text-lg text-center leading-none">
            {char}
          </span>
        </button>
      ))}
    </>
  );
}

type ShapeSubmenuProps = {
  tool: ToolType;
  setTool: (tool: ToolType) => void;
  setLastUsedShape: (tool: ToolType) => void;
  getToolMeta: (type: ToolType) => { icon: ComponentType<{ className?: string }>; label: string };
  submenuOptionClass: SubmenuOptionClass;
};

export function ShapeSubmenu({
  tool,
  setTool,
  setLastUsedShape,
  getToolMeta,
  submenuOptionClass,
}: ShapeSubmenuProps) {
  return (
    <>
      {SHAPE_TOOLS.map((st) => {
        const meta = getToolMeta(st);
        const isSubActive = tool === st;
        return (
          <button
            key={st}
            onClick={() => {
              setTool(st);
              setLastUsedShape(st);
            }}
            className={submenuOptionClass(isSubActive)}
          >
            <div className="size-3.5 flex items-center justify-center shrink-0">
              {isSubActive && <Check className="size-3.5 stroke-[3]" />}
            </div>
            <meta.icon className="size-4 shrink-0" />
            <span className="flex-1 text-left text-sm font-medium pr-4 whitespace-nowrap ml-1">
              {meta.label}
            </span>
          </button>
        );
      })}
    </>
  );
}

type ColorSubmenuProps = {
  brushColor: string;
  setBrushColor: (color: string) => void;
  onPicked: () => void;
};

export function ColorSubmenu({
  brushColor,
  setBrushColor,
  onPicked,
}: ColorSubmenuProps) {
  return (
    <div className="grid grid-cols-5 gap-1 p-1">
      {PALETTE.map((c) => (
        <button
          key={c}
          onClick={() => {
            setBrushColor(c);
            onPicked();
          }}
          className={cn(
            "size-6 rounded-md border border-foreground/10 transition-transform hover:scale-110 active:scale-95 flex items-center justify-center",
            brushColor === c && "ring-2 ring-primary ring-offset-1 ring-offset-popover"
          )}
          style={{ backgroundColor: c }}
        >
          {brushColor === c && (
            <Check className="size-3 text-white mix-blend-difference" />
          )}
        </button>
      ))}
    </div>
  );
}
