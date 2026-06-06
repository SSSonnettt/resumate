"use client";
import { useResumeStore } from "@/lib/stores/resume-store";
import { ModuleRenderer } from "@/components/renderers/module-renderer";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import type { Module, Theme } from "@resumate/shared";

function SortableModule({
  module,
  theme,
}: {
  module: Module;
  theme: Theme;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: module.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      <button
        {...attributes}
        {...listeners}
        className="absolute -left-8 top-2 cursor-grab rounded-md bg-white p-1 opacity-0 shadow-sm ring-1 ring-slate-200 transition-opacity group-hover:opacity-100"
      >
        <GripVertical size={16} className="text-slate-400" />
      </button>
      <ModuleRenderer module={module} theme={theme} />
    </div>
  );
}

export function ResumeCanvas() {
  const { resume, reorderModules } = useResumeStore();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = resume.modules.findIndex((m) => m.id === active.id);
      const newIndex = resume.modules.findIndex((m) => m.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        reorderModules(oldIndex, newIndex);
      }
    }
  }

  return (
    <div
      className="mx-auto bg-white p-10 shadow-sm ring-1 ring-slate-200"
      style={{ width: "820px", minHeight: "1160px" }}
    >
      {resume.modules.length === 0 ? (
        <p className="pt-20 text-center text-slate-300">
          从左侧添加模块开始编辑简历
        </p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={resume.modules.map((m) => m.id)}
            strategy={verticalListSortingStrategy}
          >
            {resume.modules.map((mod) => (
              <SortableModule
                key={mod.id}
                module={mod}
                theme={resume.theme}
              />
            ))}
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
