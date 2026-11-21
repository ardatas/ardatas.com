"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

function Digit({ value }: { value: string }) {
  const reduced = useReducedMotion();
  return (
    <span className="clock-digit relative overflow-hidden">
      <AnimatePresence initial={false}>
        <motion.span
          key={value}
          initial={{ y: reduced ? 0 : "-55%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: reduced ? 0 : "55%", opacity: 0 }}
          transition={{ duration: reduced ? 0 : 0.24 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export default function FlipClock({ elapsedMs = 0 }: { elapsedMs?: number }) {
  const total = Math.floor(Math.max(0, elapsedMs) / 1000);
  const values = [
    Math.floor(total / 3600),
    Math.floor(total / 60) % 60,
    total % 60,
  ].map((value) => String(value).padStart(2, "0"));
  return (
    <div className="flip-clock" role="timer" aria-label={values.join(":")}>
      {["Hours", "Minutes", "Seconds"].map((unit, index) => (
        <div className="clock-unit" key={unit} aria-hidden="true">
          <div className="clock-pair">
            {values[index].split("").map((digit, i) => (
              <Digit key={i} value={digit} />
            ))}
          </div>
          <span className="clock-caption">{unit}</span>
        </div>
      ))}
    </div>
  );
}
