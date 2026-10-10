"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useCanHover } from "@/hooks/useQuality";
import { COLORS, type VisualProps } from "./shared";

function Glyph({ id }: { id: number }) {
  switch (id) {
    case 0:
      return (
        <svg viewBox="0 0 60 40" className="h-full w-full">
          {[10, 22, 15, 30, 24].map((h, i) => (
            <rect key={i} x={6 + i * 10} y={36 - h} width="6" height={h} rx="1.5" fill={COLORS.blue} />
          ))}
        </svg>
      );
    case 1:
      return (
        <svg viewBox="0 0 60 40" className="h-full w-full">
          <circle cx="30" cy="20" r="13" fill="none" stroke={COLORS.sky} strokeWidth="6" strokeDasharray="50 82" strokeLinecap="round" />
          <circle cx="30" cy="20" r="13" fill="none" stroke={COLORS.taupe} strokeWidth="6" strokeDasharray="22 82" strokeDashoffset="-54" strokeLinecap="round" />
        </svg>
      );
    case 2:
      return (
        <svg viewBox="0 0 60 40" className="h-full w-full">
          <path d="M4 32 L16 22 L26 26 L38 12 L56 6" fill="none" stroke={COLORS.taupe} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    default:
      return (
        <div className="flex h-full w-full flex-col justify-center gap-1.5 px-2">
          <div className="h-2.5 w-3/4 rounded-full bg-espresso/70" />
          <div className="h-1.5 w-1/2 rounded-full bg-taupe/50" />
          <div className="h-1.5 w-2/3 rounded-full bg-taupe/35" />
        </div>
      );
  }
}

const TINTS = [COLORS.blue, COLORS.sky, COLORS.taupe, COLORS.clay];

/** 02: dashboard widgets shuffle themselves around and can be dragged. */
export default function WidgetRearrange({ active, still }: VisualProps) {
  const [order, setOrder] = useState([0, 1, 2, 3]);
  const [dragging, setDragging] = useState(false);
  const canHover = useCanHover();

  useEffect(() => {
    if (!active || still || dragging) return;
    const id = setInterval(() => setOrder((o) => [o[3], o[0], o[1], o[2]]), 2200);
    return () => clearInterval(id);
  }, [active, still, dragging]);

  return (
    <div className="flex h-full w-full items-center justify-center" aria-hidden>
      <div className="grid w-[210px] grid-cols-2 gap-2.5">
        {order.map((id) => (
          <motion.div
            key={id}
            layout={!still}
            transition={{ type: "spring", stiffness: 280, damping: 24 }}
            drag={canHover && !still}
            dragSnapToOrigin
            dragElastic={0.25}
            whileDrag={{ scale: 1.1, zIndex: 20, cursor: "grabbing" }}
            onDragStart={() => setDragging(true)}
            onDragEnd={() => setDragging(false)}
            className="relative h-[58px] cursor-grab rounded-xl border p-1.5"
            style={{
              borderColor: `${TINTS[id]}77`,
              background: `linear-gradient(145deg, #ffffff, ${TINTS[id]}2b)`,
              boxShadow: `0 10px 16px -10px ${TINTS[id]}77, inset 0 1px 0 #fff`,
            }}
          >
            <Glyph id={id} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
